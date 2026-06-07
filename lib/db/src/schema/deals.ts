import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leadsTable } from "./leads";
import { properties } from "./properties";

export const deals = pgTable(
  "deals",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    leadId: integer("lead_id").references(() => leadsTable.id, {
      onDelete: "set null",
    }),
    propertyId: integer("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    assignedToId: varchar("assigned_to_id", { length: 255 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    createdById: varchar("created_by_id", { length: 255 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    dealerId: integer("dealer_id"),
    stage: varchar("stage", { length: 100 })
      .notNull()
      .default("lead"),
    value: numeric("value", { precision: 14, scale: 2 }),
    commission: numeric("commission", { precision: 14, scale: 2 }),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }),
    probability: integer("probability").default(0),
    expectedCloseDate: timestamp("expected_close_date"),
    closedAt: timestamp("closed_at"),
    lostReason: text("lost_reason"),
    notes: text("notes"),
    tags: text("tags").array().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("deals_stage_idx").on(t.stage),
    index("deals_lead_idx").on(t.leadId),
    index("deals_property_idx").on(t.propertyId),
    index("deals_assigned_to_idx").on(t.assignedToId),
    index("deals_created_by_idx").on(t.createdById),
    index("deals_created_at_idx").on(t.createdAt),
    index("deals_close_date_idx").on(t.expectedCloseDate),
  ],
);

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
