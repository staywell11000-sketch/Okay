---
name: i18n system architecture
description: How the multi-language system works in LuxeState CRM — context, persistence, RTL, fonts.
---

## Rule
Use the custom i18n context in `src/lib/i18n.tsx` — no external i18n library.

## Languages
- `en` English (LTR, default)
- `ur` Urdu (RTL)
- `ps` Pashto (RTL)
- `sd` Sindhi (RTL)

All three non-English languages are RTL and share Noto Nastaliq Urdu / Noto Naskh Arabic fonts loaded in `index.html`.

## API
- `useLanguage()` — returns `{ language, setLanguage, t, isRTL }`
- `t(key: TranslationKey)` — typed translation lookup with English fallback
- `LANGUAGES` array — metadata for language picker (code, name, nativeName, rtl)

## RTL activation
`LanguageProvider` useEffect sets `document.documentElement.dir = "rtl"` and `lang=` attribute. CSS in `index.css` applies Urdu/Arabic font for `html[lang="ur/ps/sd"]`.

## Persistence
1. **Primary**: `localStorage` key `luxestate_language` — immediate, device-scoped.
2. **Secondary**: `preferred_language` column in `user_settings` table (Drizzle schema, API route) — cross-device via settings PUT endpoint.

## Placement
`LanguageProvider` wraps `AuthProvider` inside `TooltipProvider` in `App.tsx`.

## Extending translations
Add new keys to `TranslationKey` union type and add the string to all 4 language objects in `src/lib/i18n.tsx`.

**Why:** Keeping translations in one file avoids bundle-splitting complexity and is appropriate for a small CRM with ~100 UI strings.

**How to apply:** Call `const { t } = useLanguage()` in any component, then use `t("some.key")`.
