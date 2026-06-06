import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatPKR } from "@/lib/currency"
import { useLanguage } from "@/lib/i18n"
import {
  Calculator,
  Building2,
  Landmark,
  TrendingUp,
  Percent,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react"

const TABS = [
  { id: "property",   icon: Building2,      labelKey: "calculator.propertyPrice" as const },
  { id: "mortgage",   icon: Landmark,       labelKey: "calculator.mortgage"       as const },
  { id: "rent",       icon: TrendingUp,     labelKey: "calculator.rentYield"      as const },
  { id: "commission", icon: Percent,        labelKey: "calculator.commission"     as const },
  { id: "currency",   icon: ArrowLeftRight, labelKey: "calculator.currency"       as const },
]

const CURRENCY_RATES: { code: string; name: string; rate: number }[] = [
  { code: "USD", name: "US Dollar",        rate: 1 / 280 },
  { code: "AED", name: "UAE Dirham",       rate: 1 / 76  },
  { code: "GBP", name: "British Pound",    rate: 1 / 354 },
  { code: "EUR", name: "Euro",             rate: 1 / 300 },
  { code: "SAR", name: "Saudi Riyal",      rate: 1 / 74.7 },
  { code: "CAD", name: "Canadian Dollar",  rate: 1 / 205 },
]

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg px-4 py-3",
      highlight
        ? "bg-primary/10 border border-primary/20"
        : "bg-muted/40"
    )}>
      <span className={cn("text-sm", highlight ? "font-semibold text-primary" : "text-muted-foreground")}>
        {label}
      </span>
      <span className={cn("font-bold tabular-nums", highlight ? "text-primary text-base" : "text-foreground text-sm")}>
        {value}
      </span>
    </div>
  )
}

