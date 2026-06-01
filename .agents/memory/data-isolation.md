---
name: Data isolation pattern
description: How user data isolation is implemented across leads, deals, properties, and analytics
---

## Rule
Every GET route that returns user-owned data must filter by the authenticated user's ID. Use `OR col IS NULL` on nullable FK columns to preserve legacy data created before isolation was added.

## Column Map
| Table | Column | Notes |
|-------|--------|-------|
| leads | created_by_id | Added June 2026; was missing originally |
| deals | created_by_id | Was present from the start |
| properties | listed_by_id | Was present from the start |
| appointments | user_id | Was present from the start |
| notifications | user_id | Was present from the start |
| user_settings | user_id | Was present from the start |

## Pattern for Raw SQL (analytics)
```sql
WHERE (created_by_id = $userId OR created_by_id IS NULL)
```

## Pattern for Drizzle ORM
```ts
.where(sql`(${table.createdById} = ${userId} OR ${table.createdById} IS NULL)`)
```

## Why
Without isolation, any authenticated user can see all other users' data. The `OR IS NULL` clause ensures existing data (created before the FK column existed) still shows up for the first user who logs in.
