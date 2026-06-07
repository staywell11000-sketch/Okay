import { useState, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { usePlan } from "@/lib/plan-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Clock, XCircle, Zap, CreditCard, Package, AlertTriangle, TrendingUp, ImagePlus, X, Loader2 } from "lucide-react"
import { format } from "date-fns"

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-gray-500",
  starter: "bg-blue-500",
  professional: "bg-purple-500",
  agency: "bg-amber-500",
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["1 User", "500 Leads/mo", "1 WhatsApp Number", "1 Facebook Page", "2 GB Storage", "Basic Analytics"],
  professional: ["5 Users", "5,000 Leads/mo", "3 WhatsApp Numbers", "3 Facebook Pages", "20 GB Storage", "Advanced Analytics", "Team Management", "Deals Pipeline", "Facebook/Instagram Sync"],
  agency: ["Unlimited Users", "Unlimited Leads", "Unlimited WhatsApp", "Unlimited Facebook", "100 GB Storage", "All Professional Features", "AI Intelligence", "Automations", "Priority Support"],
}

const AI_LIMITS: Record<string, number> = { starter: 100, professional: 1000, agency: 5000 }

function objectPathToUrl(objectPath: string): string {
  return objectPath.replace(/^\/objects/, `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/storage/objects`)
}

async function uploadScreenshot(file: File): Promise<string> {
  const res = await apiFetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  })
  if (!res.ok) throw new Error("Failed to get upload URL")
  const { uploadURL, objectPath } = await res.json()
  const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!put.ok) throw new Error("Upload failed")
  return objectPathToUrl(objectPath)
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300"><Clock className="h-3 w-3" />Pending</Badge>
  if (status === "approved") return <Badge variant="outline" className="gap-1 text-green-600 border-green-300"><CheckCircle2 className="h-3 w-3" />Approved</Badge>
  if (status === "rejected") return <Badge variant="outline" className="gap-1 text-red-600 border-red-300"><XCircle className="h-3 w-3" />Rejected</Badge>
  return <Badge variant="outline">{status}</Badge>
}

function ScreenshotUploader({ value, onChange }: { value: File | null; onChange: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const preview = value ? URL.createObjectURL(value) : null

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith("image/")) onChange(f)
  }, [onChange])

  if (value && preview) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border">
        <img src={preview} alt="Payment screenshot" className="w-full max-h-52 object-contain bg-muted" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 truncate">{value.name}</div>
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f) }}
      />
      <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center select-none">
        <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Upload payment screenshot</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tap to choose from gallery or files · PNG, JPG, WEBP</p>
        </div>
      </div>
    </div>
  )
}

