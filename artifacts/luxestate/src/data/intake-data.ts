export type IntakeSource =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "website"
  | "whatsapp"
  | "referral"
  | "cold_call"
  | "email"

export type IntegrationStatus = "connected" | "disconnected" | "error" | "pending"

export const sourceConfig: Record<
  IntakeSource,
  { label: string; color: string; bg: string; border: string; dot: string; hex: string }
> = {
  facebook: {
    label: "Facebook Ads",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
    hex: "#1877F2",
  },
  instagram: {
    label: "Instagram Ads",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-500",
    hex: "#E1306C",
  },
  tiktok: {
    label: "TikTok Ads",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    dot: "bg-purple-500",
    hex: "#8B5CF6",
  },
  website: {
    label: "Website Form",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
    hex: "#10B981",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    dot: "bg-green-500",
    hex: "#25D366",
  },
  referral: {
    label: "Referral",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
    hex: "#F59E0B",
  },
  cold_call: {
    label: "Cold Call",
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    dot: "bg-slate-400",
    hex: "#94A3B8",
  },
  email: {
    label: "Email",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    dot: "bg-indigo-500",
    hex: "#6366F1",
  },
}

export type Integration = {
  id: string
  source: IntakeSource
  name: string
  status: IntegrationStatus
  leadsThisMonth: number
  leadsTotal: number
  lastSync: string
  webhookUrl: string
  apiEndpoint: string
  campaignCount: number
  conversionRate: string
  avgScore: number
  description: string
}

export const integrations: Integration[] = [
  {
    id: "int-fb",
    source: "facebook",
    name: "Facebook Lead Ads",
    status: "connected",
    leadsThisMonth: 48,
    leadsTotal: 312,
    lastSync: "2 minutes ago",
    webhookUrl: "https://api.luxestate.io/webhooks/facebook",
    apiEndpoint: "https://graph.facebook.com/v18.0/leadgen_forms",
    campaignCount: 4,
    conversionRate: "18.4%",
    avgScore: 71,
    description: "Meta Ads Manager — lead form submissions auto-sync via webhook",
  },
  {
    id: "int-ig",
    source: "instagram",
    name: "Instagram Lead Ads",
    status: "connected",
    leadsThisMonth: 31,
    leadsTotal: 187,
    lastSync: "5 minutes ago",
    webhookUrl: "https://api.luxestate.io/webhooks/instagram",
    apiEndpoint: "https://graph.instagram.com/v18.0/leads",
    campaignCount: 3,
    conversionRate: "22.1%",
    avgScore: 78,
    description: "Instagram Stories & Feed lead ads — synced via Meta Graph API",
  },
  {
    id: "int-tt",
    source: "tiktok",
    name: "TikTok Ads",
    status: "pending",
    leadsThisMonth: 0,
    leadsTotal: 0,
    lastSync: "Never",
    webhookUrl: "https://api.luxestate.io/webhooks/tiktok",
    apiEndpoint: "https://business-api.tiktok.com/open_api/v1.3/leads",
    campaignCount: 0,
    conversionRate: "—",
    avgScore: 0,
    description: "TikTok Lead Generation — awaiting API credentials configuration",
  },
  {
    id: "int-web",
    source: "website",
    name: "Website Inquiry Form",
    status: "connected",
    leadsThisMonth: 27,
    leadsTotal: 441,
    lastSync: "12 minutes ago",
    webhookUrl: "https://api.luxestate.io/webhooks/website",
    apiEndpoint: "https://api.luxestate.io/v1/leads/website",
    campaignCount: 1,
    conversionRate: "31.6%",
    avgScore: 82,
    description: "Native website contact forms — highest conversion rate source",
  },
  {
    id: "int-wa",
    source: "whatsapp",
    name: "WhatsApp Inquiry",
    status: "connected",
    leadsThisMonth: 14,
    leadsTotal: 98,
    lastSync: "Just now",
    webhookUrl: "https://api.luxestate.io/webhooks/whatsapp",
    apiEndpoint: "https://graph.facebook.com/v18.0/messages",
    campaignCount: 1,
    conversionRate: "41.2%",
    avgScore: 86,
    description: "WhatsApp Business API — direct inquiry intake from profile link",
  },
]

