import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Zap,
  BarChart3,
  DollarSign,
  MessageCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  TrendingUp,
  Activity,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api"

type UsageStats = {
  monthly: {
    calls: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCostUsd: number
  }
  allTime: {
    calls: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCostUsd: number
  }
  byOperation: {
    operation: string
    calls: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCostUsd: number
  }[]
  dailyUsage: {
    day: string
    calls: number
    inputTokens: number
    outputTokens: number
  }[]
}

const OPERATION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "analyze-lead": { label: "Lead Analysis", icon: Brain, color: "text-blue-500" },
  "analyze-all": { label: "Bulk Analysis", icon: Zap, color: "text-amber-500" },
  "sales-insights": { label: "Sales Insights", icon: TrendingUp, color: "text-emerald-500" },
  "conversation-summary": { label: "Conversation Summary", icon: MessageCircle, color: "text-purple-500" },
  "chat": { label: "AI Chat", icon: Sparkles, color: "text-primary" },
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  fontSize: "12px",
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatCost(usd: number) {
  if (usd === 0) return "$0.00"
  if (usd < 0.01) return `<$0.01`
  return `$${usd.toFixed(4)}`
}

export default function AIUsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ""
      const res = await fetch(`${API_BASE}/ai/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch usage stats")
      const data = await res.json()
      setStats(data)
    } catch (e: any) {
      setError(e?.message ?? "Failed to load usage stats")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="AI Usage & Billing" description="Track your AI API usage and estimated costs." />
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchStats}>Try Again</Button>
        </div>
      </div>
    )
  }

  const monthly = stats?.monthly ?? { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }
  const allTime = stats?.allTime ?? { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }
  const byOp = stats?.byOperation ?? []
  const daily = stats?.dailyUsage ?? []

  const kpis = [
    {
      icon: Activity,
      label: "Calls This Month",
      value: monthly.calls.toLocaleString(),
      sub: `${allTime.calls.toLocaleString()} all-time`,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: BarChart3,
      label: "Tokens This Month",
      value: formatTokens(monthly.totalTokens),
      sub: `${formatTokens(monthly.inputTokens)} in · ${formatTokens(monthly.outputTokens)} out`,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: DollarSign,
      label: "Est. Cost This Month",
      value: formatCost(monthly.estimatedCostUsd),
      sub: `${formatCost(allTime.estimatedCostUsd)} all-time`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: Brain,
      label: "Model",
      value: "GPT-4o Mini",
      sub: "$0.15 / 1M in · $0.60 / 1M out",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
  ]

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="AI Usage & Billing"
        description="Track your AI API usage and estimated costs. Powered by GPT-4o Mini."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/50"
            onClick={fetchStats}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn("glass-card border p-5 space-y-1", kpi.bg)}
          >
            <kpi.icon className={cn("h-5 w-5 mb-3", kpi.color)} />
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs font-medium text-foreground">{kpi.label}</p>
            <p className="text-xs text-muted-foreground">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Daily Usage Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Daily Usage — Last 30 Days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">API calls per day</p>
          </div>
          <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 text-xs">
            <Activity className="h-3 w-3" />
            {daily.reduce((s, d) => s + d.calls, 0)} total calls
          </Badge>
        </div>

        {daily.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/50">
            <div className="text-center">
              <Brain className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No AI usage yet this month</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Usage will appear here once you start using AI features</p>
            </div>
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [v, "Calls"]}
                  cursor={{ fill: "var(--border)", opacity: 0.3 }}
                />
                <Bar dataKey="calls" fill="oklch(0.65 0.15 75)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* By Operation Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 space-y-4"
      >
        <h3 className="text-sm font-semibold text-foreground">Usage by Feature</h3>

        {byOp.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/50">
            <p className="text-sm text-muted-foreground">No usage data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {byOp.map((op, i) => {
              const meta = OPERATION_LABELS[op.operation] ?? { label: op.operation, icon: Zap, color: "text-muted-foreground" }
              const Icon = meta.icon
              const pct = allTime.totalTokens > 0 ? (op.totalTokens / allTime.totalTokens) * 100 : 0

              return (
                <motion.div
                  key={op.operation}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="flex items-center gap-4 rounded-xl border border-border/40 bg-secondary/20 px-4 py-3"
                >
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/80")}>
                    <Icon className={cn("h-4 w-4", meta.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{meta.label}</p>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{op.calls} calls</span>
                        <span className="text-xs text-muted-foreground">{formatTokens(op.totalTokens)} tokens</span>
                        <span className="text-xs font-semibold text-foreground">{formatCost(op.estimatedCostUsd)}</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-border/50">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pct.toFixed(1)}% of all-time token usage
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Token Split Chart */}
      {byOp.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 space-y-4"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground">Token Usage by Feature</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Input vs. output tokens per feature</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byOp.map((o) => ({ ...o, label: OPERATION_LABELS[o.operation]?.label ?? o.operation }))} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={formatTokens}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [formatTokens(v), name === "inputTokens" ? "Input" : "Output"]}
                />
                <Bar dataKey="inputTokens" name="Input" fill="oklch(0.65 0.15 75)" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="outputTokens" name="Output" fill="oklch(0.75 0.1 75)" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Pricing Reference */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Pricing — GPT-4o Mini</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Input tokens: <strong className="text-foreground">$0.15 / 1M tokens</strong> &nbsp;·&nbsp;
              Output tokens: <strong className="text-foreground">$0.60 / 1M tokens</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Costs shown are estimates based on OpenAI's published pricing. Actual charges may vary.
              1,000 tokens ≈ 750 words.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
