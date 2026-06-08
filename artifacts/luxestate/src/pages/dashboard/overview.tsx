import { useState } from "react"
import { useLocation } from "wouter"
import { motion } from "framer-motion"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  Users, DollarSign, CalendarDays, TrendingUp,
  RefreshCw, Plus, ArrowRight, Building2,
  UserCheck, ClipboardList, CheckCircle2, Circle,
  AlertCircle, Loader2, UserPlus, WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { AddLeadModal } from "@/components/dashboard/add-lead-modal"
import { useAnalytics, useRefreshAnalytics } from "@/lib/analytics-api"
import { useAuth } from "@/lib/auth-context"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function upcomingLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const isToday = d.toDateString() === now.toDateString()
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (isToday) return `Today ${time}`
  if (isTomorrow) return `Tomorrow ${time}`
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`
}

const STAGE_ORDER = ["prospect", "qualified", "proposal", "negotiation", "won", "lost"]

const STAGE_COLORS: Record<string, string> = {
  prospect: "#94a3b8",
  qualified: "#60a5fa",
  proposal: "#a78bfa",
  negotiation: "#f59e0b",
  won: "#10b981",
  lost: "#f87171",
}

const SOURCE_COLORS = [
  "#b45309", "#d97706", "#f59e0b", "#fbbf24",
  "#10b981", "#60a5fa", "#a78bfa", "#f87171",
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new:         { label: "New",         cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  contacted:   { label: "Contacted",   cls: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  qualified:   { label: "Qualified",   cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  won:         { label: "Won",         cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  lost:        { label: "Lost",        cls: "bg-red-500/10 text-red-500 border-red-500/20" },
  nurturing:   { label: "Nurturing",   cls: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

type MetricCardProps = {
  label: string
  value: string | number
  subLabel?: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  href?: string
  delay?: number
}

function MetricCard({ label, value, subLabel, icon: Icon, iconColor, iconBg, href, delay = 0 }: MetricCardProps) {
  const [, nav] = useLocation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={() => href && nav(href)}
      className={cn(
        "glass-card p-5 group",
        href ? "cursor-pointer" : ""
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
          <span>View details</span>
          <ArrowRight className="h-3 w-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </motion.div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-secondary/60", className)} />
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs space-y-1">
      {label && <p className="font-semibold text-foreground">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [showAddLead, setShowAddLead] = useState(false)
  const { data, isPending, isFetching, isError, error, refetch } = useAnalytics()
  const refresh = useRefreshAnalytics()
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()

  // true only when we have NO data yet (first-ever load)
  const isFirstLoad = isPending && isFetching
  // true when we had data but a background re-fetch has now failed
  const isRefetchError = isError && !!data
  // true when first load completely failed — no data at all
  const isHardError = isError && !data

  const firstName = (user as any)?.user_metadata?.name?.split(" ")[0]
    ?? (user as any)?.email?.split("@")[0]
    ?? "there"

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  const handleRefresh = () => {
    setRefreshing(true)
    refresh()
    setTimeout(() => setRefreshing(false), 1200)
  }

  // Sort deal stages by canonical pipeline order
  const sortedStages = data?.dealsByStage
    ? [...data.dealsByStage].sort((a, b) => {
        const ai = STAGE_ORDER.indexOf(a.stage)
        const bi = STAGE_ORDER.indexOf(b.stage)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
    : []

  const totalStageCount = sortedStages.reduce((s, r) => s + r.count, 0)

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <DashboardPageHeader
        title={`Good ${greeting()}, ${firstName} 👋`}
        description={today}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || isFirstLoad || isFetching}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", (refreshing || isFetching) && "animate-spin")} />
              {isFetching && !refreshing ? "Updating…" : "Refresh"}
            </Button>
            <Button
              onClick={() => setShowAddLead(true)}
              className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        }
      />

      {/* Hard error: first load failed entirely — show a clear full-width state */}
      {isHardError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <WifiOff className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Dashboard data couldn't be loaded</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {(error as Error)?.message?.includes("HTTP")
                ? "The server returned an error. It may be starting up — please try again."
                : "A network or server issue prevented loading. Check your connection."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => { setRefreshing(true); refetch().finally(() => setRefreshing(false)) }}
            disabled={isFetching}
          >
            {isFetching
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            {isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      )}

      {/* Soft error: had data, background re-fetch failed — keep showing data */}
      {isRefetchError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-2.5 text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Data may be outdated — last refresh failed.</span>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="ml-auto flex items-center gap-1 font-medium underline-offset-2 hover:underline disabled:opacity-50"
          >
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Retry
          </button>
        </div>
      )}

      {/* ── Metric Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isFirstLoad ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))
        ) : (
          <>
            <MetricCard
              label="Total Leads"
              value={data?.kpis.totalLeads?.toLocaleString() ?? 0}
              subLabel={`${data?.kpis.wonLeads ?? 0} won · ${data?.kpis.conversionRate ?? 0}% rate`}
              icon={Users}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
              href="/dashboard/leads"
              delay={0}
            />
            <MetricCard
              label="Active Deals"
              value={data?.kpis.activeDeals?.toLocaleString() ?? 0}
              subLabel={fmt(data?.kpis.totalPipeline ?? 0) + " pipeline"}
              icon={ClipboardList}
              iconColor="text-primary"
              iconBg="bg-primary/10"
              href="/dashboard/deals"
              delay={0.05}
            />
            <MetricCard
              label="Closed Deals"
              value={data?.kpis.closedDeals?.toLocaleString() ?? 0}
              subLabel={fmt(data?.kpis.wonRevenue ?? 0) + " revenue"}
              icon={CheckCircle2}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              href="/dashboard/deals"
              delay={0.1}
            />
            <MetricCard
              label="Properties"
              value={data?.kpis.totalProperties?.toLocaleString() ?? 0}
              subLabel={`${data?.kpis.activeProperties ?? 0} active`}
              icon={Building2}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
              href="/dashboard/properties"
              delay={0.15}
            />
            <MetricCard
              label="Appointments"
              value={data?.kpis.upcomingAppointments ?? 0}
              subLabel="Next 7 days"
              icon={CalendarDays}
              iconColor="text-orange-500"
              iconBg="bg-orange-500/10"
              href="/dashboard/calendar"
              delay={0.2}
            />
            <MetricCard
              label="Team Members"
              value={data?.kpis.teamMembers ?? 0}
              subLabel="Active agents"
              icon={UserCheck}
              iconColor="text-rose-500"
              iconBg="bg-rose-500/10"
              href="/dashboard/team"
              delay={0.25}
            />
          </>
        )}
      </div>

      {/* ── Charts Row ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="mb-5">
            <h3 className="text-base font-semibold text-foreground">Weekly Activity</h3>
            <p className="text-sm text-muted-foreground">Leads &amp; deals created over the last 7 days</p>
          </div>
          {isFirstLoad ? (
            <Skeleton className="h-56" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.weeklyActivity ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDeals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.15 75)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.15 75)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#60a5fa" strokeWidth={2} fill="url(#gLeads)" />
                  <Area type="monotone" dataKey="deals" name="Deals" stroke="oklch(0.65 0.15 75)" strokeWidth={2} fill="url(#gDeals)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Lead Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="mb-5">
            <h3 className="text-base font-semibold text-foreground">Lead Sources</h3>
            <p className="text-sm text-muted-foreground">Distribution by channel</p>
          </div>
          {isFirstLoad ? (
            <Skeleton className="h-56" />
          ) : !data?.sourceBreakdown?.length ? (
            <Empty label="No source data yet" />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sourceBreakdown}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={64}
                      strokeWidth={0}
                    >
                      {(data.sourceBreakdown ?? []).map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {(data.sourceBreakdown ?? []).slice(0, 5).map((s, i) => {
                  const total = (data.sourceBreakdown ?? []).reduce((sum, x) => sum + x.count, 0)
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                  return (
                    <div key={s.source} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground flex-1">{s.source}</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Pipeline Funnel ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Deal Pipeline</h3>
            <p className="text-sm text-muted-foreground">
              {data?.kpis.totalDeals ?? 0} total deals · {fmt(data?.kpis.totalPipeline ?? 0)} pipeline value
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {}}>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {isFirstLoad ? (
          <Skeleton className="h-44" />
        ) : !sortedStages.length ? (
          <Empty label="No deals in pipeline" />
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedStages}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground capitalize"
                  tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  width={65}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Deals" radius={[0, 4, 4, 0]}>
                  {sortedStages.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Stage pills */}
        {!isFirstLoad && sortedStages.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sortedStages.map((s) => (
              <div
                key={s.stage}
                className="flex items-center gap-1.5 rounded-full border border-border/40 bg-secondary/30 px-3 py-1 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: STAGE_COLORS[s.stage] ?? "#94a3b8" }}
                />
                <span className="capitalize text-foreground">{s.stage}</span>
                <span className="text-muted-foreground">
                  {s.count} · {fmt(s.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Activity Feed ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <SectionHeader
            title="Recent Leads"
            subtitle="Latest contacts added"
            icon={UserPlus}
            href="/dashboard/leads"
          />
          {isFirstLoad ? (
            <FeedSkeleton />
          ) : !data?.recentLeads?.length ? (
            <Empty label="No leads yet" />
          ) : (
            <ul className="space-y-3">
              {data.recentLeads.map((lead, i) => {
                const badge = STATUS_BADGE[lead.status] ?? { label: lead.status, cls: "bg-secondary text-muted-foreground border-border" }
                return (
                  <motion.li
                    key={lead.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-500">
                      {(lead.name ?? "").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.source}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.cls)}>{badge.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(lead.createdAt)}</span>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </motion.div>

        {/* Upcoming Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <SectionHeader
            title="Upcoming Appointments"
            subtitle="Your scheduled meetings"
            icon={CalendarDays}
            href="/dashboard/calendar"
          />
          {isFirstLoad ? (
            <FeedSkeleton />
          ) : !data?.upcomingAppointmentsList?.length ? (
            <Empty label="No upcoming appointments" />
          ) : (
            <ul className="space-y-3">
              {data.upcomingAppointmentsList.map((appt, i) => {
                const dt = new Date(appt.dateTime)
                const isToday = dt.toDateString() === new Date().toDateString()
                return (
                  <motion.li
                    key={appt.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                      isToday ? "bg-orange-500/10 text-orange-500" : "bg-secondary/50 text-muted-foreground"
                    )}>
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{appt.title}</p>
                      {appt.leadName && (
                        <p className="truncate text-xs text-muted-foreground">{appt.leadName}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={cn(
                        "text-xs font-medium",
                        isToday ? "text-orange-500" : "text-muted-foreground"
                      )}>
                        {upcomingLabel(appt.dateTime)}
                      </span>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </motion.div>

        {/* Recent Deals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card p-6"
        >
          <SectionHeader
            title="Recent Deals"
            subtitle="Latest deal activity"
            icon={DollarSign}
            href="/dashboard/deals"
          />
          {isFirstLoad ? (
            <FeedSkeleton />
          ) : !data?.recentDeals?.length ? (
            <Empty label="No deals yet" />
          ) : (
            <ul className="space-y-3">
              {data.recentDeals.map((deal, i) => (
                <motion.li
                  key={deal.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs"
                    style={{ background: (STAGE_COLORS[deal.stage] ?? "#94a3b8") + "20", color: STAGE_COLORS[deal.stage] ?? "#94a3b8" }}
                  >
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{deal.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{deal.stage}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">{fmt(deal.value)}</p>
                    <p className="text-[10px] text-muted-foreground">{relativeTime(deal.updatedAt)}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/* ── Agent Performance ─────────────────────────────────────── */}
      {data?.agentPerformance && data.agentPerformance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Agent Performance
              </h3>
              <p className="text-sm text-muted-foreground">Lead assignments &amp; conversion</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {["Agent", "Leads", "Won", "Win Rate", "Score"].map((h) => (
                    <th key={h} className={cn(
                      "pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground",
                      h === "Agent" ? "text-left" : "text-right"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.agentPerformance.map((a) => (
                  <tr key={a.agent} className="group">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/50 to-accent/50 text-xs font-semibold text-primary-foreground">
                          {a.agent.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground truncate">{a.agent}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-muted-foreground">{a.leads}</td>
                    <td className="py-3 text-right font-medium text-foreground">{a.won}</td>
                    <td className="py-3 text-right">
                      <span className={cn("font-semibold", a.winRate >= 30 ? "text-emerald-500" : a.winRate >= 15 ? "text-amber-500" : "text-muted-foreground")}>
                        {a.winRate > 0 ? <TrendingUp className="inline h-3.5 w-3.5 mr-0.5" /> : null}
                        {a.winRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <ScorePill score={a.avgScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <AddLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} />
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, icon: Icon, href,
}: { title: string; subtitle: string; icon: React.ElementType; href?: string }) {
  const [, nav] = useLocation()
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {href && (
        <button
          onClick={() => nav(href)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60">
        <Circle className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-muted-foreground"
  return <span className={cn("font-semibold tabular-nums", color)}>{score}</span>
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}
