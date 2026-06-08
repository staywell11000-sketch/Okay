---
name: Owner access system
description: How org owner permissions are guaranteed — 6-layer defense so owners never see Access Denied or get redirected to the business setup wizard unexpectedly.
---

## The rule
Org owners must ALWAYS have full admin access. They must never see "Access Denied" or be sent to the onboarding wizard after their org exists.

## Why
The CRM's permission system has several lookup layers (organization_id column, owner_id FK, org_role column). Any one of these can be stale/corrupt, so the system must be resilient to each individually failing.

## How to apply (6-layer defense)

### 1. requireAuth.ts — self-healing on every request
Owner self-healing UPDATE now includes `onboarded = true`:
```sql
UPDATE users SET organization_id=$orgId, org_role='admin', onboarded=true
WHERE id=$userId
AND (organization_id IS DISTINCT FROM $orgId OR org_role IS DISTINCT FROM 'admin' OR onboarded IS DISTINCT FROM true)
```

### 2. requireAuth.ts — invited employees also get onboarded=true
When accepting an invite, employees are marked `onboarded = true` so they skip the business-setup wizard (which is for org owners only).

### 3. requireAuth.ts — existing members get onboarded=true
Users who already have `organization_id` but `onboarded=false` get healed on next request.

### 4. GET /permissions/my-permissions — owner_id is authoritative
The endpoint checks `organizations WHERE owner_id = userId` FIRST, before looking at `user.organization_id`. This means even if the organization_id column is stale, owners still get `isAdmin: true`.
Also: `org_role = 'admin'` (even non-owners who are admin-role members) gets `isAdmin: true`.

### 5. PermissionsContext — retry 3x before denying
Changed from `retry: false` + `.catch(() => { isAdmin: false })` to `retry: 3` with exponential backoff. During load or transient errors, keeps `isLoading: true` rather than snapping to empty permissions. A network blip no longer shows "Access Denied" to everyone.

### 6. DB repair migration (run once)
```sql
-- Fix all org owners
UPDATE users u SET organization_id=o.id, org_role='admin', onboarded=true, updated_at=NOW()
FROM organizations o WHERE o.owner_id = u.id;

-- Mark all org-connected users as onboarded
UPDATE users SET onboarded=true, updated_at=NOW()
WHERE organization_id IS NOT NULL AND onboarded IS DISTINCT FROM true;
```

## Also fixed: onboarding-api.ts useOrgProfile
The `/api/org/me` endpoint (from organizations.ts, which takes priority over onboarding.ts due to route registration order) returns `{ organization: {...} }`. The `useOrgProfile` hook must extract `data.organization ?? data`.
