import { useState, useRef, useCallback } from "react"
import { useLocation } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"
import { useCompleteOnboarding, useOrgProfile } from "@/lib/onboarding-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Building2, Users2, Megaphone, UserCircle, Target,
  Palette, Bell, ChevronRight, ChevronLeft, CheckCircle2,
  Loader2, Upload, X, Globe, Phone, Mail, MapPin,
  Sparkles, Camera,
} from "lucide-react"

const TOTAL_STEPS = 6

const THEMES = [
  { key: "gold",           label: "Gold",           primary: "#d4a017", bg: "#fffbea" },
  { key: "light",          label: "Light",          primary: "#2563eb", bg: "#f8fafc" },
  { key: "dark",           label: "Dark",           primary: "#6366f1", bg: "#1e1e2e" },
  { key: "midnight",       label: "Midnight",       primary: "#7c3aed", bg: "#0f0f23" },
  { key: "corporate-blue", label: "Corporate Blue", primary: "#1d4ed8", bg: "#eff6ff" },
  { key: "emerald",        label: "Emerald",        primary: "#059669", bg: "#ecfdf5" },
  { key: "modern-gray",    label: "Modern Gray",    primary: "#6b7280", bg: "#f9fafb" },
]

const BUSINESS_TYPES = [
  "Real Estate Agency", "Property Dealer", "Builder/Developer", "Broker", "Other",
]
const AGENT_COUNTS = ["Just me", "2–5", "6–15", "16–50", "50+"]
const LEAD_SOURCES = [
  "Facebook Ads", "Instagram Ads", "WhatsApp", "Referrals", "Property Portals", "Other",
]
const CRM_USES = [
  "Lead Management", "Sales Pipeline", "WhatsApp Management", "Agency Management", "All of the Above",
]
const POSITIONS = [
  "Owner", "CEO", "Director", "Manager", "Sales Agent", "Marketing Manager", "Other",
]
const NOTIF_FREQUENCIES = [
  { key: "instant",   label: "Instant" },
  { key: "daily",     label: "Daily Summary" },
  { key: "every_3d",  label: "Every 3 Days" },
  { key: "weekly",    label: "Weekly" },
  { key: "biweekly",  label: "Bi-Weekly" },
  { key: "monthly",   label: "Monthly" },
]
const NOTIF_CATEGORIES = [
  { key: "new_leads",          label: "New Leads" },
  { key: "lead_activity",      label: "Lead Activity" },
  { key: "deal_updates",       label: "Deal Updates" },
  { key: "missed_follow_ups",  label: "Missed Follow-Ups" },
  { key: "pipeline_changes",   label: "Pipeline Changes" },
  { key: "ai_recommendations", label: "AI Recommendations" },
  { key: "system_updates",     label: "System Updates" },
]

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100)
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5 text-xs text-muted-foreground">
        <span>Step {step} of {TOTAL_STEPS}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

function ImageUploadBox({
  label, value, onChange, icon: Icon, round,
}: {
  label: string; value: string; onChange: (v: string) => void
  icon: React.ElementType; round?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return }
    const reader = new FileReader()
    reader.onload = (e) => onChange(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [onChange])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border/50 bg-secondary/20 transition-colors hover:border-primary/40 hover:bg-secondary/40 cursor-pointer",
          round ? "rounded-full w-24 h-24 mx-auto" : "rounded-xl h-28 w-full"
        )}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className={cn("object-cover", round ? "w-24 h-24 rounded-full" : "w-full h-28 rounded-xl")}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange("") }}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-md"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              Click or drag to upload<br /><span className="text-[10px]">Max 2MB · PNG, JPG, WebP</span>
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

