import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"

interface AccessDeniedProps {
  resource?: string
  message?: string
}

export function AccessDenied({ resource, message }: AccessDeniedProps) {
  const [, navigate] = useLocation()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldX className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="max-w-sm text-muted-foreground">
          {message ??
            `You don't have permission to access${resource ? ` ${resource}` : " this page"}. Contact your admin to request access.`}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => navigate("/dashboard")}
        className="border-border/50"
      >
        Go to Dashboard
      </Button>
    </div>
  )
}
