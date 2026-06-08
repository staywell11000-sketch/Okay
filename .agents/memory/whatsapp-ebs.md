---
name: WhatsApp EBS architecture
description: Meta Embedded Signup flow for WhatsApp Business in LuxeState CRM — token exchange, SDK loading, templates, storage patterns.
---

## Rule
EBS (Embedded Signup) code exchange does NOT require `redirect_uri`. POST to Graph API without it:
```
GET /v18.0/oauth/access_token?client_id=APP_ID&client_secret=APP_SECRET&code=CODE
```

**Why:** Standard OAuth requires redirect_uri for validation, but EBS codes come from a popup (FB.login) not a redirect, so the exchange omits it. Including redirect_uri causes a mismatch error.

## How to apply
- Frontend: dynamically load `connect.facebook.net/en_US/sdk.js`, call `FB.init({ appId, ... })`, then `FB.login(callback, { config_id, response_type: 'code', override_default_response_type: true })`
- `config_id` comes from `FACEBOOK_WHATSAPP_CONFIG_ID` env var (optional — without it, standard FB login is used)
- Backend `POST /api/whatsapp/embedded-signup` receives `{ code }`, exchanges without redirect_uri, fetches WABA + phone numbers, upserts `connected_accounts`
- Templates stored in `connected_accounts.metadata.templates[]` via `POST /api/whatsapp/templates/sync`
- The `/api/whatsapp/status` endpoint returns templates flattened at top-level (not nested under metadata), along with `phoneNumber`, `businessName`, `templatesSyncedAt`

## Key env vars
- `FACEBOOK_APP_ID` — required for EBS and SDK loading
- `FACEBOOK_APP_SECRET` — required for code exchange
- `FACEBOOK_WHATSAPP_CONFIG_ID` — optional; WhatsApp Business configuration ID in Meta App Dashboard
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — required for inbound messages

## Files
- Backend routes: `artifacts/api-server/src/routes/whatsapp.ts`
- Frontend API lib: `artifacts/luxestate/src/lib/whatsapp-api.ts`
- EBS button component: `artifacts/luxestate/src/components/whatsapp/WhatsAppConnect.tsx`
- Settings tab: `artifacts/luxestate/src/components/whatsapp/WhatsAppSettingsTab.tsx`
- Settings page: WhatsApp tab added between "Connected Accounts" and "Account"
- Messages page: Connect banner shown when `useWhatsAppStatus().data?.connected === false`
