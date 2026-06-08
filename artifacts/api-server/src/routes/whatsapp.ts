import { Router } from "express"
import crypto from "crypto"
import { requireAuth } from "../middlewares/requireAuth"
import { supabaseAdmin } from "../lib/supabase"
import { db, connectedAccounts } from "@workspace/db"
import { eq, and } from "drizzle-orm"
import { logger } from "../lib/logger"

const router = Router()

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0"

// ─── Signature verification ──────────────────────────────

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!signature.startsWith("sha256=")) return false
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ─── GET /api/whatsapp/webhook — Meta hub challenge ──────

router.get("/whatsapp/webhook", (req, res) => {
  const mode      = req.query["hub.mode"]         as string
  const token     = req.query["hub.verify_token"] as string
  const challenge = req.query["hub.challenge"]    as string

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ""
  if (!verifyToken) {
    logger.warn("WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set")
    return res.status(403).send("Webhook verify token not configured")
  }

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("WhatsApp webhook verified successfully")
    return res.status(200).send(challenge)
  }

  return res.status(403).send("Verification failed")
})

// ─── POST /api/whatsapp/webhook — inbound events ─────────

router.post("/whatsapp/webhook", async (req: any, res) => {
  const appSecret = process.env.FACEBOOK_APP_SECRET ?? ""

  if (appSecret) {
    const signature = (req.headers["x-hub-signature-256"] as string) ?? ""
    const rawBody: Buffer | undefined = req.rawBody
    if (!rawBody || !verifySignature(rawBody, signature, appSecret)) {
      logger.warn("WhatsApp webhook: invalid signature")
      return res.status(401).send("Invalid signature")
    }
  } else {
    if (process.env.NODE_ENV !== "development") {
      logger.error("FACEBOOK_APP_SECRET not set — rejecting webhook request in non-dev environment")
      return res.status(401).send("Webhook not configured")
    }
    logger.warn("FACEBOOK_APP_SECRET not set — skipping signature check (development mode only)")
  }

  res.status(200).send("EVENT_RECEIVED")

  try {
    const body = req.body
    if (body?.object !== "whatsapp_business_account") return

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue
        const value = change.value

        // ── Status updates ──────────────────────────────
        for (const statusEvt of value.statuses ?? []) {
          const wamid     = statusEvt.id     as string
          const newStatus = statusEvt.status as string

          const mappedStatus =
            newStatus === "delivered" ? "delivered" :
            newStatus === "read"      ? "read"      : null

          if (mappedStatus) {
            const { error } = await supabaseAdmin
              .from("messages")
              .update({ status: mappedStatus })
              .eq("whatsapp_message_id", wamid)

            if (error) logger.error({ error, wamid }, "Failed to update message status")
          }
        }

        // ── Inbound messages ────────────────────────────
        for (const msg of value.messages ?? []) {
          if (msg.type !== "text") continue

          const senderPhone  = msg.from   as string
          const wamid        = msg.id     as string
          const content      = (msg.text?.body as string) ?? ""
          const phoneNumId   = value.metadata?.phone_number_id as string | undefined

          // Find the connected account owner by phone_number_id — uses Drizzle (Replit PG)
          let ownerUserId: string | null = null
          if (phoneNumId) {
            const accounts = await db
              .select({ userId: connectedAccounts.userId, metadata: connectedAccounts.metadata })
              .from(connectedAccounts)
              .where(and(
                eq(connectedAccounts.provider, "whatsapp"),
                eq(connectedAccounts.status, "active"),
              ))

            for (const acct of accounts) {
              const meta = acct.metadata as Record<string, string> | null
              if (meta?.phone_number_id === phoneNumId) {
                ownerUserId = acct.userId
                break
              }
            }
          }

          if (!ownerUserId) {
            logger.warn({ phoneNumId }, "No connected WhatsApp account found for incoming message")
            continue
          }

          // Find or create contact by phone number — uses Supabase
          let contactId: string

          const { data: existingContact } = await supabaseAdmin
            .from("contacts")
            .select("id")
            .eq("user_id", ownerUserId)
            .eq("phone", senderPhone)
            .maybeSingle()

          if (existingContact) {
            contactId = existingContact.id
          } else {
            const displayName = value.contacts?.[0]?.profile?.name ?? senderPhone
            const initials = displayName
              .split(" ")
              .filter(Boolean)
              .map((n: string) => n[0] ?? "")
              .join("")
              .toUpperCase()
              .slice(0, 2) || "??"

            const { data: newContact, error: ce } = await supabaseAdmin
              .from("contacts")
              .insert({
                user_id:         ownerUserId,
                name:            displayName,
                phone:           senderPhone,
                avatar_initials: initials,
              })
              .select("id")
              .single()

            if (ce || !newContact) {
              logger.error({ ce }, "Failed to create contact for inbound WhatsApp message")
              continue
            }
            contactId = newContact.id
          }

          // Find or create conversation (channel = 'whatsapp') — uses Supabase
          let conversationId: string

          const { data: existingConv } = await supabaseAdmin
            .from("conversations")
            .select("id")
            .eq("user_id", ownerUserId)
            .eq("contact_id", contactId)
            .eq("channel", "whatsapp")
            .maybeSingle()

          if (existingConv) {
            conversationId = existingConv.id
          } else {
            const displayName = value.contacts?.[0]?.profile?.name ?? senderPhone
            const { data: newConv, error: ve } = await supabaseAdmin
              .from("conversations")
              .insert({
                user_id:         ownerUserId,
                contact_id:      contactId,
                channel:         "whatsapp",
                title:           displayName,
                status:          "active",
                last_message_at: new Date().toISOString(),
                unread_count:    1,
              })
              .select("id")
              .single()

            if (ve || !newConv) {
              logger.error({ ve }, "Failed to create conversation for inbound WhatsApp message")
              continue
            }
            conversationId = newConv.id
          }

          // Deduplicate by wamid
          const { data: dup } = await supabaseAdmin
            .from("messages")
            .select("id")
            .eq("whatsapp_message_id", wamid)
            .maybeSingle()

          if (dup) continue

          // Insert the inbound message row
          const { error: me } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id:     conversationId,
              sender_id:           ownerUserId,
              content,
              type:                "text",
              status:              "delivered",
              direction:           "inbound",
              whatsapp_message_id: wamid,
            })

          if (me) {
            logger.error({ me }, "Failed to insert inbound WhatsApp message")
            continue
          }

          // Update conversation last_message + increment unread_count
          await supabaseAdmin
            .from("conversations")
            .update({
              last_message:    content,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", conversationId)

          await supabaseAdmin.rpc("increment_unread_count", { conv_id: conversationId })
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error processing WhatsApp webhook")
  }
})

// ─── POST /api/whatsapp/send ─────────────────────────────

router.post("/whatsapp/send", requireAuth, async (req: any, res) => {
  const { conversationId, content } = req.body as { conversationId: string; content: string }

  if (!conversationId || !content?.trim()) {
    return res.status(400).json({ error: "conversationId and content are required" })
  }

  try {
    // Get conversation + contact phone — scope to req.userId to prevent IDOR
    const { data: conv, error: ce } = await supabaseAdmin
      .from("conversations")
      .select("id, channel, contact:contacts(phone)")
      .eq("id", conversationId)
      .eq("user_id", req.userId)
      .single()

    if (ce || !conv) return res.status(404).json({ error: "Conversation not found" })

    const channel = (conv as any).channel as string
    if (channel !== "whatsapp") {
      return res.status(400).json({ error: "Conversation is not a WhatsApp channel" })
    }

    const recipientPhone = (conv as any).contact?.phone as string | null
    if (!recipientPhone) {
      return res.status(400).json({ error: "Contact has no phone number" })
    }

    // Get WhatsApp connected account from Replit PG (Drizzle)
    const accounts = await db
      .select({ accessToken: connectedAccounts.accessToken, metadata: connectedAccounts.metadata })
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, req.userId),
        eq(connectedAccounts.provider, "whatsapp"),
        eq(connectedAccounts.status, "active"),
      ))
      .limit(1)

    const account = accounts[0]
    if (!account) {
      return res.status(400).json({ error: "No active WhatsApp account connected" })
    }

    const meta         = account.metadata as Record<string, string> | null
    const phoneNumId   = meta?.phone_number_id
    const accessToken  = account.accessToken as string

    if (!phoneNumId) {
      return res.status(400).json({ error: "Phone number ID not found — reconnect your WhatsApp account" })
    }

    // Call WhatsApp Cloud API
    const waRes = await fetch(`${GRAPH_API_BASE}/${phoneNumId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to:                recipientPhone,
        type:              "text",
        text:              { preview_url: false, body: content },
      }),
    })

    const waJson = await waRes.json() as any

    if (!waRes.ok || !waJson.messages?.[0]?.id) {
      const errMsg = waJson?.error?.message ?? "WhatsApp API request failed"
      logger.error({ waJson }, "WhatsApp send failed")
      return res.status(502).json({ error: errMsg })
    }

    const wamid = waJson.messages[0].id as string

    // Insert message row only after confirmed API response
    const { data: message, error: me } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id:     conversationId,
        sender_id:           req.userId,
        content,
        type:                "text",
        status:              "sent",
        direction:           "outbound",
        whatsapp_message_id: wamid,
      })
      .select()
      .single()

    if (me || !message) {
      logger.error({ me }, "Failed to insert outbound WhatsApp message")
      return res.status(500).json({ error: "Message sent but failed to save" })
    }

    // Update conversation last_message
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message:    content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId)

    return res.json({ message })
  } catch (err: any) {
    logger.error({ err }, "Error in /whatsapp/send")
    return res.status(500).json({ error: err?.message ?? "Internal server error" })
  }
})

// ─── GET /api/whatsapp/status ─────────────────────────────
// Returns WhatsApp connection status for the authenticated user

router.get("/whatsapp/status", requireAuth, async (req: any, res) => {
  try {
    const accounts = await db
      .select({
        id:           connectedAccounts.id,
        status:       connectedAccounts.status,
        accountName:  connectedAccounts.accountName,
        metadata:     connectedAccounts.metadata,
        lastSyncedAt: connectedAccounts.lastSyncedAt,
      })
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, req.userId),
        eq(connectedAccounts.provider, "whatsapp"),
      ))
      .limit(1)

    const account = accounts[0]
    if (!account) {
      return res.json({ connected: false })
    }

    const meta = account.metadata as Record<string, unknown> | null
    return res.json({
      connected:         true,
      status:            account.status,
      accountName:       account.accountName,
      phoneNumberId:     (meta?.phone_number_id as string) ?? null,
      phoneNumber:       (meta?.phone_number   as string) ?? null,
      wabaId:            (meta?.waba_id        as string) ?? null,
      businessName:      (meta?.business_name  as string) ?? null,
      lastSyncedAt:      account.lastSyncedAt,
      webhookUrl:        `${getApiBaseUrl()}/api/whatsapp/webhook`,
      verifyToken:       process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? "configured" : "not_configured",
      templates:         (meta?.templates as unknown[]) ?? [],
      templatesSyncedAt: (meta?.templates_synced_at as string) ?? null,
    })
  } catch (err: any) {
    logger.error({ err }, "Error in /whatsapp/status")
    return res.status(500).json({ error: err?.message ?? "Internal server error" })
  }
})

function getApiBaseUrl(): string {
  if (process.env.API_URL) return process.env.API_URL
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`
  return "http://localhost:8080"
}

// ─── GET /api/whatsapp/sdk-config ─────────────────────────
// Public: returns Facebook App ID + optional WhatsApp config ID for EBS

router.get("/whatsapp/sdk-config", (_req, res) => {
  const appId    = process.env.FACEBOOK_APP_ID ?? null
  const configId = process.env.FACEBOOK_WHATSAPP_CONFIG_ID ?? null
  if (!appId) return res.json({ configured: false })
  return res.json({ configured: true, appId, configId })
})

// ─── POST /api/whatsapp/embedded-signup ───────────────────
// Exchanges EBS code for an access token and stores the WhatsApp account

router.post("/whatsapp/embedded-signup", requireAuth, async (req: any, res) => {
  const { code } = req.body as { code?: string }
  if (!code) return res.status(400).json({ error: "code is required" })

  const appId    = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appId || !appSecret) {
    return res.status(503).json({ error: "Meta app credentials are not configured" })
  }

  try {
    // Exchange EBS code for access token (no redirect_uri needed for EBS)
    const tokenRes  = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`,
    )
    const tokenJson = await tokenRes.json() as any
    if (!tokenJson.access_token) {
      throw new Error(tokenJson?.error?.message ?? "Token exchange failed")
    }
    const accessToken = tokenJson.access_token as string

    // Get user profile
    const profileRes  = await fetch(`${GRAPH_API_BASE}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`)
    const profileJson = await profileRes.json() as any
    if (profileJson.error) throw new Error(profileJson.error.message)
    const fbUserId = String(profileJson.id ?? "")
    const fbUserName = String(profileJson.name ?? "")

    // Fetch WABA list
    let wabaId:       string | null = null
    let phoneNumId:   string | null = null
    let phoneNumber:  string | null = null
    let businessId:   string | null = null
    let businessName: string        = fbUserName

    try {
      const wabaRes  = await fetch(
        `${GRAPH_API_BASE}/${fbUserId}/whatsapp_business_accounts?fields=id,name,business&access_token=${encodeURIComponent(accessToken)}`,
      )
      const wabaJson = await wabaRes.json() as any
      const waba     = wabaJson.data?.[0]
      if (waba) {
        wabaId       = waba.id as string
        businessName = (waba.name as string) || fbUserName
        businessId   = waba.business?.id ?? wabaId

        // Fetch phone numbers for WABA
        const phoneRes  = await fetch(
          `${GRAPH_API_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(accessToken)}`,
        )
        const phoneJson = await phoneRes.json() as any
        const phone     = phoneJson.data?.[0]
        if (phone) {
          phoneNumId  = phone.id as string
          phoneNumber = phone.display_phone_number as string
        }
      }
    } catch (waErr) {
      logger.warn({ waErr }, "Could not fetch WABA details — storing basic account")
    }

    const metadata = {
      waba_id:         wabaId,
      phone_number_id: phoneNumId,
      phone_number:    phoneNumber,
      business_id:     businessId,
      business_name:   businessName,
    }

    // Upsert connected account
    await db
      .insert(connectedAccounts)
      .values({
        userId:       req.userId,
        provider:     "whatsapp",
        accountName:  businessName,
        accountId:    fbUserId,
        accessToken,
        status:       "active",
        lastSyncedAt: new Date(),
        metadata,
        updatedAt:    new Date(),
      })
      .onConflictDoUpdate({
        target: [connectedAccounts.userId, connectedAccounts.provider],
        set: {
          accountName:  businessName,
          accountId:    fbUserId,
          accessToken,
          status:       "active",
          lastSyncedAt: new Date(),
          metadata,
          updatedAt:    new Date(),
        },
      })

    logger.info({ userId: req.userId, wabaId, phoneNumId }, "WhatsApp account connected via EBS")

    return res.json({ success: true, wabaId, phoneNumberId: phoneNumId, phoneNumber, businessName, businessId })
  } catch (err: any) {
    logger.error({ err }, "WhatsApp EBS failed")
    return res.status(500).json({ error: err?.message ?? "Connection failed" })
  }
})

// ─── GET /api/whatsapp/health ─────────────────────────────
// Verifies access token + phone number ID are still valid via Graph API

router.get("/whatsapp/health", requireAuth, async (req: any, res) => {
  try {
    const accounts = await db
      .select({
        accessToken:  connectedAccounts.accessToken,
        metadata:     connectedAccounts.metadata,
        lastSyncedAt: connectedAccounts.lastSyncedAt,
      })
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, req.userId),
        eq(connectedAccounts.provider, "whatsapp"),
      ))
      .limit(1)

    const account = accounts[0]
    if (!account) return res.json({ connected: false })

    const meta        = account.metadata as Record<string, string> | null
    const phoneNumId  = meta?.phone_number_id
    const token       = account.accessToken as string

    let tokenValid = false
    let phoneValid = false
    const details: Record<string, unknown> = {}

    // Verify access token
    try {
      const r = await fetch(`${GRAPH_API_BASE}/me?access_token=${encodeURIComponent(token)}`)
      const j = await r.json() as any
      tokenValid     = !j.error
      details.fbName = j.name ?? null
    } catch { tokenValid = false }

    // Verify phone number ID
    if (phoneNumId && tokenValid) {
      try {
        const r = await fetch(
          `${GRAPH_API_BASE}/${phoneNumId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(token)}`,
        )
        const j = await r.json() as any
        phoneValid             = !j.error
        if (phoneValid) {
          details.displayPhone  = j.display_phone_number ?? null
          details.verifiedName  = j.verified_name        ?? null
          details.qualityRating = j.quality_rating       ?? null
        }
      } catch { phoneValid = false }
    }

    const warnings: string[] = []
    if (!tokenValid)                  warnings.push("Access token is invalid or expired — reconnect your account")
    if (tokenValid && !phoneValid)    warnings.push("Phone number ID is unreachable — reconnect your account")
    if (!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) warnings.push("Webhook verify token not configured")

    return res.json({
      connected:          true,
      healthy:            tokenValid && phoneValid,
      tokenValid,
      phoneValid,
      webhookConfigured:  !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      warnings,
      details,
      webhookUrl:         `${getApiBaseUrl()}/api/whatsapp/webhook`,
      verifyToken:        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? null,
    })
  } catch (err: any) {
    logger.error({ err }, "Error in /whatsapp/health")
    return res.status(500).json({ error: err?.message ?? "Health check failed" })
  }
})

// ─── POST /api/whatsapp/templates/sync ────────────────────
// Fetches approved message templates from Meta and caches in metadata

router.post("/whatsapp/templates/sync", requireAuth, async (req: any, res) => {
  try {
    const accounts = await db
      .select({ id: connectedAccounts.id, accessToken: connectedAccounts.accessToken, metadata: connectedAccounts.metadata })
      .from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, req.userId),
        eq(connectedAccounts.provider, "whatsapp"),
        eq(connectedAccounts.status, "active"),
      ))
      .limit(1)

    const account = accounts[0]
    if (!account) return res.status(404).json({ error: "No active WhatsApp account found" })

    const meta   = account.metadata as Record<string, unknown> | null
    const wabaId = meta?.waba_id as string | undefined
    const token  = account.accessToken as string

    if (!wabaId) return res.status(400).json({ error: "WABA ID not found — reconnect your WhatsApp account" })

    const r = await fetch(
      `${GRAPH_API_BASE}/${wabaId}/message_templates?fields=id,name,language,category,status&limit=200&access_token=${encodeURIComponent(token)}`,
    )
    const j = await r.json() as any
    if (j.error) throw new Error(j.error.message)

    const templates = (j.data ?? []).map((t: any) => ({
      id:       t.id,
      name:     t.name,
      language: t.language,
      category: t.category,
      status:   t.status,
    }))

    const updatedMeta = { ...(meta ?? {}), templates, templates_synced_at: new Date().toISOString() }

    await db
      .update(connectedAccounts)
      .set({ metadata: updatedMeta, updatedAt: new Date() })
      .where(and(
        eq(connectedAccounts.userId, req.userId),
        eq(connectedAccounts.provider, "whatsapp"),
      ))

    return res.json({ synced: templates.length, templates })
  } catch (err: any) {
    logger.error({ err }, "Error syncing WhatsApp templates")
    return res.status(500).json({ error: err?.message ?? "Template sync failed" })
  }
})

// ─── DELETE /api/whatsapp/disconnect ──────────────────────
// Removes the connected WhatsApp account for the user

router.delete("/whatsapp/disconnect", requireAuth, async (req: any, res) => {
  try {
    await db
      .delete(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, req.userId),
        eq(connectedAccounts.provider, "whatsapp"),
      ))

    logger.info({ userId: req.userId }, "WhatsApp account disconnected")
    return res.status(204).send()
  } catch (err: any) {
    logger.error({ err }, "Error disconnecting WhatsApp")
    return res.status(500).json({ error: err?.message ?? "Disconnect failed" })
  }
})

export default router
