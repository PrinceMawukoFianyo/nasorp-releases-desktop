// app/dashboard/sales/order/[id]/invoice/page.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  ArrowLeft, Download, Printer, Mail, Share2, MessageCircle,
  FolderOpen, CheckCircle2, Zap, ChevronDown, Save, AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getSalesOrderById } from "@/actions/sales-orders"
import { formatCurrency, formatDate } from "../../so-utils"


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type PaperSize = "letter" | "a4" | "thermal80mm"

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers — persists the FileSystemDirectoryHandle between sessions.
// localStorage cannot hold a FileSystemDirectoryHandle; IDB can.
// ─────────────────────────────────────────────────────────────────────────────

const IDB_DB    = "afk_invoice_prefs"
const IDB_STORE = "handles"
const IDB_KEY   = "invoiceSaveDir"

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => resolve(null)
    })
  } catch { return null }
}

async function idbSet(key: string, value: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openIDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      tx.objectStore(IDB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
    })
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filename builder
// e.g.  Receipt_POS-00042_2026-03-01_14-35-22.html
// ─────────────────────────────────────────────────────────────────────────────

function buildFilename(orderNumber: string, isPOS: boolean, ext = "html"): string {
  const p  = (n: number) => String(n).padStart(2, "0")
  const d  = new Date()
  const ds = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const ts = `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  const safe = orderNumber.replace(/[^a-zA-Z0-9_-]/g, "_")
  return `${isPOS ? "Receipt" : "Invoice"}_${safe}_${ds}_${ts}.${ext}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Build stand-alone printable HTML
// Used by both the hidden pre-render iframe AND the save-to-folder feature.
// ─────────────────────────────────────────────────────────────────────────────

function buildPrintHTML(
  title: string,
  bodyHTML: string,
  paperSize: PaperSize,
  autoTriggerPrint: boolean
): string {
  const pageCSS =
    paperSize === "a4"         ? "@page{size:A4;margin:12mm}"
    : paperSize === "thermal80mm" ? "@page{size:80mm auto;margin:3mm}"
    :                               "@page{size:letter;margin:0.2in}"

  const maxWidth =
    paperSize === "thermal80mm" ? "72mm"
    : paperSize === "a4"         ? "190mm"
    :                              "760px"

  const baseFontSize = paperSize === "thermal80mm" ? "9px" : "11px"
  const twoCol = paperSize !== "thermal80mm"

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      background:white;color:#000;line-height:1.3;font-size:${baseFontSize}}
    .invoice-container{width:100%;max-width:${maxWidth};margin:0 auto;
      background:white;padding:${paperSize === "thermal80mm" ? "6px" : "16px"}}
    .invoice-header{display:flex;justify-content:space-between;align-items:flex-start;
      margin-bottom:16px;padding-bottom:12px;
      border-bottom:${paperSize === "thermal80mm" ? "1px dashed #000" : "2px solid #e5e7eb"}}
    .invoice-details-section{display:grid;
      grid-template-columns:${twoCol ? "1fr 1fr" : "1fr"};
      gap:12px;margin-bottom:14px}
    .dates-table{display:grid;
      grid-template-columns:${twoCol ? "1fr 1fr 1fr" : "1fr 1fr"};
      gap:8px;margin-bottom:14px;background:#f9fafb;padding:10px;
      border-radius:6px;border:1px solid #e5e7eb}
    .items-table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10px}
    .items-table th{background:linear-gradient(135deg,#f43f5e,#e11d48);color:white;
      padding:6px 8px;font-weight:700;font-size:9px;
      text-transform:uppercase;letter-spacing:.4px;text-align:left}
    .items-table th.right{text-align:right}
    .items-table th.center{text-align:center}
    .items-table td{padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    .items-table td.right{text-align:right}
    .items-table td.center{text-align:center}
    .totals-section{float:right;width:${paperSize === "thermal80mm" ? "100%" : "280px"};
      margin-top:6px;background:#f9fafb;padding:12px;
      border-radius:6px;border:1px solid #e5e7eb}
    .total-row{display:flex;justify-content:space-between;
      padding:3px 0;font-size:10px;border-bottom:1px solid #e5e7eb}
    .total-row.final{border-top:2px solid #f43f5e;border-bottom:none;
      padding-top:6px;margin-top:4px;font-size:11px;font-weight:bold}
    .total-row.balance{background:#fef2f2;padding:8px;
      margin:6px -12px -12px -12px;border-radius:0 0 6px 6px;font-weight:bold}
    .notes-section{clear:both;margin-top:16px;padding:10px;
      background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px}
    .terms-section{margin-top:12px;padding:10px;
      background:#f3f4f6;border-radius:6px;border:1px solid #d1d5db}
    .footer-section{clear:both;margin-top:12px;padding-top:10px;
      border-top:${paperSize === "thermal80mm" ? "1px dashed #000" : "1px solid #e5e7eb"};
      text-align:center;font-size:9px;color:#6b7280}
    @media print{
      ${pageCSS}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .invoice-container{padding:${paperSize === "thermal80mm" ? "4px" : "0.15in"}}
    }
  </style>
</head>
<body>
  <div class="invoice-container">${bodyHTML}</div>
  ${autoTriggerPrint
    ? `<script>
        window.onload=function(){setTimeout(function(){window.print()},80)};
        window.onafterprint=function(){setTimeout(function(){window.close()},500)};
      </script>`
    : ""}
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SalesOrderInvoicePage() {
  const router  = useRouter()
  const params  = useParams()
  const orderId = params.id as string

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const invoiceRef = useRef<HTMLDivElement>(null)

  // Hidden iframe: pre-loaded on mount so Print fires with zero delay
  const iframeRef  = useRef<HTMLIFrameElement>(null)

  // ── state ─────────────────────────────────────────────────────────────────
  const [isLoading,        setIsLoading]        = useState(true)
  const [salesOrder,       setSalesOrder]       = useState<any>(null)
  const [isPrinting,       setIsPrinting]       = useState(false)
  const [isSaving,         setIsSaving]         = useState(false)
  const [isGeneratingPDF,  setIsGeneratingPDF]  = useState(false)
  const [showShareMenu,    setShowShareMenu]    = useState(false)
  const [showPaperMenu,    setShowPaperMenu]    = useState(false)
  const [paperSize,        setPaperSize]        = useState<PaperSize>("letter")
  const [iframeReady,      setIframeReady]      = useState(false)
  const [savedDir,         setSavedDir]         = useState<FileSystemDirectoryHandle | null>(null)
  const [savedDirLabel,    setSavedDirLabel]    = useState<string | null>(null)
  const [lastSavedFile,    setLastSavedFile]    = useState<string | null>(null)
  const [fsSupported,      setFsSupported]      = useState(true)

  // ── load order ────────────────────────────────────────────────────────────
  useEffect(() => { loadSalesOrder() }, [orderId])

  const loadSalesOrder = async () => {
    try {
      setIsLoading(true)
      const order = await getSalesOrderById(orderId)
      if (!order) {
        toast.error("Credit Sales not found")
        router.push("/dashboard/sales/orders")
        return
      }
      setSalesOrder(order)
      toast.success("Invoice loaded")
    } catch {
      toast.error("Failed to load Credit Sales")
      router.push("/dashboard/sales/orders")
    } finally {
      setIsLoading(false)
    }
  }

  // ── detect File System Access API ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && !("showDirectoryPicker" in window)) {
      setFsSupported(false)
    }
  }, [])

  // ── restore saved folder from IndexedDB ───────────────────────────────────
  useEffect(() => {
    idbGet(IDB_KEY).then(h => {
      if (h) { setSavedDir(h); setSavedDirLabel(h.name) }
    })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // PRE-RENDER the iframe as soon as the invoice DOM is painted.
  //
  // When the user eventually clicks "Print", the iframe document is already
  // fully loaded → contentWindow.print() fires IMMEDIATELY with zero delay,
  // and the OS print dialog appears instantly.
  // ─────────────────────────────────────────────────────────────────────────

  const loadIframe = useCallback(() => {
    if (!invoiceRef.current || !iframeRef.current || !salesOrder) return
    const isPOS_ = salesOrder.orderNumber?.startsWith("POS-") || salesOrder.type === "POS"
    const html   = buildPrintHTML(
      `${isPOS_ ? "Receipt" : "Invoice"} ${salesOrder.orderNumber}`,
      invoiceRef.current.innerHTML,
      paperSize,
      false   // never auto-trigger inside the hidden iframe
    )
    setIframeReady(false)
    const iframe = iframeRef.current
    iframe.onload = () => setIframeReady(true)
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!doc) return
    doc.open(); doc.write(html); doc.close()
  }, [salesOrder, paperSize])

  // Re-build whenever data loads or paper size changes
  useEffect(() => {
    if (!isLoading && salesOrder) {
      const t = setTimeout(loadIframe, 200)  // wait one tick for DOM paint
      return () => clearTimeout(t)
    }
  }, [isLoading, salesOrder, paperSize, loadIframe])

  // ─────────────────────────────────────────────────────────────────────────
  // INSTANT PRINT  – fires the pre-loaded iframe's print() immediately
  // ─────────────────────────────────────────────────────────────────────────

  const firePrint = useCallback(() => {
    if (!iframeRef.current?.contentWindow) { window.print(); return }
    iframeRef.current.contentWindow.focus()
    iframeRef.current.contentWindow.print()
  }, [])

  const handlePrint = useCallback(() => {
    setIsPrinting(true)

    if (iframeReady) {
      // ✅ Zero-delay: iframe already loaded, fire print immediately
      firePrint()
      setIsPrinting(false)
    } else {
      // Rare fallback: build iframe now, then print on load
      const id = toast.loading("Preparing print…")
      if (!invoiceRef.current || !salesOrder) return
      const isPOS_ = salesOrder.orderNumber?.startsWith("POS-") || salesOrder.type === "POS"
      const html   = buildPrintHTML(
        `${isPOS_ ? "Receipt" : "Invoice"} ${salesOrder.orderNumber}`,
        invoiceRef.current.innerHTML, paperSize, false
      )
      const iframe = iframeRef.current!
      iframe.onload = () => {
        setIframeReady(true)
        toast.dismiss(id)
        firePrint()
        setIsPrinting(false)
      }
      const doc = iframe.contentDocument ?? iframe.contentWindow?.document
      if (doc) { doc.open(); doc.write(html); doc.close() }
    }
  }, [iframeReady, salesOrder, paperSize, firePrint])

  // ─────────────────────────────────────────────────────────────────────────
  // Get or pick save directory
  // Creates an "Invoices" or "Receipts" subfolder automatically
  // ─────────────────────────────────────────────────────────────────────────

  const resolveDir = async (isPOS_: boolean): Promise<FileSystemDirectoryHandle | null> => {
    const subName = isPOS_ ? "Receipts" : "Invoices"

    // Re-use remembered handle
    if (savedDir) {
      try {
        const perm = await (savedDir as any).requestPermission({ mode: "readwrite" })
        if (perm === "granted") return savedDir
      } catch { /* fall through to picker */ }
    }

    if (!fsSupported) return null

    try {
      const root = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
        id: "afk-invoices",
      }) as FileSystemDirectoryHandle

      // Auto-create the "Invoices" / "Receipts" subfolder
      const sub = await root.getDirectoryHandle(subName, { create: true })
      await idbSet(IDB_KEY, sub)
      setSavedDir(sub)
      setSavedDirLabel(`${root.name} / ${subName}`)
      return sub
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Could not access folder")
      return null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE TO FOLDER
  // Saves a self-contained printable HTML file with the auto-generated name.
  // Falls back to a plain browser download when File System API is unavailable.
  // ─────────────────────────────────────────────────────────────────────────

  const saveToFolder = useCallback(async (): Promise<boolean> => {
    if (!salesOrder || !invoiceRef.current) { toast.error("Invoice not ready"); return false }

    setIsSaving(true)
    const toastId = toast.loading("Saving…")

    try {
      const isPOS_ = salesOrder.orderNumber?.startsWith("POS-") || salesOrder.type === "POS"
      const filename = buildFilename(salesOrder.orderNumber, isPOS_, "html")
      const html  = buildPrintHTML(
        `${isPOS_ ? "Receipt" : "Invoice"} ${salesOrder.orderNumber}`,
        invoiceRef.current.innerHTML, paperSize, true  // saved file can auto-print when opened
      )
      const blob = new Blob([html], { type: "text/html;charset=utf-8" })

      // ── File System API path (Chrome / Edge) ──────────────────────────
      if (fsSupported) {
        const dir = await resolveDir(isPOS_)
        if (dir) {
          const fh = await dir.getFileHandle(filename, { create: true })
          const w  = await fh.createWritable()
          await w.write(blob)
          await w.close()
          setLastSavedFile(filename)
          const folderLabel = savedDirLabel ?? `Documents / ${isPOS_ ? "Receipts" : "Invoices"}`
          toast.success("Saved to folder!", {
            id: toastId,
            description: `${filename}  →  ${folderLabel}`,
            duration: 8000,
          })
          return true
        }
      }

      // ── Fallback: browser download ────────────────────────────────────
      const url = URL.createObjectURL(blob)
      const a   = Object.assign(document.createElement("a"), { href: url, download: filename })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setLastSavedFile(filename)
      toast.success("File downloaded", {
        id: toastId,
        description: `${filename}  (open it and choose File → Print → Save as PDF)`,
        duration: 8000,
      })
      return true

    } catch (e: any) {
      if (e.name === "AbortError") toast.dismiss(toastId)
      else toast.error("Save failed", { id: toastId, description: e.message })
      return false
    } finally {
      setIsSaving(false)
    }
  }, [salesOrder, paperSize, fsSupported, savedDir, savedDirLabel])

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE & PRINT  — one click does both
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveAndPrint = useCallback(async () => {
    const ok = await saveToFolder()
    if (ok) setTimeout(handlePrint, 280)  // slight pause so save toast is visible
  }, [saveToFolder, handlePrint])

  // ─────────────────────────────────────────────────────────────────────────
  // DOWNLOAD PDF  —  opens a new window with auto-print, user picks "Save as PDF"
  // ─────────────────────────────────────────────────────────────────────────

  const handleDownloadPDF = useCallback(async () => {
    if (!salesOrder || !invoiceRef.current) { toast.error("Invoice not ready"); return }
    setIsGeneratingPDF(true)
    const id = toast.loading("Opening PDF view…")
    try {
      const isPOS_ = salesOrder.orderNumber?.startsWith("POS-") || salesOrder.type === "POS"
      const html = buildPrintHTML(
        `${isPOS_ ? "Receipt" : "Invoice"} ${salesOrder.orderNumber}`,
        invoiceRef.current.innerHTML, paperSize, true
      )
      const win = window.open("", "_blank")
      if (!win) throw new Error("Pop-up blocked — please allow pop-ups for this site")
      win.document.write(html); win.document.close()
      toast.success("PDF ready", {
        id,
        description: "In the print dialog, choose 'Save as PDF' as your printer",
        duration: 8000,
      })
    } catch (e: any) {
      toast.error("Failed", { id, description: e.message })
    } finally {
      setIsGeneratingPDF(false)
    }
  }, [salesOrder, paperSize])

  // ── change folder ─────────────────────────────────────────────────────────

  const handleChangeFolder = async () => {
    if (!fsSupported) {
      toast.error("Folder auto-save requires Chrome or Edge")
      return
    }
    const isPOS_ = salesOrder?.orderNumber?.startsWith("POS-") || salesOrder?.type === "POS"
    try {
      const root = await (window as any).showDirectoryPicker({
        mode: "readwrite", startIn: "documents", id: "afk-invoices",
      }) as FileSystemDirectoryHandle
      const subName = isPOS_ ? "Receipts" : "Invoices"
      const sub = await root.getDirectoryHandle(subName, { create: true })
      await idbSet(IDB_KEY, sub)
      setSavedDir(sub)
      setSavedDirLabel(`${root.name} / ${subName}`)
      toast.success("Save folder updated", { description: `${root.name} / ${subName}` })
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Could not set folder")
    }
  }

  // ── share ─────────────────────────────────────────────────────────────────

  const handleShare = (platform: string) => {
    if (!salesOrder) { toast.error("Invoice not loaded"); return }
    const url = window.location.href
    const isPOS_ = salesOrder.orderNumber?.startsWith("POS-") || salesOrder.type === "POS"
    const msg = `${isPOS_ ? "Receipt" : "Invoice"} ${salesOrder.orderNumber} — Total: ${formatCurrency(salesOrder.subtotal + salesOrder.taxAmount - (salesOrder.discount || 0))}`
    const map: Record<string, [string, string]> = {
      whatsapp: [`https://wa.me/?text=${encodeURIComponent(msg + " " + url)}`, "WhatsApp"],
      email:    [`mailto:?subject=${encodeURIComponent(msg)}&body=${encodeURIComponent(msg + "\n\n" + url)}`, "Email"],
      telegram: [`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`, "Telegram"],
    }
    const [href, name] = map[platform] ?? []
    if (href) window.open(href, "_blank")
    setShowShareMenu(false)
    toast.success(`Opened ${name}`)
  }

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setShowShareMenu(false); toast.success("Link copied") }
    catch { toast.error("Failed to copy link") }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EARLY RETURNS
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Spinner className="size-8" />
      <p className="ml-4 text-muted-foreground">Loading invoice…</p>
    </div>
  )

  if (!salesOrder) return null

  // ── derived values ────────────────────────────────────────────────────────

  const isPOS       = salesOrder.orderNumber?.startsWith("POS-") || salesOrder.type === "POS"
  const subtotal    = salesOrder.subtotal    || 0
  const taxAmount   = salesOrder.taxAmount   || 0
  const shippingCost = salesOrder.shippingCost || 0
  const discount    = salesOrder.discount    || 0
  const total       = subtotal + taxAmount + shippingCost - discount
  const taxRate     = subtotal > 0 ? (taxAmount / subtotal * 100).toFixed(2) : "0.00"
  const invoiceDate = salesOrder.createdAt ? new Date(salesOrder.createdAt) : new Date()
  const dueDate     = new Date(invoiceDate); dueDate.setDate(dueDate.getDate() + 30)

  const getInitials = (name: string) =>
    name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()

  const PAPER_LABELS: Record<PaperSize, string> = {
    letter:      "Letter  (8.5 × 11 in)",
    a4:          "A4  (210 × 297 mm)",
    thermal80mm: "Thermal 80 mm receipt",
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Global print CSS ───────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          body{background:white;font-size:11px;padding:0!important;margin:0!important}
          body *{visibility:hidden}
          .print-container,.print-container *{visibility:visible}
          .print-container{
            position:absolute;left:0;top:0;width:100%;
            padding:0.2in!important;margin:0!important;background:white;
            max-height:10.5in;overflow:hidden}
          .no-print{display:none!important}
          @page{margin:0.2in;size:letter}
          .invoice-header,.invoice-details-section,.dates-table,.items-table,
          .totals-section,.notes-section,.terms-section,.footer-section{
            page-break-inside:avoid;break-inside:avoid}
          .items-table thead{display:table-header-group}
          .items-table tr{page-break-inside:avoid;break-inside:avoid}
          .print-container .shadow-lg{box-shadow:none!important}
          .print-container .p-6{padding:0.5rem!important}
          .print-container .mb-6{margin-bottom:0.75rem!important}
          .print-container .mb-4{margin-bottom:0.5rem!important}
        }
        @media screen{.print-container{min-height:auto}}
      `}</style>

      {/*
        ── Hidden pre-rendered iframe ──────────────────────────────────────
        Placed off-screen; loaded with the invoice HTML immediately after
        the page mounts. When the user clicks Print, contentWindow.print()
        fires instantly — no window.open, no delay, no flicker.
      */}
      <iframe
        ref={iframeRef}
        title="print-preview"
        aria-hidden="true"
        style={{
          position: "fixed", top: -9999, left: -9999,
          width: 1, height: 1, border: "none", opacity: 0,
        }}
      />

      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">

          {/* ════════════════════ ACTION BAR ════════════════════ */}
          <div className="mb-6 no-print">
            <Link href="/dashboard/sales/orders"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" />Back to Credit Saless
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Title + folder status */}
              <div>
                <h1 className="text-2xl font-bold">
                  {isPOS ? "Receipt" : "Invoice"} — {salesOrder.orderNumber}
                </h1>

                {/* ── Folder indicator strip ── */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  {savedDirLabel ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Auto-save folder: <span className="font-semibold">{savedDirLabel}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      No save folder set — click <strong>Save &amp; Print</strong> to choose one
                    </span>
                  )}
                  <button onClick={handleChangeFolder}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                    {savedDirLabel ? "Change folder" : "Choose folder"}
                  </button>
                  {lastSavedFile && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Save className="h-3 w-3" />
                      Last saved: <span className="font-medium">{lastSavedFile}</span>
                    </span>
                  )}
                  {!fsSupported && (
                    <span className="flex items-center gap-1 text-xs text-orange-500">
                      <AlertCircle className="h-3 w-3" />
                      Auto-save to folder needs Chrome or Edge — files will download normally
                    </span>
                  )}
                </div>
              </div>

              {/* ── Buttons ── */}
              <div className="flex items-center gap-2 flex-wrap">

                {/* Paper / printer size */}
                <div className="relative">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9"
                    onClick={() => { setShowPaperMenu(!showPaperMenu); setShowShareMenu(false) }}>
                    <Printer className="h-3.5 w-3.5" />
                    {paperSize === "thermal80mm" ? "Thermal" : paperSize.toUpperCase()}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                  {showPaperMenu && (
                    <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1">
                      <p className="px-3 pt-2 pb-1 text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                        Paper / printer size
                      </p>
                      {(Object.entries(PAPER_LABELS) as [PaperSize, string][]).map(([key, label]) => (
                        <button key={key}
                          onClick={() => {
                            setPaperSize(key)
                            setShowPaperMenu(false)
                            toast.info(`Paper: ${label.split("(")[0].trim()}`)
                          }}
                          className={`flex items-center justify-between w-full px-3 py-2.5 text-sm transition-colors
                            ${paperSize === key
                              ? "bg-rose-50 text-rose-700 font-semibold"
                              : "text-gray-700 hover:bg-gray-50"}`}>
                          {label}
                          {paperSize === key && <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" />}
                        </button>
                      ))}
                      <p className="px-3 py-2 text-[10px] text-gray-400 border-t border-gray-100 mt-1">
                        All printers connected to your system appear in the print dialog
                      </p>
                    </div>
                  )}
                </div>

                {/* Share */}
                <div className="relative">
                  <Button variant="outline"
                    onClick={() => { setShowShareMenu(!showShareMenu); setShowPaperMenu(false) }}>
                    <Share2 className="h-4 w-4 mr-2" />Share
                  </Button>
                  {showShareMenu && (
                    <div className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1 overflow-hidden">
                      {[
                        { id:"whatsapp", icon:<MessageCircle className="h-4 w-4 text-green-600"/>, label:"WhatsApp", hover:"hover:bg-green-50" },
                        { id:"email",    icon:<Mail className="h-4 w-4 text-blue-600"/>,           label:"Email",    hover:"hover:bg-blue-50"  },
                        { id:"telegram", icon:<MessageCircle className="h-4 w-4 text-sky-500"/>,   label:"Telegram", hover:"hover:bg-sky-50"   },
                      ].map(s => (
                        <button key={s.id} onClick={() => handleShare(s.id)}
                          className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 ${s.hover} transition-colors`}>
                          {s.icon}Share via {s.label}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 my-0.5" />
                      <button onClick={handleCopyLink}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Share2 className="h-4 w-4 text-gray-500" />Copy Link
                      </button>
                    </div>
                  )}
                </div>

                {/* Print only — instant fire */}
                <Button variant="outline" onClick={handlePrint} disabled={isPrinting} className="gap-2">
                  {isPrinting ? <Spinner className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
                  Print
                  {iframeReady && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                      <Zap className="h-3 w-3" />Ready
                    </span>
                  )}
                </Button>

                {/* ✨ PRIMARY BUTTON: save file then instantly print */}
                <Button
                  onClick={handleSaveAndPrint}
                  disabled={isPrinting || isSaving}
                  className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-md px-5">
                  {(isPrinting || isSaving)
                    ? <Spinner className="h-4 w-4" />
                    : (
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-4 w-4" />
                        <Printer className="h-4 w-4" />
                      </span>
                    )}
                  Save &amp; Print
                </Button>

                {/* Download printable HTML → user picks "Save as PDF" */}
                <Button variant="ghost" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="gap-2">
                  {isGeneratingPDF ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  PDF
                </Button>
              </div>
            </div>
          </div>

          {/* ════════════════════ INVOICE CONTENT ════════════════════ */}
          <div ref={invoiceRef} className="print-container">
            <Card className="p-6 bg-white shadow-lg print:shadow-none print:border-0">

              {/* Header */}
              <div className="invoice-header flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    {getInitials(salesOrder.organisation?.name || "AFK Berimah Hardware Shop")}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {salesOrder.organisation?.name || "AFK BERIMAH HARDWARE SHOP"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {salesOrder.organisation?.address || "14B, Northern Street, Greater South Avenue, Sunyani, USana"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{isPOS ? "RECEIPT" : "INVOICE"}</div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    {salesOrder.organisation?.phone && <>{salesOrder.organisation.phone}<br /></>}
                    {salesOrder.organisation?.email && salesOrder.organisation.email}
                  </div>
                </div>
              </div>

              {/* POS badge */}
              {isPOS && (
                <div className="mb-4 bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">POS Sale Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-600 font-medium">Sold By:</span>
                      <span className="text-xs font-semibold text-gray-900 ml-2">{salesOrder.createdBy?.name || "Cashier"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-600 font-medium">Payment Method:</span>
                      <span className="text-xs font-semibold text-gray-900 ml-2">{salesOrder.paymentMethod || "Cash"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bill To / Invoice Details */}
              <div className="invoice-details-section grid grid-cols-2 gap-6 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
                  <p className="font-bold text-sm mb-1 text-gray-900">{salesOrder.customer?.name || "Walk-in Customer"}</p>
                  <p className="text-xs leading-relaxed text-gray-600">
                    {salesOrder.customer?.address || "N/A"}<br />
                    {salesOrder.customer?.phone && <>{salesOrder.customer.phone}<br /></>}
                    {salesOrder.customer?.email && salesOrder.customer.email}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg border border-rose-200">
                  <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
                    {isPOS ? "Receipt Details" : "Invoice Details"}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">{isPOS ? "Receipt #:" : "Invoice #:"}</span>
                      <span className="font-bold text-xs text-gray-900">{salesOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Status:</span>
                      <span className="text-xs font-semibold px-2 py-1 bg-white rounded text-gray-900">{salesOrder.status}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Payment:</span>
                      <span className="text-xs font-semibold px-2 py-1 bg-white rounded text-gray-900">{salesOrder.paymentStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ship To */}
              {salesOrder.shippingAddress && (
                <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Ship To</h3>
                  <p className="text-xs leading-relaxed text-gray-700">{salesOrder.shippingAddress}</p>
                </div>
              )}

              {/* Dates */}
              <div className="dates-table grid grid-cols-3 gap-3 mb-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {isPOS ? "Sale Date" : "Invoice Date"}
                  </h3>
                  <p className="text-xs font-semibold text-gray-900">{formatDate(invoiceDate)}</p>
                </div>
                {!isPOS && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Terms</h3>
                    <p className="text-xs font-semibold text-gray-900">Net 30 Days</p>
                  </div>
                )}
                {!isPOS ? (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Due Date</h3>
                    <p className="text-xs font-semibold text-rose-600">{formatDate(dueDate)}</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Time</h3>
                    <p className="text-xs font-semibold text-gray-900">
                      {invoiceDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </div>

              {/* Items table */}
              <table className="items-table w-full mb-4 border-collapse overflow-hidden rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
                    <th className="p-2 text-left text-xs font-bold uppercase tracking-wider w-8">#</th>
                    <th className="p-2 text-left text-xs font-bold uppercase tracking-wider">Item &amp; Description</th>
                    <th className="p-2 text-center text-xs font-bold uppercase tracking-wider w-20">Qty</th>
                    <th className="p-2 text-right text-xs font-bold uppercase tracking-wider w-24">Rate</th>
                    <th className="p-2 text-right text-xs font-bold uppercase tracking-wider w-24">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {salesOrder.lines?.length > 0
                    ? salesOrder.lines.map((line: any, index: number) => {
                        const lineTotal = (line.quantity || 0) * (line.unitPrice || 0)
                        return (
                          <tr key={line.id} className="border-b border-gray-200">
                            <td className="p-2 text-xs text-gray-600">{index + 1}</td>
                            <td className="p-2">
                              <div className="font-semibold text-xs text-gray-900 mb-1">{line.item?.name || "Unknown Item"}</div>
                              <div className="text-xs text-gray-500">{line.item?.description || line.item?.sku || ""}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="text-xs font-semibold text-gray-900">{line.quantity.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">
                                {typeof line.item?.unit === "object"
                                  ? line.item?.unit?.name || line.item?.unit?.symbol || "Piece"
                                  : line.item?.unit || "Piece"}
                              </div>
                            </td>
                            <td className="p-2 text-right text-xs text-gray-900">{formatCurrency(line.unitPrice || 0)}</td>
                            <td className="p-2 text-right text-xs font-bold text-gray-900">{formatCurrency(lineTotal)}</td>
                          </tr>
                        )
                      })
                    : <tr><td colSpan={5} className="p-4 text-center text-gray-500 text-xs">No items found</td></tr>
                  }
                </tbody>
              </table>

              {/* Thank you */}
              <div className="mb-3 text-right">
                <p className="text-xs text-gray-600 italic">
                  {isPOS ? "Thank you for your purchase!" : "Thank you for your business!"}
                </p>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="totals-section w-80 bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between py-1 text-xs border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Tax ({taxRate}%)</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(taxAmount)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between py-1 text-xs border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Discount</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  {shippingCost > 0 && (
                    <div className="flex justify-between py-1 text-xs border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Shipping</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t-2 border-rose-500">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-rose-600">{formatCurrency(total)}</span>
                  </div>
                  {!isPOS && (
                    <div className="flex justify-between pt-2 mt-2 border-t border-gray-300 bg-rose-50 -mx-4 px-4 py-2 rounded-b-lg">
                      <span className="text-sm font-bold text-gray-900">Amount Due</span>
                      <span className="text-lg font-bold text-rose-600">{formatCurrency(total)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {salesOrder.notes && (
                <div className="notes-section mb-4 bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
                  <h3 className="text-xs font-bold mb-1 text-amber-900 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    Notes
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{salesOrder.notes}</p>
                </div>
              )}

              {/* Terms */}
              {!isPOS && (
                <div className="terms-section p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <h3 className="text-xs font-bold mb-2 text-gray-900 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    Terms &amp; Conditions
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Payment is due within 30 days of the invoice date. Late payments may incur additional
                    charges or interest as per applicable laws. Please make payment to the account details
                    provided or contact us for alternative payment methods.
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="footer-section mt-4 pt-3 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-600">
                  {salesOrder.organisation?.email || "info@afk.com"} | {salesOrder.organisation?.phone || "+233 (123) 456-7890"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isPOS ? "Thank you for your purchase!" : "Thank you for your business!"}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Click-away for dropdowns */}
      {(showShareMenu || showPaperMenu) && (
        <div className="fixed inset-0 z-40 no-print"
          onClick={() => { setShowShareMenu(false); setShowPaperMenu(false) }} />
      )}
    </>
  )
}