import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type FeatureClass = "A" | "B" | "C";

// ── Feature → Class classification ──────────────────────────────────────────
// Users never see this. Backend auto-routes to best model for each feature.
export const FEATURE_CLASS_MAP: Record<string, FeatureClass> = {
  // Class A — Fast & Cheap (simple text generation)
  lead_summary:            "A",
  reply_suggestion:        "A",
  "reply-suggestions":     "A",
  conversation_summary:    "A",
  "conversation-summary":  "A",
  property_matching:       "A",
  "property-matching":     "A",

  // Class B — Balanced Intelligence (structured analysis)
  "analyze-lead":          "B",
  analyze_lead:            "B",
  "deal-insights":         "B",
  deal_insights:           "B",
  "risk-detection":        "B",
  risk_detection:          "B",

  // Class C — Maximum Intelligence (complex, strategic)
  chat:                    "C",
  "ai-chat":               "C",
  "sales-insights":        "C",
  sales_insights:          "C",
  "business-insights":     "C",
  business_insights:       "C",
  "analyze-all":           "C",
  analyze_all:             "C",
  pipeline_forecast:       "C",
  automation_task:         "C",
};

export const CLASS_INFO: Record<FeatureClass, { label: string; description: string; features: string[] }> = {
  A: {
    label: "Class A — Fast & Efficient",
    description: "Simple generation tasks optimised for speed.",
    features: ["Lead Summaries", "Reply Suggestions", "Conversation Summaries", "Property Matching"],
  },
  B: {
    label: "Class B — Balanced Intelligence",
    description: "Analysis tasks requiring moderate reasoning and structured output.",
    features: ["Lead Analysis", "Deal Insights", "Risk Detection"],
  },
  C: {
    label: "Class C — Maximum Intelligence",
    description: "Complex strategic tasks requiring the deepest reasoning.",
    features: ["AI Assistant Chat", "Sales Insights", "Business Insights", "Bulk Analysis"],
  },
};

export const AVAILABLE_MODELS = [
  { value: "gpt-4o-mini", label: "AI Model — Standard", description: "Fast and cost-effective for most tasks" },
  { value: "gpt-4o",      label: "AI Model — Advanced", description: "Best quality for complex reasoning" },
  { value: "gpt-4-turbo", label: "AI Model — Enhanced", description: "High intelligence, balanced cost" },
];

// ── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: Record<FeatureClass, string> = {
  A: "gpt-4o-mini",
  B: "gpt-4o-mini",
  C: "gpt-4o-mini",
};

const FALLBACK_CONFIG: Record<FeatureClass, string> = {
  A: "gpt-4o-mini",
  B: "gpt-4o-mini",
  C: "gpt-4o-mini",
};

let configCache: Record<FeatureClass, string> | null = null;
let configCacheTime = 0;
const CONFIG_TTL_MS = 5 * 60 * 1000;

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_model_settings (
      id SERIAL PRIMARY KEY,
      class_a_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      class_b_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      class_c_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    INSERT INTO ai_model_settings (class_a_model, class_b_model, class_c_model)
    SELECT 'gpt-4o-mini','gpt-4o-mini','gpt-4o-mini'
    WHERE NOT EXISTS (SELECT 1 FROM ai_model_settings LIMIT 1)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_observability_log (
      id BIGSERIAL PRIMARY KEY,
      feature TEXT NOT NULL,
      feature_class TEXT,
      model TEXT,
      response_time_ms INTEGER,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      organization_id INTEGER,
      user_id TEXT,
      was_fallback BOOLEAN DEFAULT FALSE,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// Run table setup once on module load
ensureTables().catch(() => {});

export async function getModelConfig(): Promise<Record<FeatureClass, string>> {
  const now = Date.now();
  if (configCache && now - configCacheTime < CONFIG_TTL_MS) return configCache;
  try {
    const result = await db.execute(sql`SELECT * FROM ai_model_settings ORDER BY id LIMIT 1`);
    if (result.rows.length > 0) {
      const row = result.rows[0] as any;
      configCache = {
        A: row.class_a_model ?? DEFAULT_CONFIG.A,
        B: row.class_b_model ?? DEFAULT_CONFIG.B,
        C: row.class_c_model ?? DEFAULT_CONFIG.C,
      };
    } else {
      configCache = { ...DEFAULT_CONFIG };
    }
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  configCacheTime = now;
  return configCache!;
}

export async function updateModelConfig(updates: Partial<Record<FeatureClass, string>>) {
  await ensureTables();
  const current = await getModelConfig();
  const newA = updates.A ?? current.A;
  const newB = updates.B ?? current.B;
  const newC = updates.C ?? current.C;
  await db.execute(sql`
    UPDATE ai_model_settings
    SET class_a_model = ${newA}, class_b_model = ${newB}, class_c_model = ${newC}, updated_at = NOW()
  `);
  configCache = null;
}

export async function getModelForFeature(feature: string): Promise<string> {
  const cls = FEATURE_CLASS_MAP[feature] ?? "B";
  const config = await getModelConfig();
  return config[cls] ?? DEFAULT_CONFIG[cls];
}

// ── Main routed AI call wrapper ───────────────────────────────────────────────
// All AI calls go through this — routing, fallback, and observability are automatic.
export async function routedAiCall<T>(
  feature: string,
  callFn: (model: string) => Promise<{ result: T; usage: any }>,
  orgId?: number,
  userId?: string,
): Promise<{ result: T; usage: any; model: string; responseTimeMs: number }> {
  const model = await getModelForFeature(feature);
  const cls = FEATURE_CLASS_MAP[feature] ?? "B";
  const t0 = Date.now();

  try {
    const { result, usage } = await callFn(model);
    const ms = Date.now() - t0;
    recordObservability(feature, cls, model, ms, usage, orgId, userId, false).catch(() => {});
    return { result, usage, model, responseTimeMs: ms };
  } catch (err) {
    const fallback = FALLBACK_CONFIG[cls];
    if (fallback && fallback !== model) {
      try {
        const { result, usage } = await callFn(fallback);
        const ms = Date.now() - t0;
        recordObservability(feature, cls, fallback, ms, usage, orgId, userId, true).catch(() => {});
        return { result, usage, model: fallback, responseTimeMs: ms };
      } catch {}
    }
    const ms = Date.now() - t0;
    recordObservability(feature, cls, model, ms, null, orgId, userId, false, String(err)).catch(() => {});
    throw err;
  }
}

async function recordObservability(
  feature: string,
  cls: FeatureClass,
  model: string,
  responseTimeMs: number,
  usage: any,
  orgId?: number,
  userId?: string,
  wasFallback = false,
  errorMessage?: string,
) {
  try {
    await db.execute(sql`
      INSERT INTO ai_observability_log
        (feature, feature_class, model, response_time_ms, prompt_tokens, completion_tokens,
         organization_id, user_id, was_fallback, error_message, created_at)
      VALUES (
        ${feature}, ${cls}, ${model}, ${responseTimeMs},
        ${usage?.prompt_tokens ?? 0}, ${usage?.completion_tokens ?? 0},
        ${orgId ?? null}, ${userId ?? null}, ${wasFallback},
        ${errorMessage ?? null}, NOW()
      )
    `);
  } catch {}
}
