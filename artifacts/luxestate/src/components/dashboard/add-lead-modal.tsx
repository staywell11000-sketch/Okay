import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { surfaceInputClass, surfaceSelectClass, surfaceSelectIconClass } from "@/lib/ui-classes"
import { User, Mail, Phone, DollarSign, Building2, UserCheck, StickyNote, ChevronDown, Megaphone, Layers } from "lucide-react"
import { Lead, LeadPriority } from "@/components/dashboard/leads-types"
import { agents, propertyOptions, adPlatformSources } from "@/components/dashboard/leads-data"
import { CreateLeadInput } from "@/lib/leads-api"

type Props = {
  open: boolean
  onClose: () => void
  onAdd?: (data: CreateLeadInput) => Promise<Lead>
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  budget: "",
  source: "manual" as Lead["source"],
  priority: "warm" as LeadPriority,
  assignedTo: agents[0],
  property: "",
  notes: "",
  campaign: "",
  adSetName: "",
}

export function AddLeadModal({ open, onClose, onAdd }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const isAdPlatform = adPlatformSources.includes(form.source as typeof adPlatformSources[number])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Name is required"
    if (!form.email.trim()) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email"
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)

    const initials = form.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    const data: CreateLeadInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone || "—",
      whatsappNumber: form.phone.replace(/\D/g, ""),
      interestedProperties: form.property ? [form.property] : [],
      property: form.property || "—",
      budget: form.budget || "—",
      status: "new",
      priority: form.priority,
      source: form.source,
      assignedTo: form.assignedTo,
      lastContact: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      avatar: initials,
      score: form.priority === "hot" ? 75 : form.priority === "warm" ? 55 : 35,
      urgencyScore: form.priority === "hot" ? 70 : form.priority === "warm" ? 45 : 25,
      tags: [],
      notes: form.notes ? [form.notes] : [],
      timeline: [
        { id: `tl-${Date.now()}`, title: "Lead created via CRM", time: "Just now" },
      ],
      attachments: [],
      suggestedActions: [],
      campaign: form.campaign || undefined,
      adSetName: isAdPlatform && form.adSetName ? form.adSetName : undefined,
    }

    try {
      await onAdd?.(data)
      setForm(emptyForm)
      setErrors({})
      onClose()
    } catch {
      // error handled by mutation
    } finally {
      setSubmitting(false)
    }
  }

  const priorityOptions: { value: LeadPriority; label: string }[] = [
    { value: "hot", label: "🔴 Hot" },
    { value: "warm", label: "🟠 Warm" },
    { value: "cold", label: "🔵 Cold" },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            Add New Lead
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="lead-name" className="text-xs font-medium text-muted-foreground">
              Full Name <span className="text-red-500" aria-hidden="true">*</span>
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lead-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Sarah Mitchell"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "lead-name-error" : undefined}
                className={cn("pl-9", surfaceInputClass, errors.name && "border-red-500")}
              />
            </div>
            {errors.name && (
              <p id="lead-name-error" role="alert" className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <Label htmlFor="lead-email" className="text-xs font-medium text-muted-foreground">
              Email <span className="text-red-500" aria-hidden="true">*</span>
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="e.g. sarah@email.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "lead-email-error" : undefined}
                className={cn("pl-9", surfaceInputClass, errors.email && "border-red-500")}
              />
            </div>
            {errors.email && (
              <p id="lead-email-error" role="alert" className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Phone + Budget */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-phone" className="text-xs font-medium text-muted-foreground">Phone</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lead-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={cn("pl-9", surfaceInputClass)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-budget" className="text-xs font-medium text-muted-foreground">Budget</Label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lead-budget"
                  value={form.budget}
                  onChange={(e) => set("budget", e.target.value)}
                  placeholder="e.g. ₨ 5–8 Cr"
                  className={cn("pl-9", surfaceInputClass)}
                />
              </div>
            </div>
          </div>

          {/* Property + Source */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-property" className="text-xs font-medium text-muted-foreground">Property Interest</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="lead-property"
                  value={form.property}
                  onChange={(e) => set("property", e.target.value)}
                  className={surfaceSelectIconClass}
                >
                  <option value="">Any property</option>
                  {propertyOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-source" className="text-xs font-medium text-muted-foreground">Lead Source</Label>
              <div className="relative">
                <select
                  id="lead-source"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value as Lead["source"])}
                  className={surfaceSelectClass}
                >
                  <optgroup label="Platform">
                    <option value="manual">Manual Entry</option>
                    <option value="website">Website</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Referral">Referral</option>
                    <option value="Email">Email</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="LinkedIn">LinkedIn</option>
                  </optgroup>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Campaign fields — shown for ad platforms */}
          {isAdPlatform && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="lead-campaign" className="text-xs font-medium text-muted-foreground">Campaign Name</Label>
                <div className="relative">
                  <Megaphone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="lead-campaign"
                    value={form.campaign}
                    onChange={(e) => set("campaign", e.target.value)}
                    placeholder="e.g. Summer 2026"
                    className={cn("pl-9", surfaceInputClass)}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lead-adset" className="text-xs font-medium text-muted-foreground">Ad Set</Label>
                <div className="relative">
                  <Layers className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="lead-adset"
                    value={form.adSetName}
                    onChange={(e) => set("adSetName", e.target.value)}
                    placeholder="e.g. Luxury Buyers 35–55"
                    className={cn("pl-9", surfaceInputClass)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Priority + Assign */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-priority" className="text-xs font-medium text-muted-foreground">Priority</Label>
              <div className="relative">
                <select
                  id="lead-priority"
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value as LeadPriority)}
                  className={surfaceSelectClass}
                >
                  {priorityOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-assign" className="text-xs font-medium text-muted-foreground">Assign To</Label>
              <div className="relative">
                <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="lead-assign"
                  value={form.assignedTo}
                  onChange={(e) => set("assignedTo", e.target.value)}
                  className={surfaceSelectIconClass}
                >
                  {agents.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label htmlFor="lead-notes" className="text-xs font-medium text-muted-foreground">Initial Notes</Label>
            <div className="relative">
              <StickyNote className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
              <textarea
                id="lead-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any initial context about this lead..."
                rows={2}
                className="w-full resize-none rounded-xl border border-border/50 bg-secondary/20 pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/50">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            {submitting ? "Creating…" : "Create Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
