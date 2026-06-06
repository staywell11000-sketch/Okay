import { useState, useEffect, useRef, useCallback } from "react"
import { useLanguage, LANGUAGES, type Language } from "@/lib/i18n"
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
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import {
  User, Bell, Shield, Palette, MessageCircle, Building2,
  Link2, Camera, Loader2,
  Check, Lock, Clock, Mail, Save, RefreshCw, AlertCircle,
  Smartphone, KeyRound, LogOut, Trash2, Download, UserCog,
  Eye, EyeOff, ShieldCheck, MonitorSmartphone, Copy, CheckCheck,
  Globe, UserCircle2, CreditCard,
} from "lucide-react"
import { THEMES } from "@/lib/themes"

// ─── Tab Config ───────────────────────────────────────────

const TABS = [
  { id: "profile",      label: "Profile",            icon: User },
  { id: "branding",     label: "Business",           icon: Building2 },
  { id: "appearance",   label: "Appearance",         icon: Palette },
  { id: "language",     label: "Language",           icon: Globe },
  { id: "notifications",label: "Notifications",      icon: Bell },
  { id: "security",     label: "Security",           icon: Shield },
  { id: "accounts",     label: "Connected Accounts", icon: Link2 },
  { id: "account",      label: "Account",            icon: UserCog },
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
        checked ? "bg-primary" : "bg-input border border-border",
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

// ─── Password Input ───────────────────────────────────────

function PasswordInput({
  value, onChange, placeholder, show, onToggleShow,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  show: boolean
  onToggleShow: () => void
}) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(surfaceInputClass, "pr-10")}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ─── Detect browser + platform from user agent ────────────

function parseUserAgent(ua: string): { browser: string; os: string } {
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Unknown Browser"
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" : "Unknown OS"
  return { browser, os }
}

