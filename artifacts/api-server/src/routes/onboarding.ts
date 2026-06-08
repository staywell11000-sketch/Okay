import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Auto-migrate: add columns and constraints that may not exist yet
async function ensureOnboardingSchema() {
  const migrations: Array<{ label: string; query: string }> = [
    {
      label: "organizations.how_heard",
      query: `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS how_heard VARCHAR(200)`,
    },
    {
      label: "organizations.wants_tour",
      query: `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS wants_tour BOOLEAN DEFAULT false`,
    },
    {
      label: "organizations.onboarding_completed_at",
      query: `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP`,
    },
    {
      label: "users.onboarding_completed_at",
      query: `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP`,
    },
    {
      label: "organizations_owner_id_unique constraint",
      query: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'organizations_owner_id_unique'
          ) THEN
            ALTER TABLE organizations ADD CONSTRAINT organizations_owner_id_unique UNIQUE (owner_id);
          END IF;
        END $$
      `,
    },
  ];

  for (const m of migrations) {
    try {
      await db.execute(sql.raw(m.query));
    } catch (err: any) {
      logger.warn({ label: m.label, err: err?.message }, "ensureOnboardingSchema: non-fatal migration warning");
    }
  }
}
ensureOnboardingSchema();

router.post("/onboarding/complete", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const {
      orgName, businessType, agentCount, primaryLeadSource, crmUse,
      howHeard, wantsTour,
      logoUrl, businessPhone, businessEmail, businessAddress, businessWebsite,
      firstName, lastName, position, phone, avatarUrl,
      theme,
      notifDashboard, notifEmail, notifWhatsapp,
      notifFrequency, notifCategories,
    } = req.body;

    const userRow = await db.execute(sql`SELECT organization_id FROM users WHERE id = ${userId} LIMIT 1`);
    const orgId = (userRow.rows[0] as any)?.organization_id;

    if (orgId) {
      await db.execute(sql`
        UPDATE organizations SET
          name                    = COALESCE(${orgName || null}, name),
          logo_url                = ${logoUrl || null},
          business_phone          = ${businessPhone || null},
          business_email          = ${businessEmail || null},
          business_address        = ${businessAddress || null},
          business_website        = ${businessWebsite || null},
          business_type           = ${businessType || null},
          agent_count             = ${agentCount || null},
          primary_lead_source     = ${primaryLeadSource || null},
          crm_use                 = ${crmUse || null},
          how_heard               = ${howHeard || null},
          wants_tour              = ${wantsTour === true},
          onboarding_completed_at = NOW(),
          updated_at              = NOW()
        WHERE id = ${orgId}
      `);
    }

    await db.execute(sql`
      UPDATE users SET
        first_name              = COALESCE(${firstName || null}, first_name),
        last_name               = COALESCE(${lastName  || null}, last_name),
        phone                   = COALESCE(${phone     || null}, phone),
        avatar_url              = COALESCE(${avatarUrl || null}, avatar_url),
        onboarded               = true,
        onboarding_completed_at = NOW(),
        updated_at              = NOW()
      WHERE id = ${userId}
    `);

    const cats = Array.isArray(notifCategories)
      ? notifCategories.join(",")
      : "new_leads,lead_activity,deal_updates,missed_follow_ups,pipeline_changes,ai_recommendations,system_updates";

    await db.execute(sql`
      INSERT INTO user_settings (
        user_id, business_name, business_logo_url, position, theme,
        notifications_enabled, new_lead_notif, deal_status_notif,
        whatsapp_notif, marketing_emails_enabled, email_notif_enabled,
        notif_frequency, notif_categories,
        created_at, updated_at
      )
      VALUES (
        ${userId},
        ${orgName  || null},
        ${logoUrl  || null},
        ${position || null},
        ${theme    || "gold"},
        ${notifDashboard !== false},
        ${Array.isArray(notifCategories) ? notifCategories.includes("new_leads") : true},
        ${Array.isArray(notifCategories) ? notifCategories.includes("deal_updates") : true},
        ${notifWhatsapp !== false},
        ${notifEmail !== false},
        ${notifEmail !== false},
        ${notifFrequency || "instant"},
        ${cats},
        NOW(), NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        business_name         = COALESCE(EXCLUDED.business_name,     user_settings.business_name),
        business_logo_url     = COALESCE(EXCLUDED.business_logo_url, user_settings.business_logo_url),
        position              = COALESCE(EXCLUDED.position,          user_settings.position),
        theme                 = EXCLUDED.theme,
        notifications_enabled = EXCLUDED.notifications_enabled,
        new_lead_notif        = EXCLUDED.new_lead_notif,
        deal_status_notif     = EXCLUDED.deal_status_notif,
        whatsapp_notif        = EXCLUDED.whatsapp_notif,
        marketing_emails_enabled = EXCLUDED.marketing_emails_enabled,
        email_notif_enabled   = EXCLUDED.email_notif_enabled,
        notif_frequency       = EXCLUDED.notif_frequency,
        notif_categories      = EXCLUDED.notif_categories,
        updated_at            = NOW()
    `);

    logger.info({ userId }, "Onboarding completed");
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Onboarding complete error");
    return res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

router.get("/org/me", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const row = await db.execute(sql`
      SELECT o.id, o.name, o.plan, o.subscription_status, o.logo_url,
             o.business_phone, o.business_email, o.business_address,
             o.business_website, o.business_type, o.agent_count,
             o.primary_lead_source, o.crm_use, o.owner_id
      FROM organizations o
      JOIN users u ON u.organization_id = o.id
      WHERE u.id = ${userId}
      LIMIT 1
    `);
    if (!row.rows.length) return res.status(404).json({ error: "No organization" });
    const org = row.rows[0] as any;
    return res.json({
      id: org.id, name: org.name, plan: org.plan,
      subscriptionStatus: org.subscription_status,
      logoUrl: org.logo_url,
      businessPhone: org.business_phone, businessEmail: org.business_email,
      businessAddress: org.business_address, businessWebsite: org.business_website,
      businessType: org.business_type, agentCount: org.agent_count,
      primaryLeadSource: org.primary_lead_source, crmUse: org.crm_use,
      ownerId: org.owner_id,
    });
  } catch (err) {
    logger.error({ err }, "GET /org/me error");
    return res.status(500).json({ error: "Failed to fetch organization" });
  }
});

router.put("/org/me", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const {
      name, logoUrl, businessPhone, businessEmail,
      businessAddress, businessWebsite, businessType,
      agentCount, primaryLeadSource, crmUse,
    } = req.body;

    const userRow = await db.execute(sql`SELECT organization_id FROM users WHERE id = ${userId} LIMIT 1`);
    const orgId = (userRow.rows[0] as any)?.organization_id;
    if (!orgId) return res.status(403).json({ error: "No organization" });

    const orgRow = await db.execute(sql`SELECT owner_id FROM organizations WHERE id = ${orgId} LIMIT 1`);
    const isOwner = (orgRow.rows[0] as any)?.owner_id === userId;
    const userMeta = await db.execute(sql`SELECT role, org_role FROM users WHERE id = ${userId} LIMIT 1`);
    const meta = userMeta.rows[0] as any;
    const isAdmin = isOwner || meta?.role === "super_admin" || meta?.org_role === "admin";
    if (!isAdmin) return res.status(403).json({ error: "Admin only" });

    await db.execute(sql`
      UPDATE organizations SET
        name                = COALESCE(${name              || null}, name),
        logo_url            = COALESCE(${logoUrl           || null}, logo_url),
        business_phone      = COALESCE(${businessPhone     || null}, business_phone),
        business_email      = COALESCE(${businessEmail     || null}, business_email),
        business_address    = COALESCE(${businessAddress   || null}, business_address),
        business_website    = COALESCE(${businessWebsite   || null}, business_website),
        business_type       = COALESCE(${businessType      || null}, business_type),
        agent_count         = COALESCE(${agentCount        || null}, agent_count),
        primary_lead_source = COALESCE(${primaryLeadSource || null}, primary_lead_source),
        crm_use             = COALESCE(${crmUse            || null}, crm_use),
        updated_at          = NOW()
      WHERE id = ${orgId}
    `);

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "PUT /org/me error");
    return res.status(500).json({ error: "Failed to update organization" });
  }
});

export default router;
