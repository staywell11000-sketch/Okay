import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Unplug,
  ExternalLink,
  Info,
  Clock,
  Copy,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type Provider,
  type ConnectedAccount,
  type OAuthUrlResult,
  useConnectedAccounts,
  useDisconnectAccount,
  fetchOAuthUrl,
} from "@/lib/connected-accounts-api"
import { toast } from "sonner"

// ─── Provider metadata ────────────────────────────────────

type ProviderMeta = {
  id: Provider
  name: string
  description: string
  color: string
  bgClass: string
  textClass: string
  borderClass: string
  logo: React.ReactNode
}

function MetaLogo({ letter, color }: { letter: string; color: string }) {
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-2xl text-base font-bold text-white"
      style={{ background: color }}
    >
      {letter}
    </div>
  )
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send automated messages and reply to leads via WhatsApp Business API.",
    color: "#25D366",
    bgClass: "bg-green-500/10",
    textClass: "text-green-600 dark:text-green-400",
    borderClass: "border-green-500/30",
    logo: <MetaLogo letter="W" color="#25D366" />,
  },
  {
    id: "facebook",
    name: "Facebook Pages",
    description: "Capture leads from Facebook Ads and Page engagement automatically.",
    color: "#1877F2",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500/30",
    logo: <MetaLogo letter="f" color="#1877F2" />,
  },
  {
    id: "instagram",
    name: "Instagram Business",
    description: "Connect your Instagram Business account to sync DMs and leads from stories.",
    color: "#E1306C",
    bgClass: "bg-pink-500/10",
    textClass: "text-pink-600 dark:text-pink-400",
    borderClass: "border-pink-500/30",
    logo: <MetaLogo letter="ig" color="#E1306C" />,
  },
  {
    id: "tiktok",
    name: "TikTok for Business",
    description: "Sync your TikTok Business account for lead generation from video content.",
    color: "#010101",
    bgClass: "bg-slate-500/10",
    textClass: "text-slate-600 dark:text-slate-300",
    borderClass: "border-slate-500/30",
    logo: (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-base font-bold text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.63a8.27 8.27 0 004.85 1.55V6.73a4.86 4.86 0 01-1.08-.04z" />
        </svg>
      </div>
    ),
  },
]

// ─── Helpers ──────────────────────────────────────────────

