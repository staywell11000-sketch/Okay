---
name: PKR currency format
description: How Pakistani Rupee currency is formatted across the LuxeState CRM.
---

## Rule
All monetary values display in PKR (₨). Never use $ or USD in the UI.

## Utilities (`src/lib/currency.ts`)
- `formatPKR(value)` — full format: `₨ 1,250,000`
- `formatPKRCompact(value)` — compact: `₨ 1.25 Cr` / `₨ 5.00 L` / `₨ 500K`
- `parsePKR(str)` — strips formatting and returns number

## Compact thresholds (Pakistani notation)
- ≥ 10,000,000 → Crore (Cr)
- ≥ 100,000 → Lakh (L)
- ≥ 1,000 → Thousand (K)

## Applied in
- `analytics.tsx` — `formatCurrency()` wrapper calls `formatPKRCompact()`
- `calculator.tsx` — all result displays use `formatPKR()`

**Why:** Pakistani real estate market uses PKR with lakh/crore notation, not millions/billions.

**How to apply:** Import `formatPKR` or `formatPKRCompact` from `@/lib/currency`.