export type IncomingLead = {
  id: string
  name: string
  email: string
  phone: string
  source: IntakeSource
  campaign: string
  campaignId: string
  budget?: string
  propertyInterest?: string
  receivedAt: string
  receivedMinutesAgo: number
  status: "new" | "assigned" | "duplicate" | "dismissed"
  assignedTo?: string
  duplicateOfName?: string
  score: number
  message?: string
  formId?: string
  adId?: string
  location?: string
}

export const incomingLeads: IncomingLead[] = [
  {
    id: "il-001",
    name: "Marcus Webb",
    email: "m.webb@gmail.com",
    phone: "+1 (310) 555-0142",
    source: "facebook",
    campaign: "Malibu Luxury Homes Q2",
    campaignId: "FB-MLH-Q2-2026",
    budget: "₨ 6–9 Cr",
    propertyInterest: "Malibu Beach House",
    receivedAt: "Just now",
    receivedMinutesAgo: 1,
    status: "new",
    score: 84,
    message: "Interested in beachfront properties under ₨ 10 Cr. Looking to buy Q3 this year.",
    formId: "fb_form_9284",
    adId: "ad_malibu_video_A",
    location: "Beverly Hills, CA",
  },
  {
    id: "il-002",
    name: "Priya Sharma",
    email: "priya.s@outlook.com",
    phone: "+1 (212) 555-0388",
    source: "instagram",
    campaign: "Manhattan Penthouse Stories",
    campaignId: "IG-MPS-MAY26",
    budget: "₨ 4–7 Cr",
    propertyInterest: "Manhattan Penthouse",
    receivedAt: "4 minutes ago",
    receivedMinutesAgo: 4,
    status: "new",
    score: 79,
    message: "Saw your story ad. Love the penthouse. Do you have availability for a virtual tour?",
    formId: "ig_form_7762",
    adId: "ad_manhattan_story_B",
    location: "New York, NY",
  },
  {
    id: "il-003",
    name: "James Whitfield",
    email: "jwhitfield@proton.me",
    phone: "+1 (305) 555-0711",
    source: "website",
    campaign: "Organic / Direct",
    campaignId: "WEB-ORGANIC",
    budget: "₨ 3–5 Cr",
    propertyInterest: "Miami Beach Condo",
    receivedAt: "11 minutes ago",
    receivedMinutesAgo: 11,
    status: "assigned",
    assignedTo: "Emily Rodriguez",
    score: 91,
    message: "Looking for a luxury condo in Miami. Prefer oceanfront. Ready to move within 60 days.",
    location: "Miami, FL",
  },
  {
    id: "il-004",
    name: "Sophie Laurent",
    email: "s.laurent@email.fr",
    phone: "+33 6 12 34 56 78",
    source: "instagram",
    campaign: "Beverly Hills Lifestyle Reel",
    campaignId: "IG-BHL-MAY26",
    budget: "₨ 8–12 Cr",
    propertyInterest: "Beverly Hills Estate",
    receivedAt: "18 minutes ago",
    receivedMinutesAgo: 18,
    status: "new",
    score: 88,
    message: "Je suis intéressée par une propriété à Beverly Hills. Budget flexible.",
    formId: "ig_form_8891",
    adId: "ad_bh_reel_C",
    location: "Paris, France",
  },
  {
    id: "il-005",
    name: "Nathan Brooks",
    email: "n.brooks@yahoo.com",
    phone: "+1 (415) 555-0244",
    source: "whatsapp",
    campaign: "WhatsApp Business Profile",
    campaignId: "WA-PROFILE-2026",
    budget: "₨ 2–4 Cr",
    propertyInterest: "San Francisco Loft",
    receivedAt: "22 minutes ago",
    receivedMinutesAgo: 22,
    status: "duplicate",
    duplicateOfName: "David Park",
    score: 43,
    message: "Hi, I found your number on the website. Do you have any SF lofts available?",
    location: "San Francisco, CA",
  },
  {
    id: "il-006",
    name: "Elena Vasquez",
    email: "elena.v@hotmail.com",
    phone: "+1 (702) 555-0198",
    source: "facebook",
    campaign: "Dubai Villa International Buyers",
    campaignId: "FB-DVI-2026",
    budget: "₨ 4–7 Cr",
    propertyInterest: "Dubai Marina Villa",
    receivedAt: "35 minutes ago",
    receivedMinutesAgo: 35,
    status: "assigned",
    assignedTo: "Sarah Mitchell",
    score: 66,
    message: "International buyer looking for Dubai investment property. Cash purchase.",
    formId: "fb_form_8841",
    adId: "ad_dubai_carousel_D",
    location: "Las Vegas, NV",
  },
  {
    id: "il-007",
    name: "Thomas Huang",
    email: "t.huang@gmail.com",
    phone: "+1 (626) 555-0322",
    source: "website",
    campaign: "SEO / Google",
    campaignId: "WEB-SEO-GOOGLE",
    budget: "₨ 5–8 Cr",
    propertyInterest: "Beverly Hills Estate",
    receivedAt: "1 hour ago",
    receivedMinutesAgo: 62,
    status: "assigned",
    assignedTo: "James Donovan",
    score: 77,
    message: "Found your listing on Google. Very interested in the Beverly Hills property.",
    location: "Pasadena, CA",
  },
  {
    id: "il-008",
    name: "Amara Osei",
    email: "amara.o@email.com",
    phone: "+44 7700 900142",
    source: "instagram",
    campaign: "Manhattan Penthouse Stories",
    campaignId: "IG-MPS-MAY26",
    budget: "₨ 6–9 Cr",
    propertyInterest: "Manhattan Penthouse",
    receivedAt: "2 hours ago",
    receivedMinutesAgo: 120,
    status: "new",
    score: 82,
    message: "Moving from London. Interested in Manhattan luxury. Can arrange viewing remotely?",
    formId: "ig_form_8023",
    adId: "ad_manhattan_story_A",
    location: "London, UK",
  },
  {
    id: "il-009",
    name: "Carlos Mendez",
    email: "c.mendez@email.com",
    phone: "+52 55 5555 0192",
    source: "whatsapp",
    campaign: "WhatsApp Business Profile",
    campaignId: "WA-PROFILE-2026",
    budget: "₨ 3–5 Cr",
    propertyInterest: "Miami Beach Condo",
    receivedAt: "3 hours ago",
    receivedMinutesAgo: 180,
    status: "dismissed",
    score: 29,
    message: "Hola, me interesa el condo de Miami Beach. Tengo preguntas.",
    location: "Mexico City, MX",
  },
  {
    id: "il-010",
    name: "Rachel Kim",
    email: "rachel.kim@icloud.com",
    phone: "+1 (213) 555-0517",
    source: "facebook",
    campaign: "Malibu Luxury Homes Q2",
    campaignId: "FB-MLH-Q2-2026",
    budget: "₨ 7–12 Cr",
    propertyInterest: "Malibu Beach House",
    receivedAt: "4 hours ago",
    receivedMinutesAgo: 240,
    status: "assigned",
    assignedTo: "James Donovan",
    score: 93,
    message: "Ready to buy. Cash buyer. Malibu is my top priority. Call me ASAP.",
    formId: "fb_form_9101",
    adId: "ad_malibu_video_B",
    location: "Los Angeles, CA",
  },
]

