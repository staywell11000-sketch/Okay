import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Bed,
  Bath,
  Square,
  Heart,
  Camera,
  TrendingUp,
  CircleDot,
  User,
  BarChart2,
  X,
  GitCompare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"

const properties = [
  {
    id: 1,
    title: "Manhattan Penthouse",
    address: "432 Park Avenue, New York, NY",
    price: "₨ 35 Cr",
    beds: 4,
    baths: 5,
    sqft: "6,200",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop",
    ],
    status: "Featured",
    statusColor: "bg-primary text-primary-foreground",
    type: "Penthouse",
    analytics: { views: 320, inquiries: 24, trend: "+16%" },
    owner: { name: "Harrison LLC", contact: "harrison@realty.com", since: "2023" },
    availability: "Available",
    priceHistory: [
      { month: "Jan", price: 11.8 },
      { month: "Mar", price: 12.0 },
      { month: "May", price: 12.3 },
      { month: "Jul", price: 12.5 },
    ],
  },
  {
    id: 2,
    title: "Beverly Hills Estate",
    address: "1234 Sunset Boulevard, Los Angeles, CA",
    price: "₨ 81 Cr",
    beds: 7,
    baths: 9,
    sqft: "15,000",
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1613553497126-a44624272024?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&h=800&fit=crop",
    ],
    status: "New",
    statusColor: "bg-emerald-500 text-white",
    type: "Estate",
    analytics: { views: 410, inquiries: 31, trend: "+22%" },
    owner: { name: "Westside Capital", contact: "info@westsidecap.com", since: "2024" },
    availability: "Available",
    priceHistory: [
      { month: "Feb", price: 27.5 },
      { month: "Apr", price: 28.0 },
      { month: "Jun", price: 28.9 },
      { month: "Jul", price: 28.9 },
    ],
  },
  {
    id: 3,
    title: "Miami Beach Villa",
    address: "789 Ocean Drive, Miami Beach, FL",
    price: "₨ 24.5 Cr",
    beds: 5,
    baths: 6,
    sqft: "7,800",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1600607687644-c7f34b5a4f4f?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?w=1200&h=800&fit=crop",
    ],
    status: "Hot",
    statusColor: "bg-red-500 text-white",
    type: "Villa",
    analytics: { views: 295, inquiries: 19, trend: "+12%" },
    owner: { name: "Ocean Ventures LLC", contact: "deals@oceanv.com", since: "2022" },
    availability: "Under Offer",
    priceHistory: [
      { month: "Jan", price: 8.2 },
      { month: "Mar", price: 8.5 },
      { month: "May", price: 8.7 },
      { month: "Jul", price: 8.75 },
    ],
  },
  {
    id: 4,
    title: "Malibu Beach House",
    address: "21456 Pacific Coast Hwy, Malibu, CA",
    price: "₨ 42.5 Cr",
    beds: 6,
    baths: 7,
    sqft: "9,500",
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1600047509782-20d39509f26d?w=1200&h=800&fit=crop",
    ],
    status: "Exclusive",
    statusColor: "bg-purple-500 text-white",
    type: "Mansion",
    analytics: { views: 540, inquiries: 40, trend: "+34%" },
    owner: { name: "Pacific Luxury Group", contact: "plg@pacific.com", since: "2021" },
    availability: "Sold",
    priceHistory: [
      { month: "Jan", price: 14.0 },
      { month: "Mar", price: 14.5 },
      { month: "May", price: 15.0 },
      { month: "Jul", price: 15.2 },
    ],
  },
]

type PropertyItem = (typeof properties)[number]

type PropertyShowcaseProps = {
  searchQuery?: string
  propertyType?: string
  priceRange?: string
  viewMode?: "grid" | "list"
  bedroomFilter?: string
  availabilityFilter?: string
}

const availabilityColor: Record<string, string> = {
  Available: "text-emerald-500",
  "Under Offer": "text-amber-500",
  Sold: "text-red-500",
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
}

