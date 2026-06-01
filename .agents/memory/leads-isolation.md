---
name: Leads schema user isolation
description: The leads table was missing a created_by_id column; added June 2026
---

## Rule
The `leads` table originally had no `created_by_id` column. It was added as a nullable `varchar(255)` FK to `users.id` (with `onDelete: set null`) in June 2026.

## Why
Data isolation per user requires filtering leads by who created them. The `assigned_to` field is a free-text agent name, not a user ID — it cannot be used for isolation.

## How to Apply
- GET `/leads` and GET `/leads/:id`: filter with `WHERE (created_by_id = $userId OR created_by_id IS NULL)` — the OR handles legacy rows created before the column existed.
- POST `/leads`: always set `createdById: userId` from `req.userId`.
- Analytics raw SQL queries: same `OR created_by_id IS NULL` pattern for all lead/deal/property queries.
- Schema file: `lib/db/src/schema/leads.ts` — `createdById` field with index `leads_created_by_idx`.