export type Campaign = {
  id: string
  source: IntakeSource
  name: string
  leads: number
  conversions: number
  spend: string
  cpl: string
  roi: string
  status: "active" | "paused" | "ended"
  startDate: string
}

export const campaigns: Campaign[] = [
  {
    id: "c-001",
    source: "facebook",
    name: "Malibu Luxury Homes Q2",
    leads: 31,
    conversions: 6,
    spend: "₨ 1.18 L",
    cpl: "₨ 3,800",
    roi: "218%",
    status: "active",
    startDate: "May 1, 2026",
  },
  {
    id: "c-002",
    source: "facebook",
    name: "Dubai Villa International Buyers",
    leads: 17,
    conversions: 3,
    spend: "₨ 78K",
    cpl: "₨ 4,600",
    roi: "147%",
    status: "active",
    startDate: "Apr 15, 2026",
  },
  {
    id: "c-003",
    source: "instagram",
    name: "Manhattan Penthouse Stories",
    leads: 22,
    conversions: 5,
    spend: "₨ 87K",
    cpl: "₨ 3,950",
    roi: "291%",
    status: "active",
    startDate: "May 5, 2026",
  },
  {
    id: "c-004",
    source: "instagram",
    name: "Beverly Hills Lifestyle Reel",
    leads: 14,
    conversions: 3,
    spend: "₨ 53K",
    cpl: "₨ 3,800",
    roi: "183%",
    status: "active",
    startDate: "May 12, 2026",
  },
  {
    id: "c-005",
    source: "website",
    name: "SEO / Google Organic",
    leads: 19,
    conversions: 7,
    spend: "₨ 0",
    cpl: "₨ 0",
    roi: "∞",
    status: "active",
    startDate: "Jan 1, 2026",
  },
  {
    id: "c-006",
    source: "website",
    name: "Google Ads — Luxury Real Estate",
    leads: 8,
    conversions: 2,
    spend: "₨ 39K",
    cpl: "₨ 4,900",
    roi: "98%",
    status: "paused",
    startDate: "Apr 1, 2026",
  },
  {
    id: "c-007",
    source: "whatsapp",
    name: "WhatsApp Business Profile",
    leads: 14,
    conversions: 6,
    spend: "₨ 0",
    cpl: "₨ 0",
    roi: "∞",
    status: "active",
    startDate: "Mar 1, 2026",
  },
]