// ─── Main Page ────────────────────────────────────────────

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useSettings()
  const updateSettings = useUpdateSettings()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { session, signOut } = useAuth()
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
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h")
  const [savingNotif, setSavingNotif] = useState(false)
  const formInitialised = useRef(false)

  // ── 2FA state ─────────────────────────────────────────
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaEnrollData, setMfaEnrollData] = useState<{ id: string; qrCode: string; secret: string } | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaVerifying, setMfaVerifying] = useState(false)
  const [mfaEnrolling, setMfaEnrolling] = useState(false)
  const [mfaDisabling, setMfaDisabling] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)

  // ── Password state ────────────────────────────────────
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" })
  const [pwLoading, setPwLoading] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwStrength, setPwStrength] = useState(0)

  // ── Sessions state ────────────────────────────────────
  const [signingOutOthers, setSigningOutOthers] = useState(false)

  // ── Account / danger zone ─────────────────────────────
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Populate form fields from DB — runs once when data first arrives.
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
    setTimeFormat((settings.time_format as "12h" | "24h") ?? "12h")
  }, [settings, user])

  // Load MFA factors when security tab is opened
  useEffect(() => {
    if (activeTab === "security") loadMfaFactors()
  }, [activeTab])

  // ── Password strength ─────────────────────────────────
  useEffect(() => {
    const p = pwForm.newPassword
    let score = 0
    if (p.length >= 8) score++
    if (p.length >= 12) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^a-zA-Z0-9]/.test(p)) score++
    setPwStrength(score)
  }, [pwForm.newPassword])

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

  // ── 2FA handlers ──────────────────────────────────────

  const loadMfaFactors = async () => {
    setMfaLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error && data) setMfaFactors(data.totp ?? [])
    setMfaLoading(false)
  }

  const startMfaEnrollment = async () => {
    setMfaEnrolling(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" })
    if (error || !data) {
      toast.error("Failed to start 2FA setup: " + (error?.message ?? "Unknown error"))
      setMfaEnrolling(false)
      return
    }
    setMfaEnrollData({
      id: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    })
    setMfaCode("")
    setMfaEnrolling(false)
  }

  const verifyMfaCode = async () => {
    if (!mfaEnrollData || mfaCode.length < 6) return
    setMfaVerifying(true)
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaEnrollData.id })
    if (challengeErr || !challenge) {
      toast.error("Failed to create challenge")
      setMfaVerifying(false)
      return
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: mfaEnrollData.id,
      challengeId: challenge.id,
      code: mfaCode,
    })
    if (verifyErr) {
      toast.error("Invalid code — please try again")
      setMfaVerifying(false)
      return
    }
    toast.success("Two-factor authentication enabled!")
    setMfaEnrollData(null)
    setMfaCode("")
    await loadMfaFactors()
    setMfaVerifying(false)
  }

  const disableMfa = async (factorId: string) => {
    setMfaDisabling(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) {
      toast.error("Failed to disable 2FA: " + error.message)
      setMfaDisabling(false)
      return
    }
    toast.success("Two-factor authentication disabled")
    await loadMfaFactors()
    setMfaDisabling(false)
  }

  const cancelMfaEnrollment = async () => {
    if (mfaEnrollData) {
      await supabase.auth.mfa.unenroll({ factorId: mfaEnrollData.id }).catch(() => {})
    }
    setMfaEnrollData(null)
    setMfaCode("")
  }

  const copySecret = () => {
    if (!mfaEnrollData) return
    navigator.clipboard.writeText(mfaEnrollData.secret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  // ── Password handler ──────────────────────────────────

  const changePassword = async () => {
    if (pwForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword })
    if (error) {
      toast.error(error.message)
      setPwLoading(false)
      return
    }
    toast.success("Password updated successfully")
    setPwForm({ newPassword: "", confirmPassword: "" })
    setPwLoading(false)
  }

  // ── Session handler ───────────────────────────────────

  const signOutOtherSessions = async () => {
    setSigningOutOthers(true)
    const { error } = await supabase.auth.signOut({ scope: "others" })
    if (error) toast.error("Failed to sign out other sessions")
    else toast.success("Signed out of all other devices")
    setSigningOutOthers(false)
  }

  // ── Data export handler ───────────────────────────────

  const exportData = async () => {
    setExportLoading(true)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const headers: Record<string, string> = s?.access_token
        ? { Authorization: `Bearer ${s.access_token}` } : {}
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")
      const [leadsRes, dealsRes, propertiesRes] = await Promise.all([
        fetch(`${BASE}/api/leads`, { headers }),
        fetch(`${BASE}/api/deals`, { headers }),
        fetch(`${BASE}/api/properties`, { headers }),
      ])
      const exportData = {
        exportedAt: new Date().toISOString(),
        leads: leadsRes.ok ? await leadsRes.json() : [],
        deals: dealsRes.ok ? await dealsRes.json() : [],
        properties: propertiesRes.ok ? await propertiesRes.json() : [],
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `luxestate-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Data exported successfully")
    } catch {
      toast.error("Export failed")
    } finally {
      setExportLoading(false)
    }
  }

  // ── Derived ───────────────────────────────────────────

  const avatarInitials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || (user?.email?.[0] ?? "U").toUpperCase()
  const activeMfaFactor = mfaFactors.find((f) => f.status === "verified")
  const { browser, os } = parseUserAgent(navigator.userAgent)
  const memberSince = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—"
  const pwStrengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][pwStrength] ?? ""
  const pwStrengthColor = pwStrength <= 1 ? "bg-red-500" : pwStrength <= 2 ? "bg-amber-500" : pwStrength <= 3 ? "bg-yellow-400" : "bg-emerald-500"

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="Settings" description="Manage your profile, preferences, and integrations." />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="Settings" description="Manage your profile, preferences, and integrations." />
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
                    <Input value={business.businessName} onChange={(e) => setBusiness((b) => ({ ...b, businessName: e.target.value }))} placeholder="My Real Estate Agency" className={surfaceInputClass} />
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
              <Section title="Appearance" subtitle="Customize how your CRM looks and behaves.">
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

            {/* ─── Language ─────────────────────────────── */}
            {activeTab === "language" && (
              <Section title="Language & Region" subtitle="Choose your preferred language. RTL layout is applied automatically for Urdu, Pashto, and Sindhi.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={async () => {
                        setLanguage(lang.code as Language)
                        try {
                          await updateSettings.mutateAsync({ preferredLanguage: lang.code })
                        } catch (_) {}
                      }}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border px-4 py-4 text-left transition-all",
                        language === lang.code
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/40 hover:bg-secondary/20"
                      )}
                    >
                      <div className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl font-bold select-none",
                        language === lang.code ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {lang.code === "en" ? "A" : lang.nativeName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold text-sm", language === lang.code ? "text-primary" : "text-foreground")}>
                          {lang.nativeName}
                        </p>
                        <p className="text-xs text-muted-foreground">{lang.name}</p>
                        {lang.rtl && (
                          <span className="mt-1 inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">RTL</span>
                        )}
                      </div>
                      {language === lang.code && (
                        <div className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Language preference is saved to your account and applied on all devices.
                </p>
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
                    description="Get notified when a lead replies via WhatsApp"
                    checked={notifs.weeklyReportsEnabled}
                    onChange={(v) => handleNotifToggle("weeklyReportsEnabled", v)}
                    saving={savingNotif}
                  />
                  <NotifRow
                    label="Weekly Performance Report"
                    description="A weekly summary of your leads, deals, and activities"
                    checked={notifs.weeklyReportsEnabled}
                    onChange={(v) => handleNotifToggle("weeklyReportsEnabled", v)}
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

                {/* Two-Factor Authentication */}
                <div className="glass-card p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">Use an authenticator app for a second layer of security</p>
                    </div>
                    {mfaLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
                    {!mfaLoading && activeMfaFactor && (
                      <Badge className="ml-auto bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Enabled
                      </Badge>
                    )}
                    {!mfaLoading && !activeMfaFactor && (
                      <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">Not enabled</Badge>
                    )}
                  </div>

                  {/* Enrollment flow */}
                  <AnimatePresence>
                    {mfaEnrollData ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-5">
                          <div>
                            <p className="text-sm font-semibold text-foreground mb-1">Step 1 — Scan with your authenticator app</p>
                            <p className="text-xs text-muted-foreground">Open Google Authenticator, Authy, or any TOTP app and scan the QR code below.</p>
                          </div>

                          {/* QR Code */}
                          <div className="flex flex-col sm:flex-row gap-5 items-start">
                            <div className="flex-shrink-0 rounded-xl border-2 border-border bg-white p-2 shadow-sm">
                              <div
                                className="h-40 w-40"
                                dangerouslySetInnerHTML={{ __html: mfaEnrollData.qrCode }}
                              />
                            </div>
                            <div className="space-y-3 flex-1">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Can't scan? Enter this key manually:</p>
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                                  <code className="text-xs font-mono text-foreground flex-1 break-all select-all">
                                    {mfaEnrollData.secret}
                                  </code>
                                  <button onClick={copySecret} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                                    {secretCopied ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                  </button>
                                </div>
                              </div>
                              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  Save this key somewhere safe. It lets you recover access if you lose your authenticator app.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Verify */}
                          <div>
                            <p className="text-sm font-semibold text-foreground mb-2">Step 2 — Enter the 6-digit code from your app</p>
                            <div className="flex gap-3">
                              <Input
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className={cn(surfaceInputClass, "font-mono text-center text-lg tracking-widest w-40")}
                                onKeyDown={(e) => e.key === "Enter" && verifyMfaCode()}
                              />
                              <Button
                                onClick={verifyMfaCode}
                                disabled={mfaCode.length < 6 || mfaVerifying}
                                className="bg-primary hover:bg-primary/90 gap-2"
                              >
                                {mfaVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                Verify & Enable
                              </Button>
                              <Button variant="outline" onClick={cancelMfaEnrollment}>Cancel</Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {activeMfaFactor ? (
                          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5">
                            <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">Your account is protected with 2FA</p>
                              <p className="text-xs text-muted-foreground">Authenticator app is linked and active</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => disableMfa(activeMfaFactor.id)}
                              disabled={mfaDisabling}
                              className="flex-shrink-0 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                            >
                              {mfaDisabling ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disable"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={startMfaEnrollment}
                            disabled={mfaEnrolling}
                            className="bg-primary hover:bg-primary/90 gap-2"
                          >
                            {mfaEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                            Set Up Authenticator App
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Change Password */}
                <div className="glass-card p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Change Password</h3>
                      <p className="text-sm text-muted-foreground">Update your account password anytime</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FieldRow label="New Password">
                      <PasswordInput
                        value={pwForm.newPassword}
                        onChange={(v) => setPwForm((f) => ({ ...f, newPassword: v }))}
                        placeholder="Minimum 8 characters"
                        show={showNewPw}
                        onToggleShow={() => setShowNewPw((s) => !s)}
                      />
                      {pwForm.newPassword.length > 0 && (
                        <div className="space-y-1 mt-1.5">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-1 flex-1 rounded-full transition-all duration-300",
                                  i <= pwStrength ? pwStrengthColor : "bg-border"
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{pwStrengthLabel}</p>
                        </div>
                      )}
                    </FieldRow>

                    <FieldRow label="Confirm New Password">
                      <PasswordInput
                        value={pwForm.confirmPassword}
                        onChange={(v) => setPwForm((f) => ({ ...f, confirmPassword: v }))}
                        placeholder="Re-enter new password"
                        show={showConfirmPw}
                        onToggleShow={() => setShowConfirmPw((s) => !s)}
                      />
                      {pwForm.confirmPassword.length > 0 && pwForm.newPassword !== pwForm.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                      {pwForm.confirmPassword.length > 0 && pwForm.newPassword === pwForm.confirmPassword && (
                        <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Passwords match
                        </p>
                      )}
                    </FieldRow>

                    <Button
                      onClick={changePassword}
                      disabled={pwLoading || !pwForm.newPassword || !pwForm.confirmPassword}
                      className="bg-primary hover:bg-primary/90 gap-2"
                    >
                      {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      Update Password
                    </Button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="glass-card p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
                      <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Active Sessions</h3>
                      <p className="text-sm text-muted-foreground">Devices currently signed into your account</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Current session */}
                    <div className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 flex-shrink-0">
                        <Globe className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{browser} on {os}</p>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            Current
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Signed in · Expires {session?.expires_at
                            ? new Date(session.expires_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"
                          }
                        </p>
                      </div>
                    </div>

                    {/* Sign out other devices */}
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Sign out everywhere else</p>
                          <p className="text-xs text-muted-foreground">Revoke access from all other devices and browsers</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={signOutOtherSessions}
                        disabled={signingOutOthers}
                        className="flex-shrink-0"
                      >
                        {signingOutOthers ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sign Out Others"}
                      </Button>
                    </div>
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

            {/* ─── Account ──────────────────────────────── */}
            {activeTab === "account" && (
              <div className="space-y-4">

                {/* Account Overview */}
                <div className="glass-card p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <UserCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Account Overview</h3>
                      <p className="text-sm text-muted-foreground">Your account details and membership info</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { label: "Email Address", value: session?.user?.email ?? "—", mono: false },
                      { label: "Member Since",  value: memberSince, mono: false },
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="rounded-xl border border-border/50 bg-secondary/10 px-4 py-3.5">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={cn("text-sm font-medium text-foreground", mono && "font-mono")}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground">Plan & Billing</h3>
                      <p className="text-sm text-muted-foreground">Your current subscription plan</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">Free Plan</Badge>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-secondary/10 px-4 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">LuxeState CRM — Free</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Unlimited leads, deals, and basic analytics</p>
                    </div>
                    <Button variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed">
                      Upgrade
                    </Button>
                  </div>
                </div>

                {/* Data Export */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Export Your Data</h3>
                      <p className="text-sm text-muted-foreground">Download all your leads, deals, and properties as JSON</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Full data export</p>
                      <p className="text-xs text-muted-foreground">Leads, deals, and properties in JSON format</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportData}
                      disabled={exportLoading}
                      className="flex-shrink-0 gap-1.5"
                    >
                      {exportLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      Export
                    </Button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6 space-y-4 border border-red-500/20">
                  <div>
                    <h3 className="text-base font-semibold text-red-500">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Irreversible actions — proceed with extreme caution</p>
                  </div>

                  {/* Sign out everywhere */}
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/10 bg-red-500/5 px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Sign out of all devices</p>
                      <p className="text-xs text-muted-foreground">End all active sessions, including this one</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signOut()}
                      className="flex-shrink-0 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      Sign Out All
                    </Button>
                  </div>

                  {/* Delete account */}
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Delete Account</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account, all data, leads, and integrations. This cannot be undone.</p>
                      </div>
                      {!showDeleteConfirm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex-shrink-0 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete Account
                        </Button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showDeleteConfirm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 pt-1">
                            <p className="text-xs font-medium text-red-500">
                              Type <span className="font-mono font-bold">DELETE</span> to confirm
                            </p>
                            <Input
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder="Type DELETE to confirm"
                              className={cn(surfaceInputClass, "border-red-500/30 focus:border-red-500/60")}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={deleteConfirmText !== "DELETE"}
                                className="bg-red-500 hover:bg-red-600 text-white gap-1.5 disabled:opacity-40"
                                onClick={() => toast.error("Account deletion requires contacting support. Please email support@luxestate.app")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Permanently Delete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText("") }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
