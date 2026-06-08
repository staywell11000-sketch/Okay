import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { supabaseAdmin } from "../lib/supabase";
import { getEffectivePermissions } from "../middlewares/requirePermission";
import { DEFAULT_ROLE_PERMISSIONS } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function assertAdmin(userId: string, res: any): Promise<{ orgId: number } | null> {
  const userRow = await db.execute(sql`
    SELECT role, org_role, organization_id FROM users WHERE id = ${userId} LIMIT 1
  `);
  const user = userRow.rows[0] as any;
  if (!user?.organization_id) {
    res.status(403).json({ error: "No organization" });
    return null;
  }
  const orgRow = await db.execute(sql`
    SELECT owner_id FROM organizations WHERE id = ${user.organization_id} LIMIT 1
  `);
  const org = orgRow.rows[0] as any;
  const isAdmin =
    org?.owner_id === userId ||
    user.role === "super_admin" ||
    user.org_role === "admin";
  if (!isAdmin) {
    res.status(403).json({ error: "Access denied. Admin only." });
    return null;
  }
  return { orgId: user.organization_id };
}

router.get("/org/members", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const userRow = await db.execute(sql`
      SELECT role, org_role, organization_id FROM users WHERE id = ${userId} LIMIT 1
    `);
    const user = userRow.rows[0] as any;
    if (!user?.organization_id) return res.status(403).json({ error: "No organization" });

    const rows = await db.execute(sql`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role, u.org_role,
        u.is_active, u.invited_by, u.created_at, u.avatar_url,
        o.owner_id
      FROM users u
      JOIN organizations o ON o.id = ${user.organization_id}
      WHERE u.organization_id = ${user.organization_id}
      ORDER BY u.created_at ASC
    `);

    const ownerId = rows.rows.length > 0 ? (rows.rows[0] as any).owner_id : null;

    const members = (rows.rows as any[]).map((m) => ({
      id: m.id,
      email: m.email,
      firstName: m.first_name,
      lastName: m.last_name,
      name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email,
      role: m.role,
      orgRole: m.org_role ?? "agent",
      isActive: m.is_active,
      isOwner: m.id === ownerId,
      avatarUrl: m.avatar_url,
      createdAt: m.created_at,
    }));

    return res.json(members);
  } catch (err) {
    logger.error({ err }, "Get org members error");
    return res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.patch("/org/members/:memberId/status", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const memberId = req.params.memberId;
  try {
    const ctx = await assertAdmin(userId, res);
    if (!ctx) return;

    const { isActive } = req.body as { isActive: boolean };
    if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive must be boolean" });

    const memberCheck = await db.execute(sql`
      SELECT id FROM users WHERE id = ${memberId} AND organization_id = ${ctx.orgId} LIMIT 1
    `);
    if (!memberCheck.rows.length) return res.status(404).json({ error: "Member not found" });

    if (memberId === userId) return res.status(400).json({ error: "Cannot change your own status" });

    const orgRow = await db.execute(sql`SELECT owner_id FROM organizations WHERE id = ${ctx.orgId} LIMIT 1`);
    if ((orgRow.rows[0] as any)?.owner_id === memberId) {
      return res.status(400).json({ error: "Cannot deactivate the organization owner" });
    }

    await db.execute(sql`
      UPDATE users SET is_active = ${isActive}, updated_at = NOW() WHERE id = ${memberId}
    `);

    return res.json({ ok: true, isActive });
  } catch (err) {
    logger.error({ err }, "Update member status error");
    return res.status(500).json({ error: "Failed to update member status" });
  }
});

router.patch("/org/members/:memberId/role", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const memberId = req.params.memberId;
  try {
    const ctx = await assertAdmin(userId, res);
    if (!ctx) return;

    const { orgRole } = req.body as { orgRole: string };
    if (!orgRole) return res.status(400).json({ error: "orgRole is required" });

    const allowed = ["admin", "manager", "agent", "custom"];
    if (!allowed.includes(orgRole)) return res.status(400).json({ error: "Invalid role" });

    const memberCheck = await db.execute(sql`
      SELECT id FROM users WHERE id = ${memberId} AND organization_id = ${ctx.orgId} LIMIT 1
    `);
    if (!memberCheck.rows.length) return res.status(404).json({ error: "Member not found" });

    await db.execute(sql`
      UPDATE users SET org_role = ${orgRole}, updated_at = NOW() WHERE id = ${memberId}
    `);

    return res.json({ ok: true, orgRole });
  } catch (err) {
    logger.error({ err }, "Update member role error");
    return res.status(500).json({ error: "Failed to update member role" });
  }
});

router.post("/org/members/:memberId/password-reset", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const memberId = req.params.memberId;
  try {
    const ctx = await assertAdmin(userId, res);
    if (!ctx) return;

    const memberRow = await db.execute(sql`
      SELECT email FROM users WHERE id = ${memberId} AND organization_id = ${ctx.orgId} LIMIT 1
    `);
    if (!memberRow.rows.length) return res.status(404).json({ error: "Member not found" });

    const email = (memberRow.rows[0] as any).email;
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    return res.json({ ok: true, message: "Password reset link generated. The user will receive an email." });
  } catch (err) {
    logger.error({ err }, "Password reset error");
    return res.status(500).json({ error: "Failed to trigger password reset" });
  }
});

