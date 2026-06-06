import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { surfaceInputClass } from "@/lib/ui-classes"
import { Calculator, DollarSign, Percent, CalendarDays, TrendingDown } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
}

export function MortgageCalculatorModal({ open, onClose }: Props) {
  const [price, setPrice] = useState("5000000")
  const [downPct, setDownPct] = useState("20")
  const [rate, setRate] = useState("7.5")
  const [term, setTerm] = useState("30")

  const calc = useMemo(() => {
    const p = parseFloat(price.replace(/,/g, "")) || 0
    const d = Math.min(Math.max(parseFloat(downPct) || 0, 0), 100)
    const r = parseFloat(rate) || 0
    const t = parseInt(term) || 30

    const loanAmount = p * (1 - d / 100)
    const downAmount = p * (d / 100)
    const i = r / 100 / 12
    const n = t * 12

    let monthly = 0
    if (i > 0 && n > 0 && loanAmount > 0) {
      monthly = (loanAmount * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1)
    } else if (n > 0) {
      monthly = loanAmount / n
    }

    const totalPayment = monthly * n
    const totalInterest = totalPayment - loanAmount
    const interestPct = loanAmount > 0 ? (totalInterest / totalPayment) * 100 : 0

    return { loanAmount, downAmount, monthly, totalPayment, totalInterest, interestPct }
  }, [price, downPct, rate, term])

  const fmt = (n: number) => `₨ ${Math.round(n).toLocaleString("en-PK")}`

  const fmtMonthly = (n: number) => `₨ ${Math.round(n).toLocaleString("en-PK")}`

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10">
              <Calculator className="h-4 w-4 text-orange-500" />
            </div>
            Mortgage Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Property Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5000000"
                  className={cn("pl-8", surfaceInputClass)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Down Payment %</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={downPct}
                  onChange={(e) => setDownPct(e.target.value)}
                  placeholder="20"
                  className={cn("pl-8", surfaceInputClass)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Interest Rate % / yr</Label>
              <div className="relative">
                <TrendingDown className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="7.5"
                  className={cn("pl-8", surfaceInputClass)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Loan Term (years)</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="30"
                  className={cn("pl-8", surfaceInputClass)}
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Monthly Payment</p>
              <p className="text-3xl font-bold text-foreground">{fmtMonthly(calc.monthly)}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>

            <div className="h-px bg-border/50" />

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Loan Amount", value: fmt(calc.loanAmount) },
                { label: "Down Payment", value: fmt(calc.downAmount) },
                { label: "Total Payment", value: fmt(calc.totalPayment) },
                { label: "Total Interest", value: fmt(calc.totalInterest) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-card/50 p-2.5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Interest breakdown bar */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Principal</span>
                <span>Interest ({calc.interestPct.toFixed(1)}%)</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary transition-all"
                  style={{ width: `${100 - calc.interestPct}%` }}
                />
                <div
                  className="bg-amber-500 transition-all"
                  style={{ width: `${calc.interestPct}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            This is an estimate. Actual rates may vary based on credit score and lender.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
