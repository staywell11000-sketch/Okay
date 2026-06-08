import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/lib/auth-context";

export type PermissionEntry = { resource: string; action: string };

interface PermissionsContextValue {
  permissions: PermissionEntry[];
  isAdmin: boolean;
  orgRole: string;
  isLoading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
  canView: (resource: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: [],
  isAdmin: false,
  orgRole: "agent",
  isLoading: true,
  hasPermission: () => false,
  canView: () => false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-permissions"],
    queryFn: () =>
      apiFetch("/api/permissions/my-permissions")
        .then((r) => r.json())
        .catch(() => ({ permissions: [], isAdmin: false, orgRole: "agent" })),
    enabled: !!session,
    staleTime: 60_000,
    retry: false,
  });

  const permissions: PermissionEntry[] = data?.permissions ?? [];
  const isAdmin: boolean = data?.isAdmin ?? false;
  const orgRole: string = data?.orgRole ?? "agent";

  const hasPermission = (resource: string, action: string): boolean => {
    if (isAdmin) return true;
    return permissions.some((p) => p.resource === resource && p.action === action);
  };

  const canView = (resource: string): boolean => hasPermission(resource, "view");

  return (
    <PermissionsContext.Provider value={{ permissions, isAdmin, orgRole, isLoading, hasPermission, canView }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
