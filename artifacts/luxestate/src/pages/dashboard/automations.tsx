import { useState } from "react"
import { Zap, GitBranch, MessageSquare, UserCheck, Bell, Play, Plus, Clock, ChevronRight, Activity } from "lucide-react"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const TEMPLATE_AUTOMATIONS = [
  {
    id: 1,
    name: "Follow-up on New Leads",
    trigger: "Lead created",
    action: "Send WhatsApp message after 1 hour",
    icon: MessageSquare,
    color: "text-green-500",
    bg: "bg-green-500/10",
    active: false,
    runs: 0,
  },
  {
    id: 2,
    name: "Re-engage Cold Leads",
    trigger: "Lead inactive for 7 days",
    action: "Send follow-up + assign reminder",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    active: false,
    runs: 0,
  },
  {
    id: 3,
    name: "Auto-assign Hot Leads",
    trigger: "Lead score ≥ 80",
    action: "Assign to top agent + notify via WhatsApp",
    icon: UserCheck,
    color: "text-primary",
    bg: "bg-primary/10",
    active: false,
    runs: 0,
  },
  {
    id: 4,
    name: "Deal Stage Notification",
    trigger: "Deal moves to Negotiation",
    action: "Notify manager + create follow-up task",
    icon: Bell,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    active: false,
    runs: 0,
  },
  {
    id: 5,
    name: "Welcome New Lead",
    trigger: "Lead imported from Facebook",
    action: "Send personalised welcome message",
    icon: Zap,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    active: false,
    runs: 0,
  },
]

function AutomationCard({ automation }: { automation: typeof TEMPLATE_AUTOMATIONS[0] }) {
  const [active, setActive] = useState(automation.active)
  const Icon = automation.icon

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      active ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card hover:border-border"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5", automation.bg)}>
            <Icon className={cn("h-4 w-4", automation.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{automation.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-0.5">{automation.trigger}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="rounded-md bg-muted px-2 py-0.5">{automation.action}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">Active</Badge>}
          <button
            onClick={() => setActive(v => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none",
              active ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
              active ? "translate-x-4" : "translate-x-0.5"
            )} />
          </button>
        </div>
      </div>
      {active && (
        <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border/40">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">0 runs · Ready to trigger</span>
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs gap-1.5">
            <Play className="h-3 w-3" /> Test
          </Button>
        </div>
      )}
    </div>
  )
}

function WorkflowBuilder() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-16 text-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <GitBranch className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Visual Workflow Builder</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">Drag-and-drop automation designer with trigger → condition → action flows. Coming in the next release.</p>
      </div>
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Plus className="h-3.5 w-3.5" /> Create Workflow
      </Button>
    </div>
  )
}

function LogsTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-16 text-center gap-3">
      <Activity className="h-8 w-8 text-muted-foreground opacity-40" />
      <p className="text-sm font-medium text-foreground">No automation runs yet</p>
      <p className="text-xs text-muted-foreground">Enable automations above to start seeing execution logs here.</p>
    </div>
  )
}

export default function AutomationsPage() {
  const [tab, setTab] = useState("automations")

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="Automations"
        description="No-code workflows that trigger actions automatically based on CRM events."
        actions={
          <Button size="sm" className="gap-2" disabled>
            <Plus className="h-4 w-4" /> New Automation
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="automations" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Automations
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Builder
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="mt-0 space-y-3">
          <p className="text-xs text-muted-foreground">Toggle automations on to activate them. Full execution begins when the backend pipeline is live.</p>
          {TEMPLATE_AUTOMATIONS.map(a => (
            <AutomationCard key={a.id} automation={a} />
          ))}
        </TabsContent>

        <TabsContent value="builder" className="mt-0">
          <WorkflowBuilder />
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
