import { Switch, Route, Redirect, Router as WouterRouter } from "wouter"
import { Component, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"
import { Loader2 } from "lucide-react"

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-3xl">⚠️</div>
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{this.state.error.message}</p>
          <button
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => { this.setState({ error: null }); window.location.href = "/dashboard" }}
          >
            Return to Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import NotFound from "@/pages/not-found"
import MarketingPage from "@/pages/marketing"
import SignInPage from "@/pages/auth/sign-in"
import SignUpPage from "@/pages/auth/sign-up"
import ForgotPasswordPage from "@/pages/auth/forgot-password"
import { DashboardLayout } from "@/pages/dashboard/layout"
import OverviewPage from "@/pages/dashboard/overview"
import LeadsPage from "@/pages/dashboard/leads"
import LeadProfilePage from "@/pages/dashboard/lead-profile"
import PropertiesPage from "@/pages/dashboard/properties"
import MessagesPage from "@/pages/dashboard/messages"
import AnalyticsPage from "@/pages/dashboard/analytics"
import AIIntelligencePage from "@/pages/dashboard/ai-intelligence"
import AutomationsPage from "@/pages/dashboard/automations"
import TeamPage from "@/pages/dashboard/team"
import DealsPage from "@/pages/dashboard/deals"
import DocumentsPage from "@/pages/dashboard/documents"
import CalendarPage from "@/pages/dashboard/calendar"
import SettingsPage from "@/pages/dashboard/settings"
import IntegrationsPage from "@/pages/dashboard/integrations"
import CalculatorPage from "@/pages/dashboard/calculator"
import AIUsagePage from "@/pages/dashboard/ai-usage"
import DealersPage from "@/pages/dashboard/dealers"
import { LanguageProvider } from "@/lib/i18n"


const basePath = import.meta.env.BASE_URL.replace(/\/$/, "")


function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
          <span className="text-xl font-bold text-primary-foreground">L</span>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Redirect to="/sign-in" />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Redirect to="/dashboard" />
  return <>{children}</>
}

function HomeRedirect() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Redirect to="/dashboard" />
  return <MarketingPage />
}

function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={OverviewPage} />
          <Route path="/dashboard/leads" component={LeadsPage} />
          <Route path="/dashboard/properties" component={PropertiesPage} />
          <Route path="/dashboard/messages" component={MessagesPage} />
          <Route path="/dashboard/analytics" component={AnalyticsPage} />
          <Route path="/dashboard/ai-intelligence" component={AIIntelligencePage} />
          <Route path="/dashboard/automations" component={AutomationsPage} />
          <Route path="/dashboard/team" component={TeamPage} />
          <Route path="/dashboard/deals" component={DealsPage} />
          <Route path="/dashboard/documents" component={DocumentsPage} />
          <Route path="/dashboard/calendar" component={CalendarPage} />
          <Route path="/dashboard/calculator" component={CalculatorPage} />
          <Route path="/dashboard/ai-usage" component={AIUsagePage} />
          <Route path="/dashboard/settings" component={SettingsPage} />
          <Route path="/dashboard/integrations" component={IntegrationsPage} />
          <Route path="/dashboard/dealers" component={DealersPage} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

function LeadProfileRoute({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LeadProfilePage params={params} />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in">
        <PublicOnlyRoute><SignInPage /></PublicOnlyRoute>
      </Route>
      <Route path="/sign-up">
        <PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>
      </Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/onboarding">
        <ProtectedRoute><Redirect to="/dashboard" /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/leads/:id" component={LeadProfileRoute} />
      <Route path="/dashboard" component={DashboardRoutes} />
      <Route path="/dashboard/:rest*" component={DashboardRoutes} />
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="gold"
            enableSystem={false}
            themes={["gold", "midnight", "ocean", "emerald", "rose", "slate", "violet"]}
          >
            <TooltipProvider>
              <LanguageProvider>
                <AuthProvider>
                  <ErrorBoundary>
                    <Router />
                  </ErrorBoundary>
                  <Toaster />
                </AuthProvider>
              </LanguageProvider>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </WouterRouter>
    </ErrorBoundary>
  )
}

export default App
