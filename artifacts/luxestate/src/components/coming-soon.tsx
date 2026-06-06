import { motion } from "framer-motion"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Sparkles } from "lucide-react"
import type { ElementType } from "react"

type Props = {
  title: string
  description: string
  icon: ElementType
  features?: string[]
  backHref?: string
}

export function ComingSoon({ title, description, icon: Icon, features = [], backHref = "/dashboard" }: Props) {
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full max-w-lg flex-col items-center text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Badge className="mb-6 gap-1.5 rounded-full border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Coming Soon
          </Badge>
        </motion.div>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="mb-7 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10"
        >
          <Icon className="h-11 w-11 text-primary" strokeWidth={1.5} />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-3 text-3xl font-bold tracking-tight text-foreground"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8 text-sm leading-relaxed text-muted-foreground max-w-sm"
        >
          {description}
        </motion.p>

        {/* Feature list */}
        {features.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 w-full rounded-2xl border border-border/50 bg-secondary/20 p-5 text-left"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              What's being built
            </p>
            <ul className="space-y-2.5">
              {features.map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-start gap-2.5 text-sm text-foreground"
                >
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    ✓
                  </span>
                  {f}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Link href={backHref}>
            <Button variant="outline" className="gap-2 border-border/60">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>

        {/* Decorative glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </motion.div>
    </div>
  )
}
