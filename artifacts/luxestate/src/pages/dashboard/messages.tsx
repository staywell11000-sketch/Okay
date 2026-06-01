import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Search,
  Send,
  MoreHorizontal,
  Phone,
  StickyNote,
  ChevronDown,
  CheckCheck,
  MessageSquare,
  Link2,
  Plus,
  Loader2,
  AlertCircle,
  MessageCircle,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Smartphone,
} from "lucide-react"
import { Link } from "wouter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { surfaceInputClass } from "@/lib/ui-classes"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  type Conversation,
  type Message,
  getConversations,
  getMessages,
  sendMessage as apiSendMessage,
  createConversation,
  getOrCreateConversationForLead,
  updateConversationStatus,
  markConversationRead,
  formatMessageTime,
} from "@/lib/messaging-api"

// ─── Constants ────────────────────────────────────────────

const templates = [
  { id: 1, name: "Initial Outreach", text: "Hi! I'm reaching out regarding a luxury property that matches your criteria perfectly. Would you be available for a quick call this week?" },
  { id: 2, name: "Viewing Follow-up", text: "Thank you for visiting the property today! I'd love to hear your thoughts. Are you ready to take the next step?" },
  { id: 3, name: "Offer Confirmation", text: "Great news! Your offer has been received by our team. We'll have a response within 24–48 hours." },
  { id: 4, name: "Document Request", text: "To proceed with your application, we'll need a few documents. I'll send the checklist momentarily." },
  { id: 5, name: "Price Update", text: "I wanted to let you know that the asking price for the property you're interested in has been updated. Let's connect!" },
]

const quickReplies = [
  "On my way!",
  "Available today at 3 pm",
  "I'll send the docs shortly",
  "Let me check and get back to you",
  "Confirmed, see you then!",
]

