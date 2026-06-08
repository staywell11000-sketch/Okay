import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, Brain, Cpu, Save, RefreshCw, Activity, Clock, TrendingUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const MODELS = [
  { value: "gpt-4o-mini", label: "Standard", badge: "Fast & Affordable", badgeColor: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "gpt-4o",      label: "Advanced",  badge: "Highest Quality",   badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { value: "gpt-4-turbo", label: "Enhanced",  badge: "High Intelligence", badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
]

const CLASSES = [
  {
    key: "A" as const,
    icon: Zap,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    label: "Class A — Fast & Efficient",
    description: "Simple generation tasks that need speed over complexity.",
    features: ["Lead Summaries", "Reply Suggestions", "Conversation Summaries", "Property Matching"],
    costNote: "Lowest cost per action",
  },
  {
    key: "B" as const,
    icon: Cpu,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    label: "Class B — Balanced Intelligence",
    description: "Structured analysis tasks requiring moderate reasoning.",
    features: ["Lead Analysis", "Deal Insights", "Risk Detection"],
    costNote: "Moderate cost per action",
  },
  {
    key: "C" as const,
    icon: Brain,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
    label: "Class C — Maximum Intelligence",
    description: "Complex strategic tasks requiring the deepest reasoning.",
    features: ["AI Assistant Chat", "Sales Insights", "Business Insights", "Bulk Analysis"],
    costNote: "Higher cost per action",
  },
]

export default function AdminAiSettings() {
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin-ai-model-config"],
    queryFn: () => apiFetch("/api/admin/ai-model-config").then(r => r.json()).catch(() => ({ A: "gpt-4o-mini", B: "gpt-4o-mini", C: "gpt-4o-mini" })),
  })

  const { data: obsData } = useQuery({
    queryKey: ["admin-ai-observability"],
    queryFn: () => apiFetch("/api/admin/ai-observability").then(r => r.json()).catch(() => ({ stats: [] })),
    staleTime: 60_000,
  })

  const [draft, setDraft] = useState<Record<string, string>>({})
  const effective = { A: "gpt-4o-mini", B: "gpt-4o-mini", C: "gpt-4o-mini", ...config, ...draft }

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/ai-model-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(effective),
    }).then(r => { if (!r.ok) throw new Error("Failed to save"); return r.json() }),
    onSuccess: () => {
      toast({ title: "Model config saved", description: "Changes take effect within 5 minutes." })
      setDraft({})
      qc.invalidateQueries({ queryKey: ["admin-ai-model-config"] })
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  })

  const obsStats: any[] = obsData?.stats ?? []
  const avgByClass = CLASSES.map(cls => {
    const rows = obsStats.filter((r: any) => r.feature_class === cls.key)
    const avg = rows.length > 0 ? Math.round(rows.reduce((s: number, r: any) => s + Number(r.avg_response_ms ?? 0), 0) / rows.length) : null
    return { class: cls.key, avg, calls: rows.reduce((s: number, r: any) => s + Number(r.calls ?? 0), 0) }
  })

  const isDirty = Object.keys(draft).length > 0

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Model Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Assign AI models to each feature class. Users never see model names.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Observability row */}
      <div className="grid grid-cols-3 gap-4">
        {avgByClass.map(s => (
          <Card key={s.class}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Class {s.class}</span>
              </div>
              <p className="text-lg font-bold">{s.avg != null ? `${s.avg}ms` : "—"}</p>
              <p className="text-xs text-muted-foreground">{s.calls.toLocaleString()} calls tracked</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Model assignments */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          CLASSES.map(cls => {
            const Icon = cls.icon
            const currentModel = effective[cls.key]
            const modelInfo = MODELS.find(m => m.value === currentModel) ?? MODELS[0]
            return (
              <Card key={cls.key} className={cn(draft[cls.key] && "ring-2 ring-primary/30")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", cls.iconBg)}>
                        <Icon className={cn("h-4.5 w-4.5", cls.iconColor)} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{cls.label}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{cls.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", modelInfo.badgeColor)}>
                      {modelInfo.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {cls.features.map(f => (
                      <span key={f} className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{f}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Select
                        value={currentModel}
                        onValueChange={val => setDraft(d => ({ ...d, [cls.key]: val }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS.map(m => (
                            <SelectItem key={m.value} value={m.value}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">AI Model — {m.label}</span>
                                <span className="text-xs text-muted-foreground">({m.badge})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{cls.costNote}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Fallback Protection</p>
          <p className="text-xs text-muted-foreground mt-1">
            If the assigned model fails, the system automatically falls back to the Standard model.
            Users see a seamless experience. Failures are logged in the observability table.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
