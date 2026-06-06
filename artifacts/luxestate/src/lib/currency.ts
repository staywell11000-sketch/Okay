export function formatPKR(value: number | string | null | undefined): string {
  const n =
    typeof value === "string"
      ? parseFloat(value.replace(/[^0-9.-]/g, ""))
      : (value ?? 0)
  if (isNaN(n)) return "₨ 0"
  return `₨ ${Math.round(n).toLocaleString("en-PK")}`
}

export function formatPKRCompact(value: number): string {
  if (value >= 10_000_000) return `₨ ${(value / 10_000_000).toFixed(2)} Cr`
  if (value >= 100_000) return `₨ ${(value / 100_000).toFixed(2)} L`
  if (value >= 1_000) return `₨ ${(value / 1_000).toFixed(1)}K`
  return `₨ ${Math.round(value).toLocaleString("en-PK")}`
}

export function parsePKR(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0
}