function ChipGroup({
  options, value, onChange, multi,
}: {
  options: string[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean
}) {
  const selected = multi ? (value as string[]) : [value as string]
  const toggle = (opt: string) => {
    if (multi) {
      const arr = value as string[]
      onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt])
    } else {
      onChange(opt)
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-all select-none",
              active
                ? "border-primary bg-primary text-primary-foreground font-medium shadow-sm"
                : "border-border/50 bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-secondary/60"
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function OnboardingPage() {
  const [, navigate] = useLocation()
  const { user } = useAuth()
  const { data: profile } = useCurrentUser(user?.id)
  const { data: org } = useOrgProfile()
  const completeOnboarding = useCompleteOnboarding()
  const { setTheme } = useTheme()

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  const [orgName, setOrgName] = useState(org?.name ?? "")
  const [businessType, setBusinessType] = useState("")
  const [agentCount, setAgentCount] = useState("")
  const [primaryLeadSource, setPrimaryLeadSource] = useState("")

  const [logoUrl, setLogoUrl] = useState("")
  const [businessPhone, setBusinessPhone] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [businessAddress, setBusinessAddress] = useState("")
  const [businessWebsite, setBusinessWebsite] = useState("")

  const [firstName, setFirstName] = useState(profile?.firstName ?? "")
  const [lastName, setLastName] = useState(profile?.lastName ?? "")
  const [position, setPosition] = useState("")
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "")

  const [crmUse, setCrmUse] = useState("")

  const [theme, setThemeState] = useState("gold")

  const [notifDashboard, setNotifDashboard] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifWhatsapp, setNotifWhatsapp] = useState(false)
  const [notifFrequency, setNotifFrequency] = useState("instant")
  const [notifCategories, setNotifCategories] = useState<string[]>([
    "new_leads", "lead_activity", "deal_updates", "missed_follow_ups",
    "pipeline_changes", "ai_recommendations", "system_updates",
  ])

  const [done, setDone] = useState(false)

  const go = (delta: number) => {
    setDirection(delta)
    setStep((s) => Math.max(1, Math.min(TOTAL_STEPS, s + delta)))
  }

  const handleTheme = (key: string) => {
    setThemeState(key)
    setTheme(key)
  }

  const handleSubmit = async () => {
    try {
      await completeOnboarding.mutateAsync({
        orgName: orgName || undefined,
        businessType: businessType || undefined,
        agentCount: agentCount || undefined,
        primaryLeadSource: primaryLeadSource || undefined,
        crmUse: crmUse || undefined,
        logoUrl: logoUrl || undefined,
        businessPhone: businessPhone || undefined,
        businessEmail: businessEmail || undefined,
        businessAddress: businessAddress || undefined,
        businessWebsite: businessWebsite || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        position: position || undefined,
        phone: phone || undefined,
        avatarUrl: avatarUrl || undefined,
        theme,
        notifDashboard,
        notifEmail,
        notifWhatsapp,
        notifFrequency,
        notifCategories,
      })
      setDone(true)
      setTimeout(() => navigate("/dashboard"), 2500)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save. Please try again.")
    }
  }

  const stepNames = [
    "Business Setup",
    "Branding & Contact",
    "Your Profile",
    "CRM Goals",
    "Appearance",
    "Notifications",
  ]

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
  }

  if (done) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-amber-50 via-background to-orange-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </motion.div>
          <div>
            <p className="text-2xl font-bold text-foreground">You're all set!</p>
            <p className="text-sm text-muted-foreground mt-1">Taking you to your dashboard…</p>
          </div>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-amber-50 via-background to-orange-50 px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
            <span className="text-base font-bold text-primary-foreground">L</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Real<span className="text-primary">CRM</span>
          </span>
        </div>

        <div className="mb-6">
          <ProgressBar step={step} />
        </div>

        <div className="rounded-2xl bg-white shadow-xl shadow-black/8 overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-border/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Step {step} — {stepNames[step - 1]}
            </p>
          </div>

          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="p-6 space-y-5"
              >
                {step === 1 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Tell us about your business</h2>
                      <p className="text-sm text-muted-foreground mt-1">Help us tailor the CRM to your needs.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Company name</Label>
                      <Input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Luxe Real Estate"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">What type of business?</Label>
                      <ChipGroup options={BUSINESS_TYPES} value={businessType} onChange={setBusinessType} />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">How many agents do you have?</Label>
                      <ChipGroup options={AGENT_COUNTS} value={agentCount} onChange={setAgentCount} />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Primary lead source?</Label>
                      <ChipGroup options={LEAD_SOURCES} value={primaryLeadSource} onChange={setPrimaryLeadSource} />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Branding & contact info</h2>
                      <p className="text-sm text-muted-foreground mt-1">Your logo and details appear throughout the CRM.</p>
                    </div>

                    <ImageUploadBox
                      label="Business logo"
                      value={logoUrl}
                      onChange={setLogoUrl}
                      icon={Upload}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> Phone
                        </Label>
                        <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="+92 300 000 0000" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </Label>
                        <Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="info@business.com" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Business address
                      </Label>
                      <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Office address" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" /> Website <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                      </Label>
                      <Input value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} placeholder="https://yourwebsite.com" />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Your profile</h2>
                      <p className="text-sm text-muted-foreground mt-1">This appears on your account and in team views.</p>
                    </div>

                    <ImageUploadBox
                      label="Profile photo"
                      value={avatarUrl}
                      onChange={setAvatarUrl}
                      icon={Camera}
                      round
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">First name</Label>
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Last name</Label>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Your position</Label>
                      <ChipGroup options={POSITIONS} value={position} onChange={setPosition} />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Your phone
                      </Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 000 0000" />
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">What's your main goal?</h2>
                      <p className="text-sm text-muted-foreground mt-1">We'll prioritize features that matter most to you.</p>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {CRM_USES.map((use) => (
                        <button
                          key={use}
                          type="button"
                          onClick={() => setCrmUse(use)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all",
                            crmUse === use
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border/40 hover:border-primary/40 text-foreground"
                          )}
                        >
                          <div className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            crmUse === use ? "border-primary bg-primary" : "border-border"
                          )}>
                            {crmUse === use && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm font-medium">{use}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 5 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Choose your appearance</h2>
                      <p className="text-sm text-muted-foreground mt-1">Pick a theme that feels right. You can change it anytime.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {THEMES.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => handleTheme(t.key)}
                          className={cn(
                            "relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
                            theme === t.key
                              ? "border-primary shadow-md shadow-primary/15"
                              : "border-border/40 hover:border-primary/40"
                          )}
                          style={{ backgroundColor: t.bg }}
                        >
                          {theme === t.key && (
                            <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div
                            className="h-6 w-6 rounded-full shadow-sm"
                            style={{ backgroundColor: t.primary }}
                          />
                          <span className="text-xs font-medium" style={{ color: t.bg === "#1e1e2e" || t.bg === "#0f0f23" ? "#fff" : "#111" }}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 6 && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Notification preferences</h2>
                      <p className="text-sm text-muted-foreground mt-1">Stay informed about what matters to you.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notification channels</Label>
                      <div className="flex flex-col gap-2">
                        {[
                          { key: "dashboard", label: "Dashboard Notifications", val: notifDashboard, set: setNotifDashboard },
                          { key: "email",     label: "Email Notifications",     val: notifEmail,     set: setNotifEmail },
                          { key: "whatsapp",  label: "WhatsApp Notifications",  val: notifWhatsapp,  set: setNotifWhatsapp },
                        ].map((ch) => (
                          <button
                            key={ch.key}
                            type="button"
                            onClick={() => ch.set(!ch.val)}
                            className={cn(
                              "flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all",
                              ch.val ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30"
                            )}
                          >
                            <span className="text-sm font-medium">{ch.label}</span>
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              ch.val ? "border-primary bg-primary" : "border-border"
                            )}>
                              {ch.val && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Frequency</Label>
                      <div className="flex flex-wrap gap-2">
                        {NOTIF_FREQUENCIES.map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setNotifFrequency(f.key)}
                            className={cn(
                              "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                              notifFrequency === f.key
                                ? "border-primary bg-primary text-primary-foreground font-medium"
                                : "border-border/50 bg-secondary/30 hover:border-primary/50"
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notify me about</Label>
                      <div className="flex flex-wrap gap-2">
                        {NOTIF_CATEGORIES.map((c) => {
                          const active = notifCategories.includes(c.key)
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => setNotifCategories(
                                active ? notifCategories.filter((x) => x !== c.key) : [...notifCategories, c.key]
                              )}
                              className={cn(
                                "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                                active
                                  ? "border-primary bg-primary text-primary-foreground font-medium"
                                  : "border-border/50 bg-secondary/30 hover:border-primary/50"
                              )}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between border-t border-border/20 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => step === 1 ? undefined : go(-1)}
              disabled={step === 1}
              className="gap-1.5 border-border/50"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-all",
                    i + 1 === step ? "w-4 h-2 bg-primary" : i + 1 < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-border/50"
                  )}
                />
              ))}
            </div>

            {step < TOTAL_STEPS ? (
              <Button onClick={() => go(1)} className="gap-1.5">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={completeOnboarding.isPending}
                className="gap-1.5 bg-primary hover:bg-primary/90"
              >
                {completeOnboarding.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Complete Setup</>
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can update all of this later in{" "}
          <button
            type="button"
            onClick={handleSubmit}
            className="text-primary hover:underline font-medium"
            disabled={completeOnboarding.isPending}
          >
            Settings
          </button>
          {" "}— or{" "}
          <button
            type="button"
            onClick={handleSubmit}
            className="text-muted-foreground hover:text-foreground hover:underline"
            disabled={completeOnboarding.isPending}
          >
            skip for now
          </button>
        </p>
      </div>
    </div>
  )
}
