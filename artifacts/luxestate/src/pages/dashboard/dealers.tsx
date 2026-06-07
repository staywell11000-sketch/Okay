import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { DealerFormModal } from "@/components/dashboard/dealer-form-modal"
import { DealerDetailPanel } from "@/components/dashboard/dealer-detail-panel"
import {
  useDealers, useCreateDealer, useUpdateDealer,
  useUpdateDealerStatus, useDeleteDealer,
  type DealerRecord, type DealerInput,
} from "@/lib/dealers-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Handshake, TrendingUp, Users, Phone, Mail, MapPin, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<string, string> = {
  individual:      "Individual",
  agency:          "Agency",
  investor:        "Investor",
  builder_partner: "Builder Partner",
}

const TYPE_COLORS: Record<string, string> = {
  individual:      "bg-sky-500/10 text-sky-600 border-sky-500/20",
  agency:          "bg-violet-500/10 text-violet-600 border-violet-500/20",
  investor:        "bg-amber-500/10 text-amber-600 border-amber-500/20",
  builder_partner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "leads",  label: "Most Leads" },
  { value: "deals",  label: "Most Deals" },
]

export default function DealersPage() {
  const [search, setSearch]         = useState("")
  const [status, setStatus]         = useState("all")
  const [dealerType, setDealerType] = useState("all")
  const [sort, setSort]             = useState("newest")
  const [addOpen, setAddOpen]       = useState(false)
  const [editTarget, setEditTarget] = useState<DealerRecord | null>(null)
  const [viewTarget, setViewTarget] = useState<DealerRecord | null>(null)

  const { data: dealersData, isLoading } = useDealers({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    dealerType: dealerType !== "all" ? dealerType : undefined,
    sort,
    pageSize: 200,
  })

  const createMutation = useCreateDealer()
  const updateMutation = useUpdateDealer()
  const statusMutation = useUpdateDealerStatus()
  const deleteMutation = useDeleteDealer()

  const dealers: DealerRecord[] = dealersData?.data ?? []

  const handleSave = async (input: DealerInput) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, input })
      toast.success("Dealer updated")
      setEditTarget(null)
    } else {
      await createMutation.mutateAsync(input)
      toast.success("Dealer added")
      setAddOpen(false)
    }
  }

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id)
    toast.success("Dealer deleted")
  }

  const handleToggleStatus = async (d: DealerRecord) => {
    const next = d.status === "active" ? "inactive" : "active"
    await statusMutation.mutateAsync({ id: d.id, status: next })
    toast.success(`Dealer ${next === "active" ? "activated" : "deactivated"}`)
    if (viewTarget?.id === d.id) setViewTarget((v) => v ? { ...v, status: next } : v)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending
  const total = dealersData?.total ?? 0

  const stats = {
    total: dealers.length,
    active: dealers.filter((d) => d.status === "active").length,
    totalLeads: dealers.reduce((a, d) => a + (d.totalLeads ?? 0), 0),
    totalDeals: dealers.reduce((a, d) => a + (d.totalDeals ?? 0), 0),
  }

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="Dealers"
        description="Manage brokers, agents, investors, and partner agencies."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Dealers", value: stats.total, icon: Handshake, color: "text-primary" },
          { label: "Active", value: stats.active, icon: Handshake, color: "text-emerald-500" },
          { label: "Leads Generated", value: stats.totalLeads, icon: Users, color: "text-sky-500" },
          { label: "Deals Closed", value: stats.totalDeals, icon: TrendingUp, color: "text-amber-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or company…"
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={dealerType} onValueChange={setDealerType}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
            <SelectItem value="builder_partner">Builder Partner</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {total > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {total} dealer{total !== 1 ? "s" : ""}
            </Badge>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)} className="h-9">
            <Plus className="mr-1.5 h-4 w-4" /> Add Dealer
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/40">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-36 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : dealers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Handshake className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-base font-semibold text-foreground">No dealers found</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search || status !== "all" || dealerType !== "all" ? "Try adjusting your filters" : "Add your first dealer to get started"}
            </p>
            {!search && status === "all" && dealerType === "all" && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Dealer
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Dealer</span>
              <span className="w-24 text-center">Type</span>
              <span className="w-16 text-center">Leads</span>
              <span className="w-16 text-center">Deals</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-4" />
            </div>

            {dealers.map((dealer) => {
              const initials = dealer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              const isActive = dealer.status === "active"
              const typeCfg = TYPE_COLORS[dealer.dealerType] ?? "bg-muted text-muted-foreground border-border"
              const typeLabel = TYPE_LABELS[dealer.dealerType] ?? dealer.dealerType

              return (
                <button
                  key={dealer.id}
                  onClick={() => setViewTarget(dealer)}
                  className="w-full flex sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 sm:gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                >
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/70 to-accent/70 text-sm font-bold text-primary-foreground shadow-sm">
                      {dealer.profileImage ? (
                        <img src={dealer.profileImage} alt={dealer.name} className="h-full w-full rounded-xl object-cover" />
                      ) : initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{dealer.name}</p>
                      {dealer.company && <p className="text-xs text-muted-foreground truncate">{dealer.company}</p>}
                      <div className="flex items-center gap-3 mt-0.5 sm:hidden">
                        {dealer.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-2.5 w-2.5" />{dealer.phone}</span>}
                      </div>
                      <div className="hidden sm:flex items-center gap-3 mt-0.5">
                        {dealer.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-2.5 w-2.5" />{dealer.phone}</span>}
                        {dealer.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-2.5 w-2.5" />{dealer.email}</span>}
                        {dealer.location && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-2.5 w-2.5" />{dealer.location}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="hidden sm:flex w-24 justify-center">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", typeCfg)}>{typeLabel}</Badge>
                  </div>

                  {/* Leads */}
                  <div className="hidden sm:flex w-16 justify-center">
                    <span className="text-sm font-semibold text-foreground">{dealer.totalLeads ?? 0}</span>
                  </div>

                  {/* Deals */}
                  <div className="hidden sm:flex w-16 justify-center">
                    <span className="text-sm font-semibold text-foreground">{dealer.totalDeals ?? 0}</span>
                  </div>

                  {/* Status */}
                  <div className="hidden sm:flex w-20 justify-center">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-semibold flex items-center gap-1",
                        isActive ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-muted-foreground")} />
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto sm:ml-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <DealerFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        isSaving={isMutating}
      />
      <DealerFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSave}
        existing={editTarget}
        isSaving={isMutating}
      />
      <DealerDetailPanel
        dealer={viewTarget}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={(d) => { setViewTarget(null); setEditTarget(d) }}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  )
}
