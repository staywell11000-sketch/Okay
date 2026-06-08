import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const organizationAiUsage = pgTable(
  "organization_ai_usage",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    actionsUsed: integer("actions_used").notNull().default(0),
    actionsLimit: integer("actions_limit").notNull().default(0),
    bonusActions: integer("bonus_actions").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueOrgMonth: unique().on(t.organizationId, t.month, t.year),
  })
);

export type OrganizationAiUsage = typeof organizationAiUsage.$inferSelect;
export type NewOrganizationAiUsage = typeof organizationAiUsage.$inferInsert;
