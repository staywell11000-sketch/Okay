import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown, Plus, X,
  Bed, Bath, Maximize2, Eye, TrendingUp, MapPin, MoreHorizontal,
  Pencil, Trash2, Building2, SlidersHorizontal, ArrowUpDown,
  CheckCircle2, Clock, Star, Tag, Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { surfaceInputClass, surfaceSelectClass } from "@/lib/ui-classes"
import {
  Property, PropertyStatus, PropertyCategory,
  STATUS_CONFIG, CATEGORY_LIST, STATUS_LIST, AGENTS,
  formatPrice, formatSqft,
} from "@/components/dashboard/properties-data"

// ── Types ─────────────────────────────────────────────────────────────────
type SortKey = "price" | "beds" | "sqft" | "daysOnMarket" | "views" | "listedAt" | "title"
type SortDir = "asc" | "desc"

type PropertiesTableProps = {
  properties: Property[]
  isLoading?: boolean
  setProperties: React.Dispatch<React.SetStateAction<Property[]>> | (() => void)
  onAdd: () => void
  onEdit: (p: Property) => void
  onView: (p: Property) => void
  onDelete?: (id: string) => void
}

// ── Status dot ────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: PropertyStatus }) {
  const s = STATUS_CONFIG[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap", s.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  )
}

// ── Sort icon ─────────────────────────────────────────────────────────────
function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />
  return sort.dir === "asc"
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />
}

