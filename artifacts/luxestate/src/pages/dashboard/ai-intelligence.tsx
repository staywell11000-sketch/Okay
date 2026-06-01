import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link } from "wouter"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Flame,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Phone,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Loader2,
  Users,
  BarChart3,
  Target,
  Activity,
  ChevronRight,
  Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts"
import { useLeads } from "@/lib/leads-api"
import { useSalesInsights, useAnalyzeAll, useAnalyzeLead, type AnalyzeAllEvent } from "@/lib/ai-api"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

const priorityColor: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-amber-500 text-white",
  medium: "bg-blue-500 text-white",
  low: "bg-secondary text-muted-foreground",
}

const urgencyColor = (u: number) => {
  if (u >= 85) return "text-red-500"
  if (u >= 70) return "text-amber-500"
  return "text-emerald-500"
}

const urgencyBg = (u: number) => {
  if (u >= 85) return "bg-red-500"
  if (u >= 70) return "bg-amber-500"
  return "bg-emerald-500"
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
}

type AnalyzeProgress = {
  processed: number
  total: number
  current: string
}

export default function AIIntelligencePage() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads()
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useSalesInsights()
  const analyzeAll = useAnalyzeAll()
  const analyzeLead = useAnalyzeLead()

  const [progress, setProgress] = useState<AnalyzeProgress | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [analyzingLeadId, setAnalyzingLeadId] = useState<number | null>(null)

  const hotLeads = leads
    .filter((l) => (l.urgencyScore ?? 0) >= 60)
    .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0))
    .slice(0, 5)

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? hotLeads[0] ?? null

  const handleAnalyzeAll = useCallback(async () => {
    setProgress({ processed: 0, total: 0, current: "Starting…" })
    try {
      await analyzeAll.mutateAsync(undefined, {
        onSuccess: undefined,
      })
      // handled via onProgress
    } catch {
      toast.error("Analysis failed")
      setProgress(null)
    }
  }, [analyzeAll])

  const handleProgress = useCallback((e: AnalyzeAllEvent) => {
    if (e.type === "start") {
      setProgress({ processed: 0, total: e.total, current: "Analyzing…" })
    } else if (e.type === "progress") {
      setProgress({ processed: e.index, total: e.total, current: e.leadName })
    } else if (e.type === "done") {
      setProgress(null)
      toast.success("All leads analyzed")
      refetchInsights()
    } else if (e.type === "fatal") {
      setProgress(null)
      toast.error("Analysis failed")
    }
  }, [refetchInsights])

  const handleAnalyzeSingle = async (leadId: number) => {
    setAnalyzingLeadId(leadId)
    try {
      await analyzeLead.mutateAsync(leadId)
      toast.success("Lead analyzed")
      if (selectedLeadId === null) setSelectedLeadId(leadId)
    } catch {
      toast.error("Failed to analyze lead")
    } finally {
      setAnalyzingLeadId(null)
    }
  }

  const runAnalyzeAll = async () => {
    setProgress({ processed: 0, total: 0, current: "Starting…" })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ""
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")
      const res = await fetch(`${BASE}/api/ai/analyze-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Failed")
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const e = JSON.parse(line.slice(6)) as AnalyzeAllEvent
              handleProgress(e)
            } catch {}
          }
        }
      }
    } catch {
      toast.error("Analysis failed")
      setProgress(null)
    }
  }

  const isRefreshing = analyzeAll.isPending || progress !== null

  const selectedSignals = selectedLead
    ? [
        { label: "Budget fit", score: Math.min(100, (selectedLead.score ?? 50) + 10) },
        { label: "Engagement", score: selectedLead.urgencyScore ?? 50 },
        { label: "Timeline", score: Math.min(100, (selectedLead.urgencyScore ?? 50) + 5) },
        { label: "Intent", score: selectedLead.score ?? 50 },
        { label: "Readiness", score: Math.max(0, (selectedLead.score ?? 50) - 5) },
      ]
    : []

  const suggestedActions = selectedLead?.suggestedActions?.length
    ? selectedLead.suggestedActions.slice(0, 3).map((a, i) => ({
        label: a,
        priority: i === 0 ? "critical" : i === 1 ? "high" : "medium",
        Icon: i === 0 ? Phone : i === 1 ? MessageCircle : TrendingUp,
      }))
    : []

  if (leadsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="AI Lead Intelligence"
        description="Real-time insights, urgency scoring, and AI-powered recommendations from your live CRM data."
        actions={
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
              <Brain className="h-3 w-3" />
              AI Active
            </Badge>
            <Button
              variant="outline"
              className="gap-2 border-border/50"
              onClick={runAnalyzeAll}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {progress
                ? `Analyzing ${progress.processed}/${progress.total}…`
                : "Analyze All Leads"}
            </Button>
          </div>
        }
      />

      {progress && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Analyzing {progress.current}…
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border/50">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: progress.total > 0 ? `${(progress.processed / progress.total) * 100}%` : "5%",
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {progress.total > 0 ? `${progress.processed} / ${progress.total}` : "Starting…"}
            </span>
          </div>
        </motion.div>
      )}

      {/* Insight summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: Flame,
            title: insightsLoading ? "…" : `${insights?.hotLeadsCount ?? hotLeads.length} Hot Leads`,
            description: insightsLoading
              ? "Loading insights…"
              : `AI identified ${insights?.hotLeadsCount ?? hotLeads.length} leads with urgency ≥70 requiring immediate attention.`,
            color: "text-red-500",
            bg: "bg-red-500/10 border-red-500/20",
          },
          {
            icon: AlertTriangle,
            title: insightsLoading ? "…" : `${insights?.inactivityAlerts?.length ?? 0} Alerts`,
            description: insightsLoading
              ? "Loading…"
              : insights?.inactivityAlerts?.[0] ?? "No inactivity alerts at this time.",
            color: "text-amber-500",
            bg: "bg-amber-500/10 border-amber-500/20",
          },
          {
            icon: TrendingUp,
            title: insightsLoading ? "…" : `Pipeline: ${insights?.pipelineScore ?? "—"}/100`,
            description: insightsLoading
              ? "Loading…"
              : `${insights?.revenueForecasted ?? "—"} forecasted · ${insights?.conversionRate ?? "—"}% conversion`,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10 border-emerald-500/20",
          },
          {
            icon: Zap,
            title: insightsLoading ? "…" : `Avg Score: ${insights?.avgScore ?? "—"}`,
            description: insightsLoading
              ? "Loading…"
              : insights?.topInsights?.[0] ?? "Run analysis to generate insights.",
            color: "text-primary",
            bg: "bg-primary/10 border-primary/20",
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn("glass-card border p-5", card.bg)}
          >
            <card.icon className={cn("mb-3 h-6 w-6", card.color)} />
            <p className="font-semibold text-foreground">{card.title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{card.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Main: hot leads + detail panel */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Lead list */}
        <div className="xl:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Urgent Leads
            </h3>
            <span className="text-xs text-muted-foreground">{hotLeads.length} leads</span>
          </div>

          {hotLeads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
              <Brain className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No high-urgency leads yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Run "Analyze All Leads" to score your pipeline.</p>
            </div>
          ) : (
            hotLeads.map((lead) => (
              <motion.button
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all",
                  (selectedLead?.id === lead.id)
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 bg-card hover:border-primary/20 hover:bg-secondary/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-sm font-semibold text-primary-foreground">
                      {lead.avatar || lead.name.slice(0, 2).toUpperCase()}
                    </div>
                    {(lead.urgencyScore ?? 0) >= 80 && (
                      <Flame className="absolute -bottom-1 -right-1 h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{lead.property || lead.status}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-border/50">
                        <div
                          className={cn("h-full rounded-full transition-all", urgencyBg(lead.urgencyScore ?? 50))}
                          style={{ width: `${lead.urgencyScore ?? 50}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-bold tabular-nums", urgencyColor(lead.urgencyScore ?? 50))}>
                        {lead.urgencyScore ?? 50}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Urgency score</p>
                  </div>
                </div>
              </motion.button>
            ))
          )}

          {/* Sales insights block */}
          {insights && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/40 bg-card p-4 space-y-3 mt-2"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sales Insights
              </p>
              <div className="space-y-2">
                {insights.topInsights?.slice(0, 3).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary/60" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                {insights.weeklyTrend === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : insights.weeklyTrend === "down" ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={cn(
                  "text-xs font-semibold",
                  insights.weeklyTrend === "up" ? "text-emerald-500" :
                  insights.weeklyTrend === "down" ? "text-red-500" : "text-muted-foreground"
                )}>
                  {insights.weeklyTrend === "up" ? "+" : insights.weeklyTrend === "down" ? "-" : ""}
                  {insights.weeklyTrendPercent}% this week
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-2">
          <AnimatePresence mode="wait">
            {selectedLead ? (
              <motion.div
                key={selectedLead.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-6 space-y-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-base font-semibold text-primary-foreground">
                      {selectedLead.avatar || selectedLead.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{selectedLead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLead.property || "—"} · {selectedLead.budget || "Budget TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3 py-1.5",
                      (selectedLead.urgencyScore ?? 0) >= 80
                        ? "border-red-500/20 bg-red-500/10"
                        : "border-amber-500/20 bg-amber-500/10"
                    )}>
                      <Flame className="h-4 w-4 text-red-500" />
                      <span className={cn("text-lg font-bold", urgencyColor(selectedLead.urgencyScore ?? 50))}>
                        {selectedLead.urgencyScore ?? 50}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-border/50 text-xs"
                      onClick={() => handleAnalyzeSingle(selectedLead.id)}
                      disabled={analyzingLeadId === selectedLead.id}
                    >
                      {analyzingLeadId === selectedLead.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Brain className="h-3 w-3" />
                      )}
                      Analyze
                    </Button>
                    <Link href={`/dashboard/leads/${selectedLead.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 border-border/50 text-xs">
                        View Profile
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">AI Summary</p>
                    {!selectedLead.aiSummary && (
                      <Badge variant="outline" className="ml-auto border-muted/40 text-muted-foreground text-[10px]">
                        Not analyzed yet
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {selectedLead.aiSummary ||
                      `${selectedLead.name} is a ${selectedLead.priority} priority lead at the ${selectedLead.status} stage. Click "Analyze" to generate a detailed AI summary based on their activity and messages.`}
                  </p>
                </div>

                {/* Radar + actions */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Signal Radar
                    </p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={selectedSignals}>
                          <PolarGrid className="stroke-border/40" />
                          <PolarAngleAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                          />
                          <Radar
                            dataKey="score"
                            stroke="oklch(0.65 0.15 75)"
                            fill="oklch(0.65 0.15 75)"
                            fillOpacity={0.25}
                            strokeWidth={2}
                          />
                          <Tooltip
                            formatter={(v) => [`${v}/100`, "Score"]}
                            contentStyle={tooltipStyle}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Suggested Actions
                    </p>
                    {suggestedActions.length > 0 ? (
                      suggestedActions.map((action) => (
                        <button
                          key={action.label}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90",
                            priorityColor[action.priority]
                          )}
                        >
                          <action.Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate text-left">{action.label}</span>
                          <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0" />
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/50 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Analyze this lead to get suggested actions.
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                        <div>
                          <p className="text-xs font-semibold text-amber-600">Smart Reminder</p>
                          <p className="text-xs text-foreground">
                            {selectedLead.lastContact
                              ? `Last contact: ${selectedLead.lastContact}. Follow up soon.`
                              : "No contact recorded — reach out today."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs text-foreground">
                          Lead score: <strong>{selectedLead.score ?? 50}/100</strong> · Status:{" "}
                          <strong className="capitalize">{selectedLead.status}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-12 flex flex-col items-center justify-center gap-3 text-center h-full min-h-64"
              >
                <Brain className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-base font-semibold text-muted-foreground">Select a lead</p>
                <p className="text-sm text-muted-foreground/60">
                  Choose a lead from the list to view AI insights
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pipeline stats row */}
      {insights && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Users, label: "Total Leads", value: insights.totalLeads, color: "text-primary" },
            { icon: Target, label: "Avg Lead Score", value: `${insights.avgScore}/100`, color: "text-emerald-500" },
            { icon: BarChart3, label: "Pipeline Value", value: `$${(insights.totalDealValue / 1e6).toFixed(1)}M`, color: "text-amber-500" },
            { icon: Activity, label: "Conversion Rate", value: `${insights.conversionRate}%`, color: "text-blue-500" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className={cn("rounded-xl p-2.5 bg-secondary/50")}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Inactivity alerts */}
      {insights?.inactivityAlerts && insights.inactivityAlerts.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-foreground">Inactivity Alerts</p>
          </div>
          <div className="space-y-2">
            {insights.inactivityAlerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-foreground">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
