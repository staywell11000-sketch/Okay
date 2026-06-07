import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type PropertyRecord, type PropertyInput, uploadPropertyImage } from "@/lib/properties-api"
import { type DealerRecord } from "@/lib/dealers-api"
import { Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

const PROPERTY_TYPES = [
  { value: "plot",       label: "Plot" },
  { value: "house",      label: "House" },
  { value: "flat",       label: "Flat / Apartment" },
  { value: "commercial", label: "Commercial" },
]

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "sold",      label: "Sold" },
  { value: "pending",   label: "Pending" },
]

type Props = {
  open: boolean
  onClose: () => void
  onSave: (input: PropertyInput) => Promise<void>
  existing?: PropertyRecord | null
  isSaving?: boolean
  dealers?: DealerRecord[]
}

type FormState = {
  title: string; type: string; status: string; price: string
  city: string; sector: string; state: string
  sizeMarla: string; bedrooms: string; bathrooms: string
  description: string; images: string[]
  dealerId: string; agentId: string; subtype: string
}

const EMPTY: FormState = {
  title: "", type: "plot", status: "available", price: "",
  city: "", sector: "", state: "Punjab",
  sizeMarla: "", bedrooms: "", bathrooms: "",
  description: "", images: [],
  dealerId: "", agentId: "", subtype: "",
}

export function PropertyPKFormModal({ open, onClose, onSave, existing, isSaving, dealers = [] }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        type: existing.type ?? "plot",
        status: existing.status ?? "available",
        price: existing.price ?? "",
        city: existing.city ?? "",
        sector: existing.sector ?? "",
        state: existing.state ?? "Punjab",
        sizeMarla: existing.sizeMarla ?? "",
        bedrooms: existing.bedrooms != null ? String(existing.bedrooms) : "",
        bathrooms: existing.bathrooms ?? "",
        description: existing.description ?? "",
        images: existing.images ?? [],
        dealerId: existing.dealerId != null ? String(existing.dealerId) : "",
        agentId: existing.agentId ?? "",
        subtype: existing.subtype ?? "",
      })
    } else {
      setForm(EMPTY)
    }
  }, [existing, open])

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map((f) => uploadPropertyImage(f)))
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }))
    } catch {
      toast.error("Failed to upload image")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const removeImage = (idx: number) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const input: PropertyInput = {
      title: form.title,
      type: form.type,
      status: form.status,
      price: form.price || undefined,
      city: form.city || "",
      address: form.sector || form.city || "",
      state: form.state || "Punjab",
      sizeMarla: form.sizeMarla || undefined,
      sector: form.sector || undefined,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms || undefined,
      description: form.description || undefined,
      images: form.images,
      dealerId: form.dealerId ? Number(form.dealerId) : undefined,
      agentId: form.agentId || undefined,
      subtype: form.subtype || undefined,
    } as any
    await onSave(input)
  }

  const showBedBath = form.type !== "plot" && form.type !== "commercial"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Property" : "Add Property"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="images" className="flex-1">Images</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-0">
              <div>
                <Label>Title *</Label>
                <Input placeholder="e.g. 10 Marla House DHA Phase 5" value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Property Type</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (PKR)</Label>
                  <Input type="number" placeholder="e.g. 15000000" value={form.price} onChange={(e) => set("price", e.target.value)} />
                </div>
                <div>
                  <Label>Size (Marla)</Label>
                  <Input type="number" step="0.5" placeholder="e.g. 10" value={form.sizeMarla} onChange={(e) => set("sizeMarla", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Society / Sector</Label>
                  <Input placeholder="e.g. DHA Phase 5" value={form.sector} onChange={(e) => set("sector", e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input placeholder="e.g. Lahore" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
              </div>
              {showBedBath && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Bedrooms</Label>
                    <Input type="number" placeholder="e.g. 3" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
                  </div>
                  <div>
                    <Label>Bathrooms</Label>
                    <Input type="number" placeholder="e.g. 2" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-3 mt-0">
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Describe the property..." value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
              </div>
              <div>
                <Label>Assigned Dealer</Label>
                <Select value={form.dealerId || "none"} onValueChange={(v) => set("dealerId", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select dealer (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No dealer</SelectItem>
                    {dealers.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}{d.company ? ` — ${d.company}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub-type / Variant</Label>
                <Input placeholder="e.g. Corner Plot, Single Storey, Ground Floor" value={form.subtype} onChange={(e) => set("subtype", e.target.value)} />
              </div>
              <div>
                <Label>Province</Label>
                <Select value={form.state} onValueChange={(v) => set("state", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Punjab">Punjab</SelectItem>
                    <SelectItem value="Sindh">Sindh</SelectItem>
                    <SelectItem value="KPK">KPK</SelectItem>
                    <SelectItem value="Balochistan">Balochistan</SelectItem>
                    <SelectItem value="Islamabad">Islamabad (ICT)</SelectItem>
                    <SelectItem value="AJK">AJK</SelectItem>
                    <SelectItem value="GB">Gilgit-Baltistan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="images" className="mt-0">
              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block">Property Images</Label>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-muted/30 py-8 hover:border-primary/40 hover:bg-muted/50 transition-colors">
                    {uploading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">Click to upload images</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP — multiple allowed</p>
                      </>
                    )}
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden bg-muted">
                        <img src={img} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {idx === 0 && (
                          <div className="absolute bottom-1 left-1 rounded px-1 py-0.5 bg-black/60 text-[9px] text-white font-medium">Cover</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving || !form.title.trim() || uploading}>
              {isSaving ? "Saving…" : existing ? "Save Changes" : "Add Property"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
