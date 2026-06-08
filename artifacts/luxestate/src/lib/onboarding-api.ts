import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"

export type OrgProfile = {
  id: number
  name: string
  plan: string
  subscriptionStatus: string
  logoUrl: string | null
  businessPhone: string | null
  businessEmail: string | null
  businessAddress: string | null
  businessWebsite: string | null
  businessType: string | null
  agentCount: string | null
  primaryLeadSource: string | null
  crmUse: string | null
  ownerId: string
}

export type OnboardingPayload = {
  orgName?: string
  businessType?: string
  agentCount?: string
  primaryLeadSource?: string
  crmUse?: string
  logoUrl?: string
  businessPhone?: string
  businessEmail?: string
  businessAddress?: string
  businessWebsite?: string
  firstName?: string
  lastName?: string
  position?: string
  phone?: string
  avatarUrl?: string
  theme?: string
  notifDashboard?: boolean
  notifEmail?: boolean
  notifWhatsapp?: boolean
  notifFrequency?: string
  notifCategories?: string[]
}

export function useOrgProfile() {
  return useQuery<OrgProfile>({
    queryKey: ["org-profile"],
    queryFn: () => apiFetch("/api/org/me").then(async (r) => {
      if (!r.ok) throw new Error("No org")
      const data = await r.json()
      // /org/me from organizations.ts returns { organization: {...} }
      return (data.organization ?? data) as OrgProfile
    }),
    retry: 2,
    staleTime: 60_000,
  })
}

export function useCompleteOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: OnboardingPayload) =>
      apiFetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Failed" }))
          throw new Error(err.error ?? "Failed to complete onboarding")
        }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUser"] })
      qc.invalidateQueries({ queryKey: ["org-profile"] })
      qc.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}
