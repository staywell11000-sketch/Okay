import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, CheckCheck, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"

// ── Step definitions ───────────────────────────────────────────────────────

type TourStep = {
  target: string
  title: string
  description: string
  emoji: string
}

const STEPS: TourStep[] = [
  {
    target: "tour-dashboard",
    emoji: "🏠",
    title: "Dashboard Overview",
    description: "Your command center — live pipeline metrics, revenue forecasts, recent activity, and today's tasks, all in one place.",
  },
  {
    target: "tour-leads",
    emoji: "👥",
    title: "Leads",
    description: "Capture, qualify, and nurture every prospect. Filter by source, status, or agent and track every touchpoint end-to-end.",
  },
  {
    target: "tour-messages",
    emoji: "💬",
    title: "Messages",
    description: "Your unified WhatsApp inbox. Reply to leads, send media, and have every conversation logged automatically in the CRM.",
  },
  {
    target: "tour-properties",
    emoji: "🏢",
    title: "Properties",
    description: "Manage your full property portfolio. Add listings, attach photos and floor plans, and instantly match them to the right leads.",
  },
  {
    target: "tour-dealers",
    emoji: "🤝",
    title: "Dealers",
    description: "Track your network of dealers and brokers — their active listings, commission records, and referral performance over time.",
  },
  {
    target: "tour-analytics",
    emoji: "📊",
    title: "Analytics",
    description: "Data-driven insights on lead conversion, team performance, and revenue pipeline. Export beautiful reports in one click.",
  },
  {
    target: "tour-ai",
    emoji: "🧠",
    title: "AI Intelligence",
    description: "Your AI co-pilot. Ask anything about a lead, get closing strategies, draft follow-ups, and surface your hottest opportunities.",
  },
  {
    target: "tour-automations",
    emoji: "⚡",
    title: "Automations",
    description: "Build no-code workflows that run on autopilot — auto-send WhatsApp, assign leads by rules, follow up without lifting a finger.",
  },
  {
    target: "tour-team",
    emoji: "👨‍💼",
    title: "Team",
    description: "Manage your agents, assign roles, and track individual performance. Invite members and fine-tune access permissions per role.",
  },
  {
    target: "tour-deals",
    emoji: "📋",
    title: "Deals",
    description: "Pipeline management for every active deal. Track value, stage, and probability — and spot bottlenecks before they cost you.",
  },
  {
    target: "tour-documents",
    emoji: "📁",
    title: "Documents",
    description: "Central file storage for contracts, proposals, and property docs. Share with clients directly from the CRM — no email needed.",
  },
  {
    target: "tour-calendar",
    emoji: "📅",
    title: "Calendar",
    description: "Schedule site visits, calls, and follow-ups. Your full agenda synced with your leads and team — never miss a meeting again.",
  },
  {
    target: "tour-settings",
    emoji: "⚙️",
    title: "Settings",
    description: "Customize your workspace — branding, integrations, notifications, and account preferences. Make this CRM truly yours.",
  },
]

const STORAGE_KEY_PREFIX = "lxs-tour-done-"
const PAD = 10
const TOOLTIP_W = 344

// ── Component ──────────────────────────────────────────────────────────────

interface CRMTourProps {
  onExpand?: () => void
}

