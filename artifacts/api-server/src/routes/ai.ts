import { Router, type IRouter } from "express";
import { db, leadsTable, activities, deals, messages, conversations } from "@workspace/db";
import { eq, desc, inArray, and, or, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { openai } from "../lib/openai";
import { fireTrigger } from "../services/automationEngine";

const router: IRouter = Router();

type LeadAnalysis = {
  score: number;
  urgencyScore: number;
  aiSummary: string;
  suggestedActions: string[];
  signals: { label: string; score: number }[];
  smartReminder: string;
};

async function analyzeLeadWithAI(leadData: {
  lead: typeof leadsTable.$inferSelect;
  recentMessages: string[];
  recentActivities: string[];
  dealInfo: string | null;
}): Promise<LeadAnalysis> {
  const { lead, recentMessages, recentActivities, dealInfo } = leadData;

  const prompt = `You are an AI assistant for a luxury real estate CRM. Analyze this lead and return a JSON object.

Lead Data:
- Name: ${lead.name}
- Status: ${lead.status}
- Priority: ${lead.priority}
- Budget: ${lead.budget || "Not specified"}
- Property Interest: ${lead.property || "Not specified"}
- Source: ${lead.source || "Unknown"}
- Last Contact: ${lead.lastContact || "Unknown"}
- Notes: ${(lead.notes || []).slice(0, 3).join("; ") || "None"}
- Tags: ${(lead.tags || []).join(", ") || "None"}
- Created: ${lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "Unknown"}

Recent Messages (last 5):
${recentMessages.length > 0 ? recentMessages.join("\n") : "No messages"}

Recent Activities (last 5):
${recentActivities.length > 0 ? recentActivities.join("\n") : "No activities logged"}

Deal Info:
${dealInfo || "No active deal"}

Return ONLY a valid JSON object with these exact fields:
{
  "score": <integer 0-100, lead quality score based on budget fit, engagement, intent>,
  "urgencyScore": <integer 0-100, how urgently this lead needs follow-up>,
  "aiSummary": <2-3 sentence summary of lead status, key signals, and recommended approach>,
  "suggestedActions": <array of 3-4 specific action strings>,
  "signals": [
    {"label": "Budget fit", "score": <0-100>},
    {"label": "Engagement", "score": <0-100>},
    {"label": "Timeline", "score": <0-100>},
    {"label": "Intent", "score": <0-100>},
    {"label": "Readiness", "score": <0-100>}
  ],
  "smartReminder": <one sentence time-sensitive reminder or next best action>
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as LeadAnalysis;
  return parsed;
}

// Ownership predicate reused across routes
const ownsLead = (userId: string) =>
  or(eq(leadsTable.createdById, userId), isNull(leadsTable.createdById));

router.post("/ai/analyze-lead/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = (req as any).userId as string;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  try {
    // Scope lead fetch to the authenticated user
    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(and(eq(leadsTable.id, id), ownsLead(userId)));
    if (!lead) return void res.status(404).json({ error: "Lead not found" });

    const leadActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.leadId, id))
      .orderBy(desc(activities.createdAt))
      .limit(5);

    const leadDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.leadId, id))
      .orderBy(desc(deals.createdAt))
      .limit(1);

    // Scope conversations to this specific lead
    const leadConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.leadId, id))
      .limit(5);

    let recentMessages: string[] = [];
    if (leadConversations.length > 0) {
      const convIds = leadConversations.map((c) => c.id);
      const msgs = await db
        .select()
        .from(messages)
        .where(inArray(messages.conversationId, convIds))
        .orderBy(desc(messages.createdAt))
        .limit(5);
      // Use `direction` field (outbound/inbound), not the non-existent `senderType`
      recentMessages = msgs.map((m) => `[${(m.direction ?? "unknown").toUpperCase()}]: ${m.content}`);
    }

    const recentActivities = leadActivities.map(
      (a) => `${a.type}: ${a.title}${a.outcome ? ` → ${a.outcome}` : ""}`
    );

    const dealInfo = leadDeals[0]
      ? `Stage: ${leadDeals[0].stage}, Value: $${leadDeals[0].value ?? "TBD"}, Probability: ${leadDeals[0].probability ?? 0}%`
      : null;

    const analysis = await analyzeLeadWithAI({ lead, recentMessages, recentActivities, dealInfo });

    // Scope update to the owner as well
    const [updated] = await db
      .update(leadsTable)
      .set({
        score: analysis.score,
        urgencyScore: analysis.urgencyScore,
        aiSummary: analysis.aiSummary,
        suggestedActions: analysis.suggestedActions,
        updatedAt: new Date(),
      })
      .where(and(eq(leadsTable.id, id), ownsLead(userId)))
      .returning();

    res.json({ ...analysis, lead: updated });

    // Fire automation triggers asynchronously after responding
    if (updated) {
      fireTrigger({
        triggerType: "lead_score_updated",
        leadId: updated.id,
        lead: updated,
        previousScore: lead.score ?? undefined,
        newScore: analysis.score,
        newStatus: updated.status,
        userId,
      }).catch(() => {});
    }
  } catch (err) {
    console.error("AI analyze lead error:", err);
    res.status(500).json({ error: "Failed to analyze lead" });
  }
});

router.post("/ai/analyze-all", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Only analyze leads belonging to the authenticated user
    const allLeads = await db
      .select()
      .from(leadsTable)
      .where(ownsLead(userId))
      .orderBy(desc(leadsTable.updatedAt))
      .limit(20);

    res.write(`data: ${JSON.stringify({ type: "start", total: allLeads.length })}\n\n`);

    for (let i = 0; i < allLeads.length; i++) {
      const lead = allLeads[i];
      try {
        const leadActivities = await db
          .select()
          .from(activities)
          .where(eq(activities.leadId, lead.id))
          .orderBy(desc(activities.createdAt))
          .limit(5);

        const leadDeals = await db
          .select()
          .from(deals)
          .where(eq(deals.leadId, lead.id))
          .limit(1);

        const recentActivities = leadActivities.map(
          (a) => `${a.type}: ${a.title}${a.outcome ? ` → ${a.outcome}` : ""}`
        );
        const dealInfo = leadDeals[0]
          ? `Stage: ${leadDeals[0].stage}, Value: $${leadDeals[0].value ?? "TBD"}`
          : null;

        const analysis = await analyzeLeadWithAI({
          lead,
          recentMessages: [],
          recentActivities,
          dealInfo,
        });

        // Scope update to owner
        await db
          .update(leadsTable)
          .set({
            score: analysis.score,
            urgencyScore: analysis.urgencyScore,
            aiSummary: analysis.aiSummary,
            suggestedActions: analysis.suggestedActions,
            updatedAt: new Date(),
          })
          .where(and(eq(leadsTable.id, lead.id), ownsLead(userId)));

        res.write(
          `data: ${JSON.stringify({
            type: "progress",
            index: i + 1,
            total: allLeads.length,
            leadId: lead.id,
            leadName: lead.name,
            score: analysis.score,
            urgencyScore: analysis.urgencyScore,
          })}\n\n`
        );

        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        res.write(
          `data: ${JSON.stringify({ type: "error", leadId: lead.id, leadName: lead.name })}\n\n`
        );
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    console.error("AI analyze-all error:", err);
    res.write(`data: ${JSON.stringify({ type: "fatal", error: "Failed to analyze leads" })}\n\n`);
    res.end();
  }
});

router.post("/ai/sales-insights", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    // Scope all queries to the authenticated user's data
    const allLeads = await db
      .select()
      .from(leadsTable)
      .where(ownsLead(userId))
      .orderBy(desc(leadsTable.updatedAt))
      .limit(50);

    const allDeals = await db
      .select()
      .from(deals)
      .where(or(eq(deals.createdById, userId), isNull(deals.createdById)))
      .orderBy(desc(deals.createdAt))
      .limit(20);

    const recentActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(30);

    const statusCounts = allLeads.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {});

    const avgScore =
      allLeads.length > 0
        ? Math.round(allLeads.reduce((s, l) => s + (l.score ?? 50), 0) / allLeads.length)
        : 0;

    const hotLeads = allLeads.filter((l) => (l.urgencyScore ?? 0) >= 70).length;
    const totalDealValue = allDeals.reduce((s, d) => s + parseFloat(d.value ?? "0"), 0);
    const activityTypes = recentActivities.reduce<Record<string, number>>((acc, act) => {
      acc[act.type] = (acc[act.type] ?? 0) + 1;
      return acc;
    }, {});

    const prompt = `You are a luxury real estate sales analyst. Analyze this CRM pipeline data and return JSON insights.

Pipeline Summary:
- Total Leads: ${allLeads.length}
- Average Lead Score: ${avgScore}/100
- Hot Leads (urgency ≥70): ${hotLeads}
- Lead Status Breakdown: ${JSON.stringify(statusCounts)}
- Active Deals: ${allDeals.length}
- Total Pipeline Value: $${totalDealValue.toLocaleString()}
- Recent Activity Types: ${JSON.stringify(activityTypes)}

Return ONLY a valid JSON object:
{
  "pipelineScore": <integer 0-100, overall pipeline health>,
  "revenueForecasted": <string like "$2.4M" estimated from active deals>,
  "hotLeadsCount": ${hotLeads},
  "inactivityAlerts": [<array of up to 3 short alert strings about leads needing attention>],
  "topInsights": [<array of 4 key insight strings about the pipeline>],
  "weeklyTrend": <"up" | "down" | "stable">,
  "weeklyTrendPercent": <number like 12>,
  "conversionRate": <estimated percentage as number>,
  "avgDealDays": <estimated average days to close as number>
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const insights = JSON.parse(content);

    res.json({
      ...insights,
      totalLeads: allLeads.length,
      avgScore,
      hotLeadsCount: hotLeads,
      totalDealValue,
      statusCounts,
    });
  } catch (err) {
    console.error("Sales insights error:", err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

router.post("/ai/conversation-summary/:leadId", requireAuth, async (req, res) => {
  const leadId = parseInt(req.params.leadId as string, 10);
  const userId = (req as any).userId as string;
  if (isNaN(leadId)) return void res.status(400).json({ error: "Invalid lead ID" });

  try {
    // Scope lead fetch to the authenticated user
    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(and(eq(leadsTable.id, leadId), ownsLead(userId)));
    if (!lead) return void res.status(404).json({ error: "Lead not found" });

    const leadActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.leadId, leadId))
      .orderBy(desc(activities.createdAt))
      .limit(10);

    // Scope messages to conversations belonging to this lead, not globally
    const leadConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.leadId, leadId))
      .limit(10);

    const allMessages =
      leadConversations.length > 0
        ? await db
            .select()
            .from(messages)
            .where(inArray(messages.conversationId, leadConversations.map((c) => c.id)))
            .orderBy(desc(messages.createdAt))
            .limit(20)
        : [];

    const activityLog = leadActivities.map(
      (act) => `[${act.type.toUpperCase()}] ${act.title}${act.description ? `: ${act.description}` : ""}${act.outcome ? ` | Outcome: ${act.outcome}` : ""} (${new Date(act.createdAt).toLocaleDateString()})`
    );

    // Use `direction` field (inbound/outbound) instead of non-existent `senderType`
    const msgLog = allMessages.map(
      (msg) => `[${(msg.direction ?? "unknown").toUpperCase()}]: ${msg.content} (${new Date(msg.createdAt).toLocaleDateString()})`
    );

    const prompt = `You are an AI CRM analyst for luxury real estate. Summarize all communications and activities for this lead.

Lead: ${lead.name} | Budget: ${lead.budget || "N/A"} | Status: ${lead.status} | Property: ${lead.property || "N/A"}

Activity Log:
${activityLog.length > 0 ? activityLog.join("\n") : "No activities logged yet"}

Message History:
${msgLog.length > 0 ? msgLog.join("\n") : "No messages yet"}

Return ONLY a valid JSON object:
{
  "summary": <3-4 sentence narrative summary of the relationship and communication history>,
  "keyMoments": [<array of up to 4 significant interaction strings>],
  "sentiment": <"positive" | "neutral" | "negative" | "mixed">,
  "lastTouchpoint": <string describing the most recent meaningful interaction>,
  "relationshipStrength": <integer 0-100>,
  "nextBestAction": <specific recommended next action string>
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    res.json(JSON.parse(content));
  } catch (err) {
    console.error("Conversation summary error:", err);
    res.status(500).json({ error: "Failed to generate conversation summary" });
  }
});

export default router;
