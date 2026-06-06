// ── Types ─────────────────────────────────────────────────────────────────
export type PropertyStatus = "active" | "under_offer" | "sold" | "withdrawn" | "coming_soon" | "off_market"
export type PropertyCategory = "Penthouse" | "Estate" | "Villa" | "Mansion" | "Apartment" | "Townhouse" | "Land" | "Commercial"

export type PricePoint = { date: string; price: number }

export type Property = {
  id: string
  title: string
  address: string
  city: string
  state: string
  country: string
  price: number
  beds: number
  baths: number
  sqft: number
  lotSqft: number | null
  yearBuilt: number
  garage: number
  pool: boolean
  category: PropertyCategory
  status: PropertyStatus
  featured: boolean
  image: string
  description: string
  features: string[]
  owner: { name: string; phone: string; email: string }
  agent: string
  analytics: { views: number; inquiries: number; saves: number; trend: string }
  listedAt: string
  updatedAt: string
  daysOnMarket: number
  priceHistory: PricePoint[]
  notes: string
}

// ── Status config ─────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<PropertyStatus, { label: string; className: string; dot: string }> = {
  active:       { label: "Active",       className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  under_offer:  { label: "Under Offer",  className: "bg-amber-500/10 text-amber-400 border-amber-500/20",     dot: "bg-amber-400"   },
  sold:         { label: "Sold",         className: "bg-rose-500/10 text-rose-400 border-rose-500/20",         dot: "bg-rose-400"    },
  withdrawn:    { label: "Withdrawn",    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",         dot: "bg-zinc-400"    },
  coming_soon:  { label: "Coming Soon",  className: "bg-sky-500/10 text-sky-400 border-sky-500/20",            dot: "bg-sky-400"     },
  off_market:   { label: "Off Market",   className: "bg-purple-500/10 text-purple-400 border-purple-500/20",   dot: "bg-purple-400"  },
}

export const CATEGORY_LIST: PropertyCategory[] = ["Penthouse", "Estate", "Villa", "Mansion", "Apartment", "Townhouse", "Land", "Commercial"]

export const STATUS_LIST: PropertyStatus[] = ["active", "under_offer", "sold", "withdrawn", "coming_soon", "off_market"]

export const AGENTS = [
  "James Donovan", "Sarah Mitchell", "Marcus Chen", "Elena Rodriguez",
  "David Park", "Natalie Webb", "Ryan Torres", "Olivia Grant",
]

export function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  return `$${(n / 1000).toFixed(0)}K`
}

export function formatSqft(n: number): string {
  return n.toLocaleString()
}