function SubmitPaymentDialog({ title, plan, amount, onSuccess }: { title: string; plan: string; amount: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const reset = () => { setFile(null); setNotes(""); setUploading(false) }

  const mutation = useMutation({
    mutationFn: async () => {
      let screenshotUrl: string | undefined
      if (file) {
        setUploading(true)
        screenshotUrl = await uploadScreenshot(file)
        setUploading(false)
      }
      const res = await apiFetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, plan, screenshotUrl, notes: notes || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Submission failed")
      return data
    },
    onSuccess: () => {
      toast({ title: "Payment request submitted", description: "Our team will review it within 24 hours." })
      setOpen(false)
      reset()
      onSuccess()
    },
    onError: (err: any) => {
      setUploading(false)
      toast({ title: err.message ?? "Failed to submit", variant: "destructive" })
    },
  })

  const isPending = mutation.isPending || uploading

  return (
    <Dialog open={open} onOpenChange={v => { if (!isPending) { setOpen(v); if (!v) reset() } }}>
      <DialogTrigger asChild>
        <Button size="sm">{title}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Payment Request</DialogTitle>
          <DialogDescription>
            Transfer <strong>Rs. {amount.toLocaleString()}</strong> to our bank account, take a screenshot, and upload it below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Bank details */}
          <div className="rounded-xl bg-muted p-4 text-sm space-y-1.5">
            <p className="font-semibold text-foreground">Bank Transfer Details</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
              <span className="font-medium text-foreground/70">Account</span><span>LuxeState CRM</span>
              <span className="font-medium text-foreground/70">Bank</span><span>HBL / Easypaisa / JazzCash</span>
              <span className="font-medium text-foreground/70">Amount</span><span className="font-semibold text-foreground">Rs. {amount.toLocaleString()}</span>
              <span className="font-medium text-foreground/70">Plan</span><span className="capitalize">{plan.replace("addon_", "Add-on: ").replace(/_/g, " ")}</span>
            </div>
          </div>

          {/* Screenshot upload */}
          <div className="space-y-1.5">
            <Label>Payment Screenshot <span className="text-muted-foreground font-normal">(recommended)</span></Label>
            <ScreenshotUploader value={file} onChange={setFile} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="notes"
              placeholder="Transaction ID, bank reference number..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset() }} disabled={isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={isPending} className="min-w-28">
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading…</>
            ) : mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</>
            ) : (
              "Submit Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function BillingPage() {
  const { org, credits, isSuperAdmin } = usePlan()
  const queryClient = useQueryClient()

  const { data: paymentsData } = useQuery({
    queryKey: ["payments-mine"],
    queryFn: () => apiFetch("/api/payments/mine").then(r => r.json()),
  })

  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: () => apiFetch("/api/plans").then(r => r.json()),
  })

  const payments = paymentsData?.data ?? []
  const plans = (plansData?.plans ?? []).filter((p: any) => p.slug !== "trial")

  const aiUsedPercent = credits
    ? Math.min(100, ((credits.used) / (credits.planIncluded || 1)) * 100)
    : 0

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payments-mine"] })
    queryClient.invalidateQueries({ queryKey: ["org-me"] })
    queryClient.invalidateQueries({ queryKey: ["ai-credits"] })
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan, AI credits, and payment history.</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current Plan</CardTitle>
            {org && (
              <Badge className={`${PLAN_COLORS[org.plan]} text-white capitalize`}>
                {org.planName || org.plan}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!org ? (
            <div className="flex items-center gap-2 text-yellow-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              No organization set up yet. Contact support.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <p className="font-medium capitalize mt-1">{org.subscriptionStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Renews</p>
                  <p className="font-medium mt-1">{org.subscriptionEndDate ? format(new Date(org.subscriptionEndDate), "MMM d, yyyy") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Max Users</p>
                  <p className="font-medium mt-1">{org.maxUsers ?? "Unlimited"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">AI Requests</p>
                  <p className="font-medium mt-1">{AI_LIMITS[org.plan] ?? 30}/mo</p>
                </div>
              </div>
              {org.isSuspended && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Your account is suspended. Contact support to restore access.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Credits */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-base">AI Credits</CardTitle>
          </div>
          <CardDescription>Monthly AI request allowance + purchased add-ons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuperAdmin ? (
            <p className="text-sm text-muted-foreground">Super Admin — unlimited AI access.</p>
          ) : credits ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plan Allowance Used</span>
                  <span className="font-medium">{credits.used} / {credits.planIncluded}</span>
                </div>
                <Progress value={aiUsedPercent} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground text-xs">Plan Remaining</p>
                  <p className="font-bold text-lg mt-1">{credits.remainingPlan}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground text-xs">Add-On Credits</p>
                  <p className="font-bold text-lg mt-1">{credits.addonRemaining}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground text-xs">Total Available</p>
                  <p className="font-bold text-lg mt-1">{(credits.available ?? 0)}</p>
                </div>
              </div>
              {(credits.available ?? 0) === 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  You have reached your monthly AI limit. Purchase add-on credits below.
                </div>
              )}
              {credits.resetAt && (
                <p className="text-xs text-muted-foreground">Resets monthly · Last reset: {format(new Date(credits.resetAt), "MMM d, yyyy")}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading credits...</p>
          )}
        </CardContent>
      </Card>

      {/* AI Add-On Store */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">AI Add-On Store</CardTitle>
          </div>
          <CardDescription>Purchase additional AI request credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="font-semibold">Extra AI Pack</p>
              <p className="text-sm text-muted-foreground">+500 AI Requests · No expiry</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-bold text-lg">Rs. 2,000</p>
              <SubmitPaymentDialog
                title="Purchase"
                plan="addon_ai_requests"
                amount={2000}
                onSuccess={refresh}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Upgrade Your Plan
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(plans.length > 0 ? plans : [
            { slug: "starter", name: "Starter", price_monthly: 9999 },
            { slug: "professional", name: "Professional", price_monthly: 19999 },
            { slug: "agency", name: "Agency", price_monthly: 25000 },
          ]).map((plan: any) => {
            const isCurrent = org?.plan === plan.slug
            return (
              <Card key={plan.slug} className={isCurrent ? "border-primary ring-1 ring-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold capitalize">{plan.name}</CardTitle>
                    {isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                  </div>
                  <p className="text-2xl font-bold">Rs. {plan.price_monthly?.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1">
                    {(PLAN_FEATURES[plan.slug] ?? []).map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <SubmitPaymentDialog
                      title={`Upgrade to ${plan.name}`}
                      plan={plan.slug}
                      amount={plan.price_monthly}
                      onSuccess={refresh}
                    />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <CardTitle className="text-base">Payment History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payment requests yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium capitalize">{p.plan.replace("addon_", "Add-On: ").replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.submitted_at), "MMM d, yyyy · h:mm a")}</p>
                    {p.rejection_reason && <p className="text-xs text-destructive mt-1">Reason: {p.rejection_reason}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">Rs. {Number(p.amount).toLocaleString()}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
