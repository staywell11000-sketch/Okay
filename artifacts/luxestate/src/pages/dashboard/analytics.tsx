import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts"
import {
  Download,
  TrendingUp,
  TrendingDown,
  Award,
  Loader2,
  Users,
  DollarSign,
  Target,
  MessageCircle,
  Activity,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/lib/analytics-api"
import { exportAnalyticsPDF } from "@/lib/export-pdf"

const SOURCE_COLORS = [
  "oklch(0.65 0.15 75)",
  "oklch(0.55 0.15 200)",
  "oklch(0.60 0.15 270)",
  "oklch(0.65 0.15 145)",
  "oklch(0.60 0.05 0)",
  "oklch(0.58 0.12 30)",
  "oklch(0.62 0.10 320)",
]

const STAGE_COLORS: Record<string, string> = {
  lead: "oklch(0.60 0.05 0)",
  new: "oklch(0.60 0.05 0)",
  contacted: "oklch(0.55 0.15 200)",
  qualified: "oklch(0.60 0.15 270)",
  proposal: "oklch(0.65 0.15 75)",
  won: "oklch(0.65 0.15 145)",
  lost: "oklch(0.55 0.12 20)",
  negotiation: "oklch(0.60 0.14 50)",
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  backdropFilter: "blur(12px)",
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  delay = 0,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
  sub?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground gap-2">
      <AlertCircle className="h-4 w-4 opacity-40" />
      {message}
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading, error, refetch } = useAnalytics()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    try {
      await exportAnalyticsPDF(data)
    } catch (e) {
      console.error("PDF export failed:", e)
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading analytics from your data…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load analytics</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  const {
    kpis,
    sourceBreakdown = [],
    agentPerformance = [],
    dealsByStage = [],
    messageActivity = [],
    conversionTrend = [],
    statusBreakdown = [],
    priorityBreakdown = [],
  } = data

  const sourceWithColors = sourceBreakdown.map((s, i) => ({
    ...s,
    color: SOURCE_COLORS[i % SOURCE_COLORS.length]!,
  }))

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Analytics & Insights"
        description="Real-time performance metrics from your Supabase database."
        actions={
          <Button
            variant="outline"
            className="gap-2 border-border/50"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PDF
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Total Leads"
          value={String(kpis.totalLeads)}
          icon={Users}
          color="text-primary"
          sub={`${kpis.wonLeads} won`}
          delay={0}
        />
        <KPICard
          label="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          icon={Target}
          color={kpis.conversionRate >= 20 ? "text-emerald-500" : "text-amber-500"}
          sub="Leads → Won"
          delay={0.08}
        />
        <KPICard
          label="Pipeline Value"
          value={formatCurrency(kpis.totalPipeline)}
          icon={DollarSign}
          color="text-emerald-500"
          sub={`${formatCurrency(kpis.wonRevenue)} won`}
          delay={0.16}
        />
        <KPICard
          label="Total Activities"
          value={String(kpis.totalActivities)}
          icon={Activity}
          color="text-blue-500"
          sub={`${kpis.activitiesThisWeek} this week`}
          delay={0.24}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Total Deals"
          value={String(kpis.totalDeals)}
          icon={TrendingUp}
          color="text-purple-500"
          delay={0.28}
        />
        <KPICard
          label="Messages Sent"
          value={String(kpis.totalMessages)}
          icon={MessageCircle}
          color="text-blue-400"
          delay={0.32}
        />
        <KPICard
          label="Won Revenue"
          value={formatCurrency(kpis.wonRevenue)}
          icon={Award}
          color="text-amber-500"
          delay={0.36}
        />
        <KPICard
          label="New Leads"
          value={String(statusBreakdown.find((s) => s.status === "new")?.count ?? 0)}
          icon={Users}
          color="text-primary"
          sub="In pipeline"
          delay={0.40}
        />
      </div>

      {/* Conversion Trend + Source Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Conversion Rate Trend</h3>
            <p className="text-sm text-muted-foreground">Monthly conversion % from real lead data</p>
          </div>
          <div className="h-60">
            {conversionTrend.length === 0 ? (
              <EmptyChart message="No conversion data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={conversionTrend}>
                  <defs>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.15 75)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.15 75)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${v}%`, "Conversion Rate"]} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="rate" stroke="oklch(0.65 0.15 75)" strokeWidth={2} fill="url(#convGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Lead Sources</h3>
            <p className="text-sm text-muted-foreground">Where your leads are coming from</p>
          </div>
          <div className="h-60">
            {sourceWithColors.length === 0 ? (
              <EmptyChart message="No source data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceWithColors}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="source"
                  >
                    {sourceWithColors.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
                  <Tooltip formatter={(v, name) => [v, name]} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Message Activity + Status Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Message Activity</h3>
            <p className="text-sm text-muted-foreground">Daily messages over last 30 days</p>
          </div>
          <div className="h-56">
            {messageActivity.length === 0 ? (
              <EmptyChart message="No message data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={messageActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Messages" fill="oklch(0.55 0.15 200)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Lead Status Distribution</h3>
            <p className="text-sm text-muted-foreground">Pipeline health across all statuses</p>
          </div>
          <div className="h-56">
            {statusBreakdown.length === 0 ? (
              <EmptyChart message="No lead status data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis type="number" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                  <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground capitalize" width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={STAGE_COLORS[entry.status] ?? "oklch(0.60 0.05 0)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Deal Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="glass-card p-6"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Deal Performance</h3>
            <p className="text-sm text-muted-foreground">Pipeline value by deal stage</p>
          </div>
          {dealsByStage.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Pipeline</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(kpis.totalPipeline)}</p>
            </div>
          )}
        </div>
        <div className="h-56">
          {dealsByStage.length === 0 ? (
            <EmptyChart message="No deal data yet" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealsByStage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="stage" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground capitalize" />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip
                  formatter={(v: number, name) => [
                    name === "value" ? formatCurrency(v) : v,
                    name === "value" ? "Pipeline Value" : "Deal Count",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="value" name="value" fill="oklch(0.65 0.15 75)" radius={[4, 4, 0, 0]}>
                  {dealsByStage.map((entry, i) => (
                    <Cell key={i} fill={STAGE_COLORS[entry.stage] ?? "oklch(0.65 0.15 75)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Agent Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Agent Performance</h3>
          <p className="text-sm text-muted-foreground">Ranked by leads won — live from your database</p>
        </div>
        {agentPerformance.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 opacity-40" />
            No agents have been assigned to leads yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {["Rank", "Agent", "Leads", "Won", "Win Rate", "Avg Score", "Progress"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {agentPerformance.map((agent) => (
                  <tr key={agent.agent} className="group transition-colors hover:bg-secondary/20">
                    <td className="px-3 py-4">
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                        agent.rank === 1 ? "bg-primary text-primary-foreground" :
                        agent.rank === 2 ? "bg-secondary text-foreground" :
                        "text-muted-foreground"
                      )}>
                        {agent.rank === 1 ? <Award className="h-3.5 w-3.5" /> : `#${agent.rank}`}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-accent/70 text-xs font-semibold text-primary-foreground">
                          {agent.agent.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{agent.agent}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">{agent.leads}</td>
                    <td className="px-3 py-4 font-medium text-foreground">{agent.won}</td>
                    <td className="px-3 py-4">
                      <span className={cn("flex items-center gap-1 font-semibold", agent.winRate >= 30 ? "text-emerald-500" : "text-amber-500")}>
                        {agent.winRate >= 30 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {agent.winRate}%
                      </span>
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">{agent.avgScore}</td>
                    <td className="px-3 py-4">
                      <div className="flex w-28 items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-border/50">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${agent.winRate}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{agent.winRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Priority Breakdown */}
      {priorityBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="glass-card p-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Lead Priority Distribution</h3>
            <p className="text-sm text-muted-foreground">Urgency breakdown of your pipeline</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {priorityBreakdown.map((p) => {
              const colorMap: Record<string, string> = {
                hot: "bg-red-500/10 text-red-500 border-red-500/20",
                warm: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                cold: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                urgent: "bg-red-600/10 text-red-600 border-red-600/20",
                high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
                medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                low: "bg-slate-500/10 text-slate-500 border-slate-500/20",
              }
              return (
                <div
                  key={p.priority}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 min-w-[140px]",
                    colorMap[p.priority] ?? "bg-secondary/20 text-foreground border-border/50"
                  )}
                >
                  <div>
                    <p className="text-xs font-medium capitalize">{p.priority}</p>
                    <p className="text-2xl font-bold">{p.count}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
