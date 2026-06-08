import { useState, useEffect, useCallback } from "react"
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useWhatsAppSdkConfig,
  useWhatsAppEmbeddedSignup,
  type EbsResult,
} from "@/lib/whatsapp-api"
import { toast } from "sonner"

// ─── FB SDK type stubs ────────────────────────────────────

declare global {
  interface Window {
    FB: {
      init(opts: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void
      login(
        callback: (resp: {
          status: string
          authResponse?: {
            code?: string
            accessToken?: string
            userID?: string
            expiresIn?: number
          }
        }) => void,
        opts?: {
          config_id?: string
          response_type?: string
          override_default_response_type?: boolean
          scope?: string
          extras?: Record<string, unknown>
        }
      ): void
    }
    fbAsyncInit?: () => void
  }
}

// ─── SDK loader ───────────────────────────────────────────

let sdkLoadPromise: Promise<void> | null = null

function loadFbSdk(appId: string): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise
  if (typeof window.FB !== "undefined") return Promise.resolve()

  sdkLoadPromise = new Promise<void>((resolve) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie:  true,
        xfbml:   true,
        version: "v18.0",
      })
      resolve()
    }
    if (!document.getElementById("fb-sdk")) {
      const script  = document.createElement("script")
      script.id     = "fb-sdk"
      script.src    = "https://connect.facebook.net/en_US/sdk.js"
      script.async  = true
      script.defer  = true
      document.head.appendChild(script)
    }
  })
  return sdkLoadPromise
}

// ─── Component ────────────────────────────────────────────

interface Props {
  onSuccess?: (result: EbsResult) => void
  compact?:   boolean
}

type Step = "idle" | "loading-sdk" | "launching" | "exchanging" | "done" | "error"

export function WhatsAppEmbeddedSignup({ onSuccess, compact = false }: Props) {
  const { data: sdkConfig, isLoading: sdkLoading } = useWhatsAppSdkConfig()
  const signup  = useWhatsAppEmbeddedSignup()
  const [step,  setStep]  = useState<Step>("idle")
  const [error, setError] = useState<string | null>(null)

  const configured = sdkConfig?.configured ?? false

  const handleConnect = useCallback(async () => {
    if (!sdkConfig?.configured) return
    setError(null)
    setStep("loading-sdk")

    try {
      await loadFbSdk(sdkConfig.appId)
    } catch {
      setStep("error")
      setError("Failed to load Facebook SDK — check your network connection")
      return
    }

    setStep("launching")

    window.FB.login(
      async (response) => {
        if (!response.authResponse?.code) {
          if (response.status === "unknown" || !response.authResponse) {
            setStep("idle")
          } else {
            setStep("error")
            setError("WhatsApp signup was cancelled or failed. Please try again.")
          }
          return
        }

        setStep("exchanging")
        try {
          const result = await signup.mutateAsync(response.authResponse.code)
          setStep("done")
          toast.success("WhatsApp Business account connected!")
          onSuccess?.(result)
        } catch (err: any) {
          setStep("error")
          setError(err?.message ?? "Connection failed — please try again")
        }
      },
      {
        config_id: sdkConfig.configId ?? undefined,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup:              {},
          featuretype:        "",
          sessionInfoVersion: "3",
        },
      }
    )
  }, [sdkConfig, signup, onSuccess])

  if (compact) {
    return (
      <button
        onClick={handleConnect}
        disabled={!configured || step !== "idle"}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          "bg-[#25D366] text-white hover:bg-[#20bd5c] disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {step === "idle" || step === "error" ? (
          <FaWhatsapp className="h-4 w-4" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {step === "loading-sdk"  ? "Loading…"
          : step === "launching"  ? "Opening…"
          : step === "exchanging" ? "Connecting…"
          : "Connect WhatsApp"}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/10">
          <FaWhatsapp className="h-7 w-7 text-[#25D366]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Connect WhatsApp Business</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive and reply to WhatsApp messages directly in your CRM
          </p>
        </div>
      </div>

      {/* Benefits */}
      <ul className="space-y-2">
        {[
          "Send and receive WhatsApp messages from your leads",
          "Real-time message delivery and read receipts",
          "AI-powered reply suggestions",
          "Full conversation history synced to your CRM",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-[#25D366] shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      {/* Error */}
      {step === "error" && error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      {sdkLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking configuration…
        </div>
      ) : !configured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Meta App credentials not configured
          </p>
          <p className="text-xs text-muted-foreground">
            Set <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">FACEBOOK_APP_ID</code> and{" "}
            <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">FACEBOOK_APP_SECRET</code>{" "}
            in your environment secrets to enable this feature.
          </p>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open Meta App Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={step !== "idle" && step !== "error"}
          className="gap-2 bg-[#25D366] text-white hover:bg-[#20bd5c] border-0"
        >
          {step === "idle" || step === "error" ? (
            <FaWhatsapp className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {step === "loading-sdk"  ? "Loading Facebook SDK…"
            : step === "launching"  ? "Opening WhatsApp Signup…"
            : step === "exchanging" ? "Connecting account…"
            : step === "done"       ? "Connected!"
            : "Connect via Meta Embedded Signup"}
        </Button>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="flex items-center gap-2 text-sm text-[#25D366]">
          <CheckCircle2 className="h-4 w-4" />
          WhatsApp Business account connected successfully
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/70">
        By connecting, you agree to Meta's WhatsApp Business Policy. A popup will open from
        facebook.com — allow popups if prompted.
      </p>
    </div>
  )
}
