import { useState, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Brain, CreditCard, MessageSquare, TrendingUp, Star, BarChart2, Zap, AlertCircle, Send, Bot, User, Loader2, Activity, Hash, DollarSign } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import { format } from "date-fns"

// ── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, badge, available }: {
  icon: React.ElementType; title: string; description: string; badge?: string; available?: boolean
}) {
  return (
    <div className={cn(
      "flex gap-3.5 rounded-xl border p-4 transition-colors",
      available ? "border-primary/30 bg-primary/5 hover:border-primary/50" : "border-border/60 bg-card hover:border-border"
    )}>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", available ? "bg-primary/15" : "bg-muted")}>
        <Icon className={cn("h-4 w-4", available ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
          {available && <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">Active</Badge>}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ── Chat message type ─────────────────────────────────────────────────────────
type ChatMsg = { role: "user" | "assistant"; content: string; ts: Date }

// ── AI Chat Tab ───────────────────────────────────────────────────────────────
function AIChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! I'm your AI CRM assistant with full context of your leads, deals, and pipeline. Ask me anything — who to follow up with, pipeline health, closing strategies, or lead scores.", ts: new Date() }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    const userMsg: ChatMsg = { role: "user", content: text, ts: new Date() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)
    try {
      const payload = updated.map(m => ({ role: m.role, content: m.content }))
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "Sorry, I couldn't respond.", ts: new Date() }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again.", ts: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  const suggestions = [
    "Which leads should I follow up with today?",
    "What's my pipeline health looking like?",
    "Who are my hottest leads right now?",
    "Give me a closing strategy for my top deal",
  ]

  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5 bg-muted/30">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">CRM AI Assistant</p>
          <p className="text-xs text-muted-foreground">GPT-4o Mini · Full CRM context</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px] px-2 py-0.5 text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">Live</Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs mt-0.5",
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className={cn(
              "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted text-foreground rounded-tl-sm"
            )}>
              {msg.content}
              <p className={cn("text-[10px] mt-1 opacity-60", msg.role === "user" ? "text-right" : "")}>
                {format(msg.ts, "h:mm a")}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border/60 px-4 py-3 flex gap-2 items-end bg-background">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your leads, deals, or pipeline… (Enter to send)"
          className="resize-none min-h-[42px] max-h-32 text-sm border-border/50 focus-visible:ring-primary/30"
          rows={1}
        />
        <Button size="icon" onClick={send} disabled={!input.trim() || loading} className="h-10 w-10 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

// ── Features Tab ──────────────────────────────────────────────────────────────
function FeaturesTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FeatureCard icon={MessageSquare} title="AI Chat Assistant" description="Live assistant with full CRM context — ask about any lead, deal, or property in plain language." badge="GPT-4o Mini" available />
      <FeatureCard icon={Star} title="Lead Scoring" description="Automated 0–100 lead scores with urgency signals and closing probability — updated in real time." badge="GPT-4o Mini" available />
      <FeatureCard icon={Zap} title="Bulk AI Analysis" description="One-click analysis across all leads in your pipeline — surfaces hot prospects instantly." available />
      <FeatureCard icon={TrendingUp} title="Sales Insights" description="Pipeline health score plus revenue forecast based on your historical conversion rates." available />
      <FeatureCard icon={MessageSquare} title="Conversation Summary" description="AI-generated summaries of lead interactions and next recommended actions." available />
      <FeatureCard icon={BarChart2} title="Sentiment Analysis" description="Conversation sentiment scoring and relationship health tracking across all your contacts." />
    </div>
  )
}

// ── Usage Tab ─────────────────────────────────────────────────────────────────
function UsageTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-usage-detail"],
    queryFn: () => apiFetch("/api/ai/usage").then(r => r.json()),
  })

  const usage = data?.usage
  const log: any[] = data?.log ?? []

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading usage…</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tokens", value: (usage?.totalTokens ?? 0).toLocaleString(), icon: Hash, sub: "This month" },
          { label: "Prompt Tokens", value: (usage?.promptTokens ?? 0).toLocaleString(), icon: Activity, sub: "Input" },
          { label: "Completion Tokens", value: (usage?.completionTokens ?? 0).toLocaleString(), icon: Activity, sub: "Output" },
          { label: "Est. Cost", value: `$${(usage?.estimatedCost ?? 0).toFixed(4)}`, icon: DollarSign, sub: "USD · GPT-4o Mini" },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border/60">
          <p className="text-sm font-semibold">AI Operation Log</p>
          <p className="text-xs text-muted-foreground">Last 50 AI calls across all features</p>
        </div>
        {log.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No AI usage recorded yet. Start chatting to see logs.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {log.map((entry: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-mono capitalize">{(entry.feature ?? "—").replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted-foreground">{entry.model ?? "gpt-4o-mini"}</span>
                </div>
                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  <span>{(entry.total_tokens ?? 0).toLocaleString()} tokens</span>
                  <span className="font-mono">${Number(entry.estimated_cost ?? 0).toFixed(5)}</span>
                  <span>{entry.created_at ? format(new Date(entry.created_at), "MMM d · h:mm a") : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AIIntelligencePage() {
  const [tab, setTab] = useState("chat")

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="AI Intelligence"
        description="GPT-4o powered assistant, lead scoring, and usage monitoring."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="chat" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Features
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Usage
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-0"><AIChatTab /></TabsContent>
        <TabsContent value="features" className="mt-0"><FeaturesTab /></TabsContent>
        <TabsContent value="usage" className="mt-0"><UsageTab /></TabsContent>
      </Tabs>
    </div>
  )
}
