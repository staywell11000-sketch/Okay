import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 100 }).notNull(),
    accountName: text("account_name"),
    accountId: text("account_id"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("connected_accounts_user_provider_idx").on(t.userId, t.provider),
    index("connected_accounts_user_idx").on(t.userId),
    index("connected_accounts_provider_idx").on(t.provider),
  ],
);

export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type NewConnectedAccount = typeof connectedAccounts.$inferInsert;
