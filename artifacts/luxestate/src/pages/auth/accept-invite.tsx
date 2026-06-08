import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { validateInvitation } from "@/lib/org-members-api"
import { useLocation } from "wouter"
import { cn } from "@/lib/utils"

type Step = "validate" | "signup" | "done"

export default function AcceptInvitePage() {
  const [, navigate] = useLocation()
  const [step, setStep] = useState<Step>("validate")

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [inviteData, setInviteData] = useState<{
    name: string; orgRole: string; orgName: string
  } | null>(null)

  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !code.trim()) {
      setError("Please enter your email and invitation code.")
      return
    }
    setLoading(true)
    try {
      const data = await validateInvitation(email.trim(), code.trim())
      setInviteData({ name: data.name, orgRole: data.orgRole, orgName: data.orgName })
      setStep("signup")
    } catch (err: any) {
      setError(err.message ?? "Invalid or expired invitation code.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: inviteData?.name ?? "" },
        },
      })
      if (signUpErr) {
        if (signUpErr.message.toLowerCase().includes("already registered")) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
          if (signInErr) throw new Error("This email is already registered. Try signing in instead.")
        } else {
          throw signUpErr
        }
      }
      setStep("done")
      setTimeout(() => navigate("/dashboard"), 2500)
    } catch (err: any) {
      setError(err.message ?? "Failed to create account.")
    } finally {
      setLoading(false)
    }
  }

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    agent: "Agent",
    custom: "Custom",
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card overflow-hidden p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
              <ShieldCheck className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Accept Invitation</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {step === "validate"
                  ? "Enter your email and invitation code to get started."
                  : step === "signup"
                  ? `You're joining ${inviteData?.orgName} as ${roleLabel[inviteData?.orgRole ?? "agent"] ?? inviteData?.orgRole}.`
                  : "Welcome aboard!"}
              </p>
            </div>
          </div>

          {step === "validate" && (
            <form onSubmit={handleValidate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Invitation Code</label>
                <Input
                  placeholder="e.g. AB12CD34"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  disabled={loading}
                  className="bg-background/50 font-mono tracking-widest uppercase"
                  maxLength={20}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate Invitation"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <a href="/sign-in" className="text-primary hover:underline">
                  Sign in
                </a>
              </p>
            </form>
          )}

          {step === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-foreground">{inviteData?.name}</p>
                <p className="text-muted-foreground">{email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Role:{" "}
                  <span className="font-medium text-foreground capitalize">
                    {roleLabel[inviteData?.orgRole ?? "agent"] ?? inviteData?.orgRole}
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Create Password</label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading}
                    className="bg-background/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex gap-1 pt-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        password.length === 0 ? "bg-border/30" :
                        password.length < 8 && i < 1 ? "bg-destructive" :
                        password.length >= 8 && i < 2 ? "bg-amber-500" :
                        password.length >= 12 && i < 3 ? "bg-emerald-500" :
                        password.length >= 16 ? "bg-emerald-500" : "bg-border/30"
                      )}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("validate")} disabled={loading} className="flex-1 border-border/50">
                  Back
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </div>
            </form>
          )}

          {step === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Account Created!</p>
                <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
