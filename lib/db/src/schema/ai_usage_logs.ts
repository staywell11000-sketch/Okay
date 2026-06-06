import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    operation: varchar("operation", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).default("gpt-4o-mini"),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("ai_usage_user_idx").on(t.userId),
    index("ai_usage_created_at_idx").on(t.createdAt),
    index("ai_usage_operation_idx").on(t.operation),
  ]
);

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;
