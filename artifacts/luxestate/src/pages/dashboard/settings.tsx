import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { ConnectedAccountsTab } from "@/components/dashboard/connected-accounts-tab"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { surfaceInputClass } from "@/lib/ui-classes"
import { useSettings, useUpdateSettings, useUploadImage, type SettingsUpdate } from "@/lib/settings-api"
import { toast } from "sonner"
import {
  User, Bell, Shield, Palette, MessageCircle, Building2,
  Link2, Camera, Upload, Loader2,
  Check, Lock, Clock, Mail, Phone, Save, RefreshCw, AlertCircle,
} from "lucide-react"
import { THEMES } from "@/App"

// ─── Tab Config ───────────────────────────────────────────

const TABS = [
  { id: "profile",      label: "Profile",            icon: User },
  { id: "branding",     label: "Business",           icon: Building2 },
  { id: "appearance",   label: "Appearance",         icon: Palette },
  { id: "notifications",label: "Notifications",      icon: Bell },
  { id: "security",     label: "Security",           icon: Shield },
  { id: "accounts",     label: "Connected Accounts", icon: Link2 },
]

// ─── Toggle Switch ────────────────────────────────────────

function Toggle({
  checked, onChange, disabled = false,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        checked ? "bg-primary" : "bg-muted",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

// ─── Avatar / Image Uploader ──────────────────────────────

function ImageUploader({
  current, fallback, field, onUploaded, shape = "circle",
}: {
  current?: string | null
  fallback: string
  field: "avatar" | "logo"
  onUploaded: (url: string) => void
  shape?: "circle" | "rounded"
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMut = useUploadImage()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4 MB")
      return
    }
    try {
      const url = await uploadMut.mutateAsync({ field, file })
      onUploaded(url)
      toast.success("Image uploaded")
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed")
    }
    e.target.value = ""
  }

  return (
    <div className="relative group">
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer overflow-hidden flex items-center justify-center",
          "bg-gradient-to-br from-primary/70 to-accent/70 transition-all",
          shape === "circle" ? "h-20 w-20 rounded-full" : "h-16 w-32 rounded-xl",
          "ring-2 ring-border/40 group-hover:ring-primary/50"
        )}
      >
        {current ? (
          <img src={current} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-primary-foreground select-none">{fallback}</span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {uploadMut.isPending
            ? <Loader2 className="h-5 w-5 text-white animate-spin" />
            : <Camera className="h-5 w-5 text-white" />
          }
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function NotifRow({
  label, description, checked, onChange, saving,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; saving: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={saving} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useSettings()
  const updateSettings = useUpdateSettings()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("profile")

  // ── URL param: OAuth redirect ─────────────────────────
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null)
  const [oauthError, setOauthError]               = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get("tab"); const connected = params.get("connected"); const error = params.get("error")
    if (tab === "accounts" || connected || error) {
      setActiveTab("accounts")
      if (connected) { setConnectedProvider(connected); window.history.replaceState({}, "", window.location.pathname) }
      else if (error) { setOauthError(decodeURIComponent(params.get("provider") ? `${params.get("provider")}: ${error}` : error)); window.history.replaceState({}, "", window.location.pathname) }
    }
  }, [])

  // ── Profile form state ────────────────────────────────
  const user = data?.user
  const settings = data?.settings

  const [profile, setProfile] = useState({
    firstName: "", lastName: "", email: "", phone: "", title: "", avatarUrl: "",
  })
  const [business, setBusiness] = useState({
    businessName: "", businessLogoUrl: "", whatsappNumber: "", officeAddress: "", teamSize: "", position: "",
  })
  const [notifs, setNotifs] = useState({
    notificationsEnabled: true, newLeadNotif: true, dealStatusNotif: true,
    whatsappNotif: true, weeklyReportsEnabled: true, marketingEmailsEnabled: false,
  })
  const [security, setSecurity] = useState({ securityTwoFactorEnabled: false })
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h")
  const [savingNotif, setSavingNotif] = useState(false)
  const formInitialised = useRef(false)

  // Populate form fields from DB — runs once when data first arrives.
  // Never calls setTheme() here: theme is already managed by next-themes
  // (localStorage) and must not be overwritten on every settings mount.
  useEffect(() => {
    if (!settings || formInitialised.current) return
    formInitialised.current = true
    if (user) {
      setProfile({
        firstName: user.first_name ?? "",
        lastName:  user.last_name ?? "",
        email:     user.email ?? "",
        phone:     user.phone ?? "",
        title:     user.title ?? "",
        avatarUrl: user.avatar_url ?? "",
      })
    }
    setBusiness({
      businessName:    settings.business_name ?? "",
      businessLogoUrl: settings.business_logo_url ?? "",
      whatsappNumber:  settings.whatsapp_number ?? "",
      officeAddress:   settings.office_address ?? "",
      teamSize:        settings.team_size ?? "",
      position:        settings.position ?? "",
    })
    setNotifs({
      notificationsEnabled:  settings.notifications_enabled,
      newLeadNotif:          settings.new_lead_notif,
      dealStatusNotif:       settings.deal_status_notif,
      whatsappNotif:         settings.whatsapp_notif,
      weeklyReportsEnabled:  settings.weekly_reports_enabled,
      marketingEmailsEnabled:settings.marketing_emails_enabled,
    })
    setSecurity({ securityTwoFactorEnabled: settings.security_two_factor_enabled })
    setTimeFormat((settings.time_format as "12h" | "24h") ?? "12h")
  }, [settings, user])

  // ── Save handlers ─────────────────────────────────────

  const saveProfile = async () => {
    try {
      await updateSettings.mutateAsync({
        firstName: profile.firstName || undefined,
        lastName:  profile.lastName  || undefined,
        phone:     profile.phone     || undefined,
        title:     profile.title     || undefined,
        avatarUrl: profile.avatarUrl || undefined,
      })
      toast.success("Profile saved")
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed")
    }
  }

  const saveBusiness = async () => {
    try {
      await updateSettings.mutateAsync({
        businessName:    business.businessName    || undefined,
        businessLogoUrl: business.businessLogoUrl || undefined,
        whatsappNumber:  business.whatsappNumber  || undefined,
        officeAddress:   business.officeAddress   || undefined,
        teamSize:        business.teamSize        || undefined,
        position:        business.position        || undefined,
      })
      toast.success("Business info saved")
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed")
    }
  }

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme)
    try {
      await updateSettings.mutateAsync({ theme: newTheme, timeFormat })
    } catch {}
  }

  const handleTimeFormatChange = async (fmt: "12h" | "24h") => {
    setTimeFormat(fmt)
    try {
      await updateSettings.mutateAsync({ theme, timeFormat: fmt })
    } catch {}
  }

  const handleNotifToggle = useCallback(async (key: keyof typeof notifs, value: boolean) => {
    const updated = { ...notifs, [key]: value }
    setNotifs(updated)
    setSavingNotif(true)
    try {
      await updateSettings.mutateAsync(updated as SettingsUpdate)
    } catch (err: any) {
      setNotifs(notifs) // revert
      toast.error(err?.message ?? "Save failed")
    } finally {
      setSavingNotif(false)
    }
  }, [notifs, updateSettings])

  const handleSecurityToggle = async (key: keyof typeof security, value: boolean) => {
    const updated = { ...security, [key]: value }
    setSecurity(updated)
    try {
      await updateSettings.mutateAsync(updated as SettingsUpdate)
      toast.success("Security settings updated")
    } catch (err: any) {
      setSecurity(security)
      toast.error(err?.message ?? "Save failed")
    }
  }

  const avatarInitials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || (user?.email?.[0] ?? "U").toUpperCase()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="Settings" description="Manage your account preferences." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="Settings" description="Manage your account preferences." />
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load settings.
          <button onClick={() => refetch()} className="ml-auto underline font-medium flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Settings"
        description="Manage your profile, preferences, and integrations."
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <motion.nav
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-row gap-1 overflow-x-auto pb-2 shrink-0 md:flex-col md:w-48 md:overflow-visible md:pb-0 md:sticky md:top-4"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-all shrink-0",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </motion.nav>

        {/* ── Content ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 min-w-0 space-y-4"
          >
            {/* ─── Profile ──────────────────────────────── */}
            {activeTab === "profile" && (
              <Section title="Profile Information" subtitle="Update your personal details and contact info.">
                <div className="flex items-center gap-4">
                  <ImageUploader
                    current={profile.avatarUrl}
                    fallback={avatarInitials}
                    field="avatar"
                    shape="circle"
                    onUploaded={(url) => setProfile((p) => ({ ...p, avatarUrl: url }))}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 4 MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldRow label="First Name">
                    <Input value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} placeholder="James" className={surfaceInputClass} />
                  </FieldRow>
                  <FieldRow label="Last Name">
                    <Input value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} placeholder="Donovan" className={surfaceInputClass} />
                  </FieldRow>
                  <FieldRow label="Email">
                    <Input value={profile.email} disabled placeholder="Email" className={cn(surfaceInputClass, "opacity-60 cursor-not-allowed")} />
                    <p className="text-[11px] text-muted-foreground">Email is managed through your auth provider</p>
                  </FieldRow>
                  <FieldRow label="Phone">
                    <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={surfaceInputClass} />
                  </FieldRow>
                  <FieldRow label="Job Title">
                    <Input value={profile.title} onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))} placeholder="Senior Agent" className={surfaceInputClass} />
                  </FieldRow>
                </div>

                <Button
                  onClick={saveProfile}
                  disabled={updateSettings.isPending}
                  className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 gap-2"
                >
                  {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </Section>
            )}

            {/* ─── Business / Branding ──────────────────── */}
            {activeTab === "branding" && (
              <Section title="Business & Branding" subtitle="Your agency info and branding assets.">
                <div className="flex items-center gap-4">
                  <ImageUploader
                    current={business.businessLogoUrl}
                    fallback={business.businessName?.[0]?.toUpperCase() ?? "B"}
                    field="logo"
                    shape="rounded"
                    onUploaded={(url) => setBusiness((b) => ({ ...b, businessLogoUrl: url }))}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Business Logo</p>
                    <p className="text-xs text-muted-foreground">Displayed in documents and reports · max 4 MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldRow label="Business Name">
                    <Input value={business.businessName} onChange={(e) => setBusiness((b) => ({ ...b, businessName: e.target.value }))} placeholder="LuxeState Realty" className={surfaceInputClass} />
                  </FieldRow>
                  <FieldRow label="Your Position">
                    <Input value={business.position} onChange={(e) => setBusiness((b) => ({ ...b, position: e.target.value }))} placeholder="Managing Director" className={surfaceInputClass} />
                  </FieldRow>
                  <FieldRow label="Business Phone / WhatsApp">
                    <Input value={business.whatsappNumber} onChange={(e) => setBusiness((b) => ({ ...b, whatsappNumber: e.target.value }))} placeholder="+1 (555) 000-0000" className={surfaceInputClass} />
                  </FieldRow>
                  <FieldRow label="Team Size">
                    <Input value={business.teamSize} onChange={(e) => setBusiness((b) => ({ ...b, teamSize: e.target.value }))} placeholder="e.g. 2–5" className={surfaceInputClass} />
                  </FieldRow>
                  <FieldRow label="Office Address">
                    <Input value={business.officeAddress} onChange={(e) => setBusiness((b) => ({ ...b, officeAddress: e.target.value }))} placeholder="123 Main St, Beverly Hills, CA" className={cn(surfaceInputClass, "sm:col-span-2")} />
                  </FieldRow>
                </div>

                <div className="pt-1">
                  <Button
                    onClick={saveBusiness}
                    disabled={updateSettings.isPending}
                    className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 gap-2"
                  >
                    {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </Section>
            )}

            {/* ─── Appearance ───────────────────────────── */}
            {activeTab === "appearance" && (
              <Section title="Appearance" subtitle="Customize how LuxeState looks and behaves.">
                {/* Theme */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Color Theme</label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={cn(
                          "flex items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-all",
                          theme === t.id
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20"
                            : "border-border/50 hover:border-primary/40 hover:bg-secondary/20"
                        )}
                      >
                        <div className="flex flex-shrink-0 -space-x-1.5">
                          {t.swatches.map((color, i) => (
                            <div
                              key={i}
                              className="h-7 w-7 rounded-full border-2 border-white shadow-sm"
                              style={{ background: color, zIndex: 3 - i }}
                            />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold", theme === t.id ? "text-primary" : "text-foreground")}>{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                        {theme === t.id && (
                          <div className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time format */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Time Format</label>
                  <div className="flex gap-3">
                    {[
                      { id: "12h", label: "12-hour", sample: "3:00 PM" },
                      { id: "24h", label: "24-hour", sample: "15:00" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleTimeFormatChange(opt.id as "12h" | "24h")}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all",
                          timeFormat === opt.id
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50 hover:bg-secondary/30"
                        )}
                      >
                        <Clock className={cn("h-5 w-5", timeFormat === opt.id ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-medium", timeFormat === opt.id ? "text-primary" : "text-muted-foreground")}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{opt.sample}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* ─── Notifications ────────────────────────── */}
            {activeTab === "notifications" && (
              <Section title="Notifications" subtitle="Choose when and how you want to be notified.">
                <div className="space-y-3">
                  <NotifRow
                    label="New Lead Assigned"
                    description="Get notified when a new lead is assigned to you"
                    checked={notifs.newLeadNotif}
                    onChange={(v) => handleNotifToggle("newLeadNotif", v)}
                    saving={savingNotif}
                  />
                  <NotifRow
                    label="Deal Status Change"
                    description="When a deal moves through the pipeline stages"
                    checked={notifs.dealStatusNotif}
                    onChange={(v) => handleNotifToggle("dealStatusNotif", v)}
                    saving={savingNotif}
                  />
                  <NotifRow
                    label="WhatsApp Messages"
                    description="Receive in-app WhatsApp message notifications"
                    checked={notifs.whatsappNotif}
                    onChange={(v) => handleNotifToggle("whatsappNotif", v)}
                    saving={savingNotif}
                  />
                  <NotifRow
                    label="Weekly Performance Report"
                    description="A weekly summary of your leads, deals, and activities"
                    checked={notifs.weeklyReportsEnabled}
                    onChange={(v) => handleNotifToggle("weeklyReportsEnabled", v)}
                    saving={savingNotif}
                  />
                  <NotifRow
                    label="Marketing Emails"
                    description="LuxeState product updates, tips, and announcements"
                    checked={notifs.marketingEmailsEnabled}
                    onChange={(v) => handleNotifToggle("marketingEmailsEnabled", v)}
                    saving={savingNotif}
                  />
                </div>
                {savingNotif && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </p>
                )}
              </Section>
            )}

            {/* ─── Security ────────────────────────────── */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <Section title="Security" subtitle="Protect your account and manage access.">
                  <div className="space-y-3">
                    {/* 2FA */}
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                          <Lock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                          <p className="text-xs text-muted-foreground">Add a second layer of security to your account</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {security.securityTwoFactorEnabled && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                            <Check className="h-3 w-3 mr-1" /> Enabled
                          </Badge>
                        )}
                        <Toggle
                          checked={security.securityTwoFactorEnabled}
                          onChange={(v) => handleSecurityToggle("securityTwoFactorEnabled", v)}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Password</p>
                          <p className="text-xs text-muted-foreground">Managed through your authentication provider</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-muted-foreground">Auth Provider</Badge>
                    </div>

                    {/* Sessions */}
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Active Sessions</p>
                          <p className="text-xs text-muted-foreground">Manage devices where you are signed in</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-muted-foreground">Coming soon</Badge>
                    </div>
                  </div>
                </Section>

                {/* Danger zone */}
                <div className="glass-card p-6 space-y-4 border-red-500/20">
                  <div>
                    <h3 className="text-base font-semibold text-red-500">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Irreversible actions — proceed with caution</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="outline" size="sm" disabled className="border-red-500/30 text-red-500 hover:bg-red-500/10 opacity-50 cursor-not-allowed">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Connected Accounts ───────────────────── */}
            {activeTab === "accounts" && (
              <ConnectedAccountsTab
                connectedProvider={connectedProvider}
                errorMessage={oauthError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
