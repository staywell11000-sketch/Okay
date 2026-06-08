---
name: Team permissions architecture
description: How the role/permission system works — DB tables, API middleware, frontend context, invitation flow.
---

## DB Tables Added
- `roles` — org-scoped named roles (system: admin/manager/agent/custom)
- `permissions` — resource × action catalog
- `role_permissions` — per-org role permission grants (falls back to DEFAULT_ROLE_PERMISSIONS in lib/db/src/schema/role_permissions.ts if no rows)
- `user_permissions` — per-user overrides (granted=true adds, granted=false removes from role perms)
- `invitations` — invitation_code + email + org_id + org_role + expires_at

## Users Table Additions
- `org_role` varchar(100) default 'agent' — admin | manager | agent | custom
- `is_active` boolean default true
- `invited_by` varchar(255) FK to users

## Permission Check Order (requirePermission middleware)
1. super_admin role → pass
2. org owner (organizations.owner_id === userId) → pass
3. user_permissions explicit override (granted=false → deny, granted=true → allow)
4. role_permissions for org+orgRole → pass if found
5. DEFAULT_ROLE_PERMISSIONS[orgRole] fallback → pass if found
6. deny 403

## Invitation Flow (zero extra steps)
- Admin creates invitation → 8-char hex code stored in invitations table
- Invited user opens /accept-invite (public route), enters email+code
- Frontend validates via POST /api/invitations/validate (public endpoint)
- User signs up with Supabase auth (signUp)
- requireAuth detects pending invitation by email on first API call → auto-joins org, marks invitation accepted
- No separate "accept" API call needed — requireAuth handles it atomically

## Frontend
- PermissionsProvider wraps PlanProvider in App.tsx; loads from GET /api/permissions/my-permissions
- usePermissions() → { hasPermission(resource, action), canView(resource), isAdmin, orgRole }
- Sidebar hides items where canView(resource)=false for non-admins (plan locking still shows locked icon)
- PermissionGuard in App.tsx wraps route components — shows AccessDenied for blocked resources
- DO NOT import @workspace/db in frontend files (server-only package); inline RESOURCES/ACTIONS arrays

**Why:** Org-level permission system needed for multi-user CRM without breaking existing super_admin / single-user flows.

**How to apply:** For new API routes needing auth: add `requirePermission('resource', 'action')` middleware after `requireAuth`. For new frontend pages: wrap in `<PermissionGuard resource="...">`. For sidebar: add `permissionResource` to the navItem definition.
