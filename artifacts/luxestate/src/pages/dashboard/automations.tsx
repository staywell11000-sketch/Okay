import { Zap } from "lucide-react"
import { ComingSoon } from "@/components/coming-soon"

export default function AutomationsPage() {
  return (
    <ComingSoon
      title="Automations"
      description="Build powerful no-code workflows that trigger actions automatically — from lead status changes to WhatsApp follow-ups. Launching soon."
      icon={Zap}
      features={[
        "Trigger automations on lead score change, status update, or inactivity",
        "Auto-send WhatsApp or email follow-ups",
        "Assign leads to team members automatically by rules",
        "Set reminders and tasks when a deal moves stages",
        "Full execution log with success/failure history",
        "Visual automation builder — no code required",
      ]}
    />
  )
}
