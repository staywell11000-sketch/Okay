import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "murtazaarshad499@gmail.com";

// ── Plan allowances (AI Actions per month) ─────────────────────────────────
export const PLAN_AI_ACTIONS: Record<string, number> = {
  free: 0,
  trial: 50,
  starter: 300,
  professional: 1500,
  agency: 10000,
};

// ── AI Action costs per feature ────────────────────────────────────────────
export const AI_ACTION_COSTS: Record<string, number> = {
  lead_summary:          1,
  reply_suggestion:      1,
  conversation_summary:  1,
  ai_chat:               2,
  analyze_lead:          3,
  property_matching:     3,
  deal_insights:         5,
  business_insights:     5,
  risk_detection:        5,
  market_analysis:       5,
  automation_task:       5,
  analyze_all:           10,
  pipeline_forecast:     10,
  bulk_analysis:         10,
};

// ── AI Booster packs ───────────────────────────────────────────────────────
export const AI_BOOSTER_PACKS: Record<string, { actions: number; price: number; label: string }> = {
  ai_booster_500:  { actions: 500,   price: 2000,  label: "AI Booster 500" },
  ai_booster_2000: { actions: 2000,  price: 6000,  label: "AI Booster 2,000" },
  ai_booster_5000: { actions: 5000,  price: 12000, label: "AI Booster 5,000" },
};

export function isAiBooster(plan: string): boolean {
  return plan in AI_BOOSTER_PACKS;
}

// ── Find or create the current month's usage row ───────────────────────────
export async function getOrCreateUsageRow(orgId: number, plan: string): Promise<any> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const actionsLimit = PLAN_AI_ACTIONS[plan] ?? 0;

  const existing = await db.execute(sql`
    SELECT * FROM organization_ai_usage
    WHERE organization_id = ${orgId} AND month = ${month} AND year = ${year}
    LIMIT 1
  `);
  if (existing.rows.length > 0) {
    // Update limit in case plan changed
    if (Number((existing.rows[0] as any).actions_limit) !== actionsLimit) {
      await db.execute(sql`
        UPDATE organization_ai_usage
        SET actions_limit = ${actionsLimit}, updated_at = NOW()
        WHERE organization_id = ${orgId} AND month = ${month} AND year = ${year}
      `);
      (existing.rows[0] as any).actions_limit = actionsLimit;
    }
    return existing.rows[0];
  }

  // New month — carry over bonus_actions from the previous row
  const prevRow = await db.execute(sql`
    SELECT bonus_actions FROM organization_ai_usage
    WHERE organization_id = ${orgId}
    ORDER BY year DESC, month DESC
    LIMIT 1
  `);
  const prevBonus = Number((prevRow.rows[0] as any)?.bonus_actions ?? 0);

  const inserted = await db.execute(sql`
    INSERT INTO organization_ai_usage
      (organization_id, month, year, actions_used, actions_limit, bonus_actions, created_at, updated_at)
    VALUES (${orgId}, ${month}, ${year}, 0, ${actionsLimit}, ${prevBonus}, NOW(), NOW())
    ON CONFLICT (organization_id, month, year) DO UPDATE SET
      actions_limit = EXCLUDED.actions_limit,
      updated_at = NOW()
    RETURNING *
  `);
  return inserted.rows[0];
}

