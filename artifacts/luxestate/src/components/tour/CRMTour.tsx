import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  ArrowRight, ArrowLeft, X, CheckCheck, Sparkles,
  LayoutDashboard, Users, MessageSquare, Building2,
  ClipboardList, CalendarDays, BarChart3, Users2, Settings,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"

// ─── Tour Steps ────────────────────────────────────────────────────────────────

type TourStep = {
  target: string
  title: string
  subtitle: string
  description: string
  emoji: string
  color: string
  icon: React.ElementType
}

const STEPS: TourStep[] = [
  {
    target: "tour-dashboard", emoji: "🏠", color: "#f59e0b",
    icon: LayoutDashboard,
    title: "Dashboard Overview",
    subtitle: "Your command center",
    description: "See live pipeline metrics, revenue forecasts, recent activity, and today's priorities at a glance. Everything you need to run your business.",
  },
  {
    target: "tour-leads", emoji: "👥", color: "#3b82f6",
    icon: Users,
    title: "Leads",
    subtitle: "Never miss a follow-up",
    description: "Capture, qualify, and nurture every prospect. Filter by source, status, or agent and track every touchpoint from first contact to close.",
  },
  {
    target: "tour-messages", emoji: "💬", color: "#10b981",
    icon: MessageSquare,
    title: "Messages",
    subtitle: "Unified WhatsApp inbox",
    description: "Reply to leads, send template messages, and have every conversation automatically logged in the CRM. All your client chats in one place.",
  },
  {
    target: "tour-properties", emoji: "🏢", color: "#8b5cf6",
    icon: Building2,
    title: "Properties",
    subtitle: "Your full portfolio",
    description: "Manage listings, attach photos and floor plans, and instantly match properties to the right leads using AI-powered recommendations.",
  },
  {
    target: "tour-deals", emoji: "📋", color: "#84cc16",
    icon: ClipboardList,
    title: "Deals Pipeline",
    subtitle: "Visual Kanban board",
    description: "Track every active deal by value, stage, and probability. Spot bottlenecks before they cost you and forecast revenue with precision.",
  },
  {
    target: "tour-calendar", emoji: "📅", color: "#ef4444",
    icon: CalendarDays,
    title: "Calendar",
    subtitle: "Stay on top of everything",
    description: "Schedule site visits, calls, and follow-ups. Your full agenda synced with leads and team members — never miss a meeting again.",
  },
  {
    target: "tour-analytics", emoji: "📊", color: "#06b6d4",
    icon: BarChart3,
    title: "Analytics",
    subtitle: "Data-driven decisions",
    description: "Insights on lead conversion, team performance, and revenue pipeline. Export beautiful PDF reports in one click.",
  },
  {
    target: "tour-team", emoji: "👨‍💼", color: "#0ea5e9",
    icon: Users2,
    title: "Team Management",
    subtitle: "Your whole team coordinated",
    description: "Manage agents, assign roles, and track individual performance. Invite members and fine-tune access permissions per role.",
  },
  {
    target: "tour-settings", emoji: "⚙️", color: "#6b7280",
    icon: Settings,
    title: "Settings",
    subtitle: "Make it truly yours",
    description: "Customize branding, integrations, notifications, and account preferences. Personalize every detail of your CRM workspace.",
  },
]

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "lxs-tour-done-"
const SPOT_PAD = 10
const CARD_W = 368
const CARD_H_EST = 258
const SAFE_M = 14
const GAP = SPOT_PAD + 18

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = "idle" | "welcome" | "touring" | "finished"
type Side = "right" | "left" | "bottom" | "top" | "center"
type CardPos = { x: number; y: number; side: Side }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function calcCardPos(rect: DOMRect): CardPos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cy = Math.max(SAFE_M, Math.min(rect.top + rect.height / 2 - CARD_H_EST / 2, vh - CARD_H_EST - SAFE_M))
  const cx = Math.max(SAFE_M, Math.min(rect.left + rect.width / 2 - CARD_W / 2, vw - CARD_W - SAFE_M))

  if (rect.right + GAP + CARD_W + SAFE_M <= vw)
    return { x: rect.right + GAP, y: cy, side: "right" }
  if (rect.left - GAP - CARD_W - SAFE_M >= 0)
    return { x: rect.left - GAP - CARD_W, y: cy, side: "left" }
  if (rect.bottom + GAP + CARD_H_EST + SAFE_M <= vh)
    return { x: cx, y: rect.bottom + GAP, side: "bottom" }
  if (rect.top - GAP - CARD_H_EST >= SAFE_M)
    return { x: cx, y: rect.top - GAP - CARD_H_EST, side: "top" }
  return { x: (vw - CARD_W) / 2, y: (vh - CARD_H_EST) / 2, side: "center" }
}

