import { motion } from "framer-motion"
import {
  Phone,
  Mail,
  DollarSign,
  Eye,
  MessageCircle,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

const activities = [
  {
    id: 1,
    type: "call",
    icon: Phone,
    title: "Call with Sarah Mitchell",
    description: "Discussed Manhattan penthouse viewing",
    time: "10 min ago",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: 2,
    type: "deal",
    icon: DollarSign,
    title: "Deal Closed",
    description: "Malibu Beach House - ₨ 11.8 Cr",
    time: "2 hours ago",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: 3,
    type: "viewing",
    icon: Eye,
    title: "Property Viewing",
    description: "Beverly Hills Estate - Michael Chen",
    time: "4 hours ago",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: 4,
    type: "lead",
    icon: UserPlus,
    title: "New Lead Assigned",
    description: "Jennifer Park - San Francisco Loft",
    time: "6 hours ago",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: 5,
    type: "email",
    icon: Mail,
    title: "Email Sent",
    description: "Property brochure to David Thompson",
    time: "1 day ago",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: 6,
    type: "message",
    icon: MessageCircle,
    title: "WhatsApp Message",
    description: "Follow-up with Emily Rodriguez",
    time: "1 day ago",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
]

export function RecentActivity() {
  return (
    <div className="glass-card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Your latest interactions</p>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer"
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 transition-transform group-hover:scale-110",
                activity.bgColor
              )}
            >
              <activity.icon className={cn("h-4 w-4", activity.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {activity.description}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {activity.time}
            </span>
          </motion.div>
        ))}
      </div>

      <button className="w-full mt-4 text-sm text-primary font-medium hover:underline">
        View all activity
      </button>
    </div>
  )
}
