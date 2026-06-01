import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, formatDistanceToNow } from "date-fns"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Zap,
  Plus,
  Clock,
  RefreshCw,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
  Activity,
  ScrollText,
  Settings2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useAutomations,
  useAutomationLogs,
  useCreateAutomation,
  useUpdateAutomation,
  useToggleAutomation,
  useDeleteAutomation,
  type Automation,
  type Condition,
  type AutomationAction,
} from "@/lib/automations-api"

const TRIGGER_OPTIONS = [
  { value: "lead_created", label: "Lead Created" },
  { value: "lead_status_changed", label: "Lead Status Changed" },
  { value: "message_received", label: "Message Received" },
  { value: "lead_score_updated", label: "Lead Score Updated" },
]

const CONDITION_FIELDS = [
  { value: "newStatus", label: "New Status" },
  { value: "previousStatus", label: "Previous Status" },
  { value: "newScore", label: "New Score" },
  { value: "priority", label: "Priority" },
  { value: "source", label: "Source" },
]

const CONDITION_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
]

const ACTION_TYPES = [
  { value: "notify", label: "Send Notification" },
  { value: "assign_agent", label: "Assign Agent" },
  { value: "update_status", label: "Update Lead Status" },
  { value: "update_priority", label: "Update Priority" },
  { value: "log_activity", label: "Log Activity" },
]

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"]

type FormState = {
  name: string
  description: string
  triggerType: string
  conditions: Condition[]
  actions: AutomationAction[]
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  triggerType: "lead_created",
  conditions: [],
  actions: [{ type: "notify", config: { title: "Automation Alert", message: "Automation triggered for {{lead_name}}", notificationType: "automation", userId: "" } }],
  isActive: true,
}

