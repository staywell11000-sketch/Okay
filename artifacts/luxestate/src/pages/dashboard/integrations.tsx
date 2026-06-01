import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  Globe, RefreshCw, AlertTriangle, CheckCircle2, Clock, Zap,
  MoreHorizontal, Unplug, Link2, TrendingUp, Users, ArrowRight,
  WifiOff, Activity,
} from "lucide-react"
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa"
import { FaTiktok } from "react-icons/fa6"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { PlatformIcon } from "@/components/dashboard/integration-connect-modal"
import { IntegrationConnectModal } from "@/components/dashboard/integration-connect-modal"
import { MetaPreConnectModal, MetaPostConnectModal } from "@/components/dashboard/meta-oauth-modals"
import {
  Platform, Integration, ConnectionStatus, SyncEvent,
  PLATFORM_CONFIGS, getIntegrations, saveIntegrations,
  removeIntegration, getSyncLog, addSyncEvent,
  formatRelativeTime, formatNextSync, isOverdueForSync,
  simulateSyncLeads, getNextSyncTime,
} from "@/components/dashboard/integrations-data"
import {
  useConnectedAccounts, useDisconnectAccount,
  type ConnectedAccount,
} from "@/lib/connected-accounts-api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

// ── Which platforms use real OAuth ───────────────────────────────────────
const META_PLATFORMS = new Set<Platform>(["facebook", "instagram", "whatsapp"])
const ALL_PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok", "whatsapp", "website"]

// ── Map a real connected account → display Integration ───────────────────
function realAccountToIntegration(account: ConnectedAccount): Integration {
  const meta = (account.metadata ?? {}) as Record<string, any>
  return {
    id: account.id,
    platform: account.provider as Platform,
    status: "connected",
    accountName: account.account_name ?? account.provider,
    accountId: account.account_id ?? account.id,
    adAccountName: meta.selected_ad_account_name ?? undefined,
    connectedAt: account.created_at,
    lastSync: account.last_synced_at,
    nextSync: meta.sync_interval_minutes
      ? getNextSyncTime(meta.sync_interval_minutes as number)
      : null,
    leadsTotal: 0,
    leadsSyncedToday: 0,
    leadsSyncedThisWeek: 0,
    campaigns: [],
    syncIntervalMinutes: (meta.sync_interval_minutes as number) ?? 30,
    defaultPipeline: (meta.default_pipeline as string) ?? "new",
    defaultAgent: (meta.default_agent as string) ?? "",
    extraTags: [],
  }
}

// ── Status helpers ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; dot: string; ring?: string }> = {
  disconnected: { label: "Not connected", color: "text-muted-foreground", dot: "bg-muted-foreground/30" },
  connecting:   { label: "Connecting…",   color: "text-amber-400",        dot: "bg-amber-400" },
  connected:    { label: "Connected",     color: "text-emerald-400",      dot: "bg-emerald-400", ring: "ring-emerald-400/30" },
  syncing:      { label: "Syncing…",      color: "text-sky-400",          dot: "bg-sky-400",     ring: "ring-sky-400/30" },
  error:        { label: "Error",         color: "text-destructive",      dot: "bg-destructive" },
  paused:       { label: "Paused",        color: "text-amber-400",        dot: "bg-amber-400" },
}

const CHART_COLORS: Record<Platform, string> = {
  facebook:  "#3b82f6",
  instagram: "#ec4899",
  tiktok:    "#71717a",
  whatsapp:  "#22c55e",
  website:   "#6366f1",
}

// ── Analytics chart data ──────────────────────────────────────────────────
function buildChartData(integrations: Integration[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })
  })

  const connected = integrations.filter((i) => i.status === "connected" || i.status === "syncing")

  return days.map((day, i) => {
    const row: Record<string, unknown> = { day: day.split(",")[0] }
    let total = 0
    connected.forEach((intg) => {
      const cfg = PLATFORM_CONFIGS[intg.platform]
      const val = Math.max(0, Math.floor((intg.leadsTotal / 7) * (0.5 + Math.random() * 0.8)) + (i === 6 ? intg.leadsSyncedToday : 0))
      row[cfg.name] = val
      total += val
    })
    row.total = total
    return row
  })
}

