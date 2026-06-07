import { useState, useMemo } from "react"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { PropertyMarketplaceCard } from "@/components/dashboard/property-marketplace-card"
import { PropertyPKFormModal } from "@/components/dashboard/property-pk-form-modal"
import { PropertyDetailModal } from "@/components/dashboard/property-detail-modal"
import { Property } from "@/components/dashboard/properties-data"
import {
  useProperties, useCreateProperty, useUpdateProperty,
  useUpdatePropertyStatus, useDeleteProperty, useBulkImportProperties,
  propertyToInput, recordToProperty,
  type PropertyRecord, type PropertyInput,
} from "@/lib/properties-api"
import { useDealers, type DealerRecord } from "@/lib/dealers-api"
import { PropertyImportExportModal } from "@/components/dashboard/property-import-export-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Home, Building2, Layers, Store, Download } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type TabType = "all" | "plot" | "house" | "flat" | "commercial"

const TABS: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: "all",        label: "All",        icon: Layers    },
  { key: "plot",       label: "Plots",      icon: Home      },
  { key: "house",      label: "Houses",     icon: Building2 },
  { key: "flat",       label: "Flats",      icon: Layers    },
  { key: "commercial", label: "Commercial", icon: Store     },
]

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "oldest",     label: "Oldest First" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
]

const STATUS_OPTIONS = [
  { value: "all",       label: "All Status" },
  { value: "available", label: "Available" },
  { value: "pending",   label: "Pending" },
  { value: "sold",      label: "Sold" },
]

export default function PropertiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [search, setSearch]       = useState("")
  const [status, setStatus]       = useState("all")
  const [sort, setSort]           = useState("newest")
  const [dealerFilter, setDealerFilter] = useState("all")
  const [addOpen, setAddOpen]         = useState(false)
  const [importExportOpen, setImportExportOpen] = useState(false)
  const [editTarget, setEditTarget]   = useState<PropertyRecord | null>(null)
  const [viewTarget, setViewTarget]   = useState<Property | null>(null)

  const filters = {
    search: search || undefined,
    type: activeTab !== "all" ? activeTab : undefined,
    status: status !== "all" ? status : undefined,
    sort,
    dealerId: dealerFilter !== "all" ? dealerFilter : undefined,
    pageSize: 100,
  }

  const { data: propertiesData, isLoading } = useProperties(filters as any)
  const { data: dealersData } = useDealers({ pageSize: 200 })

  const createMutation = useCreateProperty()
  const updateMutation = useUpdateProperty()
  const statusMutation = useUpdatePropertyStatus()
  const deleteMutation = useDeleteProperty()
  const bulkImport     = useBulkImportProperties()

  const rawRecords = (propertiesData?.data ?? []) as unknown as PropertyRecord[]
  const dealers: DealerRecord[] = dealersData?.data ?? []

  const dealerMap = useMemo(() => {
    const m: Record<number, string> = {}
    dealers.forEach((d) => { m[d.id] = d.name })
    return m
  }, [dealers])

  const handleSave = async (input: PropertyInput) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, input })
      toast.success("Property updated")
      setEditTarget(null)
    } else {
      await createMutation.mutateAsync(input)
      toast.success("Property added")
      setAddOpen(false)
    }
  }

  const handleMarkSold = async (p: PropertyRecord) => {
    await statusMutation.mutateAsync({ id: p.id, status: "sold" })
    toast.success("Marked as Sold")
  }

  const handleShare = (p: PropertyRecord) => {
    const text = `${p.title} — ${p.city ?? ""}${p.sector ? `, ${p.sector}` : ""} — PKR ${Number(p.price ?? 0).toLocaleString()}`
    if (navigator.share) {
      navigator.share({ title: p.title, text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      toast.success("Property details copied!")
    }
  }

  const handleDelete = async (id: string) => {
    const numId = parseInt(id)
    if (isNaN(numId)) return
    await deleteMutation.mutateAsync(numId)
    toast.success("Property deleted")
    if (viewTarget?.id === id) setViewTarget(null)
  }

  const handleView = (p: PropertyRecord) => {
    setViewTarget(recordToProperty(p))
  }

  const handleEdit = (p: PropertyRecord) => {
    setViewTarget(null)
    setEditTarget(p)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending
  const total = propertiesData?.total ?? 0

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="Property Marketplace"
        description="Manage your property listings. All data synced with Supabase."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search properties…"
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={dealerFilter} onValueChange={setDealerFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All Dealers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dealers</SelectItem>
            {dealers.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {total > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {total} listing{total !== 1 ? "s" : ""}
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => setImportExportOpen(true)} className="h-9">
            <Download className="mr-1.5 h-4 w-4" /> Import / Export
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="h-9">
            <Plus className="mr-1.5 h-4 w-4" /> Add Property
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : rawRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-base font-semibold text-foreground">No properties found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {search || status !== "all" || dealerFilter !== "all" ? "Try adjusting your filters" : "Add your first property to get started"}
          </p>
          {!search && status === "all" && dealerFilter === "all" && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Property
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rawRecords.map((p) => (
            <PropertyMarketplaceCard
              key={p.id}
              property={p}
              dealerName={p.dealerId ? dealerMap[p.dealerId] : undefined}
              onView={handleView}
              onEdit={handleEdit}
              onMarkSold={handleMarkSold}
              onShare={handleShare}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <PropertyPKFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        isSaving={isMutating}
        dealers={dealers}
      />

      {/* Edit Modal */}
      <PropertyPKFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSave}
        existing={editTarget}
        isSaving={isMutating}
        dealers={dealers}
      />

      {/* Import / Export Modal */}
      <PropertyImportExportModal
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        properties={rawRecords}
        onImport={async (rows) => {
          const result = await bulkImport.mutateAsync(rows)
          if (result.imported > 0) toast.success(`Imported ${result.imported} propert${result.imported !== 1 ? "ies" : "y"}`)
          if (result.skipped > 0) toast.warning(`${result.skipped} rows skipped`)
          return result
        }}
      />

      {/* Detail Panel (existing component) */}
      <PropertyDetailModal
        property={viewTarget}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={() => viewTarget && handleEdit(rawRecords.find((r) => String(r.id) === viewTarget.id)!)}
        onStatusChange={async (id, newStatus) => {
          const numId = parseInt(id)
          if (!isNaN(numId)) {
            await statusMutation.mutateAsync({ id: numId, status: newStatus })
            setViewTarget(null)
          }
        }}
      />
    </div>
  )
}
