import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Pencil, CheckCircle, Share2, Home, MapPin, Maximize2, BedDouble, Bath, Handshake } from "lucide-react"
import { type PropertyRecord } from "@/lib/properties-api"
import { cn } from "@/lib/utils"

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  plot:       { label: "Plot",       color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  house:      { label: "House",      color: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  flat:       { label: "Flat",       color: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  apartment:  { label: "Apartment",  color: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  commercial: { label: "Commercial", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  available:   { label: "Available",  color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", dot: "bg-emerald-500" },
  sold:        { label: "Sold",       color: "bg-rose-500/15 text-rose-600 border-rose-500/30",           dot: "bg-rose-500"    },
  pending:     { label: "Pending",    color: "bg-amber-500/15 text-amber-600 border-amber-500/30",         dot: "bg-amber-500"   },
  active:      { label: "Active",     color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", dot: "bg-emerald-500" },
  under_offer: { label: "Under Offer",color: "bg-amber-500/15 text-amber-600 border-amber-500/30",         dot: "bg-amber-500"   },
  withdrawn:   { label: "Withdrawn",  color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",           dot: "bg-zinc-500"    },
}

function formatPKR(val: string | number | null | undefined): string {
  const n = val ? Number(val) : 0
  if (!n) return "Price TBD"
  if (n >= 10_000_000) return `PKR ${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)} Crore`
  if (n >= 100_000) return `PKR ${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)} Lac`
  return `PKR ${n.toLocaleString()}`
}

function formatSize(sizeMarla: string | number | null | undefined, sqft: number | null | undefined): string {
  if (sizeMarla) {
    const m = Number(sizeMarla)
    if (m >= 20) return `${(m / 20).toFixed(m % 20 === 0 ? 0 : 1)} Kanal`
    return `${m} Marla`
  }
  if (sqft) return `${sqft.toLocaleString()} sqft`
  return ""
}

type Props = {
  property: PropertyRecord
  dealerName?: string
  onView: (p: PropertyRecord) => void
  onEdit: (p: PropertyRecord) => void
  onMarkSold: (p: PropertyRecord) => void
  onShare: (p: PropertyRecord) => void
}

export function PropertyMarketplaceCard({ property, dealerName, onView, onEdit, onMarkSold, onShare }: Props) {
  const images = property.images ?? []
  const coverImage = images[0] || ""
  const typeCfg = TYPE_CONFIG[property.type ?? ""] ?? { label: property.type ?? "Property", color: "bg-muted text-muted-foreground border-border" }
  const statusCfg = STATUS_CONFIG[property.status] ?? { label: property.status, color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" }
  const location = [property.sector, property.city].filter(Boolean).join(", ")
  const sizeLabel = formatSize(property.sizeMarla, property.sqft)

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
      {/* Image */}
      <div className="relative h-44 shrink-0 overflow-hidden bg-muted">
        {coverImage ? (
          <img src={coverImage} alt={property.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Home className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge variant="outline" className={cn("text-[10px] font-semibold border px-1.5 py-0.5", typeCfg.color)}>{typeCfg.label}</Badge>
        </div>
        <div className="absolute right-2 top-2">
          <Badge variant="outline" className={cn("text-[10px] font-semibold border px-1.5 py-0.5 flex items-center gap-1", statusCfg.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </Badge>
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
            +{images.length - 1} photos
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Price */}
        <p className="text-base font-bold text-foreground leading-tight">{formatPKR(property.price)}</p>

        {/* Title */}
        <p className="text-sm font-semibold text-foreground line-clamp-1">{property.title}</p>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Specs */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
          {sizeLabel && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {sizeLabel}
            </span>
          )}
          {(property.bedrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" />
              {property.bedrooms} Bed
            </span>
          )}
          {property.bathrooms && Number(property.bathrooms) > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              {property.bathrooms} Bath
            </span>
          )}
        </div>

        {/* Dealer */}
        {dealerName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">
            <Handshake className="h-3 w-3 shrink-0 text-primary/60" />
            <span className="line-clamp-1">{dealerName}</span>
          </div>
        )}

        {/* Description */}
        {property.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{property.description}</p>
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center gap-1.5 pt-2 border-t border-border/50">
          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onView(property)}>
            <Eye className="mr-1 h-3 w-3" /> View
          </Button>
          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onEdit(property)}>
            <Pencil className="mr-1 h-3 w-3" /> Edit
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 w-7 p-0 text-xs hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
            title="Mark as Sold"
            onClick={() => onMarkSold(property)}
          >
            <CheckCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 w-7 p-0 text-xs hover:bg-sky-500/10 hover:text-sky-600 hover:border-sky-500/30"
            title="Share"
            onClick={() => onShare(property)}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
