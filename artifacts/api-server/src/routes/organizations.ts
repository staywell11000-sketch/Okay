import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ── GET /api/org/me — get current user's organization ──────────────────────
router.get("/api/org/me", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const rows = await db.execute(sql`
      SELECT o.*, p.name as plan_name, p.price_monthly, p.max_users, p.max_leads_per_month,
             p.max_whatsapp_numbers, p.max_facebook_pages, p.max_storage_gb, p.features
      FROM organizations o
      LEFT JOIN plans p ON p.slug = o.plan
      WHERE o.owner_id = ${userId}
         OR o.id = (SELECT organization_id FROM users WHERE id = ${userId})
      LIMIT 1
    `);
    if (!rows.rows.length) return res.status(404).json({ error: "No organization found" });
    return res.json({ organization: rows.rows[0] });
  } catch (err) {
    logger.error({ err }, "GET /api/org/me error");
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/admin/organizations — super admin list all ────────────────────
router.get("/api/admin/organizations", requireAuth, requireSuperAdmin, async (req, res) => {
  const { search, status, page = "1" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limit = 50;
  const offset = (pageNum - 1) * limit;
  try {
    const rows = await db.execute(sql`
      SELECT o.*, p.name as plan_name, p.price_monthly,
             u.email as owner_email, u.first_name as owner_first_name, u.last_name as owner_last_name,
             (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as member_count,
             (SELECT COUNT(*) FROM leads WHERE created_by_id IN (SELECT id FROM users WHERE organization_id = o.id)) as lead_count
      FROM organizations o
      LEFT JOIN plans p ON p.slug = o.plan
      LEFT JOIN users u ON u.id = o.owner_id
      WHERE (${search ? sql`o.name ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'}` : sql`true`})
        AND (${status && status !== 'all' ? sql`o.subscription_status = ${status}` : sql`true`})
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = await db.execute(sql`SELECT COUNT(*) FROM organizations`);
    return res.json({ data: rows.rows, total: Number((total.rows[0] as any).count), page: pageNum });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/organizations error");
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/admin/organizations/:id ───────────────────────────────────────
router.get("/api/admin/organizations/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db.execute(sql`
      SELECT o.*, p.name as plan_name, p.price_monthly, p.features,
             u.email as owner_email, u.first_name as owner_first_name, u.last_name as owner_last_name
      FROM organizations o
      LEFT JOIN plans p ON p.slug = o.plan
      LEFT JOIN users u ON u.id = o.owner_id
      WHERE o.id = ${parseInt(id)}
    `);
    if (!rows.rows.length) return res.status(404).json({ error: "Not found" });
    return res.json({ organization: rows.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /api/admin/organizations/:id ─────────────────────────────────────
router.patch("/api/admin/organizations/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const actorId = (req as any).userId;
  const actorEmail = (req as any).userEmail;
  const { plan, subscriptionStatus, subscriptionEndDate, isSuspended, isInternal } = req.body;
  try {
    await db.execute(sql`
      UPDATE organizations SET
        plan = COALESCE(${plan ?? null}, plan),
        subscription_status = COALESCE(${subscriptionStatus ?? null}, subscription_status),
        subscription_end_date = COALESCE(${subscriptionEndDate ? new Date(subscriptionEndDate) : null}, subscription_end_date),
        is_suspended = COALESCE(${isSuspended ?? null}, is_suspended),
        is_internal = COALESCE(${isInternal ?? null}, is_internal),
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `);
    await db.execute(sql`
      INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, organization_id, meta, created_at)
      VALUES (${actorId}, ${actorEmail}, 'org.updated', 'organization', ${id}, ${parseInt(id)}, ${JSON.stringify(req.body)}, NOW())
    `);
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "PATCH /api/admin/organizations/:id error");
    return res.status(500).json({ error: "Server error" });
  }
});

// ── POST /api/admin/organizations/:id/approve-subscription ─────────────────
router.post("/api/admin/organizations/:id/approve-subscription", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const actorId = (req as any).userId;
  const actorEmail = (req as any).userEmail;
  const { plan, months = 1 } = req.body;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30 * Number(months));
  try {
    await db.execute(sql`
      UPDATE organizations SET
        plan = COALESCE(${plan ?? null}, plan),
        subscription_status = 'active',
        subscription_end_date = ${endDate},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `);
    await db.execute(sql`
      INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, organization_id, meta, created_at)
      VALUES (${actorId}, ${actorEmail}, 'subscription.approved', 'organization', ${id}, ${parseInt(id)},
              ${JSON.stringify({ plan, months, endDate })}, NOW())
    `);
    return res.json({ success: true, subscriptionEndDate: endDate });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ── POST /api/admin/organizations/:id/suspend ──────────────────────────────
router.post("/api/admin/organizations/:id/suspend", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const actorId = (req as any).userId;
  const actorEmail = (req as any).userEmail;
  try {
    await db.execute(sql`UPDATE organizations SET is_suspended = true, updated_at = NOW() WHERE id = ${parseInt(id)}`);
    await db.execute(sql`
      INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, organization_id, created_at)
      VALUES (${actorId}, ${actorEmail}, 'org.suspended', 'organization', ${id}, ${parseInt(id)}, NOW())
    `);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ── POST /api/admin/organizations/:id/unsuspend ────────────────────────────
router.post("/api/admin/organizations/:id/unsuspend", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const actorId = (req as any).userId;
  const actorEmail = (req as any).userEmail;
  try {
    await db.execute(sql`UPDATE organizations SET is_suspended = false, updated_at = NOW() WHERE id = ${parseInt(id)}`);
    await db.execute(sql`
      INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, organization_id, created_at)
      VALUES (${actorId}, ${actorEmail}, 'org.unsuspended', 'organization', ${id}, ${parseInt(id)}, NOW())
    `);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/admin/stats ───────────────────────────────────────────────────
router.get("/api/admin/stats", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM organizations) as total_orgs,
        (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active') as active_orgs,
        (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'trial') as trial_orgs,
        (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'expired') as expired_orgs,
        (SELECT COUNT(*) FROM organizations WHERE is_suspended = true) as suspended_orgs,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM payment_requests WHERE status = 'pending') as pending_payments,
        (SELECT COUNT(*) FROM payment_requests WHERE status = 'approved') as approved_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payment_requests WHERE status = 'approved') as total_revenue
    `);
    return res.json({ stats: stats.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