// ── Image placeholder ─────────────────────────────────────────────────────
function PropertyThumb({ src, title }: { src: string; title: string }) {
  const [err, setErr] = useState(false)
  return err ? (
    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-secondary/40">
      <Building2 className="h-4 w-4 text-muted-foreground/40" />
    </div>
  ) : (
    <img
      src={src}
      alt={title}
      onError={() => setErr(true)}
      className="h-10 w-14 shrink-0 rounded-lg object-cover"
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function PropertiesTable({ properties, isLoading, setProperties, onAdd, onEdit, onView, onDelete }: PropertiesTableProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"all" | PropertyCategory>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | PropertyStatus>("all")
  const [agentFilter, setAgentFilter] = useState("all")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [bedsFilter, setBedsFilter] = useState("any")
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "listedAt", dir: "desc" })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const tableRef = useRef<HTMLDivElement>(null)

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, categoryFilter, statusFilter, agentFilter, priceMin, priceMax, bedsFilter])

  const toggleSort = (key: SortKey) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" })
  }

  const filtered = useMemo(() => {
    let list = [...properties]
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.owner.name.toLowerCase().includes(q)
    )
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter)
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter)
    if (agentFilter !== "all") list = list.filter((p) => p.agent === agentFilter)
    if (priceMin) list = list.filter((p) => p.price >= Number(priceMin) * 1_000_000)
    if (priceMax) list = list.filter((p) => p.price <= Number(priceMax) * 1_000_000)
    if (bedsFilter !== "any") {
      const n = Number(bedsFilter)
      list = list.filter((p) => p.beds >= n)
    }
    list.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      if (sort.key === "price") { av = a.price; bv = b.price }
      else if (sort.key === "beds") { av = a.beds; bv = b.beds }
      else if (sort.key === "sqft") { av = a.sqft; bv = b.sqft }
      else if (sort.key === "daysOnMarket") { av = a.daysOnMarket; bv = b.daysOnMarket }
      else if (sort.key === "views") { av = a.analytics.views; bv = b.analytics.views }
      else if (sort.key === "listedAt") { av = a.listedAt; bv = b.listedAt }
      else if (sort.key === "title") { av = a.title; bv = b.title }
      if (av < bv) return sort.dir === "asc" ? -1 : 1
      if (av > bv) return sort.dir === "asc" ? 1 : -1
      return 0
    })
    return list
  }, [properties, search, categoryFilter, statusFilter, agentFilter, priceMin, priceMax, bedsFilter, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = (id: string) => {
    if (onDelete) {
      onDelete(id)
    } else {
      (setProperties as React.Dispatch<React.SetStateAction<Property[]>>)((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const handleStatusChange = (id: string, status: PropertyStatus) => {
    (setProperties as React.Dispatch<React.SetStateAction<Property[]>>)((prev) => prev.map((p) => p.id === id ? { ...p, status, updatedAt: new Date().toISOString().slice(0, 10) } : p))
  }

  const activeFilterCount = [
    categoryFilter !== "all",
    statusFilter !== "all",
    agentFilter !== "all",
    !!priceMin || !!priceMax,
    bedsFilter !== "any",
  ].filter(Boolean).length

  const clearFilters = () => {
    setCategoryFilter("all"); setStatusFilter("all"); setAgentFilter("all")
    setPriceMin(""); setPriceMax(""); setBedsFilter("any")
  }

  // Stats
  const activeCount = properties.filter((p) => p.status === "active").length
  const totalValue = properties.filter((p) => p.status === "active").reduce((s, p) => s + p.price, 0)
  const avgDom = properties.length ? Math.round(properties.reduce((s, p) => s + p.daysOnMarket, 0) / properties.length) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Properties", value: properties.length, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active Listings", value: activeCount, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Portfolio Value", value: formatPrice(totalValue), icon: TrendingUp, color: "text-sky-500", bg: "bg-sky-500/10" },
          { label: "Avg Days on Market", value: avgDom, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card flex items-center gap-3 p-4"
          >
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="glass-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, address, owner…"
              className={cn("h-9 w-full rounded-md border pl-9 pr-3 text-sm placeholder:text-muted-foreground/50", surfaceInputClass)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category */}
          <div className="relative">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)} className={cn(surfaceSelectClass, "h-9 w-36 text-xs")}>
              <option value="all">All Categories</option>
              {CATEGORY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Status */}
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={cn(surfaceSelectClass, "h-9 w-36 text-xs")}>
              <option value="all">All Statuses</option>
              {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* More filters toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={cn("gap-1.5 border-border/50 text-xs", showFilters && "bg-secondary/40")}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{activeFilterCount}</span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{filtered.length} properties</span>
            <Button onClick={onAdd} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Property
            </Button>
          </div>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/30 pt-3">
                {/* Agent */}
                <div className="relative">
                  <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className={cn(surfaceSelectClass, "h-8 w-44 text-xs")}>
                    <option value="all">All Agents</option>
                    {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
                {/* Beds */}
                <div className="relative">
                  <select value={bedsFilter} onChange={(e) => setBedsFilter(e.target.value)} className={cn(surfaceSelectClass, "h-8 w-32 text-xs")}>
                    <option value="any">Any Beds</option>
                    <option value="3">3+ Beds</option>
                    <option value="4">4+ Beds</option>
                    <option value="5">5+ Beds</option>
                    <option value="6">6+ Beds</option>
                    <option value="8">8+ Beds</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
                {/* Price range */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="Min $M"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className={cn("h-8 w-24 rounded-md border px-2 text-xs", surfaceInputClass)}
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <input
                    type="number"
                    placeholder="Max $M"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className={cn("h-8 w-24 rounded-md border px-2 text-xs", surfaceInputClass)}
                  />
                  <span className="text-xs text-muted-foreground">million</span>
                </div>
                {/* Sort */}
                <div className="relative ml-auto">
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    <select
                      value={`${sort.key}_${sort.dir}`}
                      onChange={(e) => {
                        const [key, dir] = e.target.value.split("_") as [SortKey, SortDir]
                        setSort({ key, dir })
                      }}
                      className={cn(surfaceSelectClass, "h-8 w-44 text-xs")}
                    >
                      <option value="listedAt_desc">Listed Date (Newest)</option>
                      <option value="listedAt_asc">Listed Date (Oldest)</option>
                      <option value="price_desc">Price (High → Low)</option>
                      <option value="price_asc">Price (Low → High)</option>
                      <option value="daysOnMarket_asc">Days on Market (↑)</option>
                      <option value="daysOnMarket_desc">Days on Market (↓)</option>
                      <option value="views_desc">Most Viewed</option>
                      <option value="sqft_desc">Largest First</option>
                      <option value="title_asc">Title A–Z</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto" ref={tableRef}>
          <table className="w-full min-w-[1100px]">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
              <tr className="border-b border-border/40">
                <th className="px-4 py-2.5 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Property</span>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <button onClick={() => toggleSort("title")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Details <SortIcon col="title" sort={sort} />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</span>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</span>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <button onClick={() => toggleSort("price")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Price <SortIcon col="price" sort={sort} />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <button onClick={() => toggleSort("beds")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Specs <SortIcon col="beds" sort={sort} />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent</span>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <button onClick={() => toggleSort("daysOnMarket")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    DOM <SortIcon col="daysOnMarket" sort={sort} />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <button onClick={() => toggleSort("views")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    Analytics <SortIcon col="views" sort={sort} />
                  </button>
                </th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>

            <tbody>
              <AnimatePresence mode="popLayout" initial={false}>
                {isLoading ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="flex flex-col items-center gap-3 py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-xs text-muted-foreground">Loading properties…</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="flex flex-col items-center gap-4 py-20">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border/40">
                          <Building2 className="h-7 w-7 text-muted-foreground/30" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-foreground">No properties found</p>
                          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters or add a new property</p>
                        </div>
                        <Button onClick={onAdd} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
                          <Plus className="h-3.5 w-3.5" /> Add Property
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((property, idx) => (
                    <PropertyRow
                      key={property.id}
                      property={property}
                      idx={idx}
                      onView={() => onView(property)}
                      onEdit={() => onEdit(property)}
                      onDelete={() => handleDelete(property.id)}
                      onStatusChange={(status) => handleStatusChange(property.id, status)}
                    />
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 p-0">
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn("flex h-7 w-7 items-center justify-center rounded text-xs transition-colors",
                      page === p ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-secondary/40"
                    )}
                  >{p}</button>
                )
              })}
              <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 p-0">
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Property row ──────────────────────────────────────────────────────────
function PropertyRow({
  property, idx, onView, onEdit, onDelete, onStatusChange,
}: {
  property: Property
  idx: number
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: PropertyStatus) => void
}) {
  const initials = (property.agent ?? "").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2) || "?"

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: idx * 0.02 }}
      className="group border-b border-border/20 last:border-0 hover:bg-secondary/10 transition-colors cursor-pointer"
      onClick={onView}
    >
      {/* Thumbnail */}
      <td className="w-16 px-4 py-2.5">
        <div className="relative">
          <PropertyThumb src={property.image} title={property.title} />
          {property.featured && (
            <div className="absolute -top-1 -right-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </div>
          )}
        </div>
      </td>

      {/* Title + address */}
      <td className="max-w-[200px] px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-foreground">{property.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          {property.city}, {property.state}
        </p>
      </td>

      {/* Category */}
      <td className="px-3 py-2.5">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/40 text-muted-foreground whitespace-nowrap">
          {property.category}
        </Badge>
      </td>

      {/* Status */}
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:opacity-80 transition-opacity">
              <StatusDot status={property.status} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Change Status</p>
            <DropdownMenuSeparator />
            {STATUS_LIST.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => onStatusChange(s)}
                className={cn("gap-2 text-xs", property.status === s && "font-semibold")}
              >
                <span className={cn("h-2 w-2 rounded-full", STATUS_CONFIG[s].dot)} />
                {STATUS_CONFIG[s].label}
                {property.status === s && <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>

      {/* Price */}
      <td className="px-3 py-2.5">
        <p className="text-sm font-bold text-foreground tabular-nums">{formatPrice(property.price)}</p>
      </td>

      {/* Specs */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Bed className="h-3 w-3" />{property.beds}</span>
          <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" />{property.baths}</span>
          <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" />{(property.sqft / 1000).toFixed(1)}k</span>
        </div>
      </td>

      {/* Agent */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
            {initials}
          </div>
          <span className="truncate text-xs text-muted-foreground">{property.agent.split(" ")[0]}</span>
        </div>
      </td>

      {/* DOM */}
      <td className="px-3 py-2.5">
        <span className={cn(
          "text-xs tabular-nums",
          property.daysOnMarket > 120 ? "text-rose-400" : property.daysOnMarket > 60 ? "text-amber-400" : "text-muted-foreground"
        )}>
          {property.daysOnMarket}d
        </span>
      </td>

      {/* Analytics */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{property.analytics.views}</span>
          <span className={cn("flex items-center gap-0.5 font-medium",
            property.analytics.trend.startsWith("+") ? "text-emerald-400" : "text-rose-400"
          )}>
            <TrendingUp className="h-3 w-3" />{property.analytics.trend}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onView} className="gap-2 text-xs">
                <Eye className="h-3.5 w-3.5" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit Property
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-xs text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  )
}
