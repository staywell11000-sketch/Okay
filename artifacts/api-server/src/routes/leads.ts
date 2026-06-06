import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { eq, sql, and, or, ilike, inArray } from "drizzle-orm";
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
  const pageSize = Math.min(1000, Math.max(1, Number(req.query.pageSize) || 500));
  const page = Math.max(1, Number(req.query.page) || 1);
  const search = (req.query.search as string | undefined)?.trim();
  const status = req.query.status as string | undefined;
  const source = req.query.source as string | undefined;
  const priority = req.query.priority as string | undefined;

  try {
    const conditions = [eq(leadsTable.createdById, userId)];
    if (search) {
      const pat = `%${search}%`;
      conditions.push(
        or(
          ilike(leadsTable.name, pat),
          ilike(leadsTable.email, pat),
          ilike(leadsTable.phone, pat),
          ilike(leadsTable.property, pat),
        )!
      );
    }
    if (status && status !== "all") conditions.push(eq(leadsTable.status, status));
    if (source && source !== "all") conditions.push(eq(leadsTable.source, source));
    if (priority && priority !== "all") conditions.push(eq(leadsTable.priority, priority));

    const rows = await db
      .select()
      .from(leadsTable)
      .where(and(...conditions))
      .orderBy(sql`${leadsTable.createdAt} DESC`)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    res.json(rows.map(sanitize));
  } catch (err) {
    console.error("Leads fetch error:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.get("/leads/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  const userId: string = req.userId;
  try {
    const [row] = await db.select().from(leadsTable)
      .where(sql`${leadsTable.id} = ${id} AND ${leadsTable.createdById} = ${userId}`);
    if (!row) return void res.status(404).json({ error: "Lead not found" });
    res.json(sanitize(row));
  } catch {
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

router.post("/leads/bulk", requireAuth, async (req: any, res) => {
  const { leads: inputLeads } = req.body as { leads: any[] };
  const userId: string = req.userId;
  if (!Array.isArray(inputLeads) || inputLeads.length === 0) {
    return void res.status(400).json({ error: "leads array required" });
  }
  if (inputLeads.length > 500) {
    return void res.status(400).json({ error: "Maximum 500 leads per bulk import" });
  }
  try {
    const values = inputLeads.map((lead) => {
      const { id: _id, createdAt: _c, updatedAt: _u, createdById: _cb, ...body } = lead;
      return { ...body, createdById: userId };
    });

    // Deduplicate by email against existing leads owned by this user
    const emails = values.map((v) => v.email).filter(Boolean) as string[];
    const existingEmails = new Set<string>();
    if (emails.length > 0) {
      const existing = await db
        .select({ email: leadsTable.email })
        .from(leadsTable)
        .where(
          and(
            inArray(leadsTable.email, emails),
            eq(leadsTable.createdById, userId)
          )
        );
      existing.forEach((r) => { if (r.email) existingEmails.add(r.email.toLowerCase()); });
    }

    // Also deduplicate within the batch itself (keep first occurrence per email)
    const seenEmails = new Set<string>();
    const deduped = values.filter((v) => {
      const key = v.email?.toLowerCase() ?? "";
      if (!key) return true; // no email — always allow
      if (existingEmails.has(key) || seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    });
    const skipped = values.length - deduped.length;

    if (deduped.length === 0) {
      return void res.status(200).json({ created: [], errors: [], skipped, message: "All leads already exist — no duplicates imported." });
    }

    const created = await db.insert(leadsTable).values(deduped).returning();
    const sanitized = created.map(sanitize);

    // Fire triggers asynchronously — don't block the response
    Promise.allSettled(
      created.map((row) => Promise.allSettled([
        fireTrigger({
          triggerType: "lead_created",
          leadId: row.id,
          lead: row,
          userId: userId ?? undefined,
          newStatus: row.status,
        }),
        createNotification({
          userId,
          type: "lead",
          title: `Lead imported — ${row.name}`,
          body: row.source ? `Source: ${row.source}` : "A new lead was bulk imported.",
          actionUrl: `/dashboard/leads/${row.id}`,
          metadata: { leadId: row.id },
        }),
      ]))
    ).catch(() => {});

    res.status(201).json({ created: sanitized, errors: [], skipped });
  } catch (err: any) {
    console.error("Bulk import error:", err);
    res.status(500).json({ error: "Bulk import failed", message: err?.message });
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
          AND ${leadsTable.createdById} = ${userId}`
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
      .where(sql`${leadsTable.id} = ${id} AND ${leadsTable.createdById} = ${userId}`);
    const { id: _id, createdAt: _c, updatedAt: _u, createdById: _cb, ...body } = req.body;
    const [row] = await db
      .update(leadsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(sql`${leadsTable.id} = ${id} AND ${leadsTable.createdById} = ${userId}`)
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
      .where(sql`${leadsTable.id} = ${id} AND ${leadsTable.createdById} = ${userId}`);
    const { id: _id, createdAt: _c, updatedAt: _u, createdById: _cb, ...body } = req.body;
    const [row] = await db
      .update(leadsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(sql`${leadsTable.id} = ${id} AND ${leadsTable.createdById} = ${userId}`)
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
      sql`${leadsTable.id} = ${id} AND ${leadsTable.createdById} = ${userId}`
    );
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

export default router;
