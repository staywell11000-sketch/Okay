import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.message?.includes("401") || error?.status === 401) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})
