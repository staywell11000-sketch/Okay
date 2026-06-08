import { useState } from "react"
import { Link, useLocation } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Users, Building2, BarChart3, Settings,
  ChevronLeft, Bell, MessageSquare, Brain, Zap, Users2,
  ClipboardList, FolderOpen, CalendarDays, Cable, LogOut,
  Calculator, Handshake, CreditCard, Shield, Lock, MapPin,
} from "lucide-react"
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

type NavItem = {
  href: string
  key: TranslationKey
  icon: React.ElementType
  permissionResource?: string
  tourId?: string
}

const navItems: NavItem[] = [
  { href: "/dashboard",                 key: "nav.overview",        icon: LayoutDashboard, tourId: "tour-dashboard" },
  { href: "/dashboard/leads",           key: "nav.leads",           icon: Users,           permissionResource: "leads",          tourId: "tour-leads" },
  { href: "/dashboard/integrations",    key: "nav.leadSources",     icon: Cable,           permissionResource: "leads" },
  { href: "/dashboard/properties",      key: "nav.properties",      icon: Building2,       permissionResource: "properties",     tourId: "tour-properties" },
  { href: "/dashboard/dealers",         key: "nav.dealers",         icon: Handshake,       permissionResource: "dealers",        tourId: "tour-dealers" },
  { href: "/dashboard/messages",        key: "nav.messages",        icon: MessageSquare,   permissionResource: "messages",       tourId: "tour-messages" },
  { href: "/dashboard/analytics",       key: "nav.analytics",       icon: BarChart3,       permissionResource: "analytics",      tourId: "tour-analytics" },
  { href: "/dashboard/ai-intelligence", key: "nav.aiIntelligence",  icon: Brain,           permissionResource: "ai_intelligence", tourId: "tour-ai" },
  { href: "/dashboard/automations",     key: "nav.automations",     icon: Zap,             permissionResource: "automations",    tourId: "tour-automations" },
  { href: "/dashboard/team",            key: "nav.team",            icon: Users2,          permissionResource: "team",           tourId: "tour-team" },
  { href: "/dashboard/deals",           key: "nav.deals",           icon: ClipboardList,   permissionResource: "deals",          tourId: "tour-deals" },
  { href: "/dashboard/documents",       key: "nav.documents",       icon: FolderOpen,      permissionResource: "documents",      tourId: "tour-documents" },
  { href: "/dashboard/calculator",      key: "nav.calculator",      icon: Calculator },
  { href: "/dashboard/calendar",        key: "nav.calendar",        icon: CalendarDays,    permissionResource: "calendar",       tourId: "tour-calendar" },
  { href: "/dashboard/billing",         key: "nav.billing",         icon: CreditCard },
  { href: "/dashboard/settings",        key: "nav.settings",        icon: Settings,        permissionResource: "settings",       tourId: "tour-settings" },
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
    open: false, featureKey: "",
  })

  const isActive = (href: string) =>
    href === "/dashboard" ? location === "/dashboard" : location.startsWith(href)

  const isLocked = (href: string): boolean => {
    if (isSuperAdmin) return false
    const featureKey = NAV_FEATURE_MAP[href]
    return featureKey ? !hasFeature(featureKey) : false
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
    <TooltipProvider delayDuration={200}>
      <>
        {/* Sidebar — outer element has no overflow-hidden so the floating
            toggle button can escape the boundary */}
        <motion.aside
          animate={{ width: collapsed ? 72 : 240 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="group/sidebar relative flex flex-col border-r border-sidebar-border bg-sidebar h-full shrink-0"
        >
          {/* Inner container clips overflowing text during animation */}
          <div className="flex flex-col h-full overflow-hidden">

            {/* ── Brand header ──────────────────────────────────── */}
            <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-3 overflow-hidden">
              <Link href="/dashboard">
                <div className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                  {businessLogoUrl ? (
                    <img
                      src={businessLogoUrl}
                      alt={businessName}
                      className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm shadow-primary/25">
                      <span className="text-sm font-bold text-primary-foreground">{brandInitial}</span>
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="brand-name"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="text-base font-semibold tracking-tight text-sidebar-foreground truncate overflow-hidden whitespace-nowrap"
                      >
                        {businessName}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            </div>

            {/* ── Nav items ──────────────────────────────────────── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 scrollbar-thin">
              <SidebarNavExtras collapsed={collapsed} />
              {visibleItems.map((item) => {
                const active = isActive(item.href)
                const locked = isLocked(item.href)
                const label = t(item.key)

                const inner = (
                  <Link key={item.href} href={item.href} onClick={(e) => handleNavClick(item.href, e)}>
                    <div
                      data-tour={item.tourId}
                      className={cn(
                        "relative flex h-9 items-center gap-3 rounded-xl px-3 cursor-pointer",
                        "transition-colors duration-150",
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
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <item.icon className={cn(
                        "relative z-10 h-4 w-4 shrink-0 transition-transform duration-150",
                        "group-hover/navitem:scale-110",
                        active && !locked ? "text-sidebar-primary-foreground" : locked ? "text-muted-foreground/70" : "",
                      )} />
                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            key="label"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.18, ease: "easeInOut" }}
                            className="relative z-10 flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap text-sm font-medium"
                          >
                            <span className={locked ? "text-muted-foreground" : ""}>{label}</span>
                            {locked && <Lock className="h-3 w-3 text-muted-foreground/50 ml-1 shrink-0" />}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {collapsed && locked && (
                        <Lock className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-muted-foreground/50" />
                      )}
                    </div>
                  </Link>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{inner}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {label}
                        {locked && <span className="ml-1.5 opacity-60">(Locked)</span>}
                      </TooltipContent>
                    </Tooltip>
                  )
                }
                return inner
              })}
            </nav>

            {/* ── User section ───────────────────────────────────── */}
            <div className="shrink-0 border-t border-sidebar-border p-2">
              <SidebarUserSection
                collapsed={collapsed}
                notifOpen={notifOpen}
                onToggleNotif={onToggleNotif}
                unreadCount={unreadCount}
              />
            </div>
          </div>

          {/* ── Floating collapse toggle ────────────────────────────
              Sits on the right border of the sidebar. Appears on hover. */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "absolute -right-3 top-[60px] z-30",
              "flex h-6 w-6 items-center justify-center rounded-full",
              "border border-border bg-card shadow-md",
              "text-muted-foreground hover:text-foreground hover:border-primary/40 hover:shadow-lg",
              "transition-all duration-200 hover:scale-110",
              // Only show on sidebar hover or when already interacting
              "opacity-0 group-hover/sidebar:opacity-100 focus:opacity-100",
            )}
          >
            <ChevronLeft
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-250",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </motion.aside>

        <UpgradeModal
          open={upgradeModal.open}
          onClose={() => setUpgradeModal({ open: false, featureKey: "" })}
          featureKey={upgradeModal.featureKey}
          currentPlan={org?.plan ?? "free"}
        />
      </>
    </TooltipProvider>
  )
}

function SidebarNavExtras({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation()
  const isSuperAdmin = useSuperAdmin()
  const extras = [
    { href: "/admin", label: "Super Admin", icon: Shield, show: isSuperAdmin },
  ]

  return (
    <>
      {extras.filter(e => e.show).map(item => {
        const active = location.startsWith(item.href)
        const inner = (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "relative flex h-9 items-center gap-3 rounded-xl px-3 cursor-pointer",
              "transition-colors duration-150",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}>
              {active && (
                <motion.div
                  layoutId={`activeNav-${item.href}`}
                  className="absolute inset-0 rounded-xl bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <item.icon className={cn(
                "relative z-10 h-4 w-4 shrink-0",
                active ? "text-sidebar-primary-foreground" : ""
              )} />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="relative z-10 overflow-hidden whitespace-nowrap text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </Link>
        )

        if (collapsed) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{inner}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
            </Tooltip>
          )
        }
        return inner
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
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const avatar = profile?.avatarUrl ? (
    <img src={profile.avatarUrl} alt={displayName} className="h-7 w-7 rounded-full object-cover ring-1 ring-border/40" />
  ) : (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-xs font-semibold text-primary-foreground">
      {initials}
    </div>
  )

  const handleStartTour = () => {
    window.dispatchEvent(new CustomEvent("crm-tour-start"))
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleNotif}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                notifOpen && "bg-sidebar-accent"
              )}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleStartTour}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
            >
              <MapPin className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Product Tour</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/dashboard/settings">
              <div className="flex cursor-pointer items-center justify-center transition-all hover:ring-2 hover:ring-primary/40 rounded-full">
                {avatar}
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{displayName} · Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSignOut}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors duration-150"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleStartTour}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
            title="Product Tour"
          >
            <MapPin className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Product Tour</TooltipContent>
      </Tooltip>

      <button
        onClick={onToggleNotif}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-150",
          "text-sidebar-foreground hover:bg-sidebar-accent",
          notifOpen && "bg-sidebar-accent"
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Link href="/dashboard/settings" className="min-w-0 flex-1">
        <div className="group flex items-center gap-2 rounded-xl px-2 py-1.5 cursor-pointer hover:bg-sidebar-accent transition-colors duration-150 min-w-0">
          <div className="shrink-0">{avatar}</div>
          <div className="flex min-w-0 flex-1 flex-col leading-none">
            <p className="truncate text-xs font-semibold text-sidebar-foreground group-hover:text-sidebar-accent-foreground">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground capitalize mt-0.5">
              {displayTitle}
            </p>
          </div>
          <Settings className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
        </div>
      </Link>

      <button
        onClick={handleSignOut}
        title="Sign out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors duration-150"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
