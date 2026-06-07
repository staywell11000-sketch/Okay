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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
