import { pgTable, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("agent"),
  title: varchar("title", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  avatarUrl: text("avatar_url"),
  onboarded: boolean("onboarded").notNull().default(false),
  organizationId: integer("organization_id"),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
