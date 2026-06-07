import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  amount: integer("amount").notNull(),
  plan: varchar("plan", { length: 50 }).notNull(),
  screenshotUrl: text("screenshot_url"),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type NewPaymentRequest = typeof paymentRequests.$inferInsert;