// ── Integration Card ──────────────────────────────────────────────────────
function IntegrationCard({
  platform,
  integration,
  isRealAccount,
  onConnect,
  onSync,
  onDisconnect,
  onReconnect,
}: {
  platform: Platform
  integration: Integration | null
  isRealAccount: boolean
  onConnect: () => void
  onSync: () => void
  onDisconnect: () => void
  onReconnect: () => void
}) {
  const cfg = PLATFORM_CONFIGS[platform]
  const status: ConnectionStatus = integration?.status ?? "disconnected"
  const sc = STATUS_CONFIG[status]
  const isConnected = status === "connected" || status === "syncing"
  const isSyncing = status === "syncing"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card flex flex-col gap-4 p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={platform} size="md" />
          <div>
            <p className="text-sm font-semibold">{cfg.name}</p>
            <Badge variant="outline" className="mt-0.5 text-[9px] px-1.5 py-0 border-border/30 text-muted-foreground">
              {cfg.category}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-2 py-0.5 border text-[10px] font-medium",
            isConnected ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/30 bg-secondary/20"
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              sc.dot,
              isSyncing && "animate-pulse",
              isConnected && !isSyncing && "animate-[pulse_3s_ease-in-out_infinite]"
            )} />
            <span className={sc.color}>{sc.label}</span>
          </div>

          {isConnected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {!isRealAccount && (
                  <DropdownMenuItem onClick={onSync} disabled={isSyncing} className="gap-2 text-sm">
                    <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                    {isSyncing ? "Syncing…" : "Sync now"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onReconnect} className="gap-2 text-sm">
                  <Link2 className="h-3.5 w-3.5" /> Reconnect
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDisconnect} className="gap-2 text-sm text-destructive focus:text-destructive">
                  <Unplug className="h-3.5 w-3.5" /> Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Connected info */}
      {isConnected && integration ? (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-border/30 bg-secondary/10 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">Connected as</p>
            <p className="text-sm font-medium mt-0.5 truncate">{integration.accountName}</p>
            {integration.adAccountName && (
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{integration.adAccountName}</p>
            )}
          </div>

          {/* Stats — real accounts show 0 until Lead Ads sync is enabled */}
          {!isRealAccount && (
            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border/30 bg-secondary/10 px-2 py-2">
                <span className="text-base font-bold tabular-nums text-foreground">{integration.leadsTotal}</span>
                <span className="text-[9px] text-muted-foreground text-center">Total Leads</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border/30 bg-secondary/10 px-2 py-2">
                <span className="text-base font-bold tabular-nums text-emerald-400">{integration.leadsSyncedToday}</span>
                <span className="text-[9px] text-muted-foreground text-center">Today</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border/30 bg-secondary/10 px-2 py-2">
                <span className={cn("text-base font-bold tabular-nums", isSyncing ? "text-sky-400" : "text-muted-foreground")}>
                  {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : formatNextSync(integration.nextSync)}
                </span>
                <span className="text-[9px] text-muted-foreground text-center">Next Sync</span>
              </div>
            </div>
          )}

          {isRealAccount && (
            <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
              <p className="text-[11px] text-sky-400 leading-relaxed">
                {integration?.platform === "tiktok"
                  ? "OAuth connected. TikTok lead sync is coming soon."
                  : "OAuth connected. Lead Ads syncing will begin once configured."}
              </p>
            </div>
          )}

          {/* Sync time (simulated only) */}
          {!isRealAccount && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last sync: {formatRelativeTime(integration.lastSync)}
              </span>
              <span className="flex items-center gap-1 text-sky-400 cursor-pointer hover:text-sky-300 transition-colors" onClick={onSync}>
                <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing…" : "Sync now"}
              </span>
            </div>
          )}

          {/* Campaign badges (simulated only) */}
          {!isRealAccount && integration.campaigns.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {integration.campaigns.slice(0, 3).map((c) => (
                <Badge key={c} variant="outline" className="text-[9px] px-1.5 py-0 border-border/30 text-muted-foreground">
                  {c}
                </Badge>
              ))}
              {integration.campaigns.length > 3 && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/30 text-muted-foreground">
                  +{integration.campaigns.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{integration?.errorMessage ?? "Connection lost. Please reconnect."}</p>
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1.5 border-border/50" onClick={onReconnect}>
            <RefreshCw className="h-3.5 w-3.5" /> Reconnect
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{cfg.tagline}</p>
          <Button
            size="sm"
            className={cn("w-full gap-2 text-white shadow-sm", `bg-gradient-to-r ${cfg.gradient}`)}
            onClick={onConnect}
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect {cfg.name}
            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </div>
      )}
    </motion.div>
  )
}

// ── Sync log row ──────────────────────────────────────────────────────────
function SyncLogRow({ event }: { event: SyncEvent }) {
  const cfg = PLATFORM_CONFIGS[event.platform]
  const isSuccess = event.status === "success"
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
      <PlatformIcon platform={event.platform} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{cfg.name}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 py-0",
              isSuccess ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-destructive/20 bg-destructive/5 text-destructive"
            )}
          >
            {isSuccess ? "Success" : "Error"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{event.message}</p>
      </div>
      <div className="text-right shrink-0">
        {isSuccess && <p className="text-sm font-semibold text-emerald-400">+{event.leadsAdded}</p>}
        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(event.timestamp)}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const qc = useQueryClient()

  // ── Real Meta accounts from API ───────────────────────────────────────
  const { data: realAccounts = [], isLoading: accountsLoading } = useConnectedAccounts()
  const disconnectAccount = useDisconnectAccount()

  // ── Simulated accounts (TikTok, Website only) ─────────────────────────
  const [simulatedIntegrations, setSimulatedIntegrations] = useState<Integration[]>(() =>
    getIntegrations().filter((i) => !META_PLATFORMS.has(i.platform))
  )
  const [syncLog, setSyncLog] = useState<SyncEvent[]>(() => getSyncLog())

  // ── Modal state ───────────────────────────────────────────────────────
  const [metaPreOpen, setMetaPreOpen] = useState<Platform | null>(null)
  const [postOAuthAccount, setPostOAuthAccount] = useState<ConnectedAccount | null>(null)
  const [simulatedModal, setSimulatedModal] = useState<Platform | null>(null)

  // ── URL param handling (OAuth callback) ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get("connected") as Platform | null
    const error = params.get("error")
    const provider = params.get("provider") as Platform | null

    if (connected || error) {
      const url = new URL(window.location.href)
      url.searchParams.delete("connected")
      url.searchParams.delete("error")
      url.searchParams.delete("provider")
      url.searchParams.delete("tab")
      window.history.replaceState({}, "", url.toString())
    }

    if (connected && META_PLATFORMS.has(connected)) {
      qc.invalidateQueries({ queryKey: ["connectedAccounts"] })
    }

    if (error) {
      console.warn(`OAuth error for ${provider ?? "unknown"}:`, error)
    }
  }, [qc])

  // Open post-OAuth modal once real account appears after callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Params already cleared above; use a ref to remember the initial connected value
  }, [])

  // Separate effect: once real accounts load and we have a freshly connected provider,
  // open the configure modal. We track it via sessionStorage to survive the redirect.
  useEffect(() => {
    const pendingProvider = sessionStorage.getItem("meta_oauth_pending") as Platform | null
    if (!pendingProvider || accountsLoading) return

    const account = realAccounts.find((a) => a.provider === pendingProvider)
    if (account) {
      sessionStorage.removeItem("meta_oauth_pending")
      setPostOAuthAccount(account)
    }
  }, [realAccounts, accountsLoading])

  // Store pending provider before redirect so we can open configure modal after return
  const handleMetaConnect = (platform: Platform) => {
    sessionStorage.setItem("meta_oauth_pending", platform)
    setMetaPreOpen(platform)
  }

  // On page load, read URL params and set pending if needed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get("connected") as Platform | null
    if (connected && META_PLATFORMS.has(connected)) {
      sessionStorage.setItem("meta_oauth_pending", connected)
    }
  }, [])

  // ── Simulated auto-sync (TikTok + Website only) ───────────────────────
  const syncTimerRef = useRef<number | null>(null)

  const refreshSimulated = useCallback(() => {
    setSimulatedIntegrations(getIntegrations().filter((i) => !META_PLATFORMS.has(i.platform)))
    setSyncLog(getSyncLog())
  }, [])

  useEffect(() => {
    const tick = () => {
      const all = getIntegrations().filter((i) => !META_PLATFORMS.has(i.platform))
      let changed = false
      all.forEach((intg) => {
        if (isOverdueForSync(intg)) {
          intg.status = "syncing"
          changed = true
          setTimeout(() => {
            const current = getIntegrations().find((i) => i.platform === intg.platform)
            if (current) {
              const leads = simulateSyncLeads()
              const updated: Integration = {
                ...current,
                status: "connected",
                lastSync: new Date().toISOString(),
                nextSync: getNextSyncTime(current.syncIntervalMinutes),
                leadsTotal: current.leadsTotal + leads,
                leadsSyncedToday: current.leadsSyncedToday + leads,
                leadsSyncedThisWeek: current.leadsSyncedThisWeek + leads,
              }
              const rest = getIntegrations().filter((i) => i.platform !== intg.platform)
              saveIntegrations([...rest, updated])
              addSyncEvent({
                platform: intg.platform,
                accountName: intg.accountName,
                timestamp: new Date().toISOString(),
                leadsAdded: leads,
                status: "success",
                message: `Auto-sync completed — ${leads} new lead${leads !== 1 ? "s" : ""} captured`,
              })
              refreshSimulated()
            }
          }, 3000)
        }
      })
      if (changed) {
        saveIntegrations([...all, ...getIntegrations().filter((i) => META_PLATFORMS.has(i.platform))])
        refreshSimulated()
      }
    }

    tick()
    syncTimerRef.current = window.setInterval(tick, 60_000)
    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current) }
  }, [refreshSimulated])

  // ── Merge real + simulated integrations for display ───────────────────
  const realIntegrations = realAccounts
    .filter((a) => META_PLATFORMS.has(a.provider as Platform) || a.provider === "tiktok")
    .map(realAccountToIntegration)

  const allIntegrations: Integration[] = [...realIntegrations, ...simulatedIntegrations]

  const getIntegrationDisplay = (p: Platform): { integration: Integration | null; isReal: boolean } => {
    const real = realIntegrations.find((i) => i.platform === p)
    if (real) return { integration: real, isReal: true }
    const sim = simulatedIntegrations.find((i) => i.platform === p)
    return { integration: sim ?? null, isReal: false }
  }

  const getRealAccount = (p: Platform) => realAccounts.find((a) => a.provider === p) ?? null

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleConnect = (platform: Platform) => {
    if (META_PLATFORMS.has(platform)) {
      handleMetaConnect(platform)
    } else {
      setSimulatedModal(platform)
    }
  }

  const handleDisconnect = async (platform: Platform) => {
    if (META_PLATFORMS.has(platform)) {
      const account = getRealAccount(platform)
      if (account) await disconnectAccount.mutateAsync(account.id).catch(() => null)
    } else {
      removeIntegration(platform)
      refreshSimulated()
    }
  }

  const handleSync = (platform: Platform) => {
    if (META_PLATFORMS.has(platform)) return
    const intg = simulatedIntegrations.find((i) => i.platform === platform)
    if (!intg) return
    const updated = { ...intg, status: "syncing" as ConnectionStatus }
    const rest = simulatedIntegrations.filter((i) => i.platform !== platform)
    setSimulatedIntegrations([...rest, updated])
    saveIntegrations([...rest, updated])

    setTimeout(() => {
      const leads = simulateSyncLeads()
      const done: Integration = {
        ...updated,
        status: "connected",
        lastSync: new Date().toISOString(),
        nextSync: getNextSyncTime(updated.syncIntervalMinutes),
        leadsTotal: updated.leadsTotal + leads,
        leadsSyncedToday: updated.leadsSyncedToday + leads,
        leadsSyncedThisWeek: updated.leadsSyncedThisWeek + leads,
      }
      const r = getIntegrations().filter((i) => i.platform !== platform)
      saveIntegrations([...r, done])
      addSyncEvent({
        platform,
        accountName: intg.accountName,
        timestamp: new Date().toISOString(),
        leadsAdded: leads,
        status: "success",
        message: `Manual sync — ${leads} new lead${leads !== 1 ? "s" : ""} captured`,
      })
      refreshSimulated()
    }, 3000)
  }

  const handleSimulatedConnected = (integration: Integration) => {
    refreshSimulated()
    setSimulatedModal(null)
  }

  // ── Derived stats ─────────────────────────────────────────────────────
  const connected = allIntegrations.filter((i) => i.status === "connected" || i.status === "syncing")
  const totalLeadsToday = connected.reduce((s, i) => s + i.leadsSyncedToday, 0)
  const totalLeadsWeek = connected.reduce((s, i) => s + i.leadsSyncedThisWeek, 0)
  const totalLeadsAll = connected.reduce((s, i) => s + i.leadsTotal, 0)
  const syncing = connected.filter((i) => i.status === "syncing").length
  const nextSyncIntg = connected
    .filter((i) => i.nextSync)
    .sort((a, b) => new Date(a.nextSync!).getTime() - new Date(b.nextSync!).getTime())[0]

  const chartData = buildChartData(allIntegrations)

  const pageStats = [
    { label: "Connected Sources", value: `${connected.length} / ${ALL_PLATFORMS.length}`, icon: Link2, color: "text-primary", bg: "bg-primary/10" },
    { label: "Leads Today", value: totalLeadsToday, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Leads This Week", value: totalLeadsWeek, icon: TrendingUp, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Total Synced", value: totalLeadsAll, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
    {
      label: "Next Sync",
      value: nextSyncIntg ? formatNextSync(nextSyncIntg.nextSync) : "—",
      icon: syncing > 0 ? Activity : Clock,
      color: syncing > 0 ? "text-sky-500" : "text-muted-foreground",
      bg: syncing > 0 ? "bg-sky-500/10" : "bg-secondary/40",
    },
  ]

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Lead Sources"
        description="Connect your ad platforms and lead channels to auto-sync leads into your CRM."
      />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {pageStats.map((stat) => (
          <div key={stat.label} className="glass-card flex items-center gap-3 p-4">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", stat.bg)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Channel cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Lead Channels</h2>
          <span className="text-xs text-muted-foreground">{connected.length} of {ALL_PLATFORMS.length} connected</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_PLATFORMS.map((platform, i) => {
            const { integration, isReal } = getIntegrationDisplay(platform)
            return (
              <motion.div
                key={platform}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <IntegrationCard
                  platform={platform}
                  integration={integration}
                  isRealAccount={isReal}
                  onConnect={() => handleConnect(platform)}
                  onSync={() => handleSync(platform)}
                  onDisconnect={() => handleDisconnect(platform)}
                  onReconnect={() => handleConnect(platform)}
                />
              </motion.div>
            )
          })}

          {/* Coming soon */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card flex flex-col items-center justify-center gap-3 p-6 border-dashed opacity-60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-border/50">
              <Link2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">More coming soon</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">LinkedIn, Zillow, Google Ads</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Analytics + Sync Log */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 lg:grid-cols-3"
      >
        {/* Chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Leads by Source</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
            {connected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {connected.map((intg) => (
                  <div key={intg.platform} className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[intg.platform] }} />
                    <span className="text-[10px] text-muted-foreground">{PLATFORM_CONFIGS[intg.platform].name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {connected.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <WifiOff className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No sources connected yet</p>
              <p className="text-xs text-muted-foreground/60">Connect a lead channel above to see analytics</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={12} barGap={2}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  cursor={{ fill: "hsl(var(--secondary)/0.3)" }}
                />
                {connected.map((intg) => (
                  <Bar
                    key={intg.platform}
                    dataKey={PLATFORM_CONFIGS[intg.platform].name}
                    stackId="a"
                    fill={CHART_COLORS[intg.platform]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sync log */}
        <div className="glass-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Sync Activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Recent sync events</p>
          </div>

          {syncLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Activity className="h-8 w-8 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground text-center">No sync events yet</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[220px]">
              {syncLog.slice(0, 20).map((event) => (
                <SyncLogRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Modals ── */}

      {/* Meta pre-OAuth modal */}
      {metaPreOpen && (
        <MetaPreConnectModal
          platform={metaPreOpen}
          open={!!metaPreOpen}
          onClose={() => setMetaPreOpen(null)}
        />
      )}

      {/* Meta post-OAuth configure modal */}
      {postOAuthAccount && (
        <MetaPostConnectModal
          account={postOAuthAccount}
          open={!!postOAuthAccount}
          onClose={() => setPostOAuthAccount(null)}
          onDone={() => setPostOAuthAccount(null)}
        />
      )}

      {/* Simulated modal for TikTok / Website */}
      {simulatedModal && !META_PLATFORMS.has(simulatedModal) && (
        <IntegrationConnectModal
          platform={simulatedModal}
          open={!!simulatedModal}
          onClose={() => setSimulatedModal(null)}
          onConnected={handleSimulatedConnected}
        />
      )}
    </div>
  )
}