export type AssignmentRule = {
  id: string
  name: string
  triggerSource?: IntakeSource
  triggerCondition: string
  action: string
  assignedAgent: string
  priority: number
  active: boolean
}

export const assignmentRules: AssignmentRule[] = [
  {
    id: "rule-1",
    name: "High-Score Facebook Leads → James",
    triggerSource: "facebook",
    triggerCondition: "Score ≥ 80 from Facebook Ads",
    action: "Auto-assign + send welcome WhatsApp",
    assignedAgent: "James Donovan",
    priority: 1,
    active: true,
  },
  {
    id: "rule-2",
    name: "Instagram International Leads → Sarah",
    triggerSource: "instagram",
    triggerCondition: "Source = Instagram AND location = international",
    action: "Auto-assign + tag International",
    assignedAgent: "Sarah Mitchell",
    priority: 2,
    active: true,
  },
  {
    id: "rule-3",
    name: "Website High-Intent → Any Available",
    triggerSource: "website",
    triggerCondition: "Source = Website AND Score ≥ 70",
    action: "Round-robin assignment + immediate alert",
    assignedAgent: "Round Robin",
    priority: 3,
    active: true,
  },
  {
    id: "rule-4",
    name: "WhatsApp Leads → Michael",
    triggerSource: "whatsapp",
    triggerCondition: "Source = WhatsApp",
    action: "Assign to Michael + reply with availability",
    assignedAgent: "Michael Chen",
    priority: 4,
    active: true,
  },
  {
    id: "rule-5",
    name: "Low-Score Any Source → Emily",
    triggerSource: undefined,
    triggerCondition: "Score < 50 — any source",
    action: "Assign to Emily + add to nurture sequence",
    assignedAgent: "Emily Rodriguez",
    priority: 5,
    active: false,
  },
]

export type WebhookEndpoint = {
  id: string
  name: string
  source: IntakeSource
  url: string
  secret: string
  events: string[]
  lastCalled: string
  totalCalls: number
  status: "active" | "inactive"
  provider: string
}

