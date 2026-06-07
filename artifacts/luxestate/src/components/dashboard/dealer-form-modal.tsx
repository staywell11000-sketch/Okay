import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type DealerRecord, type DealerInput } from "@/lib/dealers-api"

const DEALER_TYPES = [
  { value: "individual",      label: "Individual Broker" },
  { value: "agency",          label: "Agency" },
  { value: "investor",        label: "Investor" },
  { value: "builder_partner", label: "Builder Partner" },
]

type Props = {
  open: boolean
  onClose: () => void
  onSave: (input: DealerInput) => Promise<void>
  existing?: DealerRecord | null
  isSaving?: boolean
}

const EMPTY: DealerInput = {
  name: "", company: "", phone: "", email: "",
  location: "", dealerType: "individual", status: "active", notes: "",
}

export function DealerFormModal({ open, onClose, onSave, existing, isSaving }: Props) {
  const [form, setForm] = useState<DealerInput>(EMPTY)

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        company: existing.company ?? "",
        phone: existing.phone,
        email: existing.email ?? "",
        location: existing.location ?? "",
        dealerType: existing.dealerType,
        status: existing.status,
        notes: existing.notes ?? "",
      })
    } else {
      setForm(EMPTY)
    }
  }, [existing, open])

  const set = (k: keyof DealerInput, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    await onSave(form)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Dealer" : "Add Dealer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Ahmed Khan" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <Label>Company</Label>
              <Input placeholder="Agency or company name" value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div>
              <Label>Dealer Type</Label>
              <Select value={form.dealerType} onValueChange={(v) => set("dealerType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEALER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone *</Label>
              <Input placeholder="+92 300 0000000" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="dealer@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Location</Label>
              <Input placeholder="e.g. DHA Phase 5, Lahore" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes about this dealer..." value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving || !form.name.trim() || !form.phone.trim()}>
              {isSaving ? "Saving…" : existing ? "Save Changes" : "Add Dealer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