export function CRMTour({ onExpand }: CRMTourProps) {
  const { user } = useAuth()
  const { data: profile } = useCurrentUser(user?.id)

  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null
  const onExpandRef = useRef(onExpand)
  onExpandRef.current = onExpand

  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [tooltipTop, setTooltipTop] = useState(0)
  const [tooltipLeft, setTooltipLeft] = useState(0)
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  // ── Check conditions and auto-start ──────────────────────────────────────
  useEffect(() => {
    if (!profile?.onboarded || !storageKey) return
    try {
      if (localStorage.getItem(storageKey)) return
    } catch {}
    const t = setTimeout(() => {
      setVisible(true)
      onExpandRef.current?.()
    }, 900)
    return () => clearTimeout(t)
  }, [profile?.onboarded, storageKey])

  // ── Track viewport size ───────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setWinSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  // ── Persist completion ────────────────────────────────────────────────────
  const completeTour = useCallback(() => {
    setVisible(false)
    if (storageKey) {
      try { localStorage.setItem(storageKey, "1") } catch {}
    }
  }, [storageKey])

  // ── Measure target element & compute positions ────────────────────────────
  const measure = useCallback((s: number) => {
    const el = document.querySelector(`[data-tour="${STEPS[s]?.target}"]`)
    if (!el) {
      if (s < STEPS.length - 1) setStep(s + 1)
      else completeTour()
      return
    }
    const r = el.getBoundingClientRect()
    setRect(r)

    const { w, h } = { w: window.innerWidth, h: window.innerHeight }
    const TOOLTIP_H = 228
    let left = r.right + 20
    let top = r.top + r.height / 2 - TOOLTIP_H / 2
    if (left + TOOLTIP_W > w - 12) left = Math.max(12, r.left - TOOLTIP_W - 20)
    top = Math.max(12, Math.min(top, h - TOOLTIP_H - 12))
    setTooltipTop(top)
    setTooltipLeft(left)
  }, [completeTour])

  useEffect(() => {
    if (!visible) return
    measure(step)
    const t = setTimeout(() => measure(step), 320)
    return () => clearTimeout(t)
  }, [visible, step, measure, winSize])

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else completeTour()
  }

  if (!visible) return null

  const { w, h } = winSize
  const cur = STEPS[step]
  const isLast = step === STEPS.length - 1

  const panels = rect
    ? [
        { top: 0,                left: 0,              width: w,                            height: Math.max(0, rect.top - PAD) },
        { top: rect.top - PAD,   left: 0,              width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2 },
        { top: rect.top - PAD,   left: rect.right + PAD, width: Math.max(0, w - rect.right - PAD), height: rect.height + PAD * 2 },
        { top: rect.bottom + PAD, left: 0,             width: w,                            height: Math.max(0, h - rect.bottom - PAD) },
      ]
    : [{ top: 0, left: 0, width: w, height: h }]

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9980, pointerEvents: "none" }}>

      {/* ── Dark backdrop (4 panels with spotlight hole) ── */}
      {panels.map((p, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            background: "rgba(0,0,0,0.64)",
            top: p.top, left: p.left, width: p.width, height: p.height,
            pointerEvents: "all",
          }}
        />
      ))}

      {/* ── Spotlight ring ── */}
      {rect && (
        <motion.div
          key={`ring-${step}`}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          style={{
            position: "fixed",
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 12,
            boxShadow: "0 0 0 2.5px hsl(var(--primary)), 0 0 28px 10px hsl(var(--primary) / 0.25)",
            pointerEvents: "none",
            zIndex: 9982,
          }}
        />
      )}

      {/* ── Tooltip card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`card-${step}`}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 440, damping: 34 }}
          style={{
            position: "fixed",
            top: tooltipTop,
            left: tooltipLeft,
            width: TOOLTIP_W,
            zIndex: 9990,
            pointerEvents: "all",
          }}
          className="rounded-2xl border border-border/60 bg-card shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Header */}
          <div className="relative px-5 pt-4 pb-3.5 border-b border-border/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-2xl shadow-sm ring-1 ring-primary/20">
                {cur.emoji}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <Map className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Step {step + 1} of {STEPS.length}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-foreground leading-tight">
                  {cur.title}
                </h3>
              </div>
              <button
                onClick={completeTour}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                aria-label="Close tour"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cur.description}
            </p>

            {/* Progress track */}
            <div className="flex items-center gap-1 mt-4 mb-4">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{ transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)" }}
                  className={
                    i === step
                      ? "h-1.5 w-5 rounded-full bg-primary"
                      : i < step
                      ? "h-1.5 w-1.5 rounded-full bg-primary/45"
                      : "h-1.5 w-1.5 rounded-full bg-muted/55"
                  }
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={completeTour}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Skip tour
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 gap-1.5 px-4 text-xs font-semibold"
              >
                {isLast ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  )
}
