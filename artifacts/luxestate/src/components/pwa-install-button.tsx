import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, X, Share, ArrowDownToLine, Smartphone, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePWA } from "@/lib/use-pwa"
import { cn } from "@/lib/utils"

type Variant = "hero" | "banner" | "header" | "inline"

interface PWAInstallButtonProps {
  variant?: Variant
  className?: string
}

export function PWAInstallButton({ variant = "inline", className }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, install } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  if (isInstalled || dismissed) return null

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSHint(true)
      return
    }
    await install()
  }

  if (variant === "hero") {
    return (
      <>
        <AnimatePresence>
          {showIOSHint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-border/50 bg-card/95 p-4 shadow-2xl backdrop-blur-xl"
            >
              <button
                onClick={() => setShowIOSHint(false)}
                className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-secondary/50"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Install on iOS</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tap the <strong>Share</strong> button in Safari, then select{" "}
                    <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className={cn("flex items-center justify-center gap-2", className)}
        >
          <Button
            size="lg"
            variant="outline"
            onClick={handleInstall}
            className="h-14 gap-2.5 border-primary/30 bg-background/50 px-8 text-base font-semibold backdrop-blur-sm transition-all hover:border-primary/60 hover:bg-primary/5 group"
          >
            <Download className="h-5 w-5 text-primary transition-transform group-hover:-translate-y-0.5" />
            {isIOS ? "Add to Home Screen" : "Download App"}
            <span className="ml-0.5 hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:block">
              Free
            </span>
          </Button>
        </motion.div>
      </>
    )
  }

  if (variant === "banner") {
    if (!canInstall && !isIOS) return null
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "fixed left-0 right-0 top-0 z-[100] flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2.5 backdrop-blur-xl",
            className
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <span className="text-sm font-bold text-primary-foreground">L</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">LuxeState CRM</p>
              <p className="text-[10px] text-muted-foreground">Install for the best experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleInstall}
              className="h-7 gap-1.5 bg-primary px-3 text-xs hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (variant === "header") {
    if (!canInstall && !isIOS) return null
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleInstall}
        className={cn(
          "h-8 gap-1.5 border-primary/30 text-xs font-medium text-primary hover:bg-primary/5",
          className
        )}
      >
        <Download className="h-3.5 w-3.5" />
        {isIOS ? "Add to Home Screen" : "Install App"}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={handleInstall}
      className={cn("gap-2", className)}
    >
      <Download className="h-4 w-4" />
      {isIOS ? "Add to Home Screen" : "Install App"}
    </Button>
  )
}

export function PWAInstallSection() {
  const { canInstall, isInstalled, isIOS, isAndroid, install } = usePWA()
  const [showIOSHint, setShowIOSHint] = useState(false)

  if (isInstalled) return null
  if (!canInstall && !isIOS) return null

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
          <span className="text-2xl font-bold text-primary-foreground">L</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Install LuxeState on this device</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isIOS
              ? "Add to your home screen for quick access — works offline too."
              : isAndroid
              ? "Install for Android — works offline and launches like a native app."
              : "Install as a desktop app — no browser needed, works offline."}
          </p>
        </div>
        <Button
          onClick={async () => {
            if (isIOS) { setShowIOSHint(true); return }
            await install()
          }}
          className="shrink-0 gap-2 bg-primary hover:bg-primary/90"
        >
          {isIOS ? <Share className="h-4 w-4" /> : isAndroid ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          {isIOS ? "How to Install" : "Install Now"}
        </Button>
      </div>
      <AnimatePresence>
        {showIOSHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm">
              <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">
                In Safari, tap the <strong className="text-foreground">Share</strong> icon at the bottom of the screen, then select{" "}
                <strong className="text-foreground">Add to Home Screen</strong>.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
