import { useState, useEffect } from "react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt(): Promise<void>
}

export interface PWAInstallState {
  canInstall: boolean
  isInstalled: boolean
  isIOS: boolean
  isAndroid: boolean
  install: () => Promise<"accepted" | "dismissed" | null>
}

export function usePWA(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as any).MSStream

  const isAndroid =
    typeof navigator !== "undefined" &&
    /android/i.test(navigator.userAgent)

  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    setIsInstalled(installed)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const installedHandler = () => setIsInstalled(true)

    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", installedHandler)
    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", installedHandler)
    }
  }, [])

  const install = async (): Promise<"accepted" | "dismissed" | null> => {
    if (!deferredPrompt) return null
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === "accepted") setIsInstalled(true)
    return outcome
  }

  return { canInstall: !!deferredPrompt, isInstalled, isIOS, isAndroid, install }
}
