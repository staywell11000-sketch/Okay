import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Building2, TrendingUp, ShoppingBag, Activity, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const PLAN_COLOR: Record<string, string> = {
  agency:       "bg-amber-500/10 text-amber-600 border-amber-500/20",
  professional: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  starter:      "bg-blue-500/10 text-blue-600 border-blue-500/20",
  trial:        "bg-slate-500/10 text-slate-600 border-slate-500/20",
  free:         "bg-slate-500/10 text-slate-500 border-slate-500/20",
}

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function AdminAiUsage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai-stats"],
    queryFn: () => apiFetch("/api/admin/ai-stats").then(r => r.json()).catch(() => ({})),
    staleTime: 60_000,
  })

  const { data: recentData } = useQuery({
    queryKey: ["admin-ai-recent"],
    queryFn: () => apiFetch("/api/admin/ai-usage-log").then(r => r.json()).catch(() => ({ data: [] })),
    staleTime: 60_000,
  })

  const s = data ?? {}
  const topOrgs: any[] = s.top_orgs_by_usage ?? []
  const topFeatures: any[] = s.top_features ?? []
  const recent: any[] = recentData?.data ?? []
  const thisMonth = s.this_month ?? {}
  const boosterRevenue = s.booster_revenue ?? {}

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">AI Usage Analytics</h1>
        <p className="text-muted-foreground text-sm">AI Actions consumption and revenue across all organizations</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Actions This Month"
          value={Number(thisMonth.actions_used ?? 0).toLocaleString()}
          sub={`${Number(thisMonth.active_orgs ?? 0)} active orgs`}
          icon={Zap}
          color="bg-amber-500"
        />
        <StatCard
          title="Bonus Remaining"
          value={Number(thisMonth.bonus_remaining ?? 0).toLocaleString()}
          sub="Across all orgs"
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Booster Revenue"
          value={`Rs. ${Number(boosterRevenue.total_pkr ?? 0).toLocaleString()}`}
          sub={`${Number(boosterRevenue.total_sales ?? 0)} booster sales`}
          icon={ShoppingBag}
          color="bg-green-500"
        />
        <StatCard
          title="Total AI Requests"
          value={Number(s.total_requests ?? 0).toLocaleString()}
          sub="All time"
          icon={Activity}
          color="bg-purple-500"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top orgs by usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Top Organizations by AI Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topOrgs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet this month</p>
            ) : (
              <div className="space-y-3">
                {topOrgs.map((row: any, i: number) => {
                  const used = Number(row.actions_used ?? 0)
                  const limit = Number(row.actions_limit ?? 0)
                  const bonus = Number(row.bonus_actions ?? 0)
                  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
                  return (
                    <div key={row.organization_id ?? i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                          <span className="text-sm font-medium truncate">{row.org_name ?? `Org #${row.organization_id}`}</span>
                          <Badge variant="outline" className={cn("text-xs shrink-0", PLAN_COLOR[row.plan] ?? PLAN_COLOR.free)}>
                            {row.plan ?? "free"}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold tabular-nums shrink-0 ml-2">{used.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">/ {limit.toLocaleString()}</span>
                        {bonus > 0 && <span className="text-xs text-purple-500">+{bonus.toLocaleString()} bonus</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most used features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Most Used AI Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet this month</p>
            ) : (
              <div className="space-y-2">
                {topFeatures.map((row: any, i: number) => {
                  const calls = Number(row.calls ?? 0)
                  const maxCalls = Number(topFeatures[0]?.calls ?? 1)
                  const pct = Math.round((calls / maxCalls) * 100)
                  return (
                    <div key={row.feature ?? i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{(row.feature ?? "").replace(/-/g, " ")}</span>
                        <span className="tabular-nums text-muted-foreground">{calls.toLocaleString()} calls</span>
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent calls */}
      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent AI Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {recent.slice(0, 50).map((row: any) => (
                <div key={row.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium capitalize truncate">{(row.feature ?? "").replace(/-/g, " ")}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{row.org_name ?? `Org #${row.organization_id}`}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {row.created_at ? format(new Date(row.created_at), "MMM d, h:mm a") : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
