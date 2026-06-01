---
name: Settings theme override bug
description: Why setTheme() must never be called in the settings page useEffect
---

## Rule
Never call `setTheme()` in a `useEffect` that watches fetched settings data in `settings.tsx`.

## Why
`next-themes` manages the active theme via `localStorage`. On every mount of the settings page, if `useEffect` calls `setTheme(settings.theme)`, it overwrites whatever theme the user currently has active — even if they just changed it on another page. The `formInitialised` ref trick doesn't fully fix this because each route navigation remounts the component.

**The correct pattern:** only call `setTheme()` in the explicit click handler (`handleThemeChange`). The `useEffect` should only populate *form state* (time format, notification toggles, etc.), never apply the theme.

## How to Apply
- `settings.tsx` `useEffect`: set `timeFormat`, `notifs`, `security`, profile fields from DB — but NOT `setTheme()`.
- `handleThemeChange(id)`: call both `setTheme(id)` AND `updateSettings.mutate({ theme: id })`.
- The theme selector UI reads `theme` from `useTheme()` which already reflects localStorage — no need to sync from DB.
