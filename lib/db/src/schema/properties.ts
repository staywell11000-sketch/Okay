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

export const properties = pgTable(
  "properties",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zipCode: varchar("zip_code", { length: 20 }),
    country: varchar("country", { length: 100 }).default("PK"),
    type: varchar("type", { length: 50 }).notNull().default("house"),
    subtype: varchar("subtype", { length: 100 }),
    status: varchar("status", { length: 50 }).notNull().default("available"),
    price: numeric("price", { precision: 14, scale: 2 }),
    pricePerSqft: numeric("price_per_sqft", { precision: 10, scale: 2 }),
    bedrooms: integer("bedrooms"),
    bathrooms: numeric("bathrooms", { precision: 4, scale: 1 }),
    sqft: integer("sqft"),
    sizeMarla: numeric("size_marla", { precision: 10, scale: 2 }),
    sector: text("sector"),
    lotSize: numeric("lot_size", { precision: 10, scale: 2 }),
    yearBuilt: integer("year_built"),
    parkingSpaces: integer("parking_spaces"),
    images: jsonb("images").$type<string[]>().default([]),
    amenities: text("amenities").array().default([]),
    tags: text("tags").array().default([]),
    mlsNumber: text("mls_number"),
    externalId: text("external_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    dealerId: integer("dealer_id"),
    agentId: varchar("agent_id", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),
    listedById: varchar("listed_by_id", { length: 255 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("properties_status_idx").on(t.status),
    index("properties_type_idx").on(t.type),
    index("properties_city_idx").on(t.city),
    index("properties_listed_by_idx").on(t.listedById),
    index("properties_dealer_idx").on(t.dealerId),
    index("properties_created_at_idx").on(t.createdAt),
  ],
);

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
