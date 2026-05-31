import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "./auth-context"
import { useCallback } from "react"

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api"

export type UserProfile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  title: string | null
  phone: string | null
  avatar_url: string | null
}

export type UserSettingsData = {
  id: number
  business_name: string | null
  business_logo_url: string | null
  whatsapp_number: string | null
  position: string | null
  theme: string | null
  time_format: string | null
  notifications_enabled: boolean
  new_lead_notif: boolean
  deal_status_notif: boolean
  whatsapp_notif: boolean
  weekly_reports_enabled: boolean
  marketing_emails_enabled: boolean
  security_two_factor_enabled: boolean
}

export type SettingsResponse = {
  user: UserProfile | null
  settings: UserSettingsData | null
}

export type SettingsUpdate = {
  firstName?: string
  lastName?: string
  phone?: string
  title?: string
  avatarUrl?: string
  businessName?: string
  businessLogoUrl?: string
  whatsappNumber?: string
  position?: string
  theme?: string
  timeFormat?: string
  notificationsEnabled?: boolean
  newLeadNotif?: boolean
  dealStatusNotif?: boolean
  whatsappNotif?: boolean
  weeklyReportsEnabled?: boolean
  marketingEmailsEnabled?: boolean
  securityTwoFactorEnabled?: boolean
}

function useAuthHeaders() {
  const { session } = useAuth()
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

export function useSettings() {
  const headers = useAuthHeaders()
  const { session } = useAuth()

  return useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(`${API}/settings`, { headers })
      if (!res.ok) throw new Error("Failed to fetch settings")
      return res.json()
    },
    staleTime: 1000 * 60,
    enabled: !!session,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const headers = {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }

  return useMutation({
    mutationFn: async (update: SettingsUpdate) => {
      const res = await fetch(`${API}/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(update),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any
        throw new Error(err.error || "Failed to update settings")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}

export function useUploadImage() {
  const { session } = useAuth()
  const headers = {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }

  return useMutation({
    mutationFn: async ({ field, file }: { field: "avatar" | "logo"; file: File }) => {
      const base64 = await fileToBase64(file)
      const res = await fetch(`${API}/settings/upload`, {
        method: "POST",
        headers,
        body: JSON.stringify({ field, base64, filename: file.name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any
        throw new Error(err.error || "Upload failed")
      }
      const data = await res.json() as { url: string }
      return data.url
    },
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
