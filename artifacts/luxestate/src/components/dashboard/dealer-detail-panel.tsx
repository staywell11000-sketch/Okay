import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Phone, Mail, MapPin, Building2, Pencil, Trash2, ToggleLeft, ToggleRight, TrendingUp, Handshake, Users } from "lucide-react"
import { type DealerRecord } from "@/lib/dealers-api"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<string, string> = {
  individual:      "Individual Broker",
  agency:          "Agency",
  investor:        "Investor",
  builder_partner: "Builder Partner",
}

type Props = {
  dealer: DealerRecord | null
  open: boolean
  onClose: () => void
  onEdit: (d: DealerRecord) => void
  onDelete: (id: number) => void
  onToggleStatus: (d: DealerRecord) => void
}

export function DealerDetailPanel({ dealer, open, onClose, onEdit, onDelete, onToggleStatus }: Props) {
  if (!dealer) return null

  const initials = dealer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const isActive = dealer.status === "active"
  const convRate = dealer.totalLeads && dealer.totalLeads > 0
    ? ((dealer.totalDeals ?? 0) / dealer.totalLeads * 100).toFixed(0)
    : "0"

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Dealer Profile</SheetTitle>
        </SheetHeader>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-accent/80 text-xl font-bold text-primary-foreground shadow-sm">
            {dealer.profileImage ? (
              <img src={dealer.profileImage} alt={dealer.name} className="h-full w-full rounded-2xl object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">{dealer.name}</h3>
            {dealer.company && <p className="text-sm text-muted-foreground truncate">{dealer.company}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">{TYPE_LABELS[dealer.dealerType] ?? dealer.dealerType}</Badge>
              <Badge variant="outline" className={cn("text-xs", isActive ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground")}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2.5 mb-6">
          {dealer.phone && (
            <a href={`tel:${dealer.phone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {dealer.phone}
            </a>
          )}
          {dealer.email && (
            <a href={`mailto:${dealer.email}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {dealer.email}
            </a>
          )}
          {dealer.location && (
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {dealer.location}
            </div>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Analytics */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Performance</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
              <div className="flex justify-center mb-1"><Users className="h-4 w-4 text-primary/60" /></div>
              <p className="text-xl font-bold text-foreground">{dealer.totalLeads ?? 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Leads</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
              <div className="flex justify-center mb-1"><Handshake className="h-4 w-4 text-primary/60" /></div>
              <p className="text-xl font-bold text-foreground">{dealer.totalDeals ?? 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Deals</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
              <div className="flex justify-center mb-1"><TrendingUp className="h-4 w-4 text-primary/60" /></div>
              <p className="text-xl font-bold text-foreground">{convRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Conv. Rate</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {dealer.notes && (
          <>
            <Separator className="mb-4" />
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{dealer.notes}</p>
            </div>
          </>
        )}

        <Separator className="mb-4" />

        {/* Meta */}
        <div className="text-xs text-muted-foreground mb-6 space-y-1">
          <p>Added: {new Date(dealer.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
          <p>Updated: {new Date(dealer.updatedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => onEdit(dealer)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              className="flex-1" variant="outline"
              onClick={() => onToggleStatus(dealer)}
            >
              {isActive ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            onClick={() => { onDelete(dealer.id); onClose(); }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Dealer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
