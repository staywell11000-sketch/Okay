import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
})

export function getOAuthRedirectUrl(path: string = "/auth/callback"): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}${base}${path}`
}
