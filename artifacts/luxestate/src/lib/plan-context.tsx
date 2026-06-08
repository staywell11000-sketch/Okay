import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/lib/auth-context";

export type PlanSlug = "free" | "trial" | "starter" | "professional" | "agency";

export interface OrgPlan {
  orgId: number;
  plan: PlanSlug;
  planName: string;
  subscriptionStatus: "trial" | "active" | "expired" | "suspended";
  subscriptionEndDate: string | null;
  maxUsers: number | null;
  maxLeadsPerMonth: number | null;
  maxWhatsappNumbers: number | null;
  maxFacebookPages: number | null;
  maxStorageGb: number | null;
  features: string[];
  isSuperAdmin: boolean;
  isSuspended: boolean;
}

export interface AiCredits {
  planIncluded: number;
  used: number;
  remainingPlan: number;
  bonusActions: number;
  addonRemaining: number;
  available: number | null;
  isSuperAdmin: boolean;
  resetAt: string | null;
  month?: number;
  year?: number;
}

interface PlanContextValue {
  org: OrgPlan | null;
  credits: AiCredits | null;
  isLoading: boolean;
  hasFeature: (feature: string) => boolean;
  canUseAi: () => boolean;
  isAtAiLimit: () => boolean;
  isSuperAdmin: boolean;
}

const PlanContext = createContext<PlanContextValue>({
  org: null,
  credits: null,
  isLoading: true,
  hasFeature: () => false,
  canUseAi: () => false,
  isAtAiLimit: () => false,
  isSuperAdmin: false,
});

const SUPER_ADMIN_EMAIL = "murtazaarshad499@gmail.com";

export function PlanProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userEmail = session?.user?.email;
  const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ["org-me"],
    queryFn: () => apiFetch("/api/org/me").then(r => r.json()).catch(() => null),
    enabled: !!session,
    staleTime: 60_000,
    retry: false,
  });

  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ["ai-credits"],
    queryFn: () => apiFetch("/api/ai/credits").then(r => r.json()).catch(() => null),
    enabled: !!session,
    staleTime: 30_000,
    retry: false,
  });

  const org: OrgPlan | null = orgData?.organization
    ? {
        orgId: orgData.organization.id,
        plan: orgData.organization.plan as PlanSlug,
        planName: orgData.organization.plan_name ?? orgData.organization.plan,
        subscriptionStatus: orgData.organization.subscription_status,
        subscriptionEndDate: orgData.organization.subscription_end_date,
        maxUsers: orgData.organization.max_users,
        maxLeadsPerMonth: orgData.organization.max_leads_per_month,
        maxWhatsappNumbers: orgData.organization.max_whatsapp_numbers,
        maxFacebookPages: orgData.organization.max_facebook_pages,
        maxStorageGb: orgData.organization.max_storage_gb,
        features: Array.isArray(orgData.organization.features) ? orgData.organization.features : [],
        isSuperAdmin,
        isSuspended: orgData.organization.is_suspended ?? false,
      }
    : null;

  const credits: AiCredits | null = creditsData
    ? {
        planIncluded: creditsData.planIncluded ?? 0,
        used: creditsData.used ?? 0,
        remainingPlan: creditsData.remainingPlan ?? 0,
        bonusActions: creditsData.bonusActions ?? 0,
        addonRemaining: creditsData.addonRemaining ?? creditsData.bonusActions ?? 0,
        available: creditsData.available ?? null,
        isSuperAdmin: creditsData.isSuperAdmin ?? false,
        resetAt: creditsData.resetAt ?? null,
        month: creditsData.month,
        year: creditsData.year,
      }
    : null;

  const hasFeature = (feature: string): boolean => {
    if (isSuperAdmin) return true;
    if (!org) return false;
    if (org.isSuspended) return false;
    return org.features.includes(feature);
  };

  const canUseAi = (): boolean => {
    if (isSuperAdmin) return true;
    if (!credits) return false;
    return (credits.available ?? 0) > 0;
  };

  const isAtAiLimit = (): boolean => {
    if (isSuperAdmin) return false;
    if (!credits) return false;
    return (credits.available ?? 0) <= 0;
  };

  return (
    <PlanContext.Provider value={{
      org,
      credits,
      isLoading: orgLoading || creditsLoading,
      hasFeature,
      canUseAi,
      isAtAiLimit,
      isSuperAdmin,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}

export function useSuperAdmin() {
  const { isSuperAdmin } = useContext(PlanContext);
  return isSuperAdmin;
}