router.get("/permissions/my-permissions", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const userRow = await db.execute(sql`
      SELECT role, org_role, organization_id FROM users WHERE id = ${userId} LIMIT 1
    `);
    const user = userRow.rows[0] as any;

    if (user?.role === "super_admin") {
      const all: Array<{ resource: string; action: string }> = [];
      for (const perms of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
        for (const p of perms as any[]) {
          if (!all.some((x) => x.resource === p.resource && x.action === p.action)) {
            all.push(p);
          }
        }
      }
      return res.json({ permissions: all, isAdmin: true, orgRole: "admin" });
    }

    if (!user?.organization_id) {
      return res.json({ permissions: [], isAdmin: false, orgRole: "agent" });
    }

    const orgRow = await db.execute(sql`
      SELECT owner_id FROM organizations WHERE id = ${user.organization_id} LIMIT 1
    `);
    const org = orgRow.rows[0] as any;
    const isOwner = org?.owner_id === userId;

    if (isOwner) {
      return res.json({
        permissions: DEFAULT_ROLE_PERMISSIONS.admin,
        isAdmin: true,
        orgRole: "admin",
      });
    }

    const orgRole = user.org_role ?? "agent";
    const perms = await getEffectivePermissions(userId, user.organization_id, orgRole);

    return res.json({
      permissions: perms,
      isAdmin: orgRole === "admin",
      orgRole,
    });
  } catch (err) {
    logger.error({ err }, "Get my permissions error");
    return res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

router.get("/permissions/roles", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const userRow = await db.execute(sql`
      SELECT role, org_role, organization_id FROM users WHERE id = ${userId} LIMIT 1
    `);
    const user = userRow.rows[0] as any;
    if (!user?.organization_id) return res.status(403).json({ error: "No organization" });

    const rows = await db.execute(sql`
      SELECT role_name, resource, action FROM role_permissions
      WHERE organization_id = ${user.organization_id}
      ORDER BY role_name, resource, action
    `);

    const hasCustom = rows.rows.length > 0;
    const result: Record<string, Array<{ resource: string; action: string }>> = {};

    if (hasCustom) {
      for (const r of rows.rows as any[]) {
        if (!result[r.role_name]) result[r.role_name] = [];
        result[r.role_name].push({ resource: r.resource, action: r.action });
      }
    } else {
      for (const [roleName, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        result[roleName] = perms as any[];
      }
    }

    return res.json({ roles: result, hasCustomized: hasCustom });
  } catch (err) {
    logger.error({ err }, "Get role permissions error");
    return res.status(500).json({ error: "Failed to fetch role permissions" });
  }
});

router.put("/permissions/roles/:roleName", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const roleName = req.params.roleName;
  try {
    const ctx = await assertAdmin(userId, res);
    if (!ctx) return;

    if (roleName === "admin") {
      return res.status(400).json({ error: "Admin role permissions cannot be modified" });
    }

    const { permissions } = req.body as {
      permissions: Array<{ resource: string; action: string }>;
    };

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "permissions must be an array" });
    }

    await db.execute(sql`
      DELETE FROM role_permissions WHERE organization_id = ${ctx.orgId} AND role_name = ${roleName}
    `);

    for (const p of permissions) {
      await db.execute(sql`
        INSERT INTO role_permissions (organization_id, role_name, resource, action, created_at)
        VALUES (${ctx.orgId}, ${roleName}, ${p.resource}, ${p.action}, NOW())
      `);
    }

    return res.json({ ok: true, roleName, count: permissions.length });
  } catch (err) {
    logger.error({ err }, "Update role permissions error");
    return res.status(500).json({ error: "Failed to update role permissions" });
  }
});

router.get("/permissions/users/:memberId", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const memberId = req.params.memberId;
  try {
    const ctx = await assertAdmin(userId, res);
    if (!ctx) return;

    const memberCheck = await db.execute(sql`
      SELECT id FROM users WHERE id = ${memberId} AND organization_id = ${ctx.orgId} LIMIT 1
    `);
    if (!memberCheck.rows.length) return res.status(404).json({ error: "Member not found" });

    const rows = await db.execute(sql`
      SELECT resource, action, granted FROM user_permissions WHERE user_id = ${memberId}
    `);

    return res.json(rows.rows);
  } catch (err) {
    logger.error({ err }, "Get user permissions error");
    return res.status(500).json({ error: "Failed to fetch user permissions" });
  }
});

router.put("/permissions/users/:memberId", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const memberId = req.params.memberId;
  try {
    const ctx = await assertAdmin(userId, res);
    if (!ctx) return;

    const memberCheck = await db.execute(sql`
      SELECT id FROM users WHERE id = ${memberId} AND organization_id = ${ctx.orgId} LIMIT 1
    `);
    if (!memberCheck.rows.length) return res.status(404).json({ error: "Member not found" });

    const { permissions } = req.body as {
      permissions: Array<{ resource: string; action: string; granted: boolean }>;
    };
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "permissions must be an array" });
    }

    await db.execute(sql`DELETE FROM user_permissions WHERE user_id = ${memberId}`);

    for (const p of permissions) {
      await db.execute(sql`
        INSERT INTO user_permissions (user_id, resource, action, granted, created_at)
        VALUES (${memberId}, ${p.resource}, ${p.action}, ${p.granted}, NOW())
      `);
    }

    return res.json({ ok: true, count: permissions.length });
  } catch (err) {
    logger.error({ err }, "Update user permissions error");
    return res.status(500).json({ error: "Failed to update user permissions" });
  }
});

export default router;