// ── Mock data ─────────────────────────────────────────────────────────────
export const initialProperties: Property[] = [
  {
    id: "p001", title: "One57 Penthouse", address: "157 West 57th St", city: "New York", state: "NY", country: "USA",
    price: 14_500_000, beds: 4, baths: 5, sqft: 6200, lotSqft: null, yearBuilt: 2014, garage: 1, pool: false,
    category: "Penthouse", status: "active", featured: true,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
    description: "Iconic full-floor penthouse with panoramic Central Park views. Chef's kitchen, library, private terrace.",
    features: ["Central Park Views", "Private Terrace", "Chef's Kitchen", "Wine Cellar", "24/7 Concierge"],
    owner: { name: "Harrison LLC", phone: "+1 (212) 555-0101", email: "harrison@realty.com" },
    agent: "James Donovan", analytics: { views: 320, inquiries: 24, saves: 18, trend: "+16%" },
    listedAt: "2026-03-01", updatedAt: "2026-05-10", daysOnMarket: 89,
    priceHistory: [{ date: "Jan 26", price: 13_800_000 }, { date: "Mar 26", price: 14_200_000 }, { date: "May 26", price: 14_500_000 }],
    notes: "Owner flexible on closing timeline. Has received two offers.",
  },
  {
    id: "p002", title: "Beverly Hills Grand Estate", address: "1234 Sunset Blvd", city: "Los Angeles", state: "CA", country: "USA",
    price: 28_900_000, beds: 7, baths: 9, sqft: 15000, lotSqft: 43560, yearBuilt: 2008, garage: 4, pool: true,
    category: "Estate", status: "active", featured: true,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
    description: "Palatial estate behind private gates. Tennis court, infinity pool, home theater, and a 12-car motor court.",
    features: ["Tennis Court", "Infinity Pool", "Home Theater", "12-Car Garage", "Guest House"],
    owner: { name: "Westside Capital", phone: "+1 (310) 555-0200", email: "info@westsidecap.com" },
    agent: "Sarah Mitchell", analytics: { views: 410, inquiries: 31, saves: 29, trend: "+22%" },
    listedAt: "2026-01-15", updatedAt: "2026-05-20", daysOnMarket: 134,
    priceHistory: [{ date: "Jan 26", price: 27_500_000 }, { date: "Mar 26", price: 28_200_000 }, { date: "May 26", price: 28_900_000 }],
    notes: "Seller motivated. Will consider offers above ₨ 75 Cr.",
  },
  {
    id: "p003", title: "Miami Beach Oceanfront Villa", address: "789 Ocean Drive", city: "Miami Beach", state: "FL", country: "USA",
    price: 8_750_000, beds: 5, baths: 6, sqft: 7800, lotSqft: 12000, yearBuilt: 2019, garage: 2, pool: true,
    category: "Villa", status: "under_offer", featured: false,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop",
    description: "Direct ocean frontage with private beach access. Smart home throughout, rooftop deck with hot tub.",
    features: ["Ocean Frontage", "Private Beach", "Rooftop Deck", "Smart Home", "Chef's Kitchen"],
    owner: { name: "Ocean Ventures LLC", phone: "+1 (305) 555-0333", email: "deals@oceanv.com" },
    agent: "Marcus Chen", analytics: { views: 295, inquiries: 19, saves: 14, trend: "+12%" },
    listedAt: "2026-02-10", updatedAt: "2026-05-18", daysOnMarket: 108,
    priceHistory: [{ date: "Feb 26", price: 8_200_000 }, { date: "Apr 26", price: 8_750_000 }],
    notes: "Offer accepted pending financing. Backup offers welcome.",
  },
  {
    id: "p004", title: "Malibu Cliffside Mansion", address: "21456 Pacific Coast Hwy", city: "Malibu", state: "CA", country: "USA",
    price: 15_200_000, beds: 6, baths: 7, sqft: 9500, lotSqft: 21780, yearBuilt: 2016, garage: 3, pool: true,
    category: "Mansion", status: "sold", featured: false,
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop",
    description: "Dramatic cliff-edge compound with uninterrupted Pacific views. Glass-and-steel architecture.",
    features: ["Pacific Views", "Cliff Edge Pool", "Glass Architecture", "Private Dock", "Meditation Garden"],
    owner: { name: "Pacific Luxury Group", phone: "+1 (310) 555-0444", email: "plg@pacific.com" },
    agent: "Elena Rodriguez", analytics: { views: 540, inquiries: 40, saves: 36, trend: "+34%" },
    listedAt: "2025-12-01", updatedAt: "2026-04-22", daysOnMarket: 142,
    priceHistory: [{ date: "Dec 25", price: 14_000_000 }, { date: "Feb 26", price: 14_800_000 }, { date: "Apr 26", price: 15_200_000 }],
    notes: "Closed at asking price. All cash buyer.",
  },
  {
    id: "p005", title: "Greenwich Equestrian Estate", address: "55 Round Hill Road", city: "Greenwich", state: "CT", country: "USA",
    price: 22_000_000, beds: 8, baths: 10, sqft: 18500, lotSqft: 522720, yearBuilt: 1998, garage: 5, pool: true,
    category: "Estate", status: "active", featured: false,
    image: "https://images.unsplash.com/photo-1566908829550-e6551b00979b?w=800&h=600&fit=crop",
    description: "Historic 12-acre estate with equestrian facilities, caretaker's cottage, and formal gardens.",
    features: ["Equestrian Facilities", "12 Acres", "Caretaker Cottage", "Formal Gardens", "Ballroom"],
    owner: { name: "Round Hill Trust", phone: "+1 (203) 555-0555", email: "trust@roundhill.com" },
    agent: "David Park", analytics: { views: 178, inquiries: 12, saves: 9, trend: "+8%" },
    listedAt: "2026-04-01", updatedAt: "2026-05-15", daysOnMarket: 58,
    priceHistory: [{ date: "Apr 26", price: 22_000_000 }],
    notes: "Estate sale. Trustees approving offers by committee.",
  },
  {
    id: "p006", title: "Central Park West Penthouse", address: "15 Central Park West", city: "New York", state: "NY", country: "USA",
    price: 19_500_000, beds: 5, baths: 6, sqft: 5400, lotSqft: null, yearBuilt: 2008, garage: 2, pool: false,
    category: "Penthouse", status: "coming_soon", featured: true,
    image: "https://images.unsplash.com/photo-1600607687644-c7f34b5a4f4f?w=800&h=600&fit=crop",
    description: "Trophy penthouse in the most prestigious address on Central Park. Double-height living room.",
    features: ["Central Park Views", "Double-Height Ceilings", "Private Gym", "Wine Room", "Staff Quarters"],
    owner: { name: "CPW Holdings", phone: "+1 (212) 555-0606", email: "cpw@holdings.com" },
    agent: "Natalie Webb", analytics: { views: 892, inquiries: 67, saves: 52, trend: "+45%" },
    listedAt: "2026-06-01", updatedAt: "2026-05-28", daysOnMarket: 0,
    priceHistory: [{ date: "Jun 26", price: 19_500_000 }],
    notes: "Pre-market. Showings by appointment only from June 1.",
  },
  {
    id: "p007", title: "Aspen Mountain Chalet", address: "900 Ajax Ave", city: "Aspen", state: "CO", country: "USA",
    price: 11_750_000, beds: 6, baths: 7, sqft: 8200, lotSqft: 17424, yearBuilt: 2021, garage: 3, pool: false,
    category: "Villa", status: "active", featured: false,
    image: "https://images.unsplash.com/photo-1482192505345-5852b4bcf9e3?w=800&h=600&fit=crop",
    description: "Ski-in/ski-out chalet with mountain panoramas, heated stone floors, and apres-ski bar.",
    features: ["Ski-In/Ski-Out", "Mountain Views", "Heated Floors", "Apres-Ski Bar", "Steam Room"],
    owner: { name: "Alpine Legacy LLC", phone: "+1 (970) 555-0707", email: "alpine@legacy.com" },
    agent: "Ryan Torres", analytics: { views: 244, inquiries: 18, saves: 15, trend: "+19%" },
    listedAt: "2026-03-20", updatedAt: "2026-05-12", daysOnMarket: 70,
    priceHistory: [{ date: "Mar 26", price: 11_200_000 }, { date: "May 26", price: 11_750_000 }],
    notes: "Seasonal property. Owner uses Q4 only.",
  },
  {
    id: "p008", title: "Tribeca Loft Residence", address: "101 Franklin Street", city: "New York", state: "NY", country: "USA",
    price: 6_800_000, beds: 3, baths: 3, sqft: 4100, lotSqft: null, yearBuilt: 1920, garage: 0, pool: false,
    category: "Apartment", status: "active", featured: false,
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop",
    description: "Full-floor pre-war loft with exposed brick, 14-ft ceilings, and original cast-iron columns.",
    features: ["Full Floor", "14-Ft Ceilings", "Original Details", "Private Keyed Elevator", "Roof Rights"],
    owner: { name: "Franklin Street Partners", phone: "+1 (212) 555-0808", email: "info@franklinst.com" },
    agent: "Olivia Grant", analytics: { views: 198, inquiries: 15, saves: 11, trend: "+11%" },
    listedAt: "2026-04-15", updatedAt: "2026-05-22", daysOnMarket: 44,
    priceHistory: [{ date: "Apr 26", price: 6_800_000 }],
    notes: "Flexible possession date. Motivated seller.",
  },
  {
    id: "p009", title: "Palm Beach Waterfront Estate", address: "3 South Ocean Blvd", city: "Palm Beach", state: "FL", country: "USA",
    price: 35_000_000, beds: 9, baths: 11, sqft: 22000, lotSqft: 65340, yearBuilt: 2003, garage: 6, pool: true,
    category: "Estate", status: "off_market", featured: false,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop",
    description: "Intracoastal and ocean-view estate with private dock for 120-foot yacht, ballroom, spa.",
    features: ["Private Dock", "Ballroom", "Ocean & Intracoastal", "Spa", "Staff Wing"],
    owner: { name: "Confidential", phone: "+1 (561) 555-0909", email: "private@pb.com" },
    agent: "James Donovan", analytics: { views: 63, inquiries: 5, saves: 4, trend: "+2%" },
    listedAt: "2026-05-01", updatedAt: "2026-05-29", daysOnMarket: 28,
    priceHistory: [{ date: "May 26", price: 35_000_000 }],
    notes: "Off-market. Presented to select qualified buyers only.",
  },
  {
    id: "p010", title: "Hollywood Hills Contemporary", address: "2200 Laurel Canyon Blvd", city: "Los Angeles", state: "CA", country: "USA",
    price: 7_200_000, beds: 4, baths: 5, sqft: 5800, lotSqft: 10890, yearBuilt: 2022, garage: 2, pool: true,
    category: "Villa", status: "active", featured: false,
    image: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800&h=600&fit=crop",
    description: "New construction. City-light views from every room. Floating staircase, rooftop pool.",
    features: ["City Views", "Rooftop Pool", "New Construction", "Floating Staircase", "Smart Home"],
    owner: { name: "Laurel Canyon Dev.", phone: "+1 (323) 555-1010", email: "dev@laurelcyn.com" },
    agent: "Elena Rodriguez", analytics: { views: 312, inquiries: 22, saves: 19, trend: "+24%" },
    listedAt: "2026-02-28", updatedAt: "2026-05-25", daysOnMarket: 90,
    priceHistory: [{ date: "Feb 26", price: 7_000_000 }, { date: "Apr 26", price: 7_200_000 }],
    notes: "New build. Developer will consider upgrades.",
  },
  {
    id: "p011", title: "Chicago Gold Coast Penthouse", address: "1500 N Lake Shore Dr", city: "Chicago", state: "IL", country: "USA",
    price: 5_400_000, beds: 4, baths: 4, sqft: 4800, lotSqft: null, yearBuilt: 2011, garage: 2, pool: false,
    category: "Penthouse", status: "active", featured: false,
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
    description: "Stunning Lake Michigan and city views. Floor-to-ceiling glass, open chef's kitchen.",
    features: ["Lake Michigan Views", "Floor-to-Ceiling Glass", "Private Elevator", "Wrap Terrace", "Concierge"],
    owner: { name: "Lake Shore Holdings", phone: "+1 (312) 555-1111", email: "lakeshore@hlgs.com" },
    agent: "Marcus Chen", analytics: { views: 188, inquiries: 14, saves: 10, trend: "+9%" },
    listedAt: "2026-04-05", updatedAt: "2026-05-18", daysOnMarket: 54,
    priceHistory: [{ date: "Apr 26", price: 5_400_000 }],
    notes: "Owner relocating internationally. Wants quick close.",
  },
  {
    id: "p012", title: "Hamptons Beachfront Compound", address: "144 Gin Lane", city: "Southampton", state: "NY", country: "USA",
    price: 42_000_000, beds: 10, baths: 12, sqft: 24000, lotSqft: 174240, yearBuilt: 1995, garage: 4, pool: true,
    category: "Estate", status: "active", featured: true,
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop",
    description: "Legendary 4-acre Gin Lane compound. 400 feet of ocean frontage. Fully renovated 2024.",
    features: ["400ft Ocean Frontage", "4 Acres", "Guest House", "Fully Renovated 2024", "Dock"],
    owner: { name: "Gin Lane Trust", phone: "+1 (631) 555-1212", email: "ginlane@trust.com" },
    agent: "Sarah Mitchell", analytics: { views: 621, inquiries: 48, saves: 43, trend: "+38%" },
    listedAt: "2026-03-15", updatedAt: "2026-05-28", daysOnMarket: 75,
    priceHistory: [{ date: "Mar 26", price: 40_000_000 }, { date: "May 26", price: 42_000_000 }],
    notes: "Landmark property. Previous offers rejected under ₨ 112 Cr.",
  },
  {
    id: "p013", title: "San Francisco Pacific Heights", address: "2701 Broadway", city: "San Francisco", state: "CA", country: "USA",
    price: 9_800_000, beds: 5, baths: 5, sqft: 6700, lotSqft: 6534, yearBuilt: 1905, garage: 2, pool: false,
    category: "Mansion", status: "active", featured: false,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    description: "Grand Edwardian mansion with bay views. Meticulously restored with modern systems.",
    features: ["Bay Views", "Edwardian Architecture", "Restored 2020", "Wine Cellar", "Carriage House"],
    owner: { name: "Broadway Realty", phone: "+1 (415) 555-1313", email: "broadway@realty.com" },
    agent: "David Park", analytics: { views: 267, inquiries: 20, saves: 16, trend: "+14%" },
    listedAt: "2026-02-20", updatedAt: "2026-05-19", daysOnMarket: 98,
    priceHistory: [{ date: "Feb 26", price: 9_500_000 }, { date: "Apr 26", price: 9_800_000 }],
    notes: "Buyers must be pre-approved. Historic building restrictions apply.",
  },
  {
    id: "p014", title: "Austin Lake Travis Compound", address: "5500 Comanche Trail", city: "Austin", state: "TX", country: "USA",
    price: 12_500_000, beds: 7, baths: 8, sqft: 11200, lotSqft: 87120, yearBuilt: 2020, garage: 4, pool: true,
    category: "Estate", status: "withdrawn", featured: false,
    image: "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=800&h=600&fit=crop",
    description: "Private lakefront compound. 200-ft waterfront, boathouse, outdoor kitchen and amphitheater.",
    features: ["Lake Travis Waterfront", "Boathouse", "Outdoor Amphitheater", "200ft Frontage", "Generator"],
    owner: { name: "Comanche Trail LLC", phone: "+1 (512) 555-1414", email: "info@comanchetrail.com" },
    agent: "Ryan Torres", analytics: { views: 142, inquiries: 9, saves: 7, trend: "-3%" },
    listedAt: "2025-11-01", updatedAt: "2026-03-10", daysOnMarket: 129,
    priceHistory: [{ date: "Nov 25", price: 13_500_000 }, { date: "Jan 26", price: 12_800_000 }, { date: "Mar 26", price: 12_500_000 }],
    notes: "Withdrawn pending family estate dispute. Likely to relist Q3.",
  },
  {
    id: "p015", title: "Scottsdale Desert Modern", address: "9100 E Camelback Rd", city: "Scottsdale", state: "AZ", country: "USA",
    price: 4_900_000, beds: 4, baths: 4, sqft: 5200, lotSqft: 26136, yearBuilt: 2023, garage: 3, pool: true,
    category: "Villa", status: "active", featured: false,
    image: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&h=600&fit=crop",
    description: "Desert contemporary at the base of Camelback Mountain. Zero-edge pool, meditation courtyard.",
    features: ["Camelback Views", "Zero-Edge Pool", "Meditation Courtyard", "New 2023", "Solar Powered"],
    owner: { name: "Camelback Ventures", phone: "+1 (480) 555-1515", email: "cv@camelback.com" },
    agent: "Olivia Grant", analytics: { views: 156, inquiries: 11, saves: 8, trend: "+13%" },
    listedAt: "2026-04-20", updatedAt: "2026-05-27", daysOnMarket: 39,
    priceHistory: [{ date: "Apr 26", price: 4_900_000 }],
    notes: "New listing. Builder's model, fully furnished.",
  },
]
