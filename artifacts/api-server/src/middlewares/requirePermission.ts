import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { DEFAULT_ROLE_PERMISSIONS } from "@workspace/db";
import { logger } from "../lib/logger";

export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const userRow = await db.execute(sql`
        SELECT role, org_role, organization_id, is_active
        FROM users WHERE id = ${userId} LIMIT 1
      `);
      const user = userRow.rows[0] as any;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      if (!user.is_active) {
        return res.status(403).json({ error: "Account is deactivated", code: "ACCOUNT_INACTIVE" });
      }

      if (user.role === "super_admin") return next();

      if (!user.organization_id) {
        return res.status(403).json({ error: "No organization", code: "NO_ORG" });
      }

      const orgRow = await db.execute(sql`
        SELECT owner_id FROM organizations WHERE id = ${user.organization_id} LIMIT 1
      `);
      const org = orgRow.rows[0] as any;
      if (org?.owner_id === userId) return next();

      const userPerm = await db.execute(sql`
        SELECT granted FROM user_permissions
        WHERE user_id = ${userId} AND resource = ${resource} AND action = ${action}
        LIMIT 1
      `);
      if (userPerm.rows.length > 0) {
        const granted = (userPerm.rows[0] as any).granted;
        if (!granted) {
          return res.status(403).json({ error: "Access denied", code: "PERMISSION_DENIED" });
        }
        return next();
      }

      const orgRole = user.org_role ?? "agent";

      const rolePerm = await db.execute(sql`
        SELECT id FROM role_permissions
        WHERE organization_id = ${user.organization_id}
          AND role_name = ${orgRole}
          AND resource = ${resource}
          AND action = ${action}
        LIMIT 1
      `);
      if (rolePerm.rows.length > 0) return next();

      const defaults = DEFAULT_ROLE_PERMISSIONS[orgRole] ?? DEFAULT_ROLE_PERMISSIONS.agent;
      const hasDefault = defaults.some(
        (p) => p.resource === resource && p.action === action
      );
      if (hasDefault) return next();

      return res.status(403).json({ error: "Access denied", code: "PERMISSION_DENIED" });
    } catch (err) {
      logger.error({ err }, "requirePermission error");
      return res.status(500).json({ error: "Server error" });
    }
  };
}

export async function getEffectivePermissions(
  userId: string,
  organizationId: number,
  orgRole: string
): Promise<Array<{ resource: string; action: string }>> {
  const rolePerms = await db.execute(sql`
    SELECT resource, action FROM role_permissions
    WHERE organization_id = ${organizationId} AND role_name = ${orgRole}
  `);

  let perms: Array<{ resource: string; action: string }>;
  if (rolePerms.rows.length > 0) {
    perms = rolePerms.rows as any[];
  } else {
    perms = [...(DEFAULT_ROLE_PERMISSIONS[orgRole] ?? DEFAULT_ROLE_PERMISSIONS.agent)];
  }

  const userPerms = await db.execute(sql`
    SELECT resource, action, granted FROM user_permissions WHERE user_id = ${userId}
  `);

  for (const up of userPerms.rows as any[]) {
    if (up.granted) {
      if (!perms.some((p) => p.resource === up.resource && p.action === up.action)) {
        perms.push({ resource: up.resource, action: up.action });
      }
    } else {
      perms = perms.filter((p) => !(p.resource === up.resource && p.action === up.action));
    }
  }

  return perms;
}
