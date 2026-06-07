import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, Clock, ExternalLink, CreditCard } from "lucide-react"
import { format } from "date-fns"

const ADDON_PLANS = ["addon_ai_requests", "addon_leads", "addon_storage", "addon_whatsapp_accounts"]

function ApproveDialog({ payment, onSuccess }: { payment: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [months, setMonths] = useState("1")
  const { toast } = useToast()
  const isAddon = ADDON_PLANS.includes(payment.plan)

  const mutation = useMutation({
    mutationFn: () => {
      const endpoint = isAddon
        ? `/api/admin/payments/${payment.id}/approve-addon`
        : `/api/admin/payments/${payment.id}/approve`
      return apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: parseInt(months) }),
      }).then(r => r.json())
    },
    onSuccess: () => { toast({ title: "Payment approved" }); setOpen(false); onSuccess() },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  })

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Approve</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Payment — {payment.org_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p><strong>Plan:</strong> {payment.plan}</p>
              <p><strong>Amount:</strong> Rs. {Number(payment.amount).toLocaleString()}</p>
              <p><strong>Submitted:</strong> {format(new Date(payment.submitted_at), "MMM d, yyyy h:mm a")}</p>
              {payment.notes && <p><strong>Notes:</strong> {payment.notes}</p>}
            </div>
            {payment.screenshot_url && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Screenshot</p>
                <div className="rounded-xl overflow-hidden border border-border bg-muted">
                  <img
                    src={payment.screenshot_url}
                    alt="Payment proof"
                    className="w-full max-h-64 object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                </div>
                <a href={payment.screenshot_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />Open full image
                </a>
              </div>
            )}
            {!isAddon && (
              <div className="space-y-1">
                <Label>Duration (months)</Label>
                <Input type="number" min="1" max="24" value={months} onChange={e => setMonths(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RejectDialog({ payment, onSuccess }: { payment: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/api/admin/payments/${payment.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Payment rejected" }); setOpen(false); onSuccess() },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  })

  return (
    <>
      <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setOpen(true)}>Reject</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea placeholder="Reason for rejection..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Rejecting..." : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function AdminPayments() {
  const [status, setStatus] = useState("pending")
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", status],
    queryFn: () => apiFetch(`/api/admin/payments?status=${status}`).then(r => r.json()),
    refetchInterval: 15_000,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-payments"] })
  const payments = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Payment Requests</h1>
        <p className="text-muted-foreground text-sm">Review and approve customer payment submissions</p>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No {status === "all" ? "" : status} payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.org_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{p.plan.replace("addon_", "Add-on: ").replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.owner_email}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.submitted_at), "MMM d, yyyy · h:mm a")}</p>
                    {p.rejection_reason && <p className="text-xs text-destructive">Rejected: {p.rejection_reason}</p>}
                    {p.notes && <p className="text-xs text-muted-foreground">Notes: {p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold">Rs. {Number(p.amount).toLocaleString()}</span>
                    {p.status === "pending" && (
                      <div className="flex gap-2">
                        <ApproveDialog payment={p} onSuccess={refresh} />
                        <RejectDialog payment={p} onSuccess={refresh} />
                      </div>
                    )}
                    {p.status === "approved" && <Badge variant="outline" className="gap-1 text-green-600 border-green-300"><CheckCircle2 className="h-3 w-3" />Approved</Badge>}
                    {p.status === "rejected" && <Badge variant="outline" className="gap-1 text-red-600 border-red-300"><XCircle className="h-3 w-3" />Rejected</Badge>}
                    {p.status === "pending" && <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300"><Clock className="h-3 w-3" />Pending</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