export function PropertyShowcase({
  searchQuery = "",
  propertyType = "All Types",
  priceRange = "Price: Any",
  viewMode = "grid",
  bedroomFilter = "Any",
  availabilityFilter = "All",
}: PropertyShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedProperties, setLikedProperties] = useState<number[]>([])
  const [activeGallery, setActiveGallery] = useState<{ propertyId: number; imageIndex: number } | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedTab, setExpandedTab] = useState<"price" | "owner">("price")
  const [compareIds, setCompareIds] = useState<number[]>([])
  const [showCompare, setShowCompare] = useState(false)

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredProperties = properties.filter((property) => {
    const matchesQuery =
      !normalizedQuery ||
      property.title.toLowerCase().includes(normalizedQuery) ||
      property.address.toLowerCase().includes(normalizedQuery)
    const matchesType = propertyType === "All Types" || property.type === propertyType
    const priceMatch = property.price.match(/₨\s*([\d.]+)\s*(Cr|L)?/)
    const numericCr = priceMatch
      ? (parseFloat(priceMatch[1]) * (priceMatch[2] === "L" ? 0.1 : 1))
      : 0
    const matchesPrice =
      priceRange === "Price: Any" ||
      (priceRange === "₨ Under 25 Cr" && numericCr < 25) ||
      (priceRange === "₨ 25–50 Cr" && numericCr >= 25 && numericCr <= 50) ||
      (priceRange === "₨ 50 Cr+" && numericCr > 50)
    const matchesBeds =
      bedroomFilter === "Any" ||
      (bedroomFilter === "4+" && property.beds >= 4) ||
      (bedroomFilter === "6+" && property.beds >= 6) ||
      (bedroomFilter === "7+" && property.beds >= 7)
    const matchesAvailability =
      availabilityFilter === "All" || property.availability === availabilityFilter
    return matchesQuery && matchesType && matchesPrice && matchesBeds && matchesAvailability
  })

  const safeLength = Math.max(filteredProperties.length, 1)
  const next = () => setCurrentIndex((prev) => (prev + 1) % safeLength)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + safeLength) % safeLength)

  const toggleLike = (id: number) => {
    setLikedProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const compareProperties = properties.filter((p) => compareIds.includes(p.id))

  const visibleProperties: PropertyItem[] =
    viewMode === "list"
      ? filteredProperties
      : [
          filteredProperties[currentIndex % safeLength],
          filteredProperties[(currentIndex + 1) % safeLength],
          filteredProperties[(currentIndex + 2) % safeLength],
        ].filter((property): property is PropertyItem => Boolean(property))

  const openGallery = (propertyId: number, imageIndex = 0) => {
    setActiveGallery({ propertyId, imageIndex })
  }

  const closeGallery = () => setActiveGallery(null)

  const activeGalleryProperty = activeGallery
    ? properties.find((property) => property.id === activeGallery.propertyId)
    : null

  const nextGalleryImage = () => {
    if (!activeGalleryProperty || !activeGallery) return
    setActiveGallery({
      propertyId: activeGallery.propertyId,
      imageIndex: (activeGallery.imageIndex + 1) % activeGalleryProperty.images.length,
    })
  }

  const prevGalleryImage = () => {
    if (!activeGalleryProperty || !activeGallery) return
    setActiveGallery({
      propertyId: activeGallery.propertyId,
      imageIndex:
        (activeGallery.imageIndex - 1 + activeGalleryProperty.images.length) %
        activeGalleryProperty.images.length,
    })
  }

  return (
    <div className="glass-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Featured Properties</h3>
          <p className="text-sm text-muted-foreground">Premium listings in your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          {compareIds.length === 2 && (
            <Button
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90"
              onClick={() => setShowCompare(true)}
            >
              <GitCompare className="h-3.5 w-3.5" />
              Compare
            </Button>
          )}
          <Badge variant="outline" className="hidden md:flex">
            {filteredProperties.length} listings
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={prev}
            className="h-9 w-9 border-border/50"
            disabled={viewMode === "list" || filteredProperties.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={next}
            className="h-9 w-9 border-border/50"
            disabled={viewMode === "list" || filteredProperties.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {compareIds.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
          <GitCompare className="h-4 w-4" />
          <span>
            {compareIds.length === 1
              ? "Select one more property to compare"
              : "2 properties selected — click Compare to view side-by-side"}
          </span>
          <button
            onClick={() => setCompareIds([])}
            className="ml-auto text-xs underline opacity-70 hover:opacity-100"
          >
            Clear
          </button>
        </div>
      )}

      {filteredProperties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">No properties found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try changing your filters to discover more listings.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          )}
        >
          <AnimatePresence mode="popLayout">
            {visibleProperties.map((property, index) => (
              <motion.div
                key={`${property.id}-${currentIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border/50 bg-card",
                  viewMode === "grid" && index === 2 && "hidden xl:block",
                  compareIds.includes(property.id) && "ring-2 ring-primary/40"
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <Badge className={cn("absolute top-3 left-3", property.statusColor)}>
                    {property.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="absolute top-3 left-28 bg-black/35 text-white border-white/30"
                  >
                    {property.type}
                  </Badge>
                  <button
                    onClick={() => toggleLike(property.id)}
                    className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:bg-white/30"
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5 transition-colors",
                        likedProperties.includes(property.id)
                          ? "fill-red-500 text-red-500"
                          : "text-white"
                      )}
                    />
                  </button>
                  <button
                    onClick={() => openGallery(property.id)}
                    className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/35 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/50"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {property.images.length} photos
                  </button>
                  <div className="absolute bottom-3 left-3">
                    <p className="text-2xl font-bold text-white">{property.price}</p>
                    <p className={cn("text-xs font-semibold", availabilityColor[property.availability])}>
                      {property.availability}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="truncate font-semibold text-foreground">{property.title}</h4>
                  <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <p className="truncate text-sm">{property.address}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-4 border-t border-border/50 pt-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Bed className="h-4 w-4" />
                      <span className="text-sm">{property.beds}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Bath className="h-4 w-4" />
                      <span className="text-sm">{property.baths}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Square className="h-4 w-4" />
                      <span className="text-sm">{property.sqft} sqft</span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-secondary/35 p-2.5 text-xs">
                    <div>
                      <p className="text-muted-foreground">Views</p>
                      <p className="font-semibold text-foreground">{property.analytics.views}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Inquiries</p>
                      <p className="font-semibold text-foreground">{property.analytics.inquiries}</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="font-semibold">{property.analytics.trend}</span>
                    </div>
                  </div>

                  {/* Expand / Compare row */}
                  <div className="mt-3 flex gap-2 border-t border-border/40 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => toggleExpand(property.id)}
                    >
                      {expandedId === property.id ? (
                        <>
                          <X className="h-3.5 w-3.5" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <BarChart2 className="h-3.5 w-3.5" />
                          Details
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex-1 gap-1.5 text-xs",
                        compareIds.includes(property.id) && "text-primary"
                      )}
                      onClick={() => toggleCompare(property.id)}
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                      {compareIds.includes(property.id) ? "Selected" : "Compare"}
                    </Button>
                  </div>

                  {/* Expandable detail panel */}
                  <AnimatePresence>
                    {expandedId === property.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 rounded-xl border border-border/40 bg-secondary/20 p-3">
                          <div className="mb-2 flex gap-1 rounded-lg bg-background/40 p-0.5">
                            <button
                              onClick={() => setExpandedTab("price")}
                              className={cn(
                                "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
                                expandedTab === "price"
                                  ? "bg-card text-foreground shadow-sm"
                                  : "text-muted-foreground"
                              )}
                            >
                              Price History
                            </button>
                            <button
                              onClick={() => setExpandedTab("owner")}
                              className={cn(
                                "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
                                expandedTab === "owner"
                                  ? "bg-card text-foreground shadow-sm"
                                  : "text-muted-foreground"
                              )}
                            >
                              Owner Details
                            </button>
                          </div>

                          {expandedTab === "price" && (
                            <div className="h-28">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={property.priceHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                  <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                  />
                                  <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(v) => `$${v}M`}
                                    domain={["auto", "auto"]}
                                  />
                                  <Tooltip
                                    formatter={(v) => [`$${v}M`, "Price"]}
                                    contentStyle={tooltipStyle}
                                  />
                                  <Bar dataKey="price" fill="oklch(0.65 0.15 75)" radius={[3, 3, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {expandedTab === "owner" && (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-foreground">
                                  {property.owner.name}
                                </p>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>
                                  <span className="font-medium text-foreground">Contact: </span>
                                  {property.owner.contact}
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">Listed since: </span>
                                  {property.owner.since}
                                </p>
                              </div>
                              <Button variant="outline" size="sm" className="w-full text-xs">
                                Contact Owner
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {viewMode === "grid" && filteredProperties.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {filteredProperties.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                currentIndex === index
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Gallery lightbox */}
      <AnimatePresence>
        {activeGallery && activeGalleryProperty ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
            onClick={closeGallery}
          >
            <div
              className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-white/20 bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activeGalleryProperty.images[activeGallery.imageIndex]}
                alt={activeGalleryProperty.title}
                className="h-[70vh] w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
                <div className="text-white">
                  <p className="font-semibold">{activeGalleryProperty.title}</p>
                  <p className="text-xs text-white/75">
                    {activeGallery.imageIndex + 1}/{activeGalleryProperty.images.length}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={closeGallery}>
                  Close
                </Button>
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2"
                onClick={prevGalleryImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                onClick={nextGalleryImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-4">
                {activeGalleryProperty.images.map((_, index) => (
                  <CircleDot
                    key={index}
                    className={cn(
                      "h-3.5 w-3.5",
                      index === activeGallery.imageIndex ? "text-white" : "text-white/40"
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Comparison modal */}
      <AnimatePresence>
        {showCompare && compareProperties.length === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onClick={() => setShowCompare(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-4xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/50 p-5">
                <div>
                  <h3 className="font-semibold text-foreground">Property Comparison</h3>
                  <p className="text-sm text-muted-foreground">Side-by-side analysis</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCompare(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="overflow-x-auto p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="w-32 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" />
                      {compareProperties.map((p) => (
                        <th key={p.id} className="py-2 text-left">
                          <img
                            src={p.images[0]}
                            alt={p.title}
                            className="mb-2 h-32 w-full rounded-lg object-cover"
                          />
                          <p className="font-semibold text-foreground">{p.title}</p>
                          <Badge className={cn("mt-1", p.statusColor)}>{p.status}</Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[
                      {
                        label: "Price",
                        values: compareProperties.map((p) => p.price),
                      },
                      {
                        label: "Type",
                        values: compareProperties.map((p) => p.type),
                      },
                      {
                        label: "Bedrooms",
                        values: compareProperties.map((p) => `${p.beds} beds`),
                      },
                      {
                        label: "Bathrooms",
                        values: compareProperties.map((p) => `${p.baths} baths`),
                      },
                      {
                        label: "Area",
                        values: compareProperties.map((p) => `${p.sqft} sqft`),
                      },
                      {
                        label: "Views",
                        values: compareProperties.map((p) => String(p.analytics.views)),
                      },
                      {
                        label: "Inquiries",
                        values: compareProperties.map((p) => String(p.analytics.inquiries)),
                      },
                      {
                        label: "Trend",
                        values: compareProperties.map((p) => p.analytics.trend),
                      },
                      {
                        label: "Availability",
                        values: compareProperties.map((p) => p.availability),
                      },
                      {
                        label: "Owner",
                        values: compareProperties.map((p) => p.owner.name),
                      },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {row.label}
                        </td>
                        {row.values.map((val, i) => (
                          <td key={i} className="py-3 font-medium text-foreground">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