// ── Middleware ─────────────────────────────────────────────────────────────
export async function requireAiCredits(req: Request, res: Response, next: NextFunction) {
  const userEmail = (req as any).userEmail as string | undefined;
  const userId   = (req as any).userId   as string;

  if (userEmail === SUPER_ADMIN_EMAIL) return next();
  try {
    const row = await db.execute(sql`SELECT role FROM users WHERE id = ${userId}`);
    if ((row.rows[0] as any)?.role === "super_admin") return next();
  } catch {}

  try {
    const orgRow = await db.execute(sql`
      SELECT o.id, o.plan, o.subscription_status
      FROM organizations o
      WHERE o.owner_id = ${userId}
         OR o.id = (SELECT organization_id FROM users WHERE id = ${userId})
      LIMIT 1
    `);

    if (!orgRow.rows.length) {
      return res.status(403).json({
        error: "ai_no_org",
        message: "No organization found.",
      });
    }

    const org = orgRow.rows[0] as any;

    if (org.plan === "free") {
      return res.status(403).json({
        error: "ai_plan_upgrade_required",
        message: "Upgrade your plan to unlock AI features.",
        requirePlan: "starter",
      });
    }

    const usage = await getOrCreateUsageRow(org.id, org.plan);
    const actionsUsed   = Number(usage.actions_used  ?? 0);
    const actionsLimit  = Number(usage.actions_limit ?? 0);
    const bonusActions  = Number(usage.bonus_actions ?? 0);
    const planRemaining = Math.max(0, actionsLimit - actionsUsed);
    const totalAvailable = planRemaining + bonusActions;

    if (totalAvailable <= 0) {
      return res.status(429).json({
        error: "ai_actions_exhausted",
        message: "You have used all your included AI Actions for this month.",
        planIncluded: actionsLimit,
        used: actionsUsed,
        bonusActions,
        totalAvailable: 0,
      });
    }

    (req as any).orgId             = org.id;
    (req as any).orgPlan           = org.plan;
    (req as any).aiActionsAvailable = totalAvailable;
    next();
  } catch {
    next(); // don't block on middleware errors
  }
}

// ── Consume AI Actions after a successful AI call ─────────────────────────
export async function consumeAiActions(
  orgId: number,
  userId: string,
  feature: string,
  actionCost: number,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; estimated_cost: number; model: string }
) {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const rowResult = await db.execute(sql`
      SELECT * FROM organization_ai_usage
      WHERE organization_id = ${orgId} AND month = ${month} AND year = ${year}
      LIMIT 1
    `);
    if (!rowResult.rows.length) return;

    const row = rowResult.rows[0] as any;
    const planRemaining = Math.max(0, Number(row.actions_limit) - Number(row.actions_used));

    if (planRemaining >= actionCost) {
      // All from plan allowance
      await db.execute(sql`
        UPDATE organization_ai_usage
        SET actions_used = actions_used + ${actionCost}, updated_at = NOW()
        WHERE organization_id = ${orgId} AND month = ${month} AND year = ${year}
      `);
    } else if (planRemaining > 0) {
      // Part plan, part bonus
      const bonusNeeded = actionCost - planRemaining;
      await db.execute(sql`
        UPDATE organization_ai_usage
        SET actions_used = actions_limit,
            bonus_actions = GREATEST(0, bonus_actions - ${bonusNeeded}),
            updated_at = NOW()
        WHERE organization_id = ${orgId} AND month = ${month} AND year = ${year}
      `);
    } else {
      // All from bonus
      await db.execute(sql`
        UPDATE organization_ai_usage
        SET bonus_actions = GREATEST(0, bonus_actions - ${actionCost}), updated_at = NOW()
        WHERE organization_id = ${orgId} AND month = ${month} AND year = ${year}
      `);
    }

    // Log to ai_usage for internal cost tracking
    await db.execute(sql`
      INSERT INTO ai_usage (organization_id, user_id, feature, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, created_at)
      VALUES (${orgId}, ${userId}, ${feature}, ${usage.model}, ${usage.prompt_tokens}, ${usage.completion_tokens}, ${usage.total_tokens}, ${usage.estimated_cost}, NOW())
    `);
  } catch {}
}

// ── Add bonus actions to an org (when booster purchased) ─────────────────
export async function addBonusActions(orgId: number, bonusAmount: number) {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Ensure row exists first
  await db.execute(sql`
    INSERT INTO organization_ai_usage (organization_id, month, year, actions_used, actions_limit, bonus_actions, created_at, updated_at)
    VALUES (${orgId}, ${month}, ${year}, 0, 0, ${bonusAmount}, NOW(), NOW())
    ON CONFLICT (organization_id, month, year) DO UPDATE SET
      bonus_actions = organization_ai_usage.bonus_actions + ${bonusAmount},
      updated_at = NOW()
  `);
}
