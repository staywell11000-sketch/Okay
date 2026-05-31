import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessName: text("business_name"),
    businessLogoUrl: text("business_logo_url"),
    whatsappNumber: varchar("whatsapp_number", { length: 50 }),
    position: varchar("position", { length: 100 }),
    theme: varchar("theme", { length: 20 }).default("system"),
    timeFormat: varchar("time_format", { length: 5 }).default("12h"),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    newLeadNotif: boolean("new_lead_notif").notNull().default(true),
    dealStatusNotif: boolean("deal_status_notif").notNull().default(true),
    whatsappNotif: boolean("whatsapp_notif").notNull().default(true),
    weeklyReportsEnabled: boolean("weekly_reports_enabled").notNull().default(true),
    marketingEmailsEnabled: boolean("marketing_emails_enabled").notNull().default(false),
    securityTwoFactorEnabled: boolean("security_two_factor_enabled").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_settings_user_id_idx").on(t.userId)],
);

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
