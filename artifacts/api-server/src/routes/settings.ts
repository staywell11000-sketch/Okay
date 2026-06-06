import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { supabaseAdmin } from "../lib/supabase";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ─── GET /api/settings ────────────────────────────────────────────────────────
router.get("/settings", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    // Fetch user + settings in parallel
    const [userResult, settingsResult] = await Promise.all([
      db.execute<{
        id: string; email: string; first_name: string | null; last_name: string | null;
        role: string; title: string | null; phone: string | null; avatar_url: string | null;
      }>(sql`SELECT id, email, first_name, last_name, role, title, phone, avatar_url FROM users WHERE id = ${userId} LIMIT 1`),
      db.execute<{
        id: number; business_name: string | null; business_logo_url: string | null;
        whatsapp_number: string | null; position: string | null; theme: string | null;
        time_format: string | null; notifications_enabled: boolean; new_lead_notif: boolean;
        deal_status_notif: boolean; whatsapp_notif: boolean; weekly_reports_enabled: boolean;
        marketing_emails_enabled: boolean; security_two_factor_enabled: boolean;
      }>(sql`SELECT * FROM user_settings WHERE user_id = ${userId} LIMIT 1`),
    ]);

    const user = userResult.rows[0] ?? null;
    const settings = settingsResult.rows[0] ?? null;

    return res.json({ user, settings });
  } catch (err) {
    console.error("GET /settings error:", err);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// ─── PUT /api/settings ────────────────────────────────────────────────────────
router.put("/settings", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const {
    // User profile fields
    firstName, lastName, phone, title, avatarUrl,
    // Settings fields
    businessName, businessLogoUrl, whatsappNumber, officeAddress, teamSize, position,
    theme, timeFormat,
    notificationsEnabled, newLeadNotif, dealStatusNotif, whatsappNotif,
    weeklyReportsEnabled, marketingEmailsEnabled, securityTwoFactorEnabled,
    preferredLanguage,
  } = req.body;

  try {
    await db.execute(sql`
      UPDATE users SET
        first_name = COALESCE(${firstName ?? null}, first_name),
        last_name  = COALESCE(${lastName  ?? null}, last_name),
        phone      = COALESCE(${phone     ?? null}, phone),
        title      = COALESCE(${title     ?? null}, title),
        avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
        updated_at = NOW()
      WHERE id = ${userId}
    `);

    await db.execute(sql`
      INSERT INTO user_settings (
        user_id, business_name, business_logo_url, whatsapp_number, office_address, team_size, position,
        theme, time_format,
        notifications_enabled, new_lead_notif, deal_status_notif, whatsapp_notif,
        weekly_reports_enabled, marketing_emails_enabled, security_two_factor_enabled,
        preferred_language,
        created_at, updated_at
      ) VALUES (
        ${userId},
        ${businessName    ?? null},
        ${businessLogoUrl ?? null},
        ${whatsappNumber  ?? null},
        ${officeAddress   ?? null},
        ${teamSize        ?? null},
        ${position        ?? null},
        ${theme           ?? "gold"},
        ${timeFormat      ?? "12h"},
        ${notificationsEnabled       ?? true},
        ${newLeadNotif               ?? true},
        ${dealStatusNotif            ?? true},
        ${whatsappNotif              ?? true},
        ${weeklyReportsEnabled       ?? true},
        ${marketingEmailsEnabled     ?? false},
        ${securityTwoFactorEnabled   ?? false},
        ${preferredLanguage          ?? "en"},
        NOW(), NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        business_name              = COALESCE(EXCLUDED.business_name,              user_settings.business_name),
        business_logo_url          = COALESCE(EXCLUDED.business_logo_url,          user_settings.business_logo_url),
        whatsapp_number            = COALESCE(EXCLUDED.whatsapp_number,            user_settings.whatsapp_number),
        office_address             = COALESCE(EXCLUDED.office_address,             user_settings.office_address),
        team_size                  = COALESCE(EXCLUDED.team_size,                  user_settings.team_size),
        position                   = COALESCE(EXCLUDED.position,                   user_settings.position),
        theme                      = EXCLUDED.theme,
        time_format                = EXCLUDED.time_format,
        notifications_enabled      = EXCLUDED.notifications_enabled,
        new_lead_notif             = EXCLUDED.new_lead_notif,
        deal_status_notif          = EXCLUDED.deal_status_notif,
        whatsapp_notif             = EXCLUDED.whatsapp_notif,
        weekly_reports_enabled     = EXCLUDED.weekly_reports_enabled,
        marketing_emails_enabled   = EXCLUDED.marketing_emails_enabled,
        security_two_factor_enabled = EXCLUDED.security_two_factor_enabled,
        preferred_language         = EXCLUDED.preferred_language,
        updated_at                 = NOW()
    `);

    return res.json({ success: true });
  } catch (err) {
    console.error("PUT /settings error:", err);
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

// ─── POST /api/settings/upload ────────────────────────────────────────────────
// Accepts { field: "avatar"|"logo", base64: "...", filename: "photo.jpg" }
// Uploads to Supabase Storage → returns { url }
router.post(
  "/settings/upload",
  requireAuth,
  async (req: any, res) => {
    const { field, base64, filename } = req.body ?? {};
    if (!field || !base64) return res.status(400).json({ error: "Missing field or base64" });
    if (!["avatar", "logo"].includes(field)) return res.status(400).json({ error: "Invalid field" });

    const base64Data = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: "Image too large — maximum size is 5 MB" });
    }

    const ext = (filename as string | undefined)?.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const storagePath = `${field}/${req.userId}.${ext}`;

    try {
      // Create bucket if not exists
      await supabaseAdmin.storage.createBucket("profile-assets", { public: true }).catch(() => {});

      const { error } = await supabaseAdmin.storage
        .from("profile-assets")
        .upload(storagePath, buffer, { upsert: true, contentType: mimeType });

      if (error) return res.status(500).json({ error: error.message });

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from("profile-assets")
        .getPublicUrl(storagePath);

      return res.json({ url: publicUrl });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? "Upload failed" });
    }
  }
);

export default router;
