import { useLocation } from "wouter"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { usePlan } from "@/lib/plan-context"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Sparkles, ArrowRight, Lock, RefreshCw, TrendingUp, Activity, BarChart3, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const FEATURE_LABELS: Record<string, string> = {
  "analyze-lead":          "Lead Analysis",
  "analyze-all":           "Bulk Analysis",
  "sales-insights":        "Sales Insights",
  "conversation-summary":  "Conversation Summary",
  "reply-suggestions":     "Reply Suggestions",
  "deal-insights":         "Deal Insights",
  "business-insights":     "Business Insights",
  "risk-detection":        "Risk Detection",
  "property-matching":     "Property Matching",
  "chat":                  "AI Assistant",
  lead_summary:            "Lead Summary",
  reply_suggestion:        "Reply Suggestion",
  conversation_summary:    "Conversation Summary",
}

const FEATURE_COST: Record<string, number> = {
  "reply-suggestions":     1,
  "conversation-summary":  1,
  "analyze-lead":          3,
  "deal-insights":         5,
  "business-insights":     5,
  "risk-detection":        5,
  "property-matching":     3,
  "sales-insights":        10,
  "analyze-all":           10,
  chat:                    2,
}

export default function AIUsagePage() {
  const [, nav] = useLocation()
  const { credits, org, isSuperAdmin } = usePlan()

  const { data: usageData, isLoading, refetch } = useQuery({
    queryKey: ["ai-usage-detail"],
    queryFn: () => apiFetch("/api/ai/usage").then(r => r.json()).catch(() => null),
    staleTime: 30_000,
  })

  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="AI Usage" description="Your AI Actions usage and history" />
        <div className="glass-card p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mx-auto">
            <Zap className="h-6 w-6 text-amber-500" />
          </div>
          <p className="font-semibold">Super Admin — Unlimited AI Actions</p>
          <p className="text-sm text-muted-foreground">You have unlimited AI Actions for testing. View full analytics in the Admin panel.</p>
          <Button variant="outline" size="sm" onClick={() => nav("/admin/ai-usage")}>View Admin Analytics</Button>
        </div>
      </div>
    )
  }

  if (!org || org.plan === "free") {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="AI Usage" description="Your AI Actions usage and history" />
        <div className="glass-card p-8 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-lg">Upgrade to unlock AI features</p>
            <p className="text-sm text-muted-foreground mt-1">Starter plan includes 300 AI Actions per month.</p>
          </div>
          <Button onClick={() => nav("/dashboard/billing")} className="gap-2">
            View Plans <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const available = credits?.available ?? 0
  const used = credits?.used ?? 0
  const planIncluded = credits?.planIncluded ?? 0
  const bonusActions = credits?.bonusActions ?? 0
  const usagePct = planIncluded > 0 ? Math.min(100, (used / planIncluded) * 100) : 0
  const month = credits?.month
  const year = credits?.year

  const byOperation: any[] = usageData?.byOperation ?? []
  const dailyUsage: any[] = usageData?.dailyUsage ?? []

  const progressColor = usagePct >= 90 ? "text-red-500" : usagePct >= 70 ? "text-amber-500" : "text-emerald-500"

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="AI Usage"
        description="Track your AI Actions balance and usage history"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Main balance card */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                AI Actions Balance
              </CardTitle>
              {month && year && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(year, month - 1, 1), "MMMM yyyy")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className={cn("text-4xl font-bold tabular-nums", progressColor)}>
                  {available.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">actions remaining</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Used</p>
                <p className="text-xl font-semibold tabular-nums">{used.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{used.toLocaleString()} used</span>
                <span>{planIncluded.toLocaleString()} included in plan</span>
              </div>
              <Progress value={usagePct} className="h-2.5" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Plan Actions</p>
                <p className="text-lg font-semibold tabular-nums">{planIncluded.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bonus Actions</p>
                <p className={cn("text-lg font-semibold tabular-nums", bonusActions > 0 ? "text-purple-500" : "")}>
                  {bonusActions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold capitalize">{org.planName ?? org.plan}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {bonusActions > 0 && (
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Bonus Actions</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">{bonusActions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Never expire · used after plan actions</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3 space-y-2">
              <p className="text-sm font-semibold">Need more AI Actions?</p>
              <p className="text-xs text-muted-foreground">Buy a booster pack. Actions never expire.</p>
              <Button size="sm" className="w-full gap-2" onClick={() => nav("/dashboard/billing")}>
                <Sparkles className="h-3.5 w-3.5" />
                Buy AI Booster
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage by feature */}
      {byOperation.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Usage by Feature
            </CardTitle>
            <CardDescription>All-time usage across AI features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byOperation.map((row: any) => {
                const label = FEATURE_LABELS[row.operation] ?? row.operation
                const cost = FEATURE_COST[row.operation] ?? 1
                const actionCost = row.calls * cost
                const maxCalls = Math.max(...byOperation.map((r: any) => r.calls))
                const pct = maxCalls > 0 ? (row.calls / maxCalls) * 100 : 0
                return (
                  <div key={row.operation} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{cost} action{cost !== 1 ? "s" : ""} each</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{row.calls.toLocaleString()} calls</span>
                        <span className="font-medium text-foreground">~{actionCost.toLocaleString()} actions</span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily usage chart */}
      {dailyUsage.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Daily Activity (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-16">
              {dailyUsage.map((d: any) => {
                const maxCalls = Math.max(...dailyUsage.map((r: any) => r.calls))
                const h = maxCalls > 0 ? Math.max(4, (d.calls / maxCalls) * 60) : 4
                return (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.calls} calls`}
                    className="flex-1 bg-primary/60 rounded-sm hover:bg-primary transition-colors"
                    style={{ height: `${h}px` }}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{dailyUsage[0]?.day}</span>
              <span>{dailyUsage[dailyUsage.length - 1]?.day}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {byOperation.length === 0 && !isLoading && (
        <div className="glass-card p-10 text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <p className="font-semibold">No AI usage yet</p>
          <p className="text-sm text-muted-foreground">Your AI Action history will appear here once you start using AI features.</p>
          <Button variant="outline" size="sm" onClick={() => nav("/dashboard/ai-intelligence")} className="gap-2 mt-2">
            Explore AI Features <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
