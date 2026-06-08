import { pgTable, serial, varchar, text } from "drizzle-orm/pg-core";

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  description: text("description"),
});

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export const RESOURCES = [
  "dashboard",
  "leads",
  "messages",
  "properties",
  "dealers",
  "analytics",
  "ai_intelligence",
  "automations",
  "team",
  "deals",
  "documents",
  "calendar",
  "settings",
] as const;

export const ACTIONS = ["view", "create", "edit", "delete"] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
