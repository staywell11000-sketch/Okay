import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plus, DollarSign, ClipboardList, CheckCircle2, Clock,
  TrendingUp, Building2, User, ChevronDown, ChevronUp,
  MoreHorizontal, XCircle, Loader2, Pencil, Trash2, Save, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { surfaceInputClass, surfaceSelectClass } from "@/lib/ui-classes"
import {
  useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal,
  Deal, DealStage, CreateDealInput,
} from "@/lib/deals-api"
import { useLeads } from "@/lib/leads-api"
import { toast } from "sonner"

const STAGES: DealStage[] = ["new", "contacted", "negotiation", "won", "lost"]

const stageConfig: Record<DealStage, { label: string; color: string; bg: string; progress: number }> = {
  new:         { label: "New",         color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20",    progress: 10 },
  contacted:   { label: "Contacted",   color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20",  progress: 30 },
  negotiation: { label: "Negotiation", color: "text-purple-500",  bg: "bg-purple-500/10 border-purple-500/20", progress: 65 },
  won:         { label: "Won",         color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", progress: 100 },
  lost:        { label: "Lost",        color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20",      progress: 0 },
}

function fmt(value: string | null | undefined): string {
  const n = parseFloat(value ?? "0")
  if (isNaN(n) || n === 0) return "—"
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

// ── Create Deal Modal ────────────────────────────────────────────────────────

type CreateModalProps = { onClose: () => void }

function CreateDealModal({ onClose }: CreateModalProps) {
  const { data: leads = [] } = useLeads()
  const createDeal = useCreateDeal()
  const [form, setForm] = useState<CreateDealInput>({
    title: "",
    leadId: null,
    stage: "new",
    value: "",
    notes: "",
    expectedCloseDate: "",
    probability: null,
  })

  const set = <K extends keyof CreateDealInput>(k: K, v: CreateDealInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (): Promise<void> => {
    if (!form.title.trim()) { toast.error("Title is required"); return }
    try {
      await createDeal.mutateAsync({
        ...form,
        value: form.value || null,
        expectedCloseDate: form.expectedCloseDate || null,
        leadId: form.leadId || null,
      })
      toast.success("Deal created")
      onClose()
    } catch {
      toast.error("Failed to create deal")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-card overflow-hidden border-primary/20"
    >
      <div className="p-5">
        <p className="mb-4 font-semibold text-foreground">New Deal</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Deal title *"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={surfaceInputClass}
          />
          <div className="relative">
            <select
              value={form.leadId ?? ""}
              onChange={(e) => set("leadId", e.target.value ? parseInt(e.target.value) : null)}
              className={surfaceSelectClass}
            >
              <option value="">Link to lead (optional)</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="relative">
            <select
              value={form.stage}
              onChange={(e) => set("stage", e.target.value as DealStage)}
              className={surfaceSelectClass}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{stageConfig[s].label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Input
            placeholder="Deal value (e.g. 5000000)"
            value={form.value ?? ""}
            onChange={(e) => set("value", e.target.value)}
            className={surfaceInputClass}
          />
          <Input
            type="date"
            placeholder="Expected close date"
            value={form.expectedCloseDate ?? ""}
            onChange={(e) => set("expectedCloseDate", e.target.value)}
            className={surfaceInputClass}
          />
          <Input
            type="number"
            placeholder="Probability % (0–100)"
            min={0}
            max={100}
            value={form.probability ?? ""}
            onChange={(e) => set("probability", e.target.value ? parseInt(e.target.value) : null)}
            className={surfaceInputClass}
          />
        </div>
        <textarea
          placeholder="Notes (optional)"
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className={cn(surfaceInputClass, "mt-3 w-full resize-none")}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.title.trim() || createDeal.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createDeal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Deal"}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Expanded Deal Detail ─────────────────────────────────────────────────────

type DetailProps = { deal: Deal; onClose: () => void }

function DealDetail({ deal, onClose }: DetailProps) {
  const updateDeal = useUpdateDeal()
  const { data: leads = [] } = useLeads()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: deal.title,
    stage: deal.stage as DealStage,
    value: deal.value ?? "",
    notes: deal.notes ?? "",
    expectedCloseDate: deal.expectedCloseDate
      ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
      : "",
    probability: deal.probability ?? "",
    lostReason: deal.lostReason ?? "",
    leadId: deal.leadId ?? "",
  })

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    try {
      await updateDeal.mutateAsync({
        id: deal.id,
        updates: {
          title: form.title,
          stage: form.stage,
          value: form.value ? String(form.value) : null,
          notes: form.notes,
          expectedCloseDate: form.expectedCloseDate || null,
          probability: form.probability !== "" ? Number(form.probability) : null,
          lostReason: form.lostReason || null,
          leadId: form.leadId ? Number(form.leadId) : null,
        },
      })
      toast.success("Deal saved")
      setEditing(false)
    } catch {
      toast.error("Failed to save deal")
    }
  }

  const cfg = stageConfig[deal.stage]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border-t border-border/50"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Deal Details
          </p>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 gap-1 text-xs">
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateDeal.isPending} className="h-7 gap-1 bg-primary text-xs hover:bg-primary/90">
                  {updateDeal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 gap-1 border-border/50 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Title */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Title</p>
            {editing
              ? <Input value={form.title} onChange={(e) => set("title", e.target.value)} className={cn(surfaceInputClass, "h-8 text-sm")} />
              : <p className="font-semibold text-foreground">{deal.title}</p>}
          </div>

          {/* Stage */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Stage</p>
            {editing ? (
              <div className="relative">
                <select value={form.stage} onChange={(e) => set("stage", e.target.value as DealStage)} className={cn(surfaceSelectClass, "h-8 text-sm")}>
                  {STAGES.map((s) => <option key={s} value={s}>{stageConfig[s].label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            ) : (
              <Badge variant="outline" className={cn("text-xs", cfg.bg, cfg.color)}>{cfg.label}</Badge>
            )}
          </div>

          {/* Value */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Deal Value</p>
            {editing
              ? <Input value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="e.g. 5000000" className={cn(surfaceInputClass, "h-8 text-sm")} />
              : <p className="font-semibold text-foreground">{fmt(deal.value)}</p>}
          </div>

          {/* Lead */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Linked Lead</p>
            {editing ? (
              <div className="relative">
                <select value={form.leadId} onChange={(e) => set("leadId", e.target.value)} className={cn(surfaceSelectClass, "h-8 text-sm")}>
                  <option value="">No lead</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            ) : (
              <p className="text-sm text-foreground">{deal.leadName ?? "—"}</p>
            )}
          </div>

          {/* Close Date */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Expected Close</p>
            {editing
              ? <Input type="date" value={form.expectedCloseDate} onChange={(e) => set("expectedCloseDate", e.target.value)} className={cn(surfaceInputClass, "h-8 text-sm")} />
              : <p className="text-sm text-foreground">{fmtDate(deal.expectedCloseDate)}</p>}
          </div>

          {/* Probability */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Probability</p>
            {editing
              ? <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => set("probability", e.target.value)} placeholder="0–100" className={cn(surfaceInputClass, "h-8 text-sm")} />
              : <p className="text-sm text-foreground">{deal.probability != null ? `${deal.probability}%` : "—"}</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <p className="mb-1 text-xs text-muted-foreground">Notes</p>
          {editing
            ? <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={cn(surfaceInputClass, "w-full resize-none text-sm")} />
            : <p className="text-sm text-foreground/80 whitespace-pre-wrap">{deal.notes || "No notes."}</p>}
        </div>

        {/* Lost reason */}
        {(deal.stage === "lost" || form.stage === "lost") && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-muted-foreground">Lost Reason</p>
            {editing
              ? <Input value={form.lostReason} onChange={(e) => set("lostReason", e.target.value)} placeholder="Why was this deal lost?" className={cn(surfaceInputClass, "h-8 text-sm")} />
              : <p className="text-sm text-red-400">{deal.lostReason || "—"}</p>}
          </div>
        )}

        {/* Meta */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-border/40 pt-4">
          <span className="text-xs text-muted-foreground">Created {fmtDate(deal.createdAt)}</span>
          {deal.closedAt && <span className="text-xs text-muted-foreground">Closed {fmtDate(deal.closedAt)}</span>}
          <span className="text-xs text-muted-foreground">Status: <span className={deal.status === "active" ? "text-emerald-500" : "text-muted-foreground"}>{deal.status}</span></span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Deal Card ────────────────────────────────────────────────────────────────

type CardProps = { deal: Deal; index: number }

function DealCard({ deal, index }: CardProps) {
  const updateDeal = useUpdateDeal()
  const deleteDeal = useDeleteDeal()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cfg = stageConfig[deal.stage]
  const progress = cfg.progress

  const handleStageChange = async (stage: DealStage) => {
    try {
      await updateDeal.mutateAsync({ id: deal.id, updates: { stage } })
      toast.success(`Moved to ${stageConfig[stage].label}`)
    } catch {
      toast.error("Failed to update stage")
    }
  }

  const handleDelete = async () => {
    try {
      await deleteDeal.mutateAsync(deal.id)
      toast.success("Deal deleted")
    } catch {
      toast.error("Failed to delete deal")
    }
    setConfirmDelete(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ delay: index * 0.05 }}
        className="glass-card overflow-hidden"
      >
        {/* Card header row */}
        <div
          className="flex w-full cursor-pointer items-start gap-4 p-5 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Avatar */}
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-sm font-bold text-primary-foreground">
            {deal.leadName ? initials(deal.leadName) : <Building2 className="h-5 w-5" />}
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-foreground">{deal.title}</p>
              <Badge variant="outline" className={cn("text-xs", cfg.bg, cfg.color)}>
                {cfg.label}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {deal.leadName && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />{deal.leadName}
                </span>
              )}
              {deal.expectedCloseDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />Close {fmtDate(deal.expectedCloseDate)}
                </span>
              )}
              {deal.probability != null && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />{deal.probability}% chance
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-border/50">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    deal.stage === "won" ? "bg-emerald-500" : deal.stage === "lost" ? "bg-red-500" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-shrink-0 flex-col items-end gap-2">
            <p className="text-xl font-bold text-foreground">{fmt(deal.value)}</p>
            <div className="flex items-center gap-1">
              {/* Stage quick-change dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-44">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Move to stage</p>
                  {STAGES.filter((s) => s !== deal.stage).map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={(e) => { e.stopPropagation(); handleStageChange(s) }}
                      className={stageConfig[s].color}
                    >
                      {stageConfig[s].label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete deal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <DealDetail deal={deal} onClose={() => setExpanded(false)} />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete confirm */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deal.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all")
  const [showCreate, setShowCreate] = useState(false)
  const { data: deals = [], isLoading, error } = useDeals()

  const filtered = useMemo(
    () => stageFilter === "all" ? deals : deals.filter((d) => d.stage === stageFilter),
    [deals, stageFilter]
  )
  const { totalValue, wonValue, activeCount, avgValue } = useMemo(() => {
    const totalValue = deals.reduce((s, d) => s + parseFloat(d.value ?? "0"), 0)
    const wonValue = deals.filter((d) => d.stage === "won").reduce((s, d) => s + parseFloat(d.value ?? "0"), 0)
    const activeCount = deals.filter((d) => d.status === "active").length
    const avgValue = deals.length ? totalValue / deals.length : 0
    return { totalValue, wonValue, activeCount, avgValue }
  }, [deals])

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Deals & Pipeline"
        description="Track every deal from first contact to closing."
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        }
      />

      {/* Create deal form */}
      <AnimatePresence>
        {showCreate && <CreateDealModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Pipeline",  value: fmt(String(totalValue)), icon: DollarSign,   sub: `${deals.length} deals` },
          { label: "Revenue Won",     value: fmt(String(wonValue)),   icon: TrendingUp,   sub: "Closed won", color: "text-emerald-500" },
          { label: "Active Deals",    value: activeCount,             icon: ClipboardList, sub: "In progress" },
          { label: "Avg. Deal Size",  value: fmt(String(avgValue)),   icon: Building2,    sub: "Across pipeline" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className={cn("h-4 w-4", s.color ?? "text-primary")} />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Stage filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStageFilter("all")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            stageFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "border border-border/50 text-muted-foreground hover:text-foreground"
          )}
        >
          All Deals ({deals.length})
        </button>
        {STAGES.map((stage) => {
          const count = deals.filter((d) => d.stage === stage).length
          const cfg = stageConfig[stage]
          return (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                stageFilter === stage
                  ? cn(cfg.bg, cfg.color)
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Deal list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16 text-center">
          <XCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium text-foreground">Failed to load deals</p>
          <p className="text-sm text-muted-foreground">Please check your connection and try again.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium text-foreground">
            {stageFilter === "all" ? "No deals yet" : `No deals in "${stageConfig[stageFilter].label}"`}
          </p>
          <p className="text-sm text-muted-foreground">Create your first deal to get started.</p>
          <Button onClick={() => setShowCreate(true)} className="mt-2 gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((deal, i) => (
              <DealCard key={deal.id} deal={deal} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
