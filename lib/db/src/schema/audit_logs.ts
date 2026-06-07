import { pgTable, serial, varchar, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: varchar("actor_id", { length: 255 }),
  actorEmail: varchar("actor_email", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 100 }),
  organizationId: integer("organization_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