// ─── Welcome Screen ────────────────────────────────────────────────────────────

function WelcomeScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart()
      if (e.key === "Escape") onSkip()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onStart, onSkip])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9990,
        background: "rgba(2, 6, 12, 0.82)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onSkip() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.06 }}
        style={{
          width: "100%", maxWidth: 480,
          borderRadius: 24,
          background: "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)",
          border: "1px solid hsl(var(--border) / 0.5)",
          boxShadow: "0 32px 80px -8px rgba(0,0,0,0.65), 0 8px 32px -4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Top gradient bar */}
        <div style={{
          height: 4,
          background: "linear-gradient(90deg, #f59e0b, #3b82f6, #10b981, #8b5cf6, #ef4444)",
        }} />

        <div style={{ padding: "36px 36px 32px" }}>
          {/* Icon cluster */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, #f59e0b22, #f59e0b08)",
                border: "1.5px solid #f59e0b33",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32,
                boxShadow: "0 8px 24px -4px rgba(245,158,11,0.2)",
              }}>
                🏙️
              </div>
              {/* Orbit dots */}
              {["#f59e0b", "#3b82f6", "#10b981"].map((c, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear", delay: i * -2 }}
                  style={{
                    position: "absolute",
                    inset: -(12 + i * 8),
                    borderRadius: "50%",
                    border: `1px dashed ${c}22`,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: 0, left: "50%",
                    transform: "translateX(-50%) translateY(-50%)",
                    width: 6, height: 6,
                    borderRadius: "50%",
                    background: c,
                    boxShadow: `0 0 8px 2px ${c}66`,
                  }} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h2 style={{
              fontSize: 24, fontWeight: 800,
              color: "hsl(var(--foreground))",
              letterSpacing: "-0.02em", lineHeight: 1.2,
              margin: "0 0 8px",
            }}>
              Welcome to RealCRM
            </h2>
            <p style={{
              fontSize: 15, color: "hsl(var(--muted-foreground))",
              lineHeight: 1.6, margin: 0,
            }}>
              Let's take a quick <strong style={{ color: "hsl(var(--foreground))" }}>60-second tour</strong> to show you everything your CRM can do.
            </p>
          </div>

          {/* Step preview chips */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6,
            justifyContent: "center", marginBottom: 28,
          }}>
            {STEPS.slice(0, 6).map((s) => (
              <div key={s.target} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 99,
                background: `${s.color}14`,
                border: `1px solid ${s.color}28`,
                fontSize: 12, fontWeight: 500,
                color: "hsl(var(--foreground))",
              }}>
                <span style={{ fontSize: 13 }}>{s.emoji}</span>
                {s.title}
              </div>
            ))}
            <div style={{
              padding: "4px 10px", borderRadius: 99,
              background: "hsl(var(--muted) / 0.5)",
              fontSize: 12, fontWeight: 500,
              color: "hsl(var(--muted-foreground))",
            }}>
              +{STEPS.length - 6} more
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={onStart}
              style={{
                width: "100%", padding: "13px 20px", borderRadius: 14,
                border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #f59e0b, #f59e0bcc)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 6px 24px -4px rgba(245,158,11,0.5)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"
                ;(e.currentTarget as HTMLElement).style.boxShadow = "0 10px 32px -4px rgba(245,158,11,0.6)"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = ""
                ;(e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px -4px rgba(245,158,11,0.5)"
              }}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              Start Tour
              <ArrowRight style={{ width: 15, height: 15 }} />
            </button>

            <button
              onClick={onSkip}
              style={{
                width: "100%", padding: "11px 20px", borderRadius: 14,
                border: "1px solid hsl(var(--border) / 0.6)",
                background: "transparent", cursor: "pointer",
                fontSize: 14, fontWeight: 500,
                color: "hsl(var(--muted-foreground))",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))"
                ;(e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent"
                ;(e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))"
              }}
            >
              Skip for now
            </button>
          </div>

          <p style={{
            textAlign: "center", marginTop: 16,
            fontSize: 11.5, color: "hsl(var(--muted-foreground) / 0.6)",
          }}>
            Press <kbd style={{ background: "hsl(var(--secondary))", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 10.5 }}>Enter</kbd> to start · <kbd style={{ background: "hsl(var(--secondary))", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 10.5 }}>Esc</kbd> to skip
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Spotlight Overlay ─────────────────────────────────────────────────────────

