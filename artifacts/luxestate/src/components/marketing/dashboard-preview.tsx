import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check } from "lucide-react"
import { Link } from "wouter"

const previewFeatures = [
  "Real-time lead pipeline visualization",
  "WhatsApp chat integration",
  "Interactive analytics charts",
  "Property showcase carousel",
  "Dark & light mode themes",
  "Mobile-responsive design",
]

export function DashboardPreview() {
  return (
    <section id="preview" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Dashboard Preview
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
              A Dashboard That
              <span className="text-primary"> Feels </span>
              Built for Your Properties
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Experience a beautifully crafted interface with glassmorphism design, smooth
              animations, and intuitive workflows that make managing your real estate business
              a pleasure.
            </p>

            <ul className="mt-8 space-y-3">
              {previewFeatures.map((feature, index) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="mt-8"
            >
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="font-semibold shadow-lg shadow-primary/25 group"
                >
                  Explore Dashboard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-black/20">
              <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 bg-muted/50 rounded-md flex items-center px-3 text-xs text-muted-foreground">
                    realcrm.app/dashboard
                  </div>
                </div>
              </div>

              <div className="bg-background p-4 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total Leads", value: "2,847", color: "from-blue-500 to-cyan-500" },
                    { label: "Active Deals", value: "156", color: "from-primary to-amber-500" },
                    { label: "Revenue", value: "$4.2M", color: "from-green-500 to-emerald-500" },
                    { label: "Conversion", value: "24.8%", color: "from-purple-500 to-pink-500" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
                    >
                      <div
                        className={`text-xs font-medium bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
                      >
                        {stat.label}
                      </div>
                      <div className="text-lg font-bold mt-1">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium">Revenue Analytics</div>
                    <div className="flex gap-1">
                      {["D", "W", "M"].map((t) => (
                        <div
                          key={t}
                          className={`px-2 py-1 text-xs rounded ${
                            t === "M"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-32 flex items-end gap-1.5">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-primary to-primary/40 rounded-sm"
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                  <div className="text-sm font-medium mb-3">Recent Leads</div>
                  <div className="space-y-2">
                    {[
                      { name: "Sarah Johnson", status: "Hot", property: "Penthouse Suite" },
                      { name: "Michael Chen", status: "Warm", property: "Waterfront Villa" },
                      { name: "Emma Williams", status: "Hot", property: "Modern Mansion" },
                    ].map((lead, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-medium">{lead.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {lead.property}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            lead.status === "Hot"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {lead.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="absolute -bottom-6 -left-6 p-4 rounded-xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">Deal Closed!</div>
                  <div className="text-xs text-muted-foreground">$2.4M - Penthouse</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.8 }}
              className="absolute -top-4 -right-4 p-3 rounded-xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <span className="text-xs font-medium">12 leads online</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
