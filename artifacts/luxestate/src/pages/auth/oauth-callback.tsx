import { useEffect } from "react"
import { useLocation } from "wouter"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"

export default function OAuthCallbackPage() {
  const [, navigate] = useLocation()
  const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""

  useEffect(() => {
    let mounted = true

    async function handleCallback() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("OAuth callback error:", error)
        if (mounted) navigate(`${basePath}/sign-in?error=oauth_failed`)
        return
      }

      if (data.session) {
        if (mounted) navigate(`${basePath}/dashboard`)
      } else {
        if (mounted) navigate(`${basePath}/sign-in?error=no_session`)
      }
    }

    handleCallback()

    return () => {
      mounted = false
    }
  }, [navigate, basePath])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-amber-50 via-background to-orange-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
          <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </motion.div>
    </div>
  )
}