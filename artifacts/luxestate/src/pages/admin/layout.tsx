import { ReactNode } from "react"
import { Link, useLocation } from "wouter"
import { useSuperAdmin } from "@/lib/plan-context"
import { Redirect } from "wouter"
import { LayoutDashboard, Building2, CreditCard, FileText, Zap, Brain, ChevronRight, HeadphonesIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/ai-usage", label: "AI Usage", icon: Zap },
  { href: "/admin/ai-settings", label: "AI Settings", icon: Brain },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/support", label: "Support", icon: HeadphonesIcon },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const isSuperAdmin = useSuperAdmin()
  const [location] = useLocation()

  if (!isSuperAdmin) return <Redirect to="/dashboard" />

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
        <div className="h-14 flex items-center px-4 border-b gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">SA</span>
          </div>
          <span className="font-semibold text-sm">Super Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? location === "/admin" : location.startsWith(href)
            return (
              <Link key={href} href={href} className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2">
            <ChevronRight className="h-3 w-3" />
            Back to CRM
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
