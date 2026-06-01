import { useMemo } from "react"
import { motion } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { LeadsTable } from "@/components/dashboard/leads-table"
import { Users, Flame, Trophy, Handshake, TrendingUp } from "lucide-react"
import { Lead } from "@/components/dashboard/leads-types"
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useBulkDeleteLeads,
  useBulkImportLeads,
  useSyncLeads,
  CreateLeadInput,
  UpdateLeadInput,
} from "@/lib/leads-api"
import { useAuth } from "@/lib/auth-context"
import { getOrCreateConversationForLead } from "@/lib/messaging-api"
import { toast } from "sonner"

export default function LeadsPage() {
  const { user } = useAuth()
  const { data: leads = [], isLoading } = useLeads()
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()
  const bulkDelete = useBulkDeleteLeads()
  const bulkImport = useBulkImportLeads()
  const syncLeads = useSyncLeads()

  const stats = useMemo(() => [
    {
      label: "Total Leads",
      value: leads.length,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Hot Leads",
      value: leads.filter((l) => l.priority === "hot").length,
      icon: Flame,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      label: "In Negotiation",
      value: leads.filter((l) => l.status === "negotiation").length,
      icon: Handshake,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Deals Won",
      value: leads.filter((l) => l.status === "won").length,
      icon: Trophy,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Avg Score",
      value: leads.length
        ? Math.round(leads.reduce((s, l) => s + (l.score ?? 0), 0) / leads.length)
        : 0,
      icon: TrendingUp,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
  ], [leads])

  const handleCreate = async (data: CreateLeadInput): Promise<Lead> => {
    try {
      const lead = await createLead.mutateAsync(data)
      toast.success(`Lead created — ${data.name}`)
      // Auto-create messaging conversation (fire-and-forget, errors silenced)
      if (user) {
        getOrCreateConversationForLead(user.id, {
          id: lead.id,
          name: lead.name,
          phone: lead.phone && lead.phone !== "—" ? lead.phone : undefined,
          email: lead.email,
          property: lead.property && lead.property !== "—" ? lead.property : undefined,
        }).catch(() => {})
      }
      return lead
    } catch {
      toast.error("Failed to create lead")
      throw new Error("Failed to create lead")
    }
  }

  const handleUpdate = async (id: number, updates: UpdateLeadInput): Promise<void> => {
    try {
      await updateLead.mutateAsync({ id, updates })
      if (updates.status) toast.success(`Status updated to ${updates.status}`)
      else if (updates.assignedTo) toast.success(`Reassigned to ${updates.assignedTo}`)
      else toast.success("Lead updated")
    } catch {
      toast.error("Failed to update lead")
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      await deleteLead.mutateAsync(id)
      toast.success("Lead archived")
    } catch {
      toast.error("Failed to archive lead")
    }
  }

  const handleBulkDelete = async (ids: number[]): Promise<void> => {
    try {
      await bulkDelete.mutateAsync(ids)
      toast.success(`${ids.length} lead${ids.length > 1 ? "s" : ""} archived`)
    } catch {
      toast.error("Failed to archive leads")
    }
  }

  const handleImport = async (imported: Lead[]): Promise<void> => {
    const inputs: CreateLeadInput[] = imported.map(({ id: _id, ...rest }) => rest as CreateLeadInput)
    try {
      await bulkImport.mutateAsync(inputs)
      toast.success(`Imported ${inputs.length} lead${inputs.length > 1 ? "s" : ""}`)
    } catch {
      toast.error("Import failed")
    }
  }

  const handleSync = async (): Promise<void> => {
    try {
      await syncLeads.mutateAsync()
      toast.success("Syncing leads from connected ad platforms — new leads will appear shortly.")
    } catch {
      toast.error("Sync failed. Make sure your Facebook or Instagram account is connected.")
    }
  }

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="Lead Management"
        description="Track, manage, and convert your real estate prospects."
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card flex items-center gap-3 p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <LeadsTable
          leads={leads}
          isLoading={isLoading}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onImport={handleImport}
          onSync={handleSync}
        />
      </motion.div>
    </div>
  )
}
