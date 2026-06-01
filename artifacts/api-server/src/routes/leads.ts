import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { fireTrigger } from "../services/automationEngine";
import { createNotification } from "../services/notificationService";

const router: IRouter = Router();

function sanitize(row: typeof leadsTable.$inferSelect) {
  return {
    ...row,
    phone: row.phone ?? "",
    whatsappNumber: row.whatsappNumber ?? "",
    interestedProperties: row.interestedProperties ?? [],
    property: row.property ?? "",
    budget: row.budget ?? "",
    source: row.source ?? "Website",
    assignedTo: row.assignedTo ?? "",
    lastContact: row.lastContact ?? "",
    avatar: row.avatar ?? "",
    notes: row.notes ?? [],
    timeline: (row.timeline as Array<{ id: string; title: string; time: string }>) ?? [],
    score: row.score ?? 50,
    urgencyScore: row.urgencyScore ?? 50,
    tags: row.tags ?? [],
    attachments: (row.attachments as Array<{ name: string; size: string; type: string }>) ?? [],
    suggestedActions: row.suggestedActions ?? [],
    adSetName: row.adSetName ?? null,
    adCreativeId: row.adCreativeId ?? null,
  };
}

router.get("/leads", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const rows = await db
      .select()
      .from(leadsTable)
      .where(sql`(${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`)
      .orderBy(sql`${leadsTable.createdAt} DESC`);
    res.json(rows.map(sanitize));
  } catch {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.get("/leads/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  const userId: string = req.userId;
  try {
    const [row] = await db.select().from(leadsTable)
      .where(sql`${leadsTable.id} = ${id} AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`);
    if (!row) return void res.status(404).json({ error: "Lead not found" });
    res.json(sanitize(row));
  } catch {
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

router.post("/leads/bulk-delete", requireAuth, async (req: any, res) => {
  const { ids } = req.body as { ids: number[] };
  const userId: string = req.userId;
  if (!Array.isArray(ids) || ids.length === 0) {
    return void res.status(400).json({ error: "ids array required" });
  }
  try {
    await db.delete(leadsTable).where(
      sql`${leadsTable.id} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::int[])
          AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`
    );
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to bulk delete leads" });
  }
});

router.post("/leads", requireAuth, async (req, res) => {
  try {
    const { id: _id, createdAt: _c, updatedAt: _u, ...body } = req.body;
    const userId = (req as any).userId;
    const [row] = await db.insert(leadsTable).values({ ...body, createdById: userId }).returning();
    const saved = sanitize(row);
    res.status(201).json(saved);
    // Fire automation trigger + notification after responding
    fireTrigger({
      triggerType: "lead_created",
      leadId: row.id,
      lead: row,
      userId: userId ?? undefined,
      newStatus: row.status,
    }).catch(() => {});
    if (userId) {
      createNotification({
        userId,
        type: "lead",
        title: `New lead added — ${row.name}`,
        body: row.source ? `Source: ${row.source}` : "A new lead has been created.",
        actionUrl: `/dashboard/leads/${row.id}`,
        metadata: { leadId: row.id },
      }).catch(() => {});
    }
  } catch (err) {
    console.error("Create lead error:", err);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.put("/leads/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const [previousLead] = await db.select().from(leadsTable)
      .where(sql`${leadsTable.id} = ${id} AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`);
    const { id: _id, createdAt: _c, updatedAt: _u, createdById: _cb, ...body } = req.body;
    const [row] = await db
      .update(leadsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(sql`${leadsTable.id} = ${id} AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`)
      .returning();
    if (!row) return void res.status(404).json({ error: "Lead not found" });
    res.json(sanitize(row));
    // Fire trigger if status changed
    if (previousLead && body.status && previousLead.status !== body.status) {
      fireTrigger({
        triggerType: "lead_status_changed",
        leadId: row.id,
        lead: row,
        previousStatus: previousLead.status,
        newStatus: body.status,
      }).catch(() => {});
    }
    // Fire trigger if score changed
    if (previousLead && body.score !== undefined && previousLead.score !== body.score) {
      fireTrigger({
        triggerType: "lead_score_updated",
        leadId: row.id,
        lead: row,
        previousScore: previousLead.score ?? undefined,
        newScore: body.score,
        newStatus: row.status,
      }).catch(() => {});
    }
  } catch {
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.patch("/leads/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const [previousLead] = await db.select().from(leadsTable)
      .where(sql`${leadsTable.id} = ${id} AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`);
    const { id: _id, createdAt: _c, updatedAt: _u, createdById: _cb, ...body } = req.body;
    const [row] = await db
      .update(leadsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(sql`${leadsTable.id} = ${id} AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`)
      .returning();
    if (!row) return void res.status(404).json({ error: "Lead not found" });
    res.json(sanitize(row));
    if (previousLead && body.status && previousLead.status !== body.status) {
      fireTrigger({
        triggerType: "lead_status_changed",
        leadId: row.id,
        lead: row,
        previousStatus: previousLead.status,
        newStatus: body.status,
      }).catch(() => {});
    }
    if (previousLead && body.score !== undefined && previousLead.score !== body.score) {
      fireTrigger({
        triggerType: "lead_score_updated",
        leadId: row.id,
        lead: row,
        previousScore: previousLead.score ?? undefined,
        newScore: body.score,
        newStatus: row.status,
      }).catch(() => {});
    }
  } catch {
    res.status(500).json({ error: "Failed to patch lead" });
  }
});

router.delete("/leads/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    await db.delete(leadsTable).where(
      sql`${leadsTable.id} = ${id} AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`
    );
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

export default router;
