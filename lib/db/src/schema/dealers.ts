import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const dealers = pgTable(
  "dealers",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    company: text("company"),
    phone: text("phone").notNull().default(""),
    email: text("email").default(""),
    location: text("location").default(""),
    dealerType: varchar("dealer_type", { length: 50 }).notNull().default("individual"),
    profileImage: text("profile_image"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    notes: text("notes"),
    totalLeads: integer("total_leads").default(0),
    totalDeals: integer("total_deals").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("dealers_user_id_idx").on(t.userId),
    index("dealers_status_idx").on(t.status),
    index("dealers_type_idx").on(t.dealerType),
    index("dealers_created_at_idx").on(t.createdAt),
  ],
);

export type Dealer = typeof dealers.$inferSelect;
export type NewDealer = typeof dealers.$inferInsert;
