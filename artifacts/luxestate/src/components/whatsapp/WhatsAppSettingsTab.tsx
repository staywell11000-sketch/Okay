import { useState } from "react"
import { FaWhatsapp } from "react-icons/fa"
import {
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Unplug, Zap,
  Copy, CheckCheck, ExternalLink, Webhook, Phone, Building2,
  ShieldCheck, WifiOff, Activity, ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  useWhatsAppStatus, useWhatsAppHealth, useWhatsAppSyncTemplates,
  useWhatsAppDisconnect, type WhatsAppTemplate,
} from "@/lib/whatsapp-api"
import { WhatsAppEmbeddedSignup } from "./WhatsAppConnect"
import { toast } from "sonner"

// ─── Template status badge ────────────────────────────────

function TemplateBadge({ status }: { status: string }) {
  const cls =
    status === "APPROVED" ? "bg-green-500/10 text-green-600 border-green-500/20" :
    status === "PENDING"  ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
    status === "REJECTED" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                            "bg-secondary text-muted-foreground border-border/50"
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", cls)}>
      {status}
    </span>
  )
}

// ─── Copy button ──────────────────────────────────────────

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="rounded p-1 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ─── Info row ─────────────────────────────────────────────

function InfoRow({ label, value, mono = false, copyable = false }: {
  label: string; value: string | null | undefined; mono?: boolean; copyable?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className={cn("text-xs text-foreground truncate", mono && "font-mono")}>{value}</span>
        {copyable && <CopyBtn value={value} />}
      </div>
    </div>
  )
}

// ─── Health indicator ─────────────────────────────────────

function HealthDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2 w-2 rounded-full", ok ? "bg-green-500" : "bg-red-500")} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

// ─── Templates table ──────────────────────────────────────

