import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Users2, Plus, Shield, Phone, Mail, MoreHorizontal,
  Loader2, Pencil, Trash2, Save, X, ClipboardList,
  ChevronRight, UserCheck, XCircle, TrendingUp, Star,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { surfaceInputClass, surfaceSelectClass } from "@/lib/ui-classes"
import {
  useTeamMembers, useTeamMember, useCreateTeamMember, useUpdateTeamMember,
  useDeleteTeamMember, useAssignLead, TeamMember, TeamRole, CreateMemberInput,
} from "@/lib/team-api"
import { useLeads } from "@/lib/leads-api"
import { toast } from "sonner"

const ROLES: TeamRole[] = ["admin", "manager", "agent"]

const roleConfig: Record<TeamRole, { label: string; color: string; bg: string }> = {
  admin:   { label: "Admin",   color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  manager: { label: "Manager", color: "text-purple-500",  bg: "bg-purple-500/10 border-purple-500/20" },
  agent:   { label: "Agent",   color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
}

function initials(name: string | null | undefined) {
  return (name ?? "").split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Add / Edit Member Modal ──────────────────────────────────────────────────

type MemberFormProps = {
  initial?: Partial<CreateMemberInput>
  onSave: (data: CreateMemberInput) => Promise<void>
  onCancel: () => void
  saving: boolean
  title: string
}

function MemberForm({ initial, onSave, onCancel, saving, title }: MemberFormProps) {
  const [form, setForm] = useState<CreateMemberInput>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    role: initial?.role ?? "agent",
    performanceScore: initial?.performanceScore ?? null,
  })
  const set = <K extends keyof CreateMemberInput>(k: K, v: CreateMemberInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!form.email.trim()) { toast.error("Email is required"); return }
    await onSave(form)
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-card overflow-hidden border-primary/20"
    >
      <div className="p-5">
        <p className="mb-4 font-semibold text-foreground">{title}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Full name *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={surfaceInputClass}
          />
          <Input
            placeholder="Email address *"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={surfaceInputClass}
          />
          <Input
            placeholder="Phone number"
            value={form.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            className={surfaceInputClass}
          />
          <div className="relative">
            <select
              value={form.role}
              onChange={(e) => set("role", e.target.value as TeamRole)}
              className={surfaceSelectClass}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleConfig[r].label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Input
            placeholder="Performance score (0–100)"
            type="number"
            min={0}
            max={100}
            value={form.performanceScore ?? ""}
            onChange={(e) => set("performanceScore", e.target.value ? parseInt(e.target.value) : null)}
            className={surfaceInputClass}
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} className="border-border/50">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Member"}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Assign Lead Modal ────────────────────────────────────────────────────────

type AssignLeadModalProps = { memberId: number; memberName: string; onClose: () => void }

function AssignLeadModal({ memberId, memberName, onClose }: AssignLeadModalProps) {
  const { data: leads = [], isLoading } = useLeads()
  const assignLead = useAssignLead()
  const unassigned = leads.filter((l) => !l.assignedTo || l.assignedTo === "")

  const handle = async (leadId: number) => {
    try {
      await assignLead.mutateAsync({ memberId, leadId })
      toast.success("Lead assigned")
      onClose()
    } catch {
      toast.error("Failed to assign lead")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <p className="font-semibold text-foreground">Assign lead to {memberName}</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : unassigned.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No unassigned leads available.</p>
          ) : (
            unassigned.map((lead) => (
              <button
                key={lead.id}
                onClick={() => handle(lead.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-secondary/40 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">{lead.status}</Badge>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Member Detail Panel ──────────────────────────────────────────────────────

type DetailPanelProps = { memberId: number; onClose: () => void; onEdit: () => void }

function MemberDetailPanel({ memberId, onClose, onEdit }: DetailPanelProps) {
  const { data: member, isLoading } = useTeamMember(memberId)
  const [showAssign, setShowAssign] = useState(false)
  const cfg = member ? roleConfig[member.role as TeamRole] : roleConfig.agent

  return (
    <>
      <motion.div
        key={memberId}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="glass-card flex h-full flex-col overflow-hidden"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agent Profile</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !member ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">Member not found.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Avatar + name */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-lg font-bold text-primary-foreground">
                  {initials(member.name)}
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{member.name}</p>
                  <Badge variant="outline" className={cn("mt-1 text-xs", cfg.bg, cfg.color)}>
                    {cfg.label}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onEdit} className="h-8 gap-1 border-border/50 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>

            {/* Contact */}
            <div className="space-y-2 rounded-xl border border-border/40 bg-secondary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />{member.email}
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />{member.phone}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/40 bg-secondary/10 p-4 text-center">
                <ClipboardList className="mx-auto h-5 w-5 text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{member.assignedLeadsCount}</p>
                <p className="text-xs text-muted-foreground">Assigned Leads</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-secondary/10 p-4 text-center">
                <Star className="mx-auto h-5 w-5 text-amber-500 mb-1" />
                <p className="text-2xl font-bold text-foreground">
                  {member.performanceScore != null ? `${member.performanceScore}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Performance</p>
              </div>
            </div>

            {/* Performance bar */}
            {member.performanceScore != null && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Performance Score</span>
                  <span className="font-semibold text-foreground">{member.performanceScore}/100</span>
                </div>
                <div className="h-2 rounded-full bg-border/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${member.performanceScore}%` }}
                  />
                </div>
              </div>
            )}

            {/* Assigned leads list */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned Leads ({member.assignedLeads.length})
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAssign(true)}
                  className="h-6 gap-1 border-border/50 text-xs"
                >
                  <Plus className="h-3 w-3" /> Assign
                </Button>
              </div>
              {member.assignedLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No leads assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {member.assignedLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 flex-shrink-0 text-xs capitalize">
                        {lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meta */}
            <p className="text-xs text-muted-foreground">
              Member since {fmtDate(member.createdAt)}
            </p>
          </div>
        )}
      </motion.div>

      {showAssign && member && (
        <AssignLeadModal
          memberId={member.id}
          memberName={member.name}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { data: members = [], isLoading, error } = useTeamMembers()
  const createMember = useCreateTeamMember()
  const updateMember = useUpdateTeamMember()
  const deleteMember = useDeleteTeamMember()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [roleFilter, setRoleFilter] = useState<TeamRole | "all">("all")

  const editingMember = members.find((m) => m.id === editingId)

  const filtered = roleFilter === "all"
    ? members
    : members.filter((m) => m.role === roleFilter)

  const totalLeads = members.reduce((s, m) => s + m.assignedLeadsCount, 0)
  const avgScore = members.length
    ? Math.round(members.reduce((s, m) => s + (m.performanceScore ?? 0), 0) / members.length)
    : 0

  const handleCreate = async (data: CreateMemberInput) => {
    try {
      await createMember.mutateAsync(data)
      toast.success("Agent added")
      setShowCreate(false)
    } catch {
      toast.error("Failed to add agent")
    }
  }

  const handleUpdate = async (data: CreateMemberInput) => {
    if (!editingId) return
    try {
      await updateMember.mutateAsync({ id: editingId, updates: data })
      toast.success("Agent updated")
      setEditingId(null)
    } catch {
      toast.error("Failed to update agent")
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      if (selectedId === deleteId) setSelectedId(null)
      await deleteMember.mutateAsync(deleteId)
      toast.success("Agent removed")
    } catch {
      toast.error("Failed to remove agent")
    }
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Team Management"
        description="Manage agents, track performance, and assign leads."
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Plus className="h-4 w-4" /> Add Agent
          </Button>
        }
      />

      {/* Add agent form */}
      <AnimatePresence>
        {showCreate && (
          <MemberForm
            title="Add New Agent"
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={createMember.isPending}
          />
        )}
        {editingId && editingMember && (
          <MemberForm
            key={`edit-${editingId}`}
            title={`Edit — ${editingMember.name}`}
            initial={editingMember}
            onSave={handleUpdate}
            onCancel={() => setEditingId(null)}
            saving={updateMember.isPending}
          />
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Agents",    value: members.length,                                        icon: Users2 },
          { label: "Admins",          value: members.filter((m) => m.role === "admin").length,       icon: Shield, color: "text-red-500" },
          { label: "Total Leads",     value: totalLeads,                                             icon: ClipboardList },
          { label: "Avg. Performance",value: members.length ? `${avgScore}%` : "—",                 icon: TrendingUp, color: "text-emerald-500" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className={cn("h-4 w-4", s.color ?? "text-primary")} />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...ROLES] as const).map((r) => {
          const count = r === "all" ? members.length : members.filter((m) => m.role === r).length
          const active = roleFilter === r
          const cfg = r === "all" ? null : roleConfig[r]
          return (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors capitalize",
                active
                  ? r === "all"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : cn(cfg!.bg, cfg!.color)
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "all" ? "All" : roleConfig[r].label} ({count})
            </button>
          )
        })}
      </div>

      {/* Main layout: table + detail panel */}
      <div className={cn("gap-6", selectedId ? "grid xl:grid-cols-5" : "block")}>
        {/* Members table */}
        <div className={cn(selectedId ? "xl:col-span-3" : "")}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="glass-card flex flex-col items-center gap-3 py-16 text-center">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="font-medium text-foreground">Failed to load team members</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card flex flex-col items-center gap-3 py-16 text-center">
              <Users2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium text-foreground">
                {roleFilter === "all" ? "No team members yet" : `No ${roleConfig[roleFilter].label}s yet`}
              </p>
              <p className="text-sm text-muted-foreground">Add your first agent to get started.</p>
              <Button onClick={() => setShowCreate(true)} className="mt-2 gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Add Agent
              </Button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border/50 px-4 py-3">
                {["Agent", "Role", "Assigned Leads", "Performance", ""].map((h) => (
                  <p key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-border/30">
                <AnimatePresence>
                  {filtered.map((member, i) => {
                    const cfg = roleConfig[member.role as TeamRole] ?? roleConfig.agent
                    const isSelected = selectedId === member.id
                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedId(isSelected ? null : member.id)}
                        className={cn(
                          "grid grid-cols-[1fr_auto_auto_auto_auto] cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors",
                          isSelected
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-secondary/30"
                        )}
                      >
                        {/* Agent info */}
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-sm font-bold text-primary-foreground">
                            {initials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{member.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>

                        {/* Role */}
                        <Badge variant="outline" className={cn("text-xs whitespace-nowrap", cfg.bg, cfg.color)}>
                          {cfg.label}
                        </Badge>

                        {/* Assigned leads */}
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                          {member.assignedLeadsCount}
                        </div>

                        {/* Performance */}
                        <div className="flex w-24 items-center gap-2">
                          {member.performanceScore != null ? (
                            <>
                              <div className="h-1.5 flex-1 rounded-full bg-border/50">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${member.performanceScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {member.performanceScore}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedId(member.id) }}>
                              <ChevronRight className="mr-2 h-3.5 w-3.5" /> View profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingId(member.id) }}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setDeleteId(member.id) }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedId && (
            <div className="xl:col-span-2">
              <MemberDetailPanel
                memberId={selectedId}
                onClose={() => setSelectedId(null)}
                onEdit={() => { setEditingId(selectedId); setSelectedId(null) }}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {members.find((m) => m.id === deleteId)?.name ?? "This agent"} will be removed from the team. Their leads will remain in the system but become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
