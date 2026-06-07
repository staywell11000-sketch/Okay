import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Building2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { type PropertyRecord } from "@/lib/properties-api"
import Papa from "papaparse"

// ── CSV Export ────────────────────────────────────────────────────────────────
const EXPORT_FIELDS: { key: keyof PropertyRecord | string; label: string }[] = [
  { key: "title",      label: "Title" },
  { key: "type",       label: "Type" },
  { key: "status",     label: "Status" },
  { key: "price",      label: "Price (PKR)" },
  { key: "city",       label: "City" },
  { key: "sector",     label: "Sector" },
  { key: "address",    label: "Address" },
  { key: "sizeMarla",  label: "Size (Marla)" },
  { key: "bedrooms",   label: "Bedrooms" },
  { key: "bathrooms",  label: "Bathrooms" },
  { key: "description", label: "Description" },
]

function getVal(p: PropertyRecord, key: string): string {
  const v = (p as any)[key]
  if (v === null || v === undefined) return ""
  if (Array.isArray(v)) return v.join("; ")
  return String(v)
}

function buildCSV(properties: PropertyRecord[]): string {
  const header = EXPORT_FIELDS.map((f) => f.label)
  const rows = properties.map((p) => EXPORT_FIELDS.map((f) => `"${getVal(p, f.key as string).replace(/"/g, '""')}"`))
  return [header, ...rows].map((r) => r.join(",")).join("\n")
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function ExportTab({ properties }: { properties: PropertyRecord[] }) {
  const [scope, setScope] = useState<"all" | "available" | "sold">("all")

  const filtered = scope === "all" ? properties
    : properties.filter((p) => p.status === scope)

  const handleExport = () => {
    const csv = buildCSV(filtered)
    downloadFile(csv, `properties-export-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv")
  }

  const handleExcelExport = () => {
    const header = EXPORT_FIELDS.map((f) => f.label)
    const rows = filtered.map((p) => EXPORT_FIELDS.map((f) => getVal(p, f.key as string)))
    const tsv = [header, ...rows].map((r) => r.join("\t")).join("\n")
    downloadFile(tsv, `properties-export-${new Date().toISOString().slice(0, 10)}.xls`, "application/vnd.ms-excel")
  }

  return (
    <div className="space-y-5 py-2">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Export scope</p>
        <div className="flex gap-2 flex-wrap">
          {(["all", "available", "sold"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)}
              className={cn(
                "rounded-lg border px-4 py-1.5 text-xs font-medium capitalize transition-all",
                scope === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {s === "all" ? `All (${properties.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${properties.filter((p) => p.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground mb-3">Exported columns: {EXPORT_FIELDS.map((f) => f.label).join(", ")}</p>
        <p className="text-xs font-medium text-foreground">{filtered.length} propert{filtered.length !== 1 ? "ies" : "y"} will be exported</p>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1 gap-2" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={handleExcelExport} disabled={filtered.length === 0}>
          <FileText className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      <div className="rounded-xl border border-dashed border-border/60 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Tip:</span> Dealer info is not included in exports. Import the same CSV back to auto-create dealers by adding dealer_name, dealer_phone columns.
        </p>
      </div>
    </div>
  )
}

// ── CSV Import ────────────────────────────────────────────────────────────────
type ParsedRow = Record<string, string>
type ImportResult = { imported: number; skipped: number; errors: string[] }

function ImportTab({ onImport }: { onImport: (rows: any[]) => Promise<ImportResult> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const parseFile = (f: File) => {
    setFile(f)
    setResult(null)
    setError("")
    Papa.parse<string[]>(f, {
      complete: (res) => {
        const all = (res.data as string[][]).filter((r) => r.some((c) => c.trim()))
        if (all.length < 2) { setError("File is empty or has no data rows."); return }
        const hdrs = all[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"))
        setHeaders(hdrs)
        const rows = all.slice(1).map((row) => {
          const obj: ParsedRow = {}
          hdrs.forEach((h, i) => { obj[h] = row[i]?.trim() ?? "" })
          return obj
        })
        setPreview(rows.slice(0, 5))
      },
      error: (err: any) => setError(`Parse error: ${err.message}`),
      skipEmptyLines: true,
    })
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    try {
      await new Promise<ParsedRow[]>((resolve, reject) => {
        Papa.parse<string[]>(file, {
          complete: async (res) => {
            const all = (res.data as string[][]).filter((r) => r.some((c) => c.trim()))
            const hdrs = all[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"))
            const rows = all.slice(1).map((row) => {
              const obj: ParsedRow = {}
              hdrs.forEach((h, i) => { obj[h] = row[i]?.trim() ?? "" })
              return obj
            })
            try {
              const r = await onImport(rows)
              setResult(r)
              resolve(rows)
            } catch (e: any) {
              reject(e)
            }
          },
          error: (err: any) => reject(new Error(err.message)),
          skipEmptyLines: true,
        })
      })
    } catch (e: any) {
      setError(e.message ?? "Import failed")
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = "title,type,status,price,city,sector,address,size_marla,bedrooms,bathrooms,description,dealer_name,dealer_phone,dealer_type\nSample House,house,available,12500000,Lahore,DHA Phase 5,Street 10 Block C,10,4,3,Beautiful house with garden,Ali Dealers,03001234567,individual"
    downloadFile(csv, "property-import-template.csv", "text/csv")
  }

  return (
    <div className="space-y-4 py-2">
      {!result ? (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all p-8",
              dragOver ? "border-primary bg-primary/5" : file ? "border-primary/50 bg-primary/3" : "border-border hover:border-primary/40"
            )}
          >
            {file ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{preview.length}+ rows detected</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </div>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = "" }}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="bg-muted/30 px-3 py-2 border-b border-border/60">
                <p className="text-xs font-medium text-foreground">Preview (first {preview.length} rows)</p>
              </div>
              <div className="overflow-x-auto max-h-32">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      {headers.slice(0, 6).map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left font-medium text-muted-foreground capitalize">{h.replace(/_/g, " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0">
                        {headers.slice(0, 6).map((h) => (
                          <td key={h} className="px-3 py-1.5 text-muted-foreground truncate max-w-[120px]">{row[h] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-dashed border-border/60 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              <span className="font-medium">Auto-dealer creation:</span> Include <code className="bg-muted px-1 rounded">dealer_name</code> and <code className="bg-muted px-1 rounded">dealer_phone</code> columns — dealers will be created automatically (no duplicates).
            </p>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={downloadTemplate}>
              <Download className="h-3 w-3" /> Download template
            </Button>
          </div>

          <Button className="w-full gap-2" onClick={handleImport} disabled={!file || loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><Building2 className="h-4 w-4" /> Import Properties</>}
          </Button>
        </>
      ) : (
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Import complete</p>
              <p className="text-sm text-muted-foreground mt-1">Your properties have been imported</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{result.imported}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Imported</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{result.skipped}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Skipped</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive mb-1">{result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {result.errors.slice(0, 3).map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => { setFile(null); setResult(null); setPreview([]); setHeaders([]) }}>
            Import another file
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface PropertyImportExportModalProps {
  open: boolean
  onClose: () => void
  properties: PropertyRecord[]
  onImport: (rows: any[]) => Promise<{ imported: number; skipped: number; errors: string[] }>
}

export function PropertyImportExportModal({ open, onClose, properties, onImport }: PropertyImportExportModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Import / Export Properties
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="import">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
              {properties.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{properties.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="import">
            <ImportTab onImport={onImport} />
          </TabsContent>
          <TabsContent value="export">
            <ExportTab properties={properties} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
