import { pgTable, serial, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  plan: varchar("plan", { length: 50 }).notNull().default("starter"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).notNull().default("trial"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndDate: timestamp("trial_end_date"),
  isInternal: boolean("is_internal").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  aiRequestsUsed: integer("ai_requests_used").notNull().default(0),
  aiRequestsResetAt: timestamp("ai_requests_reset_at"),
  supportAccessEnabled: boolean("support_access_enabled").notNull().default(false),
  supportAccessEnabledBy: varchar("support_access_enabled_by", { length: 255 }),
  supportAccessEnabledAt: timestamp("support_access_enabled_at"),
  logoUrl: text("logo_url"),
  businessPhone: varchar("business_phone", { length: 50 }),
  businessEmail: varchar("business_email", { length: 255 }),
  businessAddress: text("business_address"),
  businessWebsite: varchar("business_website", { length: 500 }),
  businessType: varchar("business_type", { length: 100 }),
  agentCount: varchar("agent_count", { length: 50 }),
  primaryLeadSource: varchar("primary_lead_source", { length: 100 }),
  crmUse: varchar("crm_use", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
