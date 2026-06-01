import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  FolderOpen, Search, Upload, FileText, FileImage, File,
  Download, Eye, Trash2, MoreHorizontal, Loader2, X,
  FileSpreadsheet, XCircle, ChevronDown, Link2, CheckCircle2,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { surfaceInputClass, surfaceSelectClass } from "@/lib/ui-classes"
import {
  useDocuments, useCreateDocument, useDeleteDocument, uploadToSupabase,
  getDownloadUrl, formatFileSize, inferFileType,
  type DocCategory, type Document,
} from "@/lib/documents-api"
import { useLeads } from "@/lib/leads-api"
import { useDeals } from "@/lib/deals-api"
import { toast } from "sonner"

// ── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES: { value: DocCategory | "all"; label: string; color: string }[] = [
  { value: "all",          label: "All",          color: "bg-primary text-primary-foreground border-transparent" },
  { value: "contract",     label: "Contract",     color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "invoice",      label: "Invoice",      color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { value: "property_doc", label: "Property Doc", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { value: "other",        label: "Other",        color: "bg-secondary/60 text-foreground border-border/40" },
]

function catConfig(value: DocCategory | "all") {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1]
}

function FileTypeIcon({ mime }: { mime: string | null | undefined }) {
  const t = inferFileType(mime)
  if (t === "pdf") return <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
  if (t === "img") return <FileImage className="h-5 w-5 text-blue-500 flex-shrink-0" />
  if (t === "doc") return <FileSpreadsheet className="h-5 w-5 text-blue-600 flex-shrink-0" />
  return <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

type UploadModalProps = { onClose: () => void }

function UploadModal({ onClose }: UploadModalProps) {
  const createDoc = useCreateDocument()
  const { data: leads = [] } = useLeads()
  const { data: deals = [] } = useDeals()

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<DocCategory>("other")
  const [leadId, setLeadId] = useState<string>("")
  const [dealId, setDealId] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [title])

  const handleUpload = async (): Promise<void> => {
    if (!file) { toast.error("Please select a file"); return }
    if (!title.trim()) { toast.error("Please enter a title"); return }
    setUploading(true)
    try {
      const { filePath, fileUrl } = await uploadToSupabase(file, setProgress)
      await createDoc.mutateAsync({
        title: title.trim(),
        category,
        fileUrl,
        filePath,
        fileType: file.type,
        fileSize: file.size,
        leadId: leadId ? Number(leadId) : null,
        dealId: dealId ? Number(dealId) : null,
      })
      toast.success("Document uploaded")
      onClose()
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-5">
          <p className="text-lg font-bold text-foreground">Upload Document</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} disabled={uploading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50 hover:bg-secondary/20"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <Upload className={cn("h-8 w-8 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
            {file ? (
              <div className="text-center">
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-medium text-foreground">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, images, and more</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading…</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-border/50">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Metadata fields */}
          <Input
            placeholder="Document title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={surfaceInputClass}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Category */}
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocCategory)}
                className={surfaceSelectClass}
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Link to lead */}
            <div className="relative">
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className={surfaceSelectClass}
              >
                <option value="">Link to lead (optional)</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Link to deal */}
            <div className="relative">
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className={surfaceSelectClass}
              >
                <option value="">Link to deal (optional)</option>
                {deals.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={uploading} className="border-border/50">
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-4 w-4" /> Upload</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

type PreviewModalProps = { doc: Document; onClose: () => void }

function PreviewModal({ doc, onClose }: PreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const t = inferFileType(doc.fileType)

  useEffect(() => {
    getDownloadUrl(doc.id)
      .then(setUrl)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [doc.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <FileTypeIcon mime={doc.fileType} />
            <p className="truncate font-semibold text-foreground">{doc.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <Button variant="outline" size="sm" asChild className="gap-1.5 border-border/50">
                <a href={url} download={doc.title} target="_blank" rel="noreferrer">
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : error || !url ? (
            <div className="text-center">
              <XCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Preview unavailable</p>
            </div>
          ) : t === "pdf" ? (
            <iframe src={url} className="h-full w-full" title={doc.title} />
          ) : t === "img" ? (
            <img src={url} alt={doc.title} className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="text-center">
              <File className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="font-medium text-foreground">Preview not available</p>
              <p className="mb-4 text-sm text-muted-foreground">Download the file to view it.</p>
              <Button asChild className="gap-2">
                <a href={url} download={doc.title} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" /> Download
                </a>
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [category, setCategory] = useState<DocCategory | "all">("all")
  const [search, setSearch] = useState("")
  const [showUpload, setShowUpload] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: docs = [], isLoading, error } = useDocuments()
  const deleteDoc = useDeleteDocument()

  const filtered = docs.filter((d) => {
    const matchCat = category === "all" || d.category === category
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const toggleSelect = (id: number) =>
    setSelectedIds((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteDoc.mutateAsync(deleteId)
      toast.success("Document deleted")
      setSelectedIds((p) => p.filter((i) => i !== deleteId))
    } catch {
      toast.error("Failed to delete document")
    }
    setDeleteId(null)
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map((id) => deleteDoc.mutateAsync(id)))
      toast.success(`Deleted ${selectedIds.length} document${selectedIds.length > 1 ? "s" : ""}`)
      setSelectedIds([])
    } catch {
      toast.error("Some deletes failed")
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      const url = await getDownloadUrl(doc.id)
      const a = document.createElement("a")
      a.href = url
      a.download = doc.title
      a.target = "_blank"
      a.click()
    } catch {
      toast.error("Failed to get download URL")
    }
  }

  const totalSize = docs.reduce((s, d) => s + (d.fileSize ?? 0), 0)

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Document Management"
        description="Contracts, invoices, property files — all in one place."
        actions={
          <Button
            onClick={() => setShowUpload(true)}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Upload className="h-4 w-4" /> Upload Files
          </Button>
        }
      />

      {/* Upload / Preview modals */}
      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
        {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Documents", value: docs.length, icon: FolderOpen },
          { label: "Contracts",    value: docs.filter((d) => d.category === "contract").length,     icon: FileText,       color: "text-blue-500" },
          { label: "Invoices",     value: docs.filter((d) => d.category === "invoice").length,      icon: FileSpreadsheet, color: "text-amber-500" },
          { label: "Storage Used", value: formatFileSize(totalSize),                                 icon: Upload },
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

      {/* Main panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`pl-9 ${surfaceInputClass}`}
            />
          </div>
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const count = cat.value === "all" ? docs.length : docs.filter((d) => d.category === cat.value).length
            const active = category === cat.value
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? cat.color : "border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Document table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium text-foreground">Failed to load documents</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">
              {docs.length === 0 ? "No documents yet" : "No results for this filter"}
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              {docs.length === 0
                ? "Upload your first document to get started."
                : "Try a different category or search term."}
            </p>
            {docs.length === 0 && (
              <Button onClick={() => setShowUpload(true)} className="gap-2 bg-primary hover:bg-primary/90">
                <Upload className="h-4 w-4" /> Upload Document
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document</th>
                  <th className="hidden px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Category</th>
                  <th className="hidden px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Linked to</th>
                  <th className="hidden px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">Size</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <AnimatePresence>
                  {filtered.map((doc, i) => {
                    const cfg = catConfig(doc.category)
                    const selected = selectedIds.includes(doc.id)
                    return (
                      <motion.tr
                        key={doc.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "group transition-colors",
                          selected ? "bg-primary/5" : "hover:bg-secondary/20"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(doc.id)}
                            className="h-4 w-4 rounded border-border/50 accent-primary"
                          />
                        </td>

                        {/* Name + date */}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <FileTypeIcon mime={doc.fileType} />
                            <div className="min-w-0">
                              <p className="max-w-[200px] truncate font-medium text-foreground">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">{fmtDate(doc.createdAt)}</p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="hidden px-2 py-3 md:table-cell">
                          <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                            {cfg.label}
                          </Badge>
                        </td>

                        {/* Linked */}
                        <td className="hidden px-2 py-3 lg:table-cell">
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {doc.leadId && (
                              <span className="flex items-center gap-1">
                                <Link2 className="h-3 w-3" /> Lead #{doc.leadId}
                              </span>
                            )}
                            {doc.dealId && (
                              <span className="flex items-center gap-1">
                                <Link2 className="h-3 w-3" /> Deal #{doc.dealId}
                              </span>
                            )}
                            {!doc.leadId && !doc.dealId && <span className="text-muted-foreground/50">—</span>}
                          </div>
                        </td>

                        {/* Size */}
                        <td className="hidden px-2 py-3 text-xs text-muted-foreground xl:table-cell">
                          {formatFileSize(doc.fileSize)}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setPreviewDoc(doc)}
                              title="Preview"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDownload(doc)}
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass w-44">
                                <DropdownMenuItem onClick={() => setPreviewDoc(doc)}>
                                  <Eye className="mr-2 h-3.5 w-3.5" /> Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                  <Download className="mr-2 h-3.5 w-3.5" /> Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(doc.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length} of {docs.length} document{docs.length !== 1 ? "s" : ""}
            </p>
            <Button
              variant="outline" size="sm"
              onClick={() => setShowUpload(true)}
              className="gap-2 border-border/50"
            >
              <Upload className="h-3.5 w-3.5" /> Upload more
            </Button>
          </div>
        )}
      </motion.div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{docs.find((d) => d.id === deleteId)?.title ?? "This document"}" will be permanently
              removed from storage and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
