import { pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("PKR"),
  maxUsers: integer("max_users"),
  maxLeadsPerMonth: integer("max_leads_per_month"),
  maxWhatsappNumbers: integer("max_whatsapp_numbers"),
  maxFacebookPages: integer("max_facebook_pages"),
  maxStorageGb: integer("max_storage_gb"),
  features: jsonb("features").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
