import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/api/admin/audit-logs", requireAuth, requireSuperAdmin, async (req, res) => {
  const { action, orgId, page = "1" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limit = 50;
  const offset = (pageNum - 1) * limit;
  try {
    const rows = await db.execute(sql`
      SELECT al.*, o.name as org_name
      FROM audit_logs al
      LEFT JOIN organizations o ON o.id = al.organization_id
      WHERE (${action ? sql`al.action ILIKE ${'%' + action + '%'}` : sql`true`})
        AND (${orgId ? sql`al.organization_id = ${parseInt(orgId)}` : sql`true`})
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = await db.execute(sql`SELECT COUNT(*) FROM audit_logs`);
    return res.json({ data: rows.rows, total: Number((total.rows[0] as any).count) });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
