import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Building2, Users, CheckCircle2, XCircle, Clock,
  TrendingUp, CalendarDays, Zap, MessageSquare, HardDrive,
  RefreshCw,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from "recharts"
import { cn } from "@/lib/utils"

function fmt(n: number) { return Number(n).toLocaleString() }
function fmtRs(n: number) {
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `Rs. ${(n / 1_000).toFixed(1)}K`
  return `Rs. ${fmt(n)}`
}
function fmtBytes(n: number) {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`
  if (n >= 1_048_576)     return `${(n / 1_048_576).toFixed(1)} MB`
  if (n >= 1_024)         return `${(n / 1_024).toFixed(1)} KB`
  return `${fmt(n)} B`
}

type StatCardProps = {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  badge?: { label: string; variant?: "default" | "secondary" | "destructive" | "outline" }
}

function StatCard({ title, value, sub, icon: Icon, color, badge }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute inset-0 opacity-5", color)} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub   && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {badge && <Badge variant={badge.variant ?? "secondary"} className="mt-2 text-xs">{badge.label}</Badge>}
      </CardContent>
    </Card>
  )
}

const SUB_COLORS: Record<string, string> = {
  active:    "#22c55e",
  trial:     "#f59e0b",
  expired:   "#94a3b8",
  suspended: "#ef4444",
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#94a3b8", "#ef4444", "#8b5cf6"]

export default function AdminOverview() {
  const { data, isPending, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch("/api/admin/stats").then(r => r.json()),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const { data: aiData } = useQuery({
    queryKey: ["admin-ai-stats"],
    queryFn: () => apiFetch("/api/admin/ai-stats").then(r => r.json()).catch(() => null),
    refetchInterval: 60_000,
    staleTime: 50_000,
  })

  const { data: growth } = useQuery({
    queryKey: ["admin-growth"],
    queryFn: () => apiFetch("/api/admin/growth").then(r => r.json()).catch(() => null),
    refetchInterval: 60_000,
    staleTime: 50_000,
  })

  const s = data?.stats
  const orgGrowth    = (growth?.org_growth    ?? []) as { month: string; new_orgs: number }[]
  const revGrowth    = (growth?.revenue_growth ?? []) as { month: string; revenue: number }[]
  const subBreakdown = (growth?.sub_breakdown  ?? []) as { status: string; count: number }[]

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform-wide metrics · live every 30 s</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          {lastUpdated && <span>Updated {lastUpdated}</span>}
        </div>
      </div>

      {/* ── Section 1: Core KPIs ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Platform Overview</h2>
        {isPending ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              title="Total Organizations"
              value={fmt(Number(s?.total_orgs ?? 0))}
              icon={Building2}
              color="bg-blue-500"
              sub="All tenants"
            />
            <StatCard
              title="Total Users"
              value={fmt(Number(s?.total_users ?? 0))}
              icon={Users}
              color="bg-violet-500"
              sub="Across all orgs"
            />
            <StatCard
              title="Active Subscriptions"
              value={fmt(Number(s?.active_subscriptions ?? 0))}
              icon={CheckCircle2}
              color="bg-green-500"
              sub="Paying plans"
            />
            <StatCard
              title="Expired Subscriptions"
              value={fmt(Number(s?.expired_subscriptions ?? 0))}
              icon={XCircle}
              color="bg-slate-500"
              sub="Lapsed plans"
            />
            <StatCard
              title="Pending Payments"
              value={fmt(Number(s?.pending_payments ?? 0))}
              icon={Clock}
              color="bg-amber-500"
              sub="Awaiting approval"
              badge={Number(s?.pending_payments ?? 0) > 0 ? { label: "Action needed", variant: "destructive" } : undefined}
            />
            <StatCard
              title="Monthly Revenue"
              value={fmtRs(Number(s?.monthly_revenue ?? 0))}
              icon={TrendingUp}
              color="bg-emerald-500"
              sub="This month · approved"
            />
            <StatCard
              title="Annual Revenue"
              value={fmtRs(Number(s?.annual_revenue ?? 0))}
              icon={CalendarDays}
              color="bg-teal-500"
              sub="This year · approved"
            />
            <StatCard
              title="AI Usage"
              value={fmt(Number(s?.ai_requests_total ?? 0))}
              icon={Zap}
              color="bg-orange-500"
              sub="Total AI requests used"
            />
            <StatCard
              title="WhatsApp Messages"
              value={fmt(Number(s?.whatsapp_messages ?? 0))}
              icon={MessageSquare}
              color="bg-[#25d366]"
              sub="All messages sent"
            />
            <StatCard
              title="Storage Usage"
              value={fmtBytes(Number(s?.storage_bytes ?? 0))}
              icon={HardDrive}
              color="bg-cyan-500"
              sub="Documents uploaded"
            />
          </div>
        )}
      </section>

      {/* ── Section 2: Charts ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Organizations Growth */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Organization Growth</CardTitle>
            <p className="text-xs text-muted-foreground">New orgs per month (last 12 months)</p>
          </CardHeader>
          <CardContent>
            {orgGrowth.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={orgGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [v, "New Orgs"]}
                  />
                  <Area
                    type="monotone" dataKey="new_orgs" stroke="#3b82f6" strokeWidth={2}
                    fill="url(#orgGrad)" dot={{ r: 3, fill: "#3b82f6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Growth */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Growth</CardTitle>
            <p className="text-xs text-muted-foreground">Approved payments per month (last 12 months)</p>
          </CardHeader>
          <CardContent>
            {revGrowth.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revGrowth} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Subscription Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Subscription Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">Distribution by status</p>
          </CardHeader>
          <CardContent>
            {subBreakdown.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">No data yet</div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={subBreakdown} dataKey="count" nameKey="status"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                      paddingAngle={3} strokeWidth={0}
                    >
                      {subBreakdown.map((entry, i) => (
                        <Cell key={entry.status} fill={SUB_COLORS[entry.status] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number, name: string) => [v, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {subBreakdown.map((entry, i) => (
                    <span key={entry.status} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: SUB_COLORS[entry.status] ?? PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {entry.status} ({entry.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Section 3: AI Cost detail ── */}
      {aiData && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">AI Cost Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total AI Requests"   value={fmt(aiData.total_requests ?? 0)}   icon={Zap}        color="bg-amber-500"  />
            <StatCard title="Total Tokens"        value={fmt(aiData.total_tokens   ?? 0)}   icon={Zap}        color="bg-orange-500" />
            <StatCard title="Est. OpenAI Cost"    value={`$${Number(aiData.total_cost ?? 0).toFixed(4)}`}  icon={TrendingUp} color="bg-red-500"    />
            <StatCard title="Avg Cost / Org"      value={`$${Number(aiData.avg_cost_per_org ?? 0).toFixed(4)}`} icon={Building2} color="bg-pink-500" />
          </div>
        </section>
      )}
    </div>
  )
}
