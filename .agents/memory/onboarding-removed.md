---
name: Onboarding wizard
description: Multi-step first-login onboarding wizard — how it works and what it guards
---

# Onboarding wizard

The onboarding wizard was fully re-implemented (June 2026) after having previously been removed.

## How it works
- New users are inserted with `onboarded = false` in `requireAuth.ts` (super-admin gets `true`)
- ON CONFLICT in `requireAuth.ts` does NOT update `onboarded`, so completed users are safe
- `POST /api/onboarding/complete` sets `onboarded = true` and saves all org/user/settings data
- **OnboardingGuard** wraps all dashboard routes: if `profile.onboarded === false`, redirects to `/onboarding`
- **OnboardingRoute** wraps `/onboarding`: if `profile.onboarded === true`, redirects to `/dashboard`

## Key files
- `artifacts/luxestate/src/pages/onboarding/index.tsx` — 6-step wizard UI
- `artifacts/luxestate/src/lib/onboarding-api.ts` — `useOrgProfile`, `useCompleteOnboarding` hooks
- `artifacts/api-server/src/routes/onboarding.ts` — backend routes
- `artifacts/luxestate/src/App.tsx` — `OnboardingGuard` and `OnboardingRoute` components

## 6 steps
1. Business Setup (name, type, agent count, lead source)
2. Branding & Contact (logo, phone, email, address, website)
3. Your Profile (avatar, first/last name, position, personal phone)
4. CRM Goals (primary CRM use)
5. Appearance (theme selection — calls `setTheme()` live)
6. Notifications (channels, frequency, categories)

## Theme note
Theme selection on step 5 calls `useTheme` from `"next-themes"` (not from `@/components/theme-provider`).

**Why:** `theme-provider.tsx` only re-exports `ThemeProvider` component; `useTheme` hook comes directly from `next-themes`.