function SpotlightOverlay({
  rect, color, isFirst,
}: {
  rect: DOMRect; color: string; isFirst: boolean
}) {
  const spotStyle = {
    top: rect.top - SPOT_PAD,
    left: rect.left - SPOT_PAD,
    width: rect.width + SPOT_PAD * 2,
    height: rect.height + SPOT_PAD * 2,
  }

  return (
    <>
      {/* Spotlight div — the box-shadow creates the full-screen dark overlay around it */}
      <motion.div
        initial={isFirst ? { opacity: 0, ...spotStyle } : undefined}
        animate={{ opacity: 1, ...spotStyle }}
        transition={{
          opacity: { duration: 0.22 },
          top: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
          left: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
          width: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
          height: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
        }}
        style={{
          position: "fixed",
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(2, 6, 12, 0.78)",
          zIndex: 9981,
          pointerEvents: "all",
        }}
      />

      {/* Glow ring — pulsing accent border around the spotlight */}
      <motion.div
        key={color}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          boxShadow: [
            `0 0 0 2px ${color}, 0 0 0 5px ${color}44, 0 0 28px 6px ${color}1a`,
            `0 0 0 2px ${color}, 0 0 0 10px ${color}18, 0 0 48px 16px ${color}0d`,
            `0 0 0 2px ${color}, 0 0 0 5px ${color}44, 0 0 28px 6px ${color}1a`,
          ],
        }}
        transition={{
          opacity: { duration: 0.3, delay: 0.1 },
          boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
        }}
        style={{
          position: "fixed",
          top: spotStyle.top - 2,
          left: spotStyle.left - 2,
          width: spotStyle.width + 4,
          height: spotStyle.height + 4,
          borderRadius: 14,
          zIndex: 9983,
          pointerEvents: "none",
        }}
      />
    </>
  )
}

// ─── Tour Card ─────────────────────────────────────────────────────────────────

const cardVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 20 : -20, opacity: 0, scale: 0.96,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -20 : 20, opacity: 0, scale: 0.96,
  }),
}

