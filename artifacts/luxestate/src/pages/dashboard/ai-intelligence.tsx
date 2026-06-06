import { Brain } from "lucide-react"
import { ComingSoon } from "@/components/coming-soon"

export default function AIIntelligencePage() {
  return (
    <ComingSoon
      title="AI Intelligence"
      description="GPT-4o powered lead scoring, urgency detection, pipeline insights, and a live AI assistant that knows your entire CRM — coming very soon."
      icon={Brain}
      features={[
        "Automated lead scoring (0–100) with urgency signals",
        "One-click bulk AI analysis across all leads",
        "Live AI chat assistant with full CRM context",
        "Sales pipeline health insights and revenue forecast",
        "Smart follow-up reminders and next-best-action suggestions",
        "Conversation sentiment analysis and relationship scoring",
      ]}
    />
  )
}