export const webhookEndpoints: WebhookEndpoint[] = [
  {
    id: "wh-001",
    name: "Facebook Lead Ads Webhook",
    source: "facebook",
    url: "https://api.luxestate.io/webhooks/facebook",
    secret: "whs_fb_••••••••••••4f2a",
    events: ["leadgen", "lead.form.submitted"],
    lastCalled: "2 min ago",
    totalCalls: 312,
    status: "active",
    provider: "Meta Graph API",
  },
  {
    id: "wh-002",
    name: "Instagram Lead Ads Webhook",
    source: "instagram",
    url: "https://api.luxestate.io/webhooks/instagram",
    secret: "whs_ig_••••••••••••7c1b",
    events: ["leadgen", "lead.form.submitted"],
    lastCalled: "5 min ago",
    totalCalls: 187,
    status: "active",
    provider: "Meta Graph API",
  },
  {
    id: "wh-003",
    name: "TikTok Ads Webhook",
    source: "tiktok",
    url: "https://api.luxestate.io/webhooks/tiktok",
    secret: "whs_tt_••••••••••••2d9e",
    events: ["lead.created"],
    lastCalled: "Never",
    totalCalls: 0,
    status: "inactive",
    provider: "TikTok Business API",
  },
  {
    id: "wh-004",
    name: "Website Form Webhook",
    source: "website",
    url: "https://api.luxestate.io/webhooks/website",
    secret: "whs_web_••••••••••••8a3f",
    events: ["form.submitted", "contact.created"],
    lastCalled: "12 min ago",
    totalCalls: 441,
    status: "active",
    provider: "Native / Make.com",
  },
  {
    id: "wh-005",
    name: "WhatsApp Inquiry Webhook",
    source: "whatsapp",
    url: "https://api.luxestate.io/webhooks/whatsapp",
    secret: "whs_wa_••••••••••••5e6d",
    events: ["message.received", "lead.qualified"],
    lastCalled: "Just now",
    totalCalls: 98,
    status: "active",
    provider: "WhatsApp Business API",
  },
]

// Chart data: Monthly leads by source (Jan–Jun 2026)
export const monthlyLeadsBySource = [
  { month: "Jan", facebook: 18, instagram: 9, tiktok: 0, website: 22, whatsapp: 4 },
  { month: "Feb", facebook: 24, instagram: 14, tiktok: 0, website: 28, whatsapp: 7 },
  { month: "Mar", facebook: 31, instagram: 19, tiktok: 0, website: 35, whatsapp: 9 },
  { month: "Apr", facebook: 38, instagram: 24, tiktok: 0, website: 41, whatsapp: 11 },
  { month: "May", facebook: 48, instagram: 31, tiktok: 0, website: 27, whatsapp: 14 },
  { month: "Jun", facebook: 0, instagram: 0, tiktok: 0, website: 0, whatsapp: 0 },
]

export const sourceDistribution = [
  { source: "facebook" as IntakeSource, label: "Facebook Ads", count: 48, pct: 39.7 },
  { source: "instagram" as IntakeSource, label: "Instagram Ads", count: 31, pct: 25.6 },
  { source: "website" as IntakeSource, label: "Website Form", count: 27, pct: 22.3 },
  { source: "whatsapp" as IntakeSource, label: "WhatsApp", count: 14, pct: 11.6 },
  { source: "tiktok" as IntakeSource, label: "TikTok Ads", count: 1, pct: 0.8 },
]

export const samplePayload = `{
  "event": "lead.form.submitted",
  "timestamp": "2026-05-28T14:23:11Z",
  "source": "facebook",
  "campaign_id": "FB-MLH-Q2-2026",
  "campaign_name": "Malibu Luxury Homes Q2",
  "form_id": "fb_form_9284",
  "ad_id": "ad_malibu_video_A",
  "lead": {
    "name": "Marcus Webb",
    "email": "m.webb@gmail.com",
    "phone": "+1 (310) 555-0142",
    "budget": "₨ 6–9 Cr",
    "property_interest": "Malibu Beach House",
    "message": "Interested in beachfront properties...",
    "location": "Beverly Hills, CA"
  },
  "meta": {
    "ip": "192.168.x.x",
    "user_agent": "Mozilla/5.0...",
    "referrer": "https://www.facebook.com"
  }
}`
