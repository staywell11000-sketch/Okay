import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Users, DollarSign, Home, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const stats = [
  {
    name: "Total Leads",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "Revenue",
    value: "₨ 11.8 Cr",
    change: "+23.1%",
    trend: "up",
    icon: DollarSign,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    name: "Properties Listed",
    value: "156",
    change: "+8.2%",
    trend: "up",
    icon: Home,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    name: "Appointments",
    value: "48",
    change: "-3.2%",
    trend: "down",
    icon: Calendar,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="glass-card p-5 group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                stat.bgColor
              )}
            >
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {stat.trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                stat.trend === "up" ? "text-emerald-500" : "text-red-500"
              )}
            >
              {stat.change}
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