function TourCard({
  step, total, cur, cardPos, direction, isLast,
  onNext, onPrev, onSkip,
}: {
  step: number
  total: number
  cur: TourStep
  cardPos: CardPos
  direction: number
  isLast: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  const progress = (step + 1) / total

  return (
    <motion.div
      key={step}
      custom={direction}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 480, damping: 36 }}
      style={{
        position: "fixed",
        top: cardPos.y,
        left: cardPos.x,
        width: CARD_W,
        zIndex: 9990,
        pointerEvents: "all",
      }}
    >
      {/* Connection arrow pointing to the spotlight */}
      {cardPos.side === "right" && (
        <div style={{
          position: "absolute",
          left: -9, top: "50%",
          transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "9px solid transparent",
          borderBottom: "9px solid transparent",
          borderRight: "9px solid hsl(var(--card))",
          filter: "drop-shadow(-2px 0 3px rgba(0,0,0,0.2))",
        }} />
      )}
      {cardPos.side === "left" && (
        <div style={{
          position: "absolute",
          right: -9, top: "50%",
          transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "9px solid transparent",
          borderBottom: "9px solid transparent",
          borderLeft: "9px solid hsl(var(--card))",
          filter: "drop-shadow(2px 0 3px rgba(0,0,0,0.2))",
        }} />
      )}
      {cardPos.side === "bottom" && (
        <div style={{
          position: "absolute",
          top: -9, left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderBottom: "9px solid hsl(var(--card))",
          filter: "drop-shadow(0 -2px 3px rgba(0,0,0,0.2))",
        }} />
      )}
      {cardPos.side === "top" && (
        <div style={{
          position: "absolute",
          bottom: -9, left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "9px solid hsl(var(--card))",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))",
        }} />
      )}

      {/* Card body */}
      <div style={{
        borderRadius: 18,
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.5)",
        boxShadow: "0 24px 64px -8px rgba(0,0,0,0.6), 0 4px 20px -2px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}>
        {/* Accent top stripe */}
        <div style={{
          height: 3.5,
          background: `linear-gradient(90deg, ${cur.color}, ${cur.color}88)`,
        }} />

        <div style={{ padding: "20px 22px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            {/* Emoji badge */}
            <div style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: `${cur.color}18`,
              border: `1.5px solid ${cur.color}30`,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 22,
              boxShadow: `0 4px 12px -2px ${cur.color}20`,
            }}>
              {cur.emoji}
            </div>

            {/* Title + progress */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Step count + dots */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                  color: cur.color,
                }}>
                  {step + 1} / {total}
                </span>
                <div style={{ display: "flex", gap: 2.5, alignItems: "center" }}>
                  {Array.from({ length: total }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        width: i === step ? 14 : 4,
                        background: i < step
                          ? `${cur.color}99`
                          : i === step
                          ? cur.color
                          : "hsl(var(--muted-foreground) / 0.2)",
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      style={{ height: 3.5, borderRadius: 99 }}
                    />
                  ))}
                </div>
              </div>
              <h3 style={{
                fontSize: 15.5, fontWeight: 800,
                color: "hsl(var(--foreground))",
                letterSpacing: "-0.01em",
                lineHeight: 1.15, margin: 0,
              }}>
                {cur.title}
              </h3>
              <p style={{
                fontSize: 11.5, fontWeight: 600,
                color: cur.color,
                margin: "2px 0 0",
                letterSpacing: "0.01em",
              }}>
                {cur.subtitle}
              </p>
            </div>

            {/* Close */}
            <button
              onClick={onSkip}
              aria-label="Close tour"
              style={{
                width: 28, height: 28, borderRadius: 8,
                border: "none", background: "transparent",
                cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "hsl(var(--muted-foreground))",
                transition: "background 0.14s, color 0.14s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))"
                ;(e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent"
                ;(e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))"
              }}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 13.5, color: "hsl(var(--muted-foreground))",
            lineHeight: 1.68, margin: "0 0 16px",
          }}>
            {cur.description}
          </p>

          {/* Progress bar */}
          <div style={{
            height: 3, borderRadius: 99,
            background: "hsl(var(--muted) / 0.4)",
            overflow: "hidden", marginBottom: 16,
          }}>
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              style={{
                height: "100%", borderRadius: 99,
                background: `linear-gradient(90deg, ${cur.color}, ${cur.color}cc)`,
              }}
            />
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {/* Skip */}
            <button
              onClick={onSkip}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12.5, color: "hsl(var(--muted-foreground))",
                padding: "6px 0", fontWeight: 500,
                transition: "color 0.14s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))" }}
            >
              Skip tour
            </button>

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 7 }}>
              {step > 0 && (
                <button
                  onClick={onPrev}
                  aria-label="Previous step"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 34, height: 34, borderRadius: 9,
                    border: "1.5px solid hsl(var(--border) / 0.7)",
                    background: "hsl(var(--secondary) / 0.5)",
                    cursor: "pointer",
                    color: "hsl(var(--foreground))",
                    transition: "background 0.14s, border-color 0.14s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))"
                    ;(e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))"
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.5)"
                    ;(e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.7)"
                  }}
                >
                  <ArrowLeft style={{ width: 14, height: 14 }} />
                </button>
              )}

              <button
                onClick={onNext}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "0 18px", height: 34, borderRadius: 9,
                  border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, color: "#fff",
                  background: `linear-gradient(135deg, ${cur.color}, ${cur.color}dd)`,
                  boxShadow: `0 4px 16px -3px ${cur.color}66`,
                  transition: "opacity 0.14s, transform 0.14s, box-shadow 0.14s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.88"
                  ;(e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 8px 22px -3px ${cur.color}88`
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = "1"
                  ;(e.currentTarget as HTMLElement).style.transform = ""
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px -3px ${cur.color}66`
                }}
              >
                {isLast ? (
                  <><CheckCheck style={{ width: 14, height: 14 }} /> Finish</>
                ) : (
                  <>Next <ArrowRight style={{ width: 14, height: 14 }} /></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard hint */}
        <div style={{
          padding: "8px 22px 12px",
          borderTop: "1px solid hsl(var(--border) / 0.3)",
          display: "flex", gap: 12,
          justifyContent: "center",
        }}>
          {[
            ["←", "Previous"],
            ["→", "Next"],
            ["Esc", "Exit"],
          ].map(([key, label]) => (
            <span key={key} style={{
              fontSize: 10.5, color: "hsl(var(--muted-foreground) / 0.5)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <kbd style={{
                background: "hsl(var(--secondary))",
                padding: "1px 5px", borderRadius: 4,
                fontFamily: "monospace", fontSize: 10,
                color: "hsl(var(--muted-foreground))",
              }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Finished Screen ───────────────────────────────────────────────────────────

function FinishedScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9990,
        background: "rgba(2, 6, 12, 0.8)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        style={{
          borderRadius: 24, overflow: "hidden",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border) / 0.5)",
          boxShadow: "0 32px 80px -8px rgba(0,0,0,0.65), 0 8px 32px -4px rgba(0,0,0,0.4)",
          padding: "44px 48px",
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.15, 1.1, 1.12, 1] }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}
        >
          🎉
        </motion.div>
        <h3 style={{
          fontSize: 22, fontWeight: 800,
          color: "hsl(var(--foreground))",
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
        }}>
          You're all set!
        </h3>
        <p style={{
          fontSize: 14.5, color: "hsl(var(--muted-foreground))",
          lineHeight: 1.6, margin: 0,
        }}>
          Your CRM is ready. Start adding leads and watch your pipeline grow.
        </p>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface CRMTourProps {
  onExpand?: () => void
}