function ActionConfigFields({ action, onChange }: { action: AutomationAction; onChange: (c: Record<string, unknown>) => void }) {
  const cfg = action.config
  if (action.type === "notify") {
    return (
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input value={(cfg.title as string) || ""} onChange={e => onChange({ ...cfg, title: e.target.value })} placeholder="Notification title" className="h-8 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Message (use {"{{lead_name}}"} or {"{{lead_status}}"})</Label>
          <Textarea value={(cfg.message as string) || ""} onChange={e => onChange({ ...cfg, message: e.target.value })} placeholder="Notification message..." className="text-sm mt-1 min-h-[60px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">User ID to notify</Label>
          <Input value={(cfg.userId as string) || ""} onChange={e => onChange({ ...cfg, userId: e.target.value })} placeholder="User ID" className="h-8 text-sm mt-1" />
        </div>
      </div>
    )
  }
  if (action.type === "assign_agent") {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">Agent Name</Label>
        <Input value={(cfg.agentName as string) || ""} onChange={e => onChange({ ...cfg, agentName: e.target.value })} placeholder="e.g. Sarah Johnson" className="h-8 text-sm mt-1" />
      </div>
    )
  }
  if (action.type === "update_status") {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">New Status</Label>
        <Select value={(cfg.status as string) || ""} onValueChange={v => onChange({ ...cfg, status: v })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    )
  }
  if (action.type === "update_priority") {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">Priority</Label>
        <Select value={(cfg.priority as string) || ""} onValueChange={v => onChange({ ...cfg, priority: v })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Select priority" /></SelectTrigger>
          <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    )
  }
  if (action.type === "log_activity") {
    return (
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Activity Title (use {"{{lead_name}}"})</Label>
          <Input value={(cfg.title as string) || ""} onChange={e => onChange({ ...cfg, title: e.target.value })} placeholder="e.g. Auto-follow-up for {{lead_name}}" className="h-8 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Activity Type</Label>
          <Select value={(cfg.activityType as string) || "system"} onValueChange={v => onChange({ ...cfg, activityType: v })}>
            <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["system", "note", "call", "email"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }
  return null
}

function AutomationFormDialog({
  open,
  onClose,
  editingAutomation,
}: {
  open: boolean
  onClose: () => void
  editingAutomation?: Automation | null
}) {
  const { toast } = useToast()
  const create = useCreateAutomation()
  const update = useUpdateAutomation()
  const isEdit = !!editingAutomation

  const [form, setForm] = useState<FormState>(() =>
    editingAutomation
      ? {
          name: editingAutomation.name,
          description: editingAutomation.description ?? "",
          triggerType: editingAutomation.triggerType,
          conditions: editingAutomation.conditions ?? [],
          actions: editingAutomation.actions ?? [],
          isActive: editingAutomation.isActive,
        }
      : { ...EMPTY_FORM }
  )

  const addCondition = () =>
    setForm((f) => ({
      ...f,
      conditions: [...f.conditions, { field: "newStatus", operator: "equals", value: "" }],
    }))

  const updateCondition = (i: number, c: Condition) =>
    setForm((f) => ({ ...f, conditions: f.conditions.map((x, idx) => (idx === i ? c : x)) }))

  const removeCondition = (i: number) =>
    setForm((f) => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }))

  const addAction = () =>
    setForm((f) => ({
      ...f,
      actions: [...f.actions, { type: "notify", config: { title: "Alert", message: "", userId: "" } }],
    }))

  const updateAction = (i: number, a: AutomationAction) =>
    setForm((f) => ({ ...f, actions: f.actions.map((x, idx) => (idx === i ? a : x)) }))

  const removeAction = (i: number) =>
    setForm((f) => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }))

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return }
    if (form.actions.length === 0) { toast({ title: "Add at least one action", variant: "destructive" }); return }
    try {
      if (isEdit && editingAutomation) {
        await update.mutateAsync({ id: editingAutomation.id, ...form })
        toast({ title: "Automation updated" })
      } else {
        await create.mutateAsync(form)
        toast({ title: "Automation created" })
      }
      onClose()
    } catch {
      toast({ title: "Failed to save automation", variant: "destructive" })
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Automation" : "New Automation Rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome New Leads" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this rule do?" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Trigger</Label>
              <Select value={form.triggerType} onValueChange={v => setForm(f => ({ ...f, triggerType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Conditions <span className="text-muted-foreground font-normal">(all must match)</span></Label>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addCondition}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {form.conditions.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No conditions — rule runs on every trigger</p>
            )}
            <div className="space-y-2">
              {form.conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={cond.field} onValueChange={v => updateCondition(i, { ...cond, field: v })}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={cond.operator} onValueChange={v => updateCondition(i, { ...cond, operator: v })}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_OPERATORS.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={String(cond.value ?? "")} onChange={e => updateCondition(i, { ...cond, value: e.target.value })} placeholder="value" className="h-8 text-xs flex-1" />
                  <button onClick={() => removeCondition(i)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Actions</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addAction}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {form.actions.map((action, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={action.type} onValueChange={v => updateAction(i, { type: v, config: {} })}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <button onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                  <ActionConfigFields action={action} onChange={cfg => updateAction(i, { ...action, config: cfg })} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
              {form.isActive
                ? <ToggleRight className="h-6 w-6 text-primary" />
                : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
            </button>
            <span className="text-sm">{form.isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LogStatusBadge({ status }: { status: string }) {
  if (status === "success") return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />success</Badge>
  if (status === "error") return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs gap-1"><XCircle className="h-3 w-3" />error</Badge>
  if (status === "partial") return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs gap-1"><AlertTriangle className="h-3 w-3" />partial</Badge>
  return <Badge variant="outline" className="text-xs">{status}</Badge>
}

function AutomationRow({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: Automation
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useToggleAutomation()
  const del = useDeleteAutomation()

  const triggerLabel = TRIGGER_OPTIONS.find(t => t.value === rule.triggerType)?.label ?? rule.triggerType

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      rule.isActive ? "border-border/50 bg-secondary/20" : "border-border/30 bg-secondary/5 opacity-60"
    )}>
      <div className="flex items-start gap-3 p-4">
        <div className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border/40",
          rule.isActive ? "bg-secondary/50" : "bg-secondary/20"
        )}>
          <Zap className={cn("h-4 w-4", rule.isActive ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{rule.name}</p>
            {rule.lastRunStatus && (
              <LogStatusBadge status={rule.lastRunStatus} />
            )}
            {rule.runCount > 0 && (
              <Badge variant="outline" className="text-xs border-border/50">
                {rule.runCount} run{rule.runCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {rule.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Trigger:</span> {triggerLabel}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {rule.actions.map((a, i) => {
              const label = ACTION_TYPES.find(at => at.value === a.type)?.label ?? a.type
              return <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{label}</span>
            })}
          </div>
          {rule.lastRunAt && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Last run {formatDistanceToNow(new Date(rule.lastRunAt), { addSuffix: true })}
              {rule.errorCount > 0 && <span className="ml-2 text-red-500">{rule.errorCount} error{rule.errorCount > 1 ? "s" : ""}</span>}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button onClick={() => setExpanded(e => !e)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={onEdit} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
            <Settings2 className="h-4 w-4" />
          </button>
          <button onClick={onToggle} disabled={toggle.isPending} className="text-muted-foreground transition-colors hover:text-foreground">
            {rule.isActive ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6" />}
          </button>
          <button
            onClick={onDelete}
            disabled={del.isPending}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30 px-4 pb-3 pt-3"
          >
            <RuleDetails rule={rule} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RuleDetails({ rule }: { rule: Automation }) {
  return (
    <div className="space-y-3 text-sm">
      {rule.conditions && rule.conditions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">CONDITIONS</p>
          <div className="space-y-1">
            {rule.conditions.map((c, i) => (
              <p key={i} className="text-xs">
                <span className="text-foreground/70">{CONDITION_FIELDS.find(f => f.value === c.field)?.label ?? c.field}</span>
                {" "}<span className="text-muted-foreground">{CONDITION_OPERATORS.find(op => op.value === c.operator)?.label ?? c.operator}</span>
                {" "}<span className="font-medium text-primary">"{String(c.value)}"</span>
              </p>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">ACTIONS</p>
        <div className="space-y-1">
          {rule.actions.map((a, i) => {
            const label = ACTION_TYPES.find(at => at.value === a.type)?.label ?? a.type
            const configSummary = Object.entries(a.config)
              .filter(([k]) => !["userId", "notificationType"].includes(k))
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(", ")
            return (
              <p key={i} className="text-xs">
                <span className="font-medium text-foreground">{label}</span>
                {configSummary && <span className="text-muted-foreground ml-1">— {configSummary}</span>}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ExecutionLogsPanel({ automationId }: { automationId?: number }) {
  const { data: logs, isLoading } = useAutomationLogs(automationId, 30)

  if (isLoading) return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )

  if (!logs || logs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
      <ScrollText className="h-8 w-8 opacity-30" />
      <p>No execution logs yet</p>
      <p className="text-xs">Logs appear here when automations are triggered</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="rounded-lg border border-border/40 bg-secondary/10 p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <LogStatusBadge status={log.status} />
              <span className="text-xs font-medium text-foreground">
                {TRIGGER_OPTIONS.find(t => t.value === log.triggerType)?.label ?? log.triggerType}
              </span>
              {log.leadId && <span className="text-xs text-muted-foreground">Lead #{log.leadId}</span>}
            </div>
            <div className="flex items-center gap-2">
              {log.durationMs && <span className="text-[10px] text-muted-foreground">{log.durationMs}ms</span>}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          {log.actionsExecuted && log.actionsExecuted.length > 0 && (
            <div className="space-y-0.5">
              {log.actionsExecuted.map((a, i) => (
                <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                  {a.error ? <XCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />}
                  <span><span className="font-medium text-foreground/70">{a.type}:</span> {a.result}</span>
                </p>
              ))}
            </div>
          )}
          {log.errorMessage && (
            <p className="mt-1 text-[10px] text-red-500">{log.errorMessage}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AutomationsPage() {
  const { data: automationRules, isLoading } = useAutomations()
  const toggle = useToggleAutomation()
  const del = useDeleteAutomation()
  const { toast } = useToast()

  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all")
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [selectedLogAutomation, setSelectedLogAutomation] = useState<number | undefined>()

  const rules = automationRules ?? []
  const filtered = filter === "all" ? rules : filter === "active" ? rules.filter(r => r.isActive) : rules.filter(r => !r.isActive)
  const activeCount = rules.filter(r => r.isActive).length
  const totalRuns = rules.reduce((s, r) => s + (r.runCount ?? 0), 0)
  const totalErrors = rules.reduce((s, r) => s + (r.errorCount ?? 0), 0)

  const handleToggle = async (id: number) => {
    try {
      await toggle.mutateAsync(id)
    } catch {
      toast({ title: "Failed to toggle automation", variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await del.mutateAsync(id)
      toast({ title: "Automation deleted" })
    } catch {
      toast({ title: "Failed to delete automation", variant: "destructive" })
    }
  }

  const openCreate = () => {
    setEditingAutomation(null)
    setDialogOpen(true)
  }

  const openEdit = (rule: Automation) => {
    setEditingAutomation(rule)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Follow-Up Automation"
        description="Create rule-based automation to act on real lead events — no simulations."
        actions={
          <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" />
            New Rule
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Active Rules", value: activeCount, icon: Zap, color: "text-primary" },
          { label: "Total Runs", value: totalRuns, icon: RefreshCw, color: "text-emerald-500" },
          { label: "Total Rules", value: rules.length, icon: Activity, color: "text-blue-500" },
          { label: "Errors", value: totalErrors, icon: AlertTriangle, color: totalErrors > 0 ? "text-red-500" : "text-muted-foreground" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {isLoading ? <span className="text-xl text-muted-foreground">—</span> : stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-border/50">
          {(["rules", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "rules" ? <Zap className="h-4 w-4" /> : <ScrollText className="h-4 w-4" />}
              {tab === "rules" ? "Automation Rules" : "Execution Logs"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "rules" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">Rules</h3>
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} rule{filtered.length !== 1 ? "s" : ""} · triggers execute in real-time
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(["all", "active", "inactive"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Zap className="h-10 w-10 opacity-20" />
                  <p className="font-medium">No automation rules yet</p>
                  <p className="text-sm">Create your first rule to automate lead actions</p>
                  <Button onClick={openCreate} size="sm" className="gap-2 mt-1">
                    <Plus className="h-4 w-4" /> Create Rule
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((rule) => (
                    <AutomationRow
                      key={rule.id}
                      rule={rule}
                      onEdit={() => openEdit(rule)}
                      onDelete={() => handleDelete(rule.id)}
                      onToggle={() => handleToggle(rule.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">Execution Logs</h3>
                  <p className="text-xs text-muted-foreground">Real execution history — every trigger, condition check and action</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedLogAutomation ? String(selectedLogAutomation) : "all"}
                    onValueChange={v => setSelectedLogAutomation(v === "all" ? undefined : parseInt(v, 10))}
                  >
                    <SelectTrigger className="h-8 text-xs w-44">
                      <SelectValue placeholder="All automations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All automations</SelectItem>
                      {rules.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ExecutionLogsPanel automationId={selectedLogAutomation} />
            </div>
          )}
        </div>
      </div>

      <AutomationFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingAutomation(null) }}
        editingAutomation={editingAutomation}
      />
    </div>
  )
}
