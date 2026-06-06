import { CreditCard } from "lucide-react"
import { ComingSoon } from "@/components/coming-soon"

export default function AIUsagePage() {
  return (
    <ComingSoon
      title="AI Usage & Billing"
      description="Track every AI API call, monitor token consumption, and view estimated costs — all in one place. Launching soon."
      icon={CreditCard}
      features={[
        "Real-time token usage tracking per feature",
        "Estimated cost breakdown (input & output tokens)",
        "Daily and monthly usage charts",
        "Usage breakdown by operation (Lead Analysis, Chat, Insights)",
        "GPT-4o Mini pricing reference and cost alerts",
      ]}
    />
  )
}
