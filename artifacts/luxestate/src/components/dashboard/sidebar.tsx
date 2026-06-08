import { useState } from "react"
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
  Handshake,
  CreditCard,
  Shield,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"
import { useSettings } from "@/lib/settings-api"
import { useLocation as useWouterLocation } from "wouter"
import { useLanguage, type TranslationKey } from "@/lib/i18n"
import { usePlan, useSuperAdmin } from "@/lib/plan-context"
import { usePermissions } from "@/lib/permissions-context"
import { UpgradeModal } from "@/components/upgrade-modal"
import { NAV_FEATURE_MAP } from "@/lib/plan-features"

type NavItem = {
  href: string
  key: TranslationKey
  icon: React.ElementType
  permissionResource?: string
}

const navItems: NavItem[] = [
  { href: "/dashboard",                 key: "nav.overview",        icon: LayoutDashboard },
  { href: "/dashboard/leads",           key: "nav.leads",           icon: Users,          permissionResource: "leads" },
  { href: "/dashboard/integrations",    key: "nav.leadSources",     icon: Cable,          permissionResource: "leads" },
  { href: "/dashboard/properties",      key: "nav.properties",      icon: Building2,      permissionResource: "properties" },
  { href: "/dashboard/dealers",         key: "nav.dealers",         icon: Handshake,      permissionResource: "dealers" },
  { href: "/dashboard/messages",        key: "nav.messages",        icon: MessageSquare,  permissionResource: "messages" },
  { href: "/dashboard/analytics",       key: "nav.analytics",       icon: BarChart3,      permissionResource: "analytics" },
  { href: "/dashboard/ai-intelligence", key: "nav.aiIntelligence",  icon: Brain,          permissionResource: "ai_intelligence" },
  { href: "/dashboard/automations",     key: "nav.automations",     icon: Zap,            permissionResource: "automations" },
  { href: "/dashboard/team",            key: "nav.team",            icon: Users2,         permissionResource: "team" },
  { href: "/dashboard/deals",           key: "nav.deals",           icon: ClipboardList,  permissionResource: "deals" },
  { href: "/dashboard/documents",       key: "nav.documents",       icon: FolderOpen,     permissionResource: "documents" },
  { href: "/dashboard/calculator",      key: "nav.calculator",      icon: Calculator },
  { href: "/dashboard/calendar",        key: "nav.calendar",        icon: CalendarDays,   permissionResource: "calendar" },
  { href: "/dashboard/billing",         key: "nav.billing",         icon: CreditCard },
  { href: "/dashboard/settings",        key: "nav.settings",        icon: Settings,       permissionResource: "settings" },
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
  const { hasFeature, org, isSuperAdmin } = usePlan()
  const { canView, isAdmin: isOrgAdmin, isLoading: permsLoading } = usePermissions()
  const businessName = settingsData?.settings?.business_name || "My CRM"
  const businessLogoUrl = settingsData?.settings?.business_logo_url
  const brandInitial = businessName.trim()[0]?.toUpperCase() ?? "C"

  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; featureKey: string }>({
    open: false,
    featureKey: "",
  })

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard"
    return location.startsWith(href)
  }

  const isLocked = (href: string): boolean => {
    if (isSuperAdmin) return false
    const featureKey = NAV_FEATURE_MAP[href]
    if (!featureKey) return false
    return !hasFeature(featureKey)
  }

  const isHiddenByPermission = (item: NavItem): boolean => {
    if (isSuperAdmin || isOrgAdmin || permsLoading) return false
    if (!item.permissionResource) return false
    return !canView(item.permissionResource)
  }

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (isLocked(href)) {
      e.preventDefault()
      const featureKey = NAV_FEATURE_MAP[href]
      if (featureKey) setUpgradeModal({ open: true, featureKey })
    }
  }

  const visibleItems = navItems.filter((item) => !isHiddenByPermission(item))

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative flex flex-col border-r border-sidebar-border bg-sidebar h-full overflow-hidden"
      >
        {/* Brand header */}
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
                      <img src={businessLogoUrl} alt={businessName} className="h-8 w-8 rounded-lg object-cover shadow-sm" />
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
                  <img src={businessLogoUrl} alt={businessName} className="h-8 w-8 rounded-lg object-cover shadow-sm" />
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

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 p-2 pt-3">
          <SidebarNavExtras collapsed={collapsed} />
          {visibleItems.map((item) => {
            const active = isActive(item.href)
            const locked = isLocked(item.href)

            return (
              <Link key={item.href} href={item.href} onClick={(e) => handleNavClick(item.href, e)}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  className={cn(
                    "relative flex h-9 items-center gap-3 rounded-xl px-3 transition-colors cursor-pointer",
                    active && !locked
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : locked
                      ? "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {active && !locked && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl bg-sidebar-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn(
                    "relative z-10 h-4 w-4 flex-shrink-0",
                    active && !locked ? "text-sidebar-primary-foreground" : locked ? "text-muted-foreground/70" : ""
                  )} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap text-sm font-medium"
                      >
                        <span className={locked ? "text-muted-foreground" : ""}>{t(item.key)}</span>
                        {locked && <Lock className="h-3 w-3 text-muted-foreground/60 ml-1 flex-shrink-0" />}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {collapsed && locked && (
                    <Lock className="absolute bottom-1 right-1 h-2.5 w-2.5 text-muted-foreground/50" />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-2">
          <SidebarUserSection
            collapsed={collapsed}
            notifOpen={notifOpen}
            onToggleNotif={onToggleNotif}
            unreadCount={unreadCount}
          />
        </div>
      </motion.aside>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, featureKey: "" })}
        featureKey={upgradeModal.featureKey}
        currentPlan={org?.plan ?? "free"}
      />
    </>
  )
}

function SidebarNavExtras({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation()
  const isSuperAdmin = useSuperAdmin()
  const extras = [
    { href: "/admin", label: "Super Admin", icon: Shield, show: isSuperAdmin, badge: null },
  ]

  return (
    <>
      {extras.filter(e => e.show).map(item => {
        const active = location.startsWith(item.href)
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
                  layoutId={`activeNav-${item.href}`}
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
                    className="relative z-10 overflow-hidden whitespace-nowrap text-sm font-medium flex items-center gap-1.5"
                  >
                    {item.label}
                    {item.badge && (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">{item.badge}</span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>
        )
      })}
    </>
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
                <img src={profile.avatarUrl} alt={displayName} className="h-7 w-7 rounded-full object-cover ring-1 ring-border/40" />
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
              <img src={profile.avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover ring-1 ring-border/40 hover:ring-primary/50 transition-all" />
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