function TemplatesTable({ templates }: { templates: WhatsAppTemplate[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? templates : templates.slice(0, 5)

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/30">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground hidden sm:table-cell">Language</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="px-3 py-2 font-mono text-[11px] text-foreground">{t.name}</td>
                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{t.language}</td>
                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell capitalize">{t.category?.toLowerCase()}</td>
                <td className="px-3 py-2 text-right"><TemplateBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {templates.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Show fewer" : `Show all ${templates.length} templates`}
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────

export function WhatsAppSettingsTab() {
  const { data: status, isLoading: statusLoading } = useWhatsAppStatus()
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useWhatsAppHealth(
    !!(status?.connected)
  )
  const syncTemplates = useWhatsAppSyncTemplates()
  const disconnect    = useWhatsAppDisconnect()
  const [confirming,  setConfirming] = useState(false)

  const connected  = status?.connected ?? false
  const templates: WhatsAppTemplate[] = (connected && status?.connected) ? (status.templates ?? []) : []

  const handleSync = async () => {
    try {
      const r = await syncTemplates.mutateAsync()
      toast.success(`Synced ${r.synced} template${r.synced !== 1 ? "s" : ""}`)
    } catch (err: any) {
      toast.error(err?.message ?? "Sync failed")
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync()
      setConfirming(false)
      toast.success("WhatsApp account disconnected")
    } catch (err: any) {
      toast.error(err?.message ?? "Disconnect failed")
    }
  }

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading WhatsApp status…
      </div>
    )
  }

  // ── Not connected ──────────────────────────────────────
  if (!connected) {
    return (
      <div className="space-y-4 max-w-xl">
        <div>
          <h3 className="text-base font-semibold text-foreground">WhatsApp Business</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect your WhatsApp Business account to send and receive messages with your leads.
          </p>
        </div>
        <WhatsAppEmbeddedSignup />
      </div>
    )
  }

  // ── Connected ──────────────────────────────────────────
  const isHealthy    = health?.connected && health.healthy
  const healthIssues = health?.connected ? (health.warnings ?? []) : []

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Status card */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/10">
              <FaWhatsapp className="h-6 w-6 text-[#25D366]" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {(status as any)?.accountName ?? "WhatsApp Business"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isHealthy ? "bg-green-500" : healthLoading ? "bg-amber-500 animate-pulse" : "bg-amber-500"
                )} />
                <span className="text-xs text-muted-foreground">
                  {healthLoading ? "Checking…" : isHealthy ? "Connected & healthy" : "Connected (issues detected)"}
                </span>
              </div>
            </div>
          </div>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 border shrink-0">Active</Badge>
        </div>

        {/* Account details */}
        {status?.connected && (
        <div className="rounded-xl border border-border/50 bg-secondary/20 px-4 divide-y divide-border/40">
          <InfoRow label="Business Name"  value={status.businessName ?? status.accountName} />
          <InfoRow label="Phone Number"   value={status.phoneNumber} />
          <InfoRow label="Phone Number ID" value={status.phoneNumberId} mono copyable />
          <InfoRow label="WABA ID"        value={status.wabaId}       mono copyable />
          <InfoRow
            label="Last Synced"
            value={status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "—"}
          />
        </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <WhatsAppEmbeddedSignup
            compact
            onSuccess={() => toast.success("WhatsApp account reconnected")}
          />
          {!confirming ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => setConfirming(true)}
            >
              <Unplug className="h-3.5 w-3.5" /> Disconnect
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Disconnect WhatsApp?</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-3 text-xs"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, disconnect"}
              </Button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Health check */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Connection Health</h3>
              <p className="text-xs text-muted-foreground">Verifies your token and phone number are still valid</p>
            </div>
          </div>
          <button
            onClick={() => refetchHealth()}
            className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh health check"
          >
            <RefreshCw className={cn("h-4 w-4", healthLoading && "animate-spin")} />
          </button>
        </div>

        {health?.connected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              <HealthDot ok={health.tokenValid}       label="Access token valid" />
              <HealthDot ok={health.phoneValid}        label="Phone number accessible" />
              <HealthDot ok={health.webhookConfigured} label="Webhook configured" />
            </div>
            {health.details?.verifiedName && (
              <p className="text-xs text-muted-foreground">
                Verified name: <span className="font-medium text-foreground">{health.details.verifiedName}</span>
                {health.details.qualityRating && ` · Quality: ${health.details.qualityRating}`}
              </p>
            )}
            {healthIssues.length > 0 && (
              <div className="space-y-1.5">
                {healthIssues.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {w}
                  </div>
                ))}
              </div>
            )}
            {health.healthy && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All checks passed — your WhatsApp integration is healthy
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
            {healthLoading ? "Checking health…" : "Health check unavailable"}
          </div>
        )}
      </div>

      {/* Webhook configuration */}
      {health?.connected && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Webhook Configuration</h3>
              <p className="text-xs text-muted-foreground">Configure these in your Meta App Dashboard → WhatsApp → Configuration</p>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/20 px-4 divide-y divide-border/40">
            <InfoRow
              label="Callback URL"
              value={health.webhookUrl}
              mono
              copyable
            />
            <InfoRow
              label="Verify Token"
              value={health.verifyToken ?? "Not configured"}
              mono
              copyable={!!health.verifyToken}
            />
          </div>
          {health.webhookConfigured ? (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Webhook verify token is configured
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Set <code className="mx-0.5 rounded bg-secondary px-1 font-mono text-[11px]">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> in your environment secrets to enable inbound messages.
            </div>
          )}
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open Meta App Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Message templates */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Message Templates</h3>
              <p className="text-xs text-muted-foreground">
                {templates.length > 0
                  ? `${templates.length} template${templates.length !== 1 ? "s" : ""} synced`
                  : "Sync your approved WhatsApp message templates"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shrink-0"
            onClick={handleSync}
            disabled={syncTemplates.isPending}
          >
            {syncTemplates.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Sync Templates
          </Button>
        </div>

        {templates.length > 0 ? (
          <TemplatesTable templates={templates} />
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
            <p className="text-sm text-muted-foreground">No templates synced yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click "Sync Templates" to pull your approved templates from Meta
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
