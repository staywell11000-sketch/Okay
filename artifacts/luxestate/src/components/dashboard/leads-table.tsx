import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  X,
  Plus,
  Download,
  Phone,
  Mail,
  MessageCircle,
  MoreHorizontal,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Loader2,
  Globe,
  MousePointerClick,
  RefreshCw,
} from "lucide-react"
import { Link, useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { surfaceInputClass, surfaceSelectClass } from "@/lib/ui-classes"
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa"
import { FaTiktok } from "react-icons/fa6"
import {
  agents,
  pipelineOrder,
  priorityConfig,
  statusConfig,
  sourceConfig,
  allSources,
  adPlatformSources,
} from "@/components/dashboard/leads-data"
import { Lead, LeadPriority, LeadSource, LeadStatus } from "@/components/dashboard/leads-types"
import { LeadDetailModal } from "@/components/dashboard/lead-detail-modal"
import { AddLeadModal } from "@/components/dashboard/add-lead-modal"
import { LeadExportImportModal } from "@/components/dashboard/lead-export-import-modal"
import { useAuth } from "@/lib/auth-context"
import { getOrCreateConversationForLead } from "@/lib/messaging-api"

type LeadsTableProps = {
  leads: Lead[]
  isLoading?: boolean
  onCreate: (data: Omit<Lead, "id">) => Promise<Lead>
  onUpdate: (id: number, updates: Partial<Lead>) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onBulkDelete?: (ids: number[]) => Promise<void>
  onImport?: (leads: Lead[]) => Promise<void>
  onSync?: () => Promise<void>
}

type SortKey = "urgencyScore" | "score" | "name" | "budget" | "lastContact"

function UrgencyRing({ score }: { score: number }) {
  const r = 10
  const circ = 2 * Math.PI * r
  const dash = Math.min((score / 100) * circ, circ)
  const color = score >= 75 ? "#ef4444" : score >= 50 ? "#f59e0b" : "#60a5fa"
  return (
    <div className="flex items-center gap-1.5">
      <svg width="26" height="26" viewBox="0 0 26 26" className="-rotate-90 shrink-0">
        <circle cx="13" cy="13" r={r} fill="none" strokeWidth="3" stroke="currentColor" className="text-border/40" />
        <circle
          cx="13" cy="13" r={r} fill="none" strokeWidth="3"
          stroke={color} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-bold tabular-nums text-foreground">{score}</span>
    </div>
  )
}

const PLATFORM_ICON_MAP: Record<string, React.ElementType> = {
  facebook:  FaFacebook,
  instagram: FaInstagram,
  whatsapp:  FaWhatsapp,
  tiktok:    FaTiktok,
  website:   Globe,
  manual:    MousePointerClick,
}

function SourceBadge({ source }: { source: Lead["source"] }) {
  const cfg = sourceConfig[source] ?? {
    className: "bg-secondary/40 text-muted-foreground border-border/50",
    dotColor: "bg-muted-foreground",
    label: source,
  }
  const PlatformIcon = cfg.platform ? PLATFORM_ICON_MAP[cfg.platform] : null
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px] font-medium px-1.5 py-0", cfg.className)}>
      {PlatformIcon ? (
        <PlatformIcon className="h-2.5 w-2.5 shrink-0" />
      ) : (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cfg.dotColor)} />
      )}
      {cfg.label}
    </Badge>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  return dir === "desc"
    ? <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    : <ArrowUp className="ml-1 h-3 w-3 text-primary" />
}

