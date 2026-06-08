import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/lib/auth-context";

export type PermissionEntry = { resource: string; action: string };

interface PermissionsContextValue {
  permissions: PermissionEntry[];
  isAdmin: boolean;
  isOwner: boolean;
  orgRole: string;
  isLoading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  canView: (resource: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: [],
  isAdmin: false,
  isOwner: false,
  orgRole: "agent",
  isLoading: true,
  hasPermission: () => false,
  canView: () => false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-permissions"],
    queryFn: () =>
      apiFetch("/api/permissions/my-permissions")
        .then((r) => {
          if (!r.ok) throw new Error(`Permissions fetch failed: ${r.status}`);
          return r.json();
        }),
    enabled: !!session,
    staleTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  // During load or transient errors, keep previous data if any.
  // Never return isAdmin:false due to a temporary network failure.
  const permissions: PermissionEntry[] = data?.permissions ?? [];
  const isAdmin: boolean = data?.isAdmin ?? false;
  const isOwner: boolean = data?.isOwner ?? false;
  const orgRole: string = data?.orgRole ?? "agent";

  // While still loading (no data yet), block rendering via isLoading.
  // If there's an error but we have no data, stay in "loading" state
  // to avoid flashing Access Denied to legitimate owners.
  const loading = isLoading || (isError && !data);

  const hasPermission = (resource: string, action: string): boolean => {
    if (isAdmin || isOwner) return true;
    return permissions.some((p) => p.resource === resource && p.action === action);
  };

  const canView = (resource: string): boolean => hasPermission(resource, "view");

  return (
    <PermissionsContext.Provider value={{
      permissions, isAdmin, isOwner, orgRole,
      isLoading: loading,
      hasPermission, canView,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