function getCallbackUrl(provider: Provider): string {
  const origin = window.location.origin
  return `${origin}/api/connected-accounts/callback/${provider}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

// ─── Status badge ─────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "expired" | "error" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    )
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        Token Expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
      <XCircle className="h-3 w-3" />
      Error
    </span>
  )
}

// ─── Individual provider card ─────────────────────────────

function ProviderCard({
  meta,
  account,
  onConnect,
  onDisconnect,
}: {
  meta: ProviderMeta
  account: ConnectedAccount | undefined
  onConnect: (provider: Provider) => Promise<void>
  onDisconnect: (id: string, provider: Provider) => void
}) {
  const [connecting, setConnecting] = useState(false)
  const [setupInfo, setSetupInfo] = useState<{ error: string; envVars: string[] } | null>(null)

  const handleConnect = async () => {
    if (connecting) return
    setConnecting(true)
    setSetupInfo(null)
    try {
      await onConnect(meta.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect"
      toast.error(msg)
    } finally {
      setConnecting(false)
    }
  }

  const handleConnectResult = async (provider: Provider): Promise<void> => {
    const returnUrl = window.location.origin + window.location.pathname
    const result: OAuthUrlResult = await fetchOAuthUrl(provider, returnUrl)
    if (!result.configured) {
      setSetupInfo({ error: result.error, envVars: result.envVars })
      return
    }
    window.location.href = result.url
  }

  const isConnected = !!account

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border p-5 transition-colors",
        isConnected
          ? cn("border", meta.borderClass, meta.bgClass)
          : "border-border/50 bg-card hover:border-border"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="shrink-0">{meta.logo}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={cn("text-sm font-semibold", isConnected ? meta.textClass : "text-foreground")}>
                {meta.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
            </div>

            {/* Status + actions */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              {isConnected && account.status && (
                <StatusBadge status={account.status} />
              )}

              {isConnected ? (
                <div className="flex items-center gap-2">
                  {account.status !== "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn("h-7 gap-1.5 text-xs", meta.borderClass, meta.textClass)}
                      onClick={handleConnect}
                      disabled={connecting}
                    >
                      {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Reconnect
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => onDisconnect(account.id, meta.id)}
                  >
                    <Unplug className="h-3 w-3" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => handleConnectResult(meta.id)}
                  disabled={connecting}
                >
                  {connecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Redirect URI row — always visible so users know what to register */}
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-secondary/30 px-2.5 py-1.5">
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Callback URL
            </span>
            <code className="min-w-0 flex-1 truncate font-mono text-[10px] text-foreground/70">
              {getCallbackUrl(meta.id)}
            </code>
            <CopyButton text={getCallbackUrl(meta.id)} />
          </div>

          {/* Connected account details */}
          {isConnected && (
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {account.account_name && (
                <span className="font-medium text-foreground">{account.account_name}</span>
              )}
              {account.account_id && (
                <span className="rounded-md bg-secondary/40 px-1.5 py-0.5 font-mono text-[11px]">
                  ID: {account.account_id}
                </span>
              )}
              {account.last_synced_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Synced {new Date(account.last_synced_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Setup required info panel */}
      <AnimatePresence>
        {setupInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Setup required before connecting</p>
                  <p className="text-muted-foreground">{setupInfo.error}</p>
                  {setupInfo.envVars.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {setupInfo.envVars.map((v) => (
                        <code key={v} className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px]">
                          {v}
                        </code>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-muted-foreground">
                    Add these in Replit → Secrets, then reload this page.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main tab component ───────────────────────────────────

type Props = {
  /** Passed from settings page when redirected back after OAuth */
  connectedProvider?: string | null
  errorMessage?: string | null
}

export function ConnectedAccountsTab({ connectedProvider, errorMessage }: Props) {
  const { data: accounts = [], isLoading, refetch } = useConnectedAccounts()
  const disconnectMutation = useDisconnectAccount()
  const [confirmDisconnect, setConfirmDisconnect] = useState<{ id: string; name: string } | null>(null)

  // Show toast from OAuth redirect result
  useEffect(() => {
    if (connectedProvider) {
      const meta = PROVIDERS.find((p) => p.id === connectedProvider)
      toast.success(`${meta?.name ?? connectedProvider} connected successfully!`)
      refetch()
    }
    if (errorMessage) {
      toast.error(`Connection failed: ${errorMessage}`)
    }
  }, [connectedProvider, errorMessage])

  const handleConnect = async (provider: Provider) => {
    const returnUrl = window.location.origin + window.location.pathname
    const result = await fetchOAuthUrl(provider, returnUrl)
    if (!result.configured) {
      throw new Error(result.error)
    }
    window.location.href = result.url
  }

  const handleDisconnect = (id: string, provider: Provider) => {
    const meta = PROVIDERS.find((p) => p.id === provider)
    setConfirmDisconnect({ id, name: meta?.name ?? provider })
  }

  const confirmAndDisconnect = async () => {
    if (!confirmDisconnect) return
    try {
      await disconnectMutation.mutateAsync(confirmDisconnect.id)
      toast.success(`${confirmDisconnect.name} disconnected.`)
    } catch {
      toast.error("Failed to disconnect. Please try again.")
    } finally {
      setConfirmDisconnect(null)
    }
  }

  const accountMap = Object.fromEntries(accounts.map((a) => [a.provider, a]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Connected Accounts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your social and messaging platforms to sync leads, send messages, and automate outreach.
              Authentication uses each platform's official OAuth flow — only real API connections are accepted.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 shrink-0"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats row */}
        {!isLoading && accounts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-border/40 pt-4">
            <div className="text-sm">
              <span className="font-semibold text-foreground">{accounts.length}</span>
              <span className="ml-1 text-muted-foreground">connected</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-green-600">{accounts.filter((a) => a.status === "active").length}</span>
              <span className="ml-1 text-muted-foreground">active</span>
            </div>
            {accounts.some((a) => a.status !== "active") && (
              <div className="text-sm">
                <span className="font-semibold text-amber-600">{accounts.filter((a) => a.status !== "active").length}</span>
                <span className="ml-1 text-muted-foreground">need attention</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Provider cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="h-28 animate-pulse rounded-2xl border border-border/40 bg-secondary/20" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {PROVIDERS.map((meta) => (
            <ProviderCard
              key={meta.id}
              meta={meta}
              account={accountMap[meta.id]}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      {/* Callback URLs summary panel */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Developer Portal Setup</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Each platform requires you to whitelist the exact OAuth callback URL shown on each card above.
          Copy and paste these into your app's "Valid OAuth Redirect URIs" setting:
        </p>
        <div className="space-y-1.5">
          {(["whatsapp", "facebook", "instagram", "tiktok"] as Provider[]).map((p) => {
            const url = getCallbackUrl(p)
            return (
              <div key={p} className="flex items-center gap-2 rounded-lg bg-secondary/30 px-3 py-2">
                <span className="w-[72px] shrink-0 text-[11px] font-semibold capitalize text-muted-foreground">{p}</span>
                <code className="min-w-0 flex-1 truncate text-[11px] text-foreground">{url}</code>
                <CopyButton text={url} />
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          For Meta apps (Facebook, Instagram, WhatsApp): go to{" "}
          <span className="font-medium text-foreground">Facebook for Developers → Your App → Facebook Login → Settings → Valid OAuth Redirect URIs</span>.
          For TikTok: go to{" "}
          <span className="font-medium text-foreground">TikTok Developer Portal → Your App → Redirect URIs</span>.
        </p>
      </div>

      {/* Disconnect confirmation overlay */}
      <AnimatePresence>
        {confirmDisconnect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="glass w-full max-w-sm rounded-2xl p-6 shadow-2xl mx-4"
            >
              <h3 className="text-base font-semibold text-foreground">Disconnect {confirmDisconnect.name}?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove the connection and revoke stored tokens. You can reconnect at any time.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setConfirmDisconnect(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={confirmAndDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Disconnect
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