export function CRMTour({ onExpand }: CRMTourProps) {
  const { user } = useAuth()
  const { data: profile } = useCurrentUser(user?.id)
  const prefersReducedMotion = useReducedMotion()

  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null
  const onExpandRef = useRef(onExpand)
  onExpandRef.current = onExpand

  const [phase, setPhase] = useState<Phase>("idle")
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [cardPos, setCardPos] = useState<CardPos>({ x: 0, y: 0, side: "center" })
  const isFirstMeasureRef = useRef(true)

  // ── Auto-start after onboarding ──────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.onboarded || !storageKey) return
    try { if (localStorage.getItem(storageKey)) return } catch {}
    const t = setTimeout(() => {
      setPhase("welcome")
      onExpandRef.current?.()
    }, 900)
    return () => clearTimeout(t)
  }, [profile?.onboarded, storageKey])

  // ── Manual restart via window event ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setStep(0)
      setDirection(1)
      isFirstMeasureRef.current = true
      setRect(null)
      setPhase("welcome")
      onExpandRef.current?.()
    }
    window.addEventListener("crm-tour-start", handler)
    return () => window.removeEventListener("crm-tour-start", handler)
  }, [])

  // ── Keyboard navigation ───────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    setDirection(1)
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      setPhase("finished")
      setTimeout(() => {
        setPhase("idle")
        if (storageKey) try { localStorage.setItem(storageKey, "1") } catch {}
      }, 2400)
    }
  }, [step, storageKey])

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }, [step])

  const completeTour = useCallback(() => {
    setPhase("idle")
    if (storageKey) try { localStorage.setItem(storageKey, "1") } catch {}
  }, [storageKey])

  useEffect(() => {
    if (phase !== "touring") return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); handleNext() }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   { e.preventDefault(); handlePrev() }
      if (e.key === "Escape") completeTour()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [phase, handleNext, handlePrev, completeTour])

  // ── Element measurement ───────────────────────────────────────────────────────
  const measure = useCallback((s: number, skipMissing = false) => {
    const target = STEPS[s]?.target
    const el = document.querySelector(`[data-tour="${target}"]`)
    if (!el) {
      if (skipMissing) {
        if (s < STEPS.length - 1) setStep(s + 1)
        else completeTour()
      }
      return false
    }
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" })
    const r = el.getBoundingClientRect()
    setRect(r)
    setCardPos(calcCardPos(r))
    isFirstMeasureRef.current = false
    return true
  }, [completeTour, prefersReducedMotion])

  // Re-measure when step changes
  useEffect(() => {
    if (phase !== "touring") return
    const found = measure(step, true)
    if (!found) return
    // Remeasure after sidebar/layout animations settle
    const t1 = setTimeout(() => measure(step), 280)
    const t2 = setTimeout(() => measure(step), 520)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase, step, measure])

  // Remeasure on window resize
  useEffect(() => {
    if (phase !== "touring") return
    const h = () => measure(step)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [phase, step, measure])

  // ── Render ────────────────────────────────────────────────────────────────────
  if (phase === "idle") return null

  const cur = STEPS[step]
  const isLast = step === STEPS.length - 1

  return createPortal(
    <>
      <AnimatePresence>
        {phase === "welcome" && (
          <WelcomeScreen
            onStart={() => { setPhase("touring") }}
            onSkip={completeTour}
          />
        )}
      </AnimatePresence>

      {phase === "touring" && rect && (
        <SpotlightOverlay
          rect={rect}
          color={cur.color}
          isFirst={isFirstMeasureRef.current}
        />
      )}

      <AnimatePresence mode="wait" custom={direction}>
        {phase === "touring" && rect && (
          <TourCard
            key={step}
            step={step}
            total={STEPS.length}
            cur={cur}
            cardPos={cardPos}
            direction={direction}
            isLast={isLast}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={completeTour}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "finished" && <FinishedScreen />}
      </AnimatePresence>
    </>,
    document.body
  )
}
