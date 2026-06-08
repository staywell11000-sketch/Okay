import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react"
import { Session, User } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { queryClient } from "./query-client"

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    // onAuthStateChange always fires INITIAL_SESSION first — use that as the
    // single source of truth for loading=false so we never get a stale
    // session=null flash before the real session is known.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        // Unblock the app on the very first event, regardless of type
        if (!initializedRef.current) {
          initializedRef.current = true
          setLoading(false)
        }

        if (event === "SIGNED_OUT") {
          // Wipe all cached queries so a new user sees a clean slate
          queryClient.clear()
        } else if (event === "TOKEN_REFRESHED") {
          // Re-fetch in-flight queries with the new access token without
          // wiping the cache (avoids full page skeleton re-render)
          queryClient.invalidateQueries()
        }
      }
    )

    // Safety net: if Supabase never fires (network issue, cold start)
    // unblock loading after 4 s so the user isn't stuck on a blank screen.
    const fallback = setTimeout(() => {
      if (mounted && !initializedRef.current) {
        initializedRef.current = true
        setLoading(false)
      }
    }, 4000)

    return () => {
      mounted = false
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    queryClient.clear()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