function CalcInput({
  label, value, onChange, placeholder, prefix, suffix, type = "number",
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; prefix?: string; suffix?: string; type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <Input
          type={type}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className={cn("h-10 text-sm", prefix && "pl-8", suffix && "pr-12")}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function PropertyCalc() {
  const { t } = useLanguage()
  const [area, setArea] = useState("")
  const [pricePerSqft, setPricePerSqft] = useState("")

  const results = useMemo(() => {
    const a = parseFloat(area) || 0
    const p = parseFloat(pricePerSqft) || 0
    const total = a * p
    const stamp = total * 0.05
    const registry = total * 0.01
    return { total, stamp, registry, totalCost: total + stamp + registry, valid: a > 0 && p > 0 }
  }, [area, pricePerSqft])

  const reset = () => { setArea(""); setPricePerSqft("") }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <CalcInput label={t("calculator.area")} value={area} onChange={setArea} placeholder="e.g. 1500" suffix="sqft" />
        <CalcInput label={t("calculator.pricePerSqft")} value={pricePerSqft} onChange={setPricePerSqft} placeholder="e.g. 8500" prefix="₨" />
        <Button variant="outline" size="sm" onClick={reset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />{t("calculator.reset")}
        </Button>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{t("calculator.result")}</p>
        {results.valid ? (
          <>
            <ResultRow label={t("calculator.totalPrice")} value={formatPKR(results.total)} highlight />
            <ResultRow label={t("calculator.pricePerSqft")} value={formatPKR(parseFloat(pricePerSqft))} />
            <ResultRow label={t("calculator.stampDuty")} value={formatPKR(results.stamp)} />
            <ResultRow label={t("calculator.registryFee")} value={formatPKR(results.registry)} />
            <ResultRow label={t("calculator.totalCost")} value={formatPKR(results.totalCost)} highlight />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Enter area and price per sqft to see results
          </div>
        )}
      </div>
    </div>
  )
}

function MortgageCalc() {
  const { t } = useLanguage()
  const [principal, setPrincipal] = useState("")
  const [rate, setRate] = useState("")
  const [years, setYears] = useState("")

  const results = useMemo(() => {
    const P = parseFloat(principal) || 0
    const annualRate = parseFloat(rate) || 0
    const n = (parseFloat(years) || 0) * 12
    if (P <= 0 || annualRate <= 0 || n <= 0) return null
    const r = annualRate / 100 / 12
    const monthly = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const totalAmount = monthly * n
    const totalInterest = totalAmount - P
    return { monthly, totalAmount, totalInterest }
  }, [principal, rate, years])

  const reset = () => { setPrincipal(""); setRate(""); setYears("") }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <CalcInput label={t("calculator.loanAmount")} value={principal} onChange={setPrincipal} placeholder="e.g. 5000000" prefix="₨" />
        <CalcInput label={t("calculator.interestRate")} value={rate} onChange={setRate} placeholder="e.g. 12" suffix="%" />
        <CalcInput label={t("calculator.loanTerm")} value={years} onChange={setYears} placeholder="e.g. 20" suffix="yrs" />
        <Button variant="outline" size="sm" onClick={reset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />{t("calculator.reset")}
        </Button>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{t("calculator.result")}</p>
        {results ? (
          <>
            <ResultRow label={t("calculator.monthlyPayment")} value={formatPKR(results.monthly)} highlight />
            <ResultRow label={t("calculator.totalAmount")} value={formatPKR(results.totalAmount)} />
            <ResultRow label={t("calculator.totalInterest")} value={formatPKR(results.totalInterest)} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Enter loan details to see monthly payment
          </div>
        )}
      </div>
    </div>
  )
}

function RentYieldCalc() {
  const { t } = useLanguage()
  const [propertyPrice, setPropertyPrice] = useState("")
  const [monthlyRent, setMonthlyRent] = useState("")

  const results = useMemo(() => {
    const price = parseFloat(propertyPrice) || 0
    const rent = parseFloat(monthlyRent) || 0
    if (price <= 0 || rent <= 0) return null
    const annualRent = rent * 12
    const grossYield = (annualRent / price) * 100
    const netYield = grossYield * 0.8
    return { annualRent, grossYield, netYield }
  }, [propertyPrice, monthlyRent])

  const reset = () => { setPropertyPrice(""); setMonthlyRent("") }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <CalcInput label={t("calculator.totalPrice")} value={propertyPrice} onChange={setPropertyPrice} placeholder="e.g. 10000000" prefix="₨" />
        <CalcInput label={t("calculator.monthlyRent")} value={monthlyRent} onChange={setMonthlyRent} placeholder="e.g. 85000" prefix="₨" />
        <Button variant="outline" size="sm" onClick={reset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />{t("calculator.reset")}
        </Button>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{t("calculator.result")}</p>
        {results ? (
          <>
            <ResultRow label={t("calculator.annualRentalIncome")} value={formatPKR(results.annualRent)} />
            <ResultRow label={t("calculator.annualYield")} value={`${results.grossYield.toFixed(2)}%`} highlight />
            <ResultRow label={t("calculator.netYield")} value={`${results.netYield.toFixed(2)}%`} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Enter property price and monthly rent
          </div>
        )}
      </div>
    </div>
  )
}

function CommissionCalc() {
  const { t } = useLanguage()
  const [salePrice, setSalePrice] = useState("")
  const [commRate, setCommRate] = useState("2")

  const results = useMemo(() => {
    const price = parseFloat(salePrice) || 0
    const rate = parseFloat(commRate) || 0
    if (price <= 0 || rate <= 0) return null
    const gross = price * (rate / 100)
    const gst = gross * 0.17
    const net = gross - gst
    return { gross, gst, net }
  }, [salePrice, commRate])

  const reset = () => { setSalePrice(""); setCommRate("2") }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <CalcInput label={t("calculator.totalPrice")} value={salePrice} onChange={setSalePrice} placeholder="e.g. 15000000" prefix="₨" />
        <CalcInput label={t("calculator.commissionRate")} value={commRate} onChange={setCommRate} placeholder="e.g. 2" suffix="%" />
        <Button variant="outline" size="sm" onClick={reset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />{t("calculator.reset")}
        </Button>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{t("calculator.result")}</p>
        {results ? (
          <>
            <ResultRow label={t("calculator.commissionAmount")} value={formatPKR(results.gross)} highlight />
            <ResultRow label={t("calculator.taxAmount")} value={formatPKR(results.gst)} />
            <ResultRow label={t("calculator.netCommission")} value={formatPKR(results.net)} highlight />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Enter sale price and commission rate
          </div>
        )}
      </div>
    </div>
  )
}

function CurrencyCalc() {
  const { t } = useLanguage()
  const [amount, setAmount] = useState("")
  const [selected, setSelected] = useState("USD")

  const results = useMemo(() => {
    const pkr = parseFloat(amount) || 0
    if (pkr <= 0) return null
    return CURRENCY_RATES.map((c) => ({
      ...c,
      converted: pkr * c.rate,
    }))
  }, [amount])

  const reset = () => { setAmount(""); setSelected("USD") }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <CalcInput label={t("calculator.fromAmount")} value={amount} onChange={setAmount} placeholder="e.g. 1000000" prefix="₨" />
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">{t("calculator.selectCurrency")}</Label>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCY_RATES.map((c) => (
              <button
                key={c.code}
                onClick={() => setSelected(c.code)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  selected === c.code
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border hover:border-primary/40 text-foreground"
                )}
              >
                <span className="font-mono font-bold">{c.code}</span>
                <span className="block text-xs text-muted-foreground truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />{t("calculator.reset")}
        </Button>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{t("calculator.result")}</p>
        {results ? (
          <>
            {results.map((c) => (
              <ResultRow
                key={c.code}
                label={`${c.code} — ${c.name}`}
                value={`${c.code} ${c.converted.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                highlight={c.code === selected}
              />
            ))}
            <p className="text-xs text-muted-foreground pt-1">{t("calculator.rateNote")}</p>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Enter an amount in PKR to convert
          </div>
        )}
      </div>
    </div>
  )
}

export default function CalculatorPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("property")

  return (
    <div className="flex flex-col h-full">
      <DashboardPageHeader
        title={t("calculator.title")}
        subtitle="Real-time property, mortgage, rent yield, commission & currency tools"
        icon={<Calculator className="h-5 w-5" />}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="mb-5 flex items-center gap-2">
            {(() => {
              const tab = TABS.find((t) => t.id === activeTab)!
              return (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <tab.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{t(tab.labelKey)}</h2>
                  </div>
                </>
              )
            })()}
          </div>
          {activeTab === "property"   && <PropertyCalc />}
          {activeTab === "mortgage"   && <MortgageCalc />}
          {activeTab === "rent"       && <RentYieldCalc />}
          {activeTab === "commission" && <CommissionCalc />}
          {activeTab === "currency"   && <CurrencyCalc />}
        </motion.div>
      </div>
    </div>
  )
}
