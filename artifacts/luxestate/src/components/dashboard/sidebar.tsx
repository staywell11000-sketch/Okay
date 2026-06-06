import { Link, useLocation } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  MessageSquare,
  Brain,
  Zap,
  Users2,
  ClipboardList,
  FolderOpen,
  CalendarDays,
  Cable,
  LogOut,
  Calculator,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"
import { useSettings } from "@/lib/settings-api"
import { useLocation as useWouterLocation } from "wouter"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

const navItems: { href: string; key: TranslationKey; icon: React.ElementType }[] = [
  { href: "/dashboard",                 key: "nav.overview",        icon: LayoutDashboard },
  { href: "/dashboard/leads",           key: "nav.leads",           icon: Users },
  { href: "/dashboard/integrations",    key: "nav.leadSources",     icon: Cable },
  { href: "/dashboard/properties",      key: "nav.properties",      icon: Building2 },
  { href: "/dashboard/messages",        key: "nav.messages",        icon: MessageSquare },
  { href: "/dashboard/analytics",       key: "nav.analytics",       icon: BarChart3 },
  { href: "/dashboard/ai-intelligence", key: "nav.aiIntelligence",  icon: Brain },
  { href: "/dashboard/automations",     key: "nav.automations",     icon: Zap },
  { href: "/dashboard/team",            key: "nav.team",            icon: Users2 },
  { href: "/dashboard/deals",           key: "nav.deals",           icon: ClipboardList },
  { href: "/dashboard/documents",       key: "nav.documents",       icon: FolderOpen },
  { href: "/dashboard/calculator",      key: "nav.calculator",      icon: Calculator },
  { href: "/dashboard/calendar",        key: "nav.calendar",        icon: CalendarDays },
  { href: "/dashboard/settings",        key: "nav.settings",        icon: Settings },
]

type SidebarProps = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  notifOpen: boolean
  onToggleNotif: () => void
  unreadCount: number
}

export function Sidebar({ collapsed, setCollapsed, notifOpen, onToggleNotif, unreadCount }: SidebarProps) {
  const [location] = useLocation()
  const { data: settingsData } = useSettings()
  const { t } = useLanguage()
  const businessName = settingsData?.settings?.business_name || "My CRM"
  const businessLogoUrl = settingsData?.settings?.business_logo_url
  const brandInitial = businessName.trim()[0]?.toUpperCase() ?? "C"

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard"
    return location.startsWith(href)
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col border-r border-sidebar-border bg-sidebar h-full overflow-hidden"
    >
      {/* ── Brand header ─────────────────────────────── */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <Link href="/dashboard">
                <div className="flex items-center gap-2 cursor-pointer select-none">
                  {businessLogoUrl ? (
                    <img
                      src={businessLogoUrl}
                      alt={businessName}
                      className="h-8 w-8 rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/25">
                      <span className="text-sm font-bold text-primary-foreground">{brandInitial}</span>
                    </div>
                  )}
                  <span className="text-base font-semibold tracking-tight text-sidebar-foreground truncate max-w-[140px]">
                    {businessName}
                  </span>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <Link href="/dashboard">
            <div className="flex w-full items-center justify-center cursor-pointer">
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt={businessName}
                  className="h-8 w-8 rounded-lg object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/25">
                  <span className="text-sm font-bold text-primary-foreground">{brandInitial}</span>
                </div>
              )}
            </div>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "absolute right-2 top-4"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* ── Nav items ────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto space-y-0.5 p-2 pt-3">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                className={cn(
                  "relative flex h-9 items-center gap-3 rounded-xl px-3 transition-colors cursor-pointer",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-sidebar-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("relative z-10 h-4 w-4 flex-shrink-0", active ? "text-sidebar-primary-foreground" : "")} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="relative z-10 overflow-hidden whitespace-nowrap text-sm font-medium"
                    >
                      {t(item.key)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* ── User section ─────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-sidebar-border p-2">
        <SidebarUserSection
          collapsed={collapsed}
          notifOpen={notifOpen}
          onToggleNotif={onToggleNotif}
          unreadCount={unreadCount}
        />
      </div>
    </motion.aside>
  )
}

function SidebarUserSection({
  collapsed, notifOpen, onToggleNotif, unreadCount,
}: {
  collapsed: boolean; notifOpen: boolean; onToggleNotif: () => void; unreadCount: number
}) {
  const { user, signOut } = useAuth()
  const { data: profile } = useCurrentUser(user?.id)
  const [, setLocation] = useWouterLocation()

  const handleSignOut = async () => {
    await signOut()
    setLocation("/")
  }

  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email?.split("@")[0] || "User"

  const displayTitle = profile?.title || profile?.role || "Agent"

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleNotif}
        className={cn(
          "relative h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent",
          notifOpen && "bg-sidebar-accent"
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {!collapsed && (
        <Link href="/dashboard/settings">
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-1 rounded-xl py-1 px-1.5 cursor-pointer hover:bg-sidebar-accent transition-colors group">
            <div className="relative flex-shrink-0">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-border/40"
                />
              ) : (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-xs font-semibold text-primary-foreground">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-xs font-semibold text-sidebar-foreground group-hover:text-sidebar-accent-foreground">{displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground capitalize">{displayTitle}</p>
            </div>
            <Settings className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      )}

      {collapsed && (
        <Link href="/dashboard/settings">
          <div className="flex items-center justify-center cursor-pointer">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-border/40 hover:ring-primary/50 transition-all"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-xs font-semibold text-primary-foreground hover:ring-2 hover:ring-primary/40 transition-all">
                {initials}
              </div>
            )}
          </div>
        </Link>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
        title="Sign out"
        onClick={handleSignOut}
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
