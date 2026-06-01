import { useState, useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { Link } from "wouter"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsPanel, type Notification } from "@/components/dashboard/notifications-panel"
import { ReactNode } from "react"
import { motion } from "framer-motion"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"
import { useSettings, useUpdateSettings } from "@/lib/settings-api"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useDismissNotification,
  type ApiNotification,
} from "@/lib/notifications-api"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":              "Overview",
  "/dashboard/leads":        "Leads",
  "/dashboard/properties":   "Properties",
  "/dashboard/messages":     "Messages",
  "/dashboard/analytics":    "Analytics",
  "/dashboard/ai-intelligence": "AI Intelligence",
  "/dashboard/automations":  "Automations",
  "/dashboard/team":         "Team",
  "/dashboard/deals":        "Deals",
  "/dashboard/documents":    "Documents",
  "/dashboard/calendar":     "Calendar",
  "/dashboard/settings":     "Settings",
  "/dashboard/integrations": "Lead Sources",
}

function getPageTitle(location: string): string {
  if (PAGE_TITLES[location]) return PAGE_TITLES[location]
  if (location.startsWith("/dashboard/leads/")) return "Lead Profile"
  return "Dashboard"
}

function toUiNotification(n: ApiNotification, now: Date): Notification {
  const created = new Date(n.createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  let time: string
  if (diffMin < 1) time = "Just now"
  else if (diffMin < 60) time = `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`
  else if (diffHr < 24) time = `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`
  else time = `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`

  const isToday = diffHr < 24

  const allowedTypes = ["lead", "message", "reminder", "deal", "property", "team", "system"] as const
  type AllowedType = typeof allowedTypes[number]
  const type: AllowedType = allowedTypes.includes(n.type as AllowedType) ? (n.type as AllowedType) : "system"

  return {
    id: n.id,
    type,
    title: n.title,
    description: n.body ?? "",
    time,
    read: n.read,
    group: isToday ? "today" : "earlier",
  }
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  const { data: settingsData } = useSettings()
  const updateSettings = useUpdateSettings()

  const savedFmt = (settingsData?.settings?.time_format as "12h" | "24h" | null | undefined) ?? "12h"
  const [fmt, setFmt] = useState<"12h" | "24h">(savedFmt)

  // Sync to DB value whenever it loads
  useEffect(() => {
    if (savedFmt) setFmt(savedFmt)
  }, [savedFmt])

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: fmt === "12h",
  })

  const toggleFmt = () => {
    const next = fmt === "12h" ? "24h" : "12h"
    setFmt(next)
    updateSettings.mutate({ timeFormat: next })
  }

  return (
    <button
      onClick={toggleFmt}
      title={`Switch to ${fmt === "12h" ? "24-hour" : "12-hour"} format`}
      className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
    >
      <span className="tabular-nums">{timeStr}</span>
    </button>
  )
}

function GlobalHeader({
  unreadCount, notifOpen, onToggleNotif,
}: {
  unreadCount: number; notifOpen: boolean; onToggleNotif: () => void
}) {
  const [location] = useLocation()
  const { user } = useAuth()
  const { data: profile } = useCurrentUser()
  const title = getPageTitle(location)

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  })

  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email?.split("@")[0] || "User"

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/40 bg-card/60 px-6 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <span className="hidden text-xs text-muted-foreground lg:block">{today}</span>
      </div>

      <div className="flex items-center gap-1">
        <LiveClock />

        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleNotif}
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Avatar → settings */}
        <Link href="/dashboard/settings">
          <div className="ml-2 cursor-pointer">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-border/40 hover:ring-primary/50 transition-all"
                title="Profile Settings"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-sm font-semibold text-primary-foreground hover:ring-2 hover:ring-primary/40 transition-all"
                title="Profile Settings"
              >
                {initials}
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}

type DashboardLayoutProps = { children: ReactNode }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed]   = useState(false)
  const [notifOpen, setNotifOpen]   = useState(false)
  const nowRef = useRef(new Date())

  const { data: apiNotifs = [] }    = useNotifications()
  const markRead                    = useMarkNotificationRead()
  const markAllRead                 = useMarkAllRead()
  const dismiss                     = useDismissNotification()

  // Refresh "now" each render so relative timestamps stay accurate
  useEffect(() => { nowRef.current = new Date() })

  const notifications: Notification[] = apiNotifs.map((n) => toUiNotification(n, nowRef.current))
  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkRead    = (id: number) => markRead.mutate(id)
  const handleMarkAllRead = ()           => markAllRead.mutate()
  const handleDismiss     = (id: number) => dismiss.mutate(id)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        notifOpen={notifOpen}
        onToggleNotif={() => setNotifOpen((v) => !v)}
        unreadCount={unreadCount}
      />
      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDismiss={handleDismiss}
        sidebarWidth={collapsed ? 72 : 240}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <GlobalHeader
          unreadCount={unreadCount}
          notifOpen={notifOpen}
          onToggleNotif={() => setNotifOpen((v) => !v)}
        />
        <motion.main
          className="flex-1 overflow-y-auto"
          animate={{ marginLeft: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="min-h-full p-6 lg:p-8">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  )
}
