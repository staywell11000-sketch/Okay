import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "murtazaarshad499@gmail.com";

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const userEmail = (req as any).userEmail as string | undefined;
  const userId = (req as any).userId as string | undefined;

  // Fast path: known super admin email
  if (userEmail === SUPER_ADMIN_EMAIL) {
    (req as any).isSuperAdmin = true;
    return next();
  }

  // DB check: role = super_admin
  try {
    const rows = await db.execute(sql`
      SELECT role FROM users WHERE id = ${userId}
    `);
    if (rows.rows.length && (rows.rows[0] as any).role === "super_admin") {
      (req as any).isSuperAdmin = true;
      return next();
    }
  } catch {
    // fall through to 403
  }

  return res.status(403).json({ error: "Forbidden: Super Admin access required" });
}