const convStatusConfig: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",   className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  pending:  { label: "Pending",  className: "bg-amber-500/10  text-amber-500  border-amber-500/20"  },
  resolved: { label: "Resolved", className: "bg-zinc-500/10   text-zinc-500   border-zinc-500/20"   },
}
const DEFAULT_STATUS_CONFIG = { label: "Unknown", className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" }

// ─── New Conversation Modal ───────────────────────────────

function NewConversationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (conv: Conversation) => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [property, setProperty] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const reset = () => { setName(""); setPhone(""); setEmail(""); setProperty(""); setError("") }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError("")
    try {
      const conv = await createConversation(user.id, { name, phone, email, linked_property: property })
      reset()
      onCreated(conv)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create conversation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            New Conversation
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Contact name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Mitchell" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@email.com" type="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Linked property <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input value={property} onChange={(e) => setProperty(e.target.value)} placeholder="Manhattan Penthouse" />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating…" : "Start Conversation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Setup Prompt ─────────────────────────────────────────

function SetupPrompt({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="glass-card flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <AlertCircle className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Database tables not found</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The messaging tables haven't been created in your Supabase project yet.
          Run the setup SQL file in your Supabase dashboard to enable messaging.
        </p>
      </div>
      <ol className="mt-2 space-y-1 text-left text-sm text-muted-foreground">
        <li>1. Open <strong>supabase-messaging-setup.sql</strong> in the project files</li>
        <li>2. Go to <strong>Supabase Dashboard → SQL Editor → New query</strong></li>
        <li>3. Paste and run the SQL</li>
        <li>4. Come back and click Retry</li>
      </ol>
      <Button onClick={onRetry} variant="outline" className="mt-2 gap-2">
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────

function EmptyConversation() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <MessageCircle className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">Select a conversation</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pick a conversation from the list, or start a new one.
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [messages, setMessages]           = useState<Message[]>([])
  const [convLoading, setConvLoading]     = useState(true)
  const [msgLoading, setMsgLoading]       = useState(false)
  const [sending, setSending]             = useState(false)
  const [setupError, setSetupError]       = useState(false)

  const [messageText, setMessageText]     = useState("")
  const [isNoteMode, setIsNoteMode]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState("")
  const [filterStatus, setFilterStatus]   = useState<"all" | "active" | "pending" | "resolved">("all")
  const [showNewConv, setShowNewConv]     = useState(false)

  const bottomRef      = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const msgChannelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const convChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // convId to auto-select, parsed once from URL on mount
  const convIdFromUrl  = useRef(new URLSearchParams(window.location.search).get("convId"))

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null
  const totalUnread  = conversations.reduce((s, c) => s + c.unread_count, 0)

  const filteredConvs = conversations.filter((c) => {
    const name = c.contact?.name ?? c.title ?? ""
    const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterStatus === "all" || c.status === filterStatus
    return matchSearch && matchStatus
  })

  // ── Load conversations ──────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      setSetupError(false)
      const data = await getConversations()
      setConversations(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("relation") || msg.includes("does not exist") || msg.includes("42P01")) {
        setSetupError(true)
      }
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // ── Auto-select conversation from URL ?convId= param ────
  useEffect(() => {
    const targetId = convIdFromUrl.current
    if (!targetId || !conversations.length || selectedId) return
    const match = conversations.find((c) => c.id === targetId)
    if (match) {
      setSelectedId(match.id)
      convIdFromUrl.current = null
    }
  }, [conversations, selectedId])

  // ── Subscribe to conversation list changes ──────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => { loadConversations() }
      )
      .subscribe()

    convChannelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [user, loadConversations])

  // ── Load messages when conversation changes ─────────────
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }

    setMsgLoading(true)
    getMessages(selectedId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setMsgLoading(false))

    markConversationRead(selectedId).then(() => {
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
      )
    })
  }, [selectedId])

  // ── Subscribe to messages in selected conversation ──────
  useEffect(() => {
    if (msgChannelRef.current) {
      supabase.removeChannel(msgChannelRef.current)
      msgChannelRef.current = null
    }
    if (!selectedId) return

    const channel = supabase
      .channel(`messages-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    msgChannelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [selectedId])

  // ── Scroll to bottom when messages change ──────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Select conversation ─────────────────────────────────
  const selectConversation = (id: string) => {
    setSelectedId(id)
    setMessageText("")
    setIsNoteMode(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Send message ────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const content = (text ?? messageText).trim()
    if (!content || !selectedId || !user || sending) return

    setSending(true)
    setMessageText("")
    setIsNoteMode(false)

    try {
      const convChannel = selectedConv?.channel ?? "crm"
      const msg = await apiSendMessage(
        selectedId,
        user.id,
        content,
        isNoteMode ? "note" : "text",
        convChannel
      )
      // Optimistic update — real-time will also fire but dedup handles it
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, last_message: content, last_message_at: msg.created_at }
            : c
        )
      )
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStatusChange = async (status: "active" | "pending" | "resolved") => {
    if (!selectedId) return
    try {
      await updateConversationStatus(selectedId, status)
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, status } : c))
      )
    } catch (err) {
      console.error("Failed to update status:", err)
    }
  }

  const handleNewConv = (conv: Conversation) => {
    setConversations((prev) => [conv, ...prev])
    setSelectedId(conv.id)
    setShowNewConv(false)
  }

  const getAvatar = (conv: Conversation) =>
    conv.contact?.avatar_initials ?? (conv.title ?? "?").slice(0, 2).toUpperCase()

  const getContactName = (conv: Conversation) =>
    conv.contact?.name ?? conv.title ?? "Unknown"

  // ─── Render ─────────────────────────────────────────────

  if (setupError) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="Messages" description="Manage all client communications." />
        <div style={{ height: "calc(100vh - 220px)", minHeight: 560 }}>
          <SetupPrompt onRetry={() => { setConvLoading(true); loadConversations() }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Messages"
        description="Manage all client communications in one unified inbox."
        actions={
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Badge className="bg-primary text-primary-foreground">{totalUnread} unread</Badge>
            )}
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              onClick={() => setShowNewConv(true)}
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
        style={{ height: "calc(100vh - 220px)", minHeight: 560 }}
      >
        <div className="flex h-full">
          {/* ── Conversation list ── */}
          <div className="flex w-80 flex-shrink-0 flex-col border-r border-border/50">
            <div className="space-y-2 border-b border-border/50 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 ${surfaceInputClass}`}
                />
              </div>
              <div className="flex gap-1 rounded-lg bg-secondary/30 p-0.5">
                {(["all", "active", "pending", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      "flex-1 rounded-md py-1 text-xs font-medium capitalize transition-colors",
                      filterStatus === s
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {convLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No conversations match your search" : "No conversations yet"}
                  </p>
                  {!searchQuery && (
                    <Button size="sm" variant="outline" onClick={() => setShowNewConv(true)} className="mt-1 gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Start one
                    </Button>
                  )}
                </div>
              ) : (
                filteredConvs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={cn(
                      "w-full border-b border-border/30 p-3 text-left transition-colors hover:bg-secondary/30",
                      selectedId === conv.id && "bg-secondary/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-sm font-semibold text-primary-foreground">
                          {getAvatar(conv)}
                        </div>
                        {conv.status === "active" && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {getContactName(conv)}
                            </p>
                            {conv.channel === "whatsapp" && (
                              <Smartphone className="h-3 w-3 flex-shrink-0 text-green-500" aria-label="WhatsApp" />
                            )}
                          </div>
                          <span className="flex-shrink-0 text-xs text-muted-foreground">
                            {formatMessageTime(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {conv.last_message ?? "No messages yet"}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={cn("py-0 text-xs", (convStatusConfig[conv.status] ?? DEFAULT_STATUS_CONFIG).className)}
                          >
                            {(convStatusConfig[conv.status] ?? DEFAULT_STATUS_CONFIG).label}
                          </Badge>
                          {conv.unread_count > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Chat area ── */}
          {!selectedConv ? (
            <EmptyConversation />
          ) : (
            <div className="flex flex-1 flex-col min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-sm font-semibold text-primary-foreground">
                    {getAvatar(selectedConv)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{getContactName(selectedConv)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {selectedConv.contact?.phone && (
                        <span>{selectedConv.contact.phone}</span>
                      )}
                      {selectedConv.linked_property && (
                        <>
                          {selectedConv.contact?.phone && <span>·</span>}
                          <Link2 className="h-3 w-3" />
                          <span>{selectedConv.linked_property}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={(convStatusConfig[selectedConv.status] ?? DEFAULT_STATUS_CONFIG).className}
                  >
                    {(convStatusConfig[selectedConv.status] ?? DEFAULT_STATUS_CONFIG).label}
                  </Badge>
                  {selectedConv.lead_id && (
                    <Link href={`/dashboard/leads/${selectedConv.lead_id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Lead Profile
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass">
                      <DropdownMenuItem onClick={() => handleStatusChange("active")}>
                        Mark as Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                        Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange("resolved")}>
                        Mark as Resolved
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {msgLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No messages yet — send the first one!
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex",
                          msg.type === "note"
                            ? "justify-center"
                            : msg.direction === "outbound"
                              ? "justify-end"
                              : "justify-start"
                        )}
                      >
                        {msg.type === "note" ? (
                          <div className="flex max-w-md items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-600">
                            <StickyNote className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="italic">{msg.content}</span>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "flex max-w-xs flex-col gap-1 lg:max-w-md xl:max-w-lg",
                              msg.direction === "outbound" ? "items-end" : "items-start"
                            )}
                          >
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                msg.direction === "outbound"
                                  ? "rounded-tr-md bg-primary text-primary-foreground"
                                  : "rounded-tl-md bg-secondary text-foreground"
                              )}
                            >
                              {msg.type === "template" && (
                                <p className="mb-1 text-xs font-semibold opacity-60">Template</p>
                              )}
                              {msg.content}
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-1",
                                msg.direction === "outbound" ? "justify-end" : "justify-start"
                              )}
                            >
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(msg.created_at)}
                              </span>
                              {msg.direction === "outbound" && (
                                <CheckCheck
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    msg.status === "read"
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    <div ref={bottomRef} />
                  </AnimatePresence>
                )}
              </div>

              {/* Quick replies */}
              <div className="border-t border-border/30 px-4 py-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => handleSend(reply)}
                      disabled={sending}
                      className="flex-shrink-0 rounded-full border border-border/50 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-50"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compose area */}
              <div className="border-t border-border/50 p-4">
                {isNoteMode && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                    <StickyNote className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Internal note — only visible to your team</span>
                    <button onClick={() => setIsNoteMode(false)} className="ml-auto underline">
                      Cancel
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 flex-shrink-0",
                      isNoteMode ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setIsNoteMode(!isNoteMode)}
                    title="Add internal note"
                  >
                    <StickyNote className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 flex-shrink-0 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        Templates
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="glass w-80" align="start" side="top">
                      {templates.map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => setMessageText(t.text)}
                          className="flex-col items-start gap-0.5"
                        >
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{t.text}</p>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Input
                    ref={inputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isNoteMode ? "Write an internal note…" : "Type a message…"}
                    className={cn("flex-1", surfaceInputClass)}
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 shadow-lg shadow-primary/25"
                    onClick={() => handleSend()}
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <NewConversationModal
        open={showNewConv}
        onClose={() => setShowNewConv(false)}
        onCreated={handleNewConv}
      />
    </div>
  )
}