function exportCSV(leads: Lead[]) {
  const headers = ["Name","Email","Phone","Status","Priority","Source","Campaign","Budget","Property","Assigned To","Score","Urgency","Last Contact","Tags"]
  const rows = leads.map((l) => [
    `"${l.name}"`, `"${l.email}"`, `"${l.phone}"`,
    l.status, l.priority, `"${l.source}"`, `"${l.campaign ?? ""}"`,
    `"${l.budget}"`, `"${l.property}"`, `"${l.assignedTo}"`,
    l.score, l.urgencyScore, `"${l.lastContact}"`, `"${l.tags.join("; ")}"`,
  ])
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function LeadsTable({ leads, isLoading: externalLoading, onCreate, onUpdate, onDelete, onBulkDelete, onImport, onSync }: LeadsTableProps) {
  const isLoading = externalLoading ?? false
  const [isSyncing, setIsSyncing] = useState(false)
  const [, navigate] = useLocation()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "all">("all")
  const [agentFilter, setAgentFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("urgencyScore")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [detailLeadId, setDetailLeadId] = useState<number | null>(null)
  const [showAddLead, setShowAddLead] = useState(false)
  const [showExportImport, setShowExportImport] = useState(false)
  const [exportImportTab, setExportImportTab] = useState<"export" | "import">("export")
  const [openingMsgLeadId, setOpeningMsgLeadId] = useState<number | null>(null)


  const detailLead = useMemo(
    () => (detailLeadId ? leads.find((l) => l.id === detailLeadId) ?? null : null),
    [detailLeadId, leads]
  )

  const statusCounts = useMemo(() => {
    return pipelineOrder.reduce<Record<LeadStatus, number>>(
      (acc, s) => { acc[s] = leads.filter((l) => l.status === s).length; return acc },
      { new: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0 }
    )
  }, [leads])

  const activeFilterCount = [
    sourceFilter !== "all",
    priorityFilter !== "all",
    agentFilter !== "all",
  ].filter(Boolean).length

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = leads.filter((lead) => {
      if (q) {
        const match =
          lead.name.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.property.toLowerCase().includes(q) ||
          lead.assignedTo.toLowerCase().includes(q) ||
          lead.tags.some((t) => t.toLowerCase().includes(q)) ||
          (lead.campaign ?? "").toLowerCase().includes(q) ||
          (lead.adSource ?? "").toLowerCase().includes(q)
        if (!match) return false
      }
      if (statusFilter !== "all" && lead.status !== statusFilter) return false
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false
      if (priorityFilter !== "all" && lead.priority !== priorityFilter) return false
      if (agentFilter !== "all" && lead.assignedTo !== agentFilter) return false
      return true
    })

    result.sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1
      if (sortKey === "name") return mul * a.name.localeCompare(b.name)
      if (sortKey === "budget") return mul * a.budget.localeCompare(b.budget)
      if (sortKey === "lastContact") return mul * a.lastContact.localeCompare(b.lastContact)
      return mul * ((b[sortKey] as number) - (a[sortKey] as number)) * -1
    })

    return result
  }, [leads, searchQuery, statusFilter, sourceFilter, priorityFilter, agentFilter, sortKey, sortDir])

  const allSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.has(l.id))

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    else { setSortKey(key); setSortDir("desc") }
  }

  const updateLead = async (id: number, updates: Partial<Lead>) => {
    await onUpdate(id, updates)
  }
  const deleteLead = async (id: number) => {
    await onDelete(id)
    if (detailLeadId === id) setDetailLeadId(null)
  }
  const updateStatus = (id: number, status: LeadStatus) => {
    onUpdate(id, { status })
  }
  const updateAssignee = (id: number, agent: string) => {
    onUpdate(id, { assignedTo: agent })
  }

  const openWhatsApp = (lead: Lead) => {
    const msg = encodeURIComponent(`Hi ${lead.name}, just checking in regarding ${lead.property}.`)
    const phone = lead.whatsappNumber.replace(/\D/g, "")
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer")
  }

  const openMessages = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || openingMsgLeadId) return
    setOpeningMsgLeadId(lead.id)
    try {
      const conv = await getOrCreateConversationForLead(user.id, {
        id: lead.id,
        name: lead.name,
        phone: lead.phone && lead.phone !== "—" ? lead.phone : undefined,
        email: lead.email,
        property: lead.property && lead.property !== "—" ? lead.property : undefined,
      })
      navigate(`/dashboard/messages?convId=${conv.id}`)
    } catch {
      navigate("/dashboard/messages")
    } finally {
      setOpeningMsgLeadId(null)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setSourceFilter("all")
    setPriorityFilter("all")
    setAgentFilter("all")
  }

  const colHeader = (label: string, key?: SortKey) => (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
        key && "cursor-pointer select-none hover:text-foreground"
      )}
      onClick={key ? () => toggleSort(key) : undefined}
    >
      <span className="flex items-center">
        {label}
        {key && <SortIcon active={sortKey === key} dir={sortDir} />}
      </span>
    </th>
  )

  return (
    <div className="glass-card overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 border-b border-border/40 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads, properties, campaigns…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("pl-9", surfaceInputClass)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((f) => !f)}
            className={cn(
              "h-9 gap-1.5 border-border/50",
              showFilters && "border-primary/40 bg-primary/10 text-primary"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-border/50"
            onClick={() => { setExportImportTab("export"); setShowExportImport(true) }}
            title="Export or import leads"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          {onSync && (
            <Button
              variant="outline"
              size="sm"
              disabled={isSyncing}
              title="Sync leads from connected ad platforms (Facebook, Instagram)"
              className="h-9 gap-1.5 border-border/50"
              onClick={async () => {
                setIsSyncing(true)
                try { await onSync() } finally { setIsSyncing(false) }
              }}
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              <span className="hidden sm:inline">{isSyncing ? "Syncing…" : "Sync Ads"}</span>
            </Button>
          )}
          <Button
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
            onClick={() => setShowAddLead(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2.5 border-b border-border/40 bg-secondary/10 px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Filter:</span>

              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as LeadSource | "all")}
                  className={cn("h-8 w-36 text-xs", surfaceSelectClass)}
                >
                  <option value="all">All Sources</option>
                  <optgroup label="Platform">
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="website">Website</option>
                    <option value="manual">Manual</option>
                  </optgroup>
                  <optgroup label="Legacy">
                    {allSources.filter(s => !["manual","facebook","instagram","tiktok","whatsapp","website"].includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as LeadPriority | "all")}
                  className={cn("h-8 w-32 text-xs", surfaceSelectClass)}
                >
                  <option value="all">All Priority</option>
                  <option value="hot">🔴 Hot</option>
                  <option value="warm">🟠 Warm</option>
                  <option value="cold">🔵 Cold</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="relative">
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className={cn("h-8 w-40 text-xs", surfaceSelectClass)}
                >
                  <option value="all">All Agents</option>
                  {agents.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="relative">
                <select
                  value={sortKey}
                  onChange={(e) => { setSortKey(e.target.value as SortKey); setSortDir("desc") }}
                  className={cn("h-8 w-36 text-xs", surfaceSelectClass)}
                >
                  <option value="urgencyScore">Sort: Urgency</option>
                  <option value="score">Sort: Score</option>
                  <option value="name">Sort: Name</option>
                  <option value="budget">Sort: Budget</option>
                  <option value="lastContact">Sort: Contact</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setSourceFilter("all"); setPriorityFilter("all"); setAgentFilter("all") }}
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pipeline Status Tabs ── */}
      <div className="flex overflow-x-auto border-b border-border/40" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => setStatusFilter("all")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors",
            statusFilter === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          All
          <span className="rounded-full bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
            {leads.length}
          </span>
        </button>
        {pipelineOrder.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors",
              statusFilter === status
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {statusConfig[status].label}
            <span className="rounded-full bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Bulk Actions Bar ── */}
      <AnimatePresence initial={false}>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2">
              <span className="text-xs font-semibold text-primary">
                {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-destructive/30 text-xs text-destructive hover:bg-destructive/5"
                onClick={async () => {
                  const ids = Array.from(selectedIds)
                  if (onBulkDelete) await onBulkDelete(ids)
                  else await Promise.all(ids.map((id) => onDelete(id)))
                  setSelectedIds(new Set())
                }}
              >
                Archive selected
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-7 w-7"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table Content ── */}
      {isLoading ? (
        <div className="space-y-0 divide-y divide-border/30 p-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="hidden h-5 w-16 rounded-full md:block" />
              <Skeleton className="hidden h-3.5 w-24 lg:block" />
              <Skeleton className="hidden h-8 w-28 xl:block" />
              <Skeleton className="hidden h-8 w-36 xl:block" />
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50">
            <Sparkles className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No leads match these filters</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Try widening your search or clearing filters</p>
          </div>
          <Button variant="outline" size="sm" className="border-border/50" onClick={resetFilters}>
            Reset all filters
          </Button>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1060px]">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                <tr className="border-b border-border/50">
                  <th className="w-10 pl-4 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelectedIds(new Set())
                        else setSelectedIds(new Set(filteredLeads.map((l) => l.id)))
                      }}
                      className="h-3.5 w-3.5 cursor-pointer rounded accent-primary"
                    />
                  </th>
                  {colHeader("Lead")}
                  {colHeader("Source / Campaign")}
                  {colHeader("Property")}
                  {colHeader("Urgency", "urgencyScore")}
                  {colHeader("Score", "score")}
                  {colHeader("Pipeline")}
                  {colHeader("Assigned")}
                  {colHeader("Contact", "lastContact")}
                  <th className="w-10 pr-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                <AnimatePresence initial={false}>
                  {filteredLeads.map((lead, index) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(index * 0.025, 0.2) }}
                      className={cn(
                        "group cursor-pointer transition-colors hover:bg-secondary/20",
                        selectedIds.has(lead.id) && "bg-primary/5"
                      )}
                      onClick={() => setDetailLeadId(lead.id)}
                    >
                      {/* Checkbox */}
                      <td className="w-10 pl-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => {
                            const next = new Set(selectedIds)
                            if (next.has(lead.id)) next.delete(lead.id); else next.add(lead.id)
                            setSelectedIds(next)
                          }}
                          className="h-3.5 w-3.5 cursor-pointer rounded accent-primary"
                        />
                      </td>

                      {/* Lead */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-accent/70 text-[11px] font-bold text-primary-foreground">
                            {lead.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="max-w-[130px] truncate text-sm font-semibold text-foreground">
                                {lead.name}
                              </p>
                              {lead.duplicateOf && (
                                <span title="Possible duplicate">
                                  <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                                </span>
                              )}
                            </div>
                            <p className="max-w-[160px] truncate text-xs text-muted-foreground">{lead.email}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", priorityConfig[lead.priority].className)}>
                                {priorityConfig[lead.priority].label}
                              </Badge>
                              {lead.tags.slice(0, 1).map((tag) => (
                                <Badge key={tag} variant="outline" className="border-border/40 bg-secondary/30 px-1.5 py-0 text-[10px] text-muted-foreground">
                                  {tag}
                                </Badge>
                              ))}
                              {lead.tags.length > 1 && (
                                <Badge variant="outline" className="border-border/40 bg-secondary/30 px-1.5 py-0 text-[10px] text-muted-foreground">
                                  +{lead.tags.length - 1}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Source + Campaign */}
                      <td className="px-3 py-3">
                        <SourceBadge source={lead.source} />
                        {lead.campaign && (
                          <p className="mt-1 max-w-[140px] truncate text-[10px] font-medium text-muted-foreground" title={lead.campaign}>
                            📢 {lead.campaign}
                          </p>
                        )}
                        {lead.adSetName && (
                          <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-muted-foreground/70" title={lead.adSetName}>
                            {lead.adSetName}
                          </p>
                        )}
                      </td>

                      {/* Property */}
                      <td className="px-3 py-3">
                        <p className="max-w-[130px] truncate text-xs font-medium text-foreground">{lead.property}</p>
                        <p className="mt-0.5 text-xs font-bold tabular-nums text-foreground/80">{lead.budget}</p>
                      </td>

                      {/* Urgency */}
                      <td className="px-3 py-3">
                        <UrgencyRing score={lead.urgencyScore} />
                      </td>

                      {/* Score */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-16 rounded-full bg-border/40">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                lead.score >= 75 ? "bg-emerald-500" : lead.score >= 50 ? "bg-amber-500" : "bg-red-400"
                              )}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-muted-foreground">{lead.score}</span>
                        </div>
                      </td>

                      {/* Pipeline Status */}
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative w-32">
                          <select
                            value={lead.status}
                            onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                            className={cn("h-7 w-32 text-xs", surfaceSelectClass)}
                          >
                            {pipelineOrder.map((s) => (
                              <option key={s} value={s}>{statusConfig[s].label}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </td>

                      {/* Assigned */}
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative w-36">
                          <select
                            value={lead.assignedTo}
                            onChange={(e) => updateAssignee(lead.id, e.target.value)}
                            className={cn("h-7 w-36 text-xs", surfaceSelectClass)}
                          >
                            {agents.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </td>

                      {/* Last Contact */}
                      <td className="px-3 py-3">
                        <p className="whitespace-nowrap text-xs text-muted-foreground">{lead.lastContact}</p>
                      </td>

                      {/* More menu */}
                      <td className="pr-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Call"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            title="Open in Messages"
                            onClick={(e) => openMessages(lead, e)}
                            disabled={openingMsgLeadId === lead.id}
                          >
                            {openingMsgLeadId === lead.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass w-44">
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs"
                                onClick={() => setDetailLeadId(lead.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Open details
                              </DropdownMenuItem>
                              <Link href={`/dashboard/leads/${lead.id}`}>
                                <DropdownMenuItem className="cursor-pointer gap-2 text-xs">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Full profile
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => openWhatsApp(lead)}>
                                <MessageCircle className="h-3.5 w-3.5" />
                                Send WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-xs text-destructive"
                                onClick={() => deleteLead(lead.id)}
                              >
                                Archive lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-2 p-3 lg:hidden">
            <AnimatePresence initial={false}>
              {filteredLeads.map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.025, 0.15) }}
                  className={cn(
                    "cursor-pointer rounded-xl border border-border/40 bg-secondary/10 p-3 transition-colors hover:border-border/60 hover:bg-secondary/20",
                    selectedIds.has(lead.id) && "border-primary/30 bg-primary/5"
                  )}
                  onClick={() => setDetailLeadId(lead.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-accent/70 text-xs font-bold text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = new Set(selectedIds)
                        if (next.has(lead.id)) next.delete(lead.id); else next.add(lead.id)
                        setSelectedIds(next)
                      }}
                    >
                      {selectedIds.has(lead.id) ? "✓" : lead.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-foreground">{lead.name}</p>
                            {lead.duplicateOf && (
                              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig[lead.status].className)}>
                            {statusConfig[lead.status].label}
                          </Badge>
                          <span className="text-xs font-bold tabular-nums text-foreground">{lead.budget}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <SourceBadge source={lead.source} />
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityConfig[lead.priority].className)}>
                          {priorityConfig[lead.priority].label}
                        </Badge>
                        {lead.campaign && (
                          <span className="text-[10px] text-muted-foreground">{lead.campaign}</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Urgency</span>
                            <UrgencyRing score={lead.urgencyScore} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-500"
                            onClick={() => openWhatsApp(lead)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Row count */}
          <div className="border-t border-border/30 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredLeads.length}</span> of{" "}
              <span className="font-semibold text-foreground">{leads.length}</span> leads
            </p>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      <LeadDetailModal
        lead={detailLead}
        onClose={() => setDetailLeadId(null)}
        onUpdate={updateLead}
        onDelete={deleteLead}
      />
      <AddLeadModal
        open={showAddLead}
        onClose={() => setShowAddLead(false)}
        onAdd={onCreate}
      />
      <LeadExportImportModal
        open={showExportImport}
        onClose={() => setShowExportImport(false)}
        leads={leads}
        defaultTab={exportImportTab}
        onImport={async (imported) => { if (onImport) await onImport(imported) }}
      />
    </div>
  )
}
