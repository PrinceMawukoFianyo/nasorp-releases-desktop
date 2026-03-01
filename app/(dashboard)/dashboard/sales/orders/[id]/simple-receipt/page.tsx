// app/dashboard/sales/order/[id]/simple-receipt/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, Printer, Share2, Home, Copy, Check, Download, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getSalesOrderById } from "@/actions/sales-orders"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type PaperSize = "thermal80mm" | "letter" | "a4"

const PAPER_LABELS: Record<PaperSize, string> = {
  thermal80mm: "Thermal 80mm (Default)",
  letter: "Letter (8.5 × 11 in)",
  a4: "A4 (210 × 297 mm)",
}

// ─── Build self-contained receipt HTML ───────────────────────────────────────
// This generates HTML with its OWN embedded styles so it renders correctly
// in a popup window that has no access to Tailwind or any parent CSS.

function buildReceiptHTML(order: any, paperSize: PaperSize): string {
  const subtotal    = order.subtotal    || 0
  const taxAmount   = order.taxAmount   || 0
  const discount    = order.discount    || 0
  const shipping    = order.shippingCost || 0
  const total       = subtotal + taxAmount + shipping - discount

  const createdAt   = new Date(order.createdAt)
  const dateStr     = createdAt.toLocaleDateString("en-GH", { month: "2-digit", day: "2-digit", year: "numeric" })
  const timeStr     = createdAt.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()
  const cashierName = order.createdBy?.name?.split(" ")[0]?.toUpperCase() || "CASHIER"

  // ── Items rows HTML ──────────────────────────────────────────────────────
  const itemRows = (order.lines ?? []).map((line: any) => {
    // Try to parse wholesale metadata from notes
    let displayQty   = line.quantity
    let displayDesc  = line.item?.name || "Unknown Item"
    let displayAmt   = (line.quantity || 0) * (line.unitPrice || 0)

    try {
      if (line.notes) {
        const meta = JSON.parse(line.notes)
        if (meta.tierId) {
          displayQty  = `${meta.packQty} ${meta.tierName}`
          displayAmt  = meta.packQty * meta.wholesalePricePerPack
        }
      }
    } catch { /* plain notes */ }

    return `
      <tr>
        <td style="padding:2px 0;vertical-align:top;width:10%;white-space:nowrap;">${displayQty}</td>
        <td style="padding:2px 4px;vertical-align:top;">${displayDesc}</td>
        <td style="padding:2px 0;vertical-align:top;text-align:right;white-space:nowrap;">GHS${displayAmt.toFixed(2)}</td>
      </tr>`
  }).join("")

  // ── Totals rows ──────────────────────────────────────────────────────────
  let totalRows = `
    <tr>
      <td colspan="2" style="padding:2px 0;">SUBTOTAL</td>
      <td style="text-align:right;padding:2px 0;">GHS${subtotal.toFixed(2)}</td>
    </tr>`

  if (taxAmount > 0) totalRows += `
    <tr>
      <td colspan="2" style="padding:2px 0;">TAX</td>
      <td style="text-align:right;padding:2px 0;">GHS${taxAmount.toFixed(2)}</td>
    </tr>`

  if (discount > 0) totalRows += `
    <tr>
      <td colspan="2" style="padding:2px 0;color:#c00;">DISCOUNT</td>
      <td style="text-align:right;padding:2px 0;color:#c00;">-GHS${discount.toFixed(2)}</td>
    </tr>`

  if (shipping > 0) totalRows += `
    <tr>
      <td colspan="2" style="padding:2px 0;">SHIPPING</td>
      <td style="text-align:right;padding:2px 0;">GHS${shipping.toFixed(2)}</td>
    </tr>`

  totalRows += `
    <tr style="border-top:2px solid #000;font-weight:bold;font-size:${paperSize === "thermal80mm" ? "12px" : "14px"};">
      <td colspan="2" style="padding:4px 0 2px;">TOTAL</td>
      <td style="text-align:right;padding:4px 0 2px;">GHS${total.toFixed(2)}</td>
    </tr>`

  // ── Customer section ─────────────────────────────────────────────────────
  const customerSection = order.customer ? `
    <div style="border-top:1px dashed #aaa;margin:6px 0;padding-top:6px;font-size:9px;">
      <strong>CUSTOMER</strong><br>
      ${order.customer.name}
      ${order.customer.phone ? `<br>Tel: ${order.customer.phone}` : ""}
    </div>` : ""

  // ── Paper-specific CSS ───────────────────────────────────────────────────
  const thermalCSS = `
    @page {
      size: 80mm auto;
      margin: 0;
    }
    html, body {
      width: 76mm;
      margin: 0 auto;
      padding: 3mm 0 5mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.35;
      background: white;
      color: #000;
    }`

  const letterCSS = `
    @page {
      size: letter;
      margin: 0.5in;
    }
    html, body {
      width: 100%;
      max-width: 3.5in;
      margin: 0 auto;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.4;
      background: white;
      color: #000;
    }`

  const a4CSS = `
    @page {
      size: A4;
      margin: 15mm;
    }
    html, body {
      width: 100%;
      max-width: 90mm;
      margin: 0 auto;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.4;
      background: white;
      color: #000;
    }`

  const pageCSS = paperSize === "a4" ? a4CSS : paperSize === "letter" ? letterCSS : thermalCSS

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    ${pageCSS}
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; }
    .divider-solid  { border-top: 2px solid #000; margin: 4px 0; }
    .divider-dashed { border-top: 1px dashed #aaa; margin: 4px 0; }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Store Header -->
  <div style="text-align:center;margin-bottom:6px;padding-bottom:6px;border-bottom:1px dashed #aaa;">
    <div style="font-weight:bold;font-size:${paperSize === "thermal80mm" ? "13px" : "15px"};letter-spacing:0.5px;">
      AFK BERIMAH ENTERPRISE
    </div>
    <div style="font-size:9px;margin-top:2px;">Near Bokankye Police Check Point</div>
    <div style="font-size:9px;">Digital Address: AA-T1257-6693</div>
    <div style="font-size:9px;">Kumasi, Ghana</div>
    <div style="font-size:9px;margin-top:2px;">Tel: +233 546 722 768</div>
  </div>

  <!-- Date / Receipt Number -->
  <div style="text-align:center;margin-bottom:6px;font-size:9px;">
    ${dateStr}&nbsp;&nbsp;${timeStr}<br>
    <strong style="font-size:10px;">RECEIPT #${order.orderNumber}</strong>
  </div>

  <!-- Transaction meta -->
  <table style="margin-bottom:4px;font-size:9px;">
    <tr>
      <td>TABLE 1</td>
      <td style="text-align:right;">STAFF ${cashierName}</td>
    </tr>
    <tr>
      <td>${order.paymentMethod || "CASH"}</td>
      <td style="text-align:right;color:#aaa;">#########19883</td>
    </tr>
  </table>

  <!-- Column headers -->
  <table style="border-top:2px solid #000;border-bottom:1px solid #000;margin:4px 0;font-weight:bold;font-size:9px;">
    <tr>
      <td style="padding:2px 0;width:10%;">QTY</td>
      <td style="padding:2px 4px;">DESC</td>
      <td style="padding:2px 0;text-align:right;">AMT</td>
    </tr>
  </table>

  <!-- Items -->
  <table style="margin-bottom:4px;font-size:9px;">
    ${itemRows}
  </table>

  <!-- Totals -->
  <div class="divider-dashed"></div>
  <table style="font-size:9px;">
    ${totalRows}
  </table>

  ${customerSection}

  <!-- Footer -->
  <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #aaa;text-align:center;font-size:9px;">
    <strong>Thank you for your patronage!</strong><br>
    <span style="color:#aaa;font-size:8px;">${order.orderNumber} • ${dateStr}</span>
    <div style="margin-top:6px;width:40px;height:40px;background:#f0f0f0;display:inline-flex;
                align-items:center;justify-content:center;font-size:7px;color:#aaa;">
      QR CODE
    </div>
  </div>

</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SimpleReceiptPage() {
  const params  = useParams()
  const router  = useRouter()
  const orderId = params.id as string

  const [isLoading,  setIsLoading]  = useState(true)
  const [salesOrder, setSalesOrder] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [paperSize,  setPaperSize]  = useState<PaperSize>("thermal80mm")
  const [showMenu,   setShowMenu]   = useState(false)

  useEffect(() => {
    loadSalesOrder()
  }, [orderId])

  const loadSalesOrder = async () => {
    try {
      setIsLoading(true)
      const order = await getSalesOrderById(orderId)
      if (!order) {
        toast.error("Receipt not found")
        router.push("/dashboard/sales/pos")
        return
      }
      setSalesOrder(order)
    } catch {
      toast.error("Failed to load receipt")
      router.push("/dashboard/sales/pos")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Print: open self-contained HTML in a popup ───────────────────────────
  const handlePrint = () => {
    if (!salesOrder) return
    setIsPrinting(true)

    const html = buildReceiptHTML(salesOrder, paperSize)
    const win  = window.open("", "_blank", "width=400,height=600")

    if (!win) {
      toast.error("Please allow pop-ups for printing")
      setIsPrinting(false)
      return
    }

    win.document.open()
    win.document.write(html)
    win.document.close()

    // Give images/fonts a moment then auto-print
    win.onload = () => {
      setTimeout(() => {
        win.print()
        setTimeout(() => win.close(), 500)
      }, 150)
    }

    setTimeout(() => setIsPrinting(false), 1500)
  }

  // ── Plain-text receipt for sharing ──────────────────────────────────────
  const getReceiptText = () => {
    if (!salesOrder) return ""
    const subtotal = salesOrder.subtotal || 0
    const taxAmount = salesOrder.taxAmount || 0
    const discount  = salesOrder.discount || 0
    const shipping  = salesOrder.shippingCost || 0
    const total     = subtotal + taxAmount + shipping - discount

    let t = `🧾 *AFK BERIMAH ENTERPRISE*\n`
    t += `Receipt #${salesOrder.orderNumber}\n`
    t += `${new Date(salesOrder.createdAt).toLocaleDateString()}\n\n`
    t += `*ITEMS:*\n`
    salesOrder.lines?.forEach((line: any) => {
      t += `${line.quantity}x ${line.item?.name} — GHS${((line.quantity || 0) * (line.unitPrice || 0)).toFixed(2)}\n`
    })
    t += `\n*TOTAL: GHS${total.toFixed(2)}*\n`
    t += `Payment: ${salesOrder.paymentMethod || "CASH"}\n\n`
    t += `Thank you for your patronage!`
    return t
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getReceiptText())
      setCopied(true)
      toast.success("Receipt copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy receipt")
    }
  }

  const handleDownloadTxt = () => {
    const blob = new Blob([getReceiptText()], { type: "text/plain" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `receipt-${salesOrder?.orderNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Receipt downloaded")
  }

  // ── Loading / Not found ──────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spinner className="size-8 mr-3" />
      <p className="text-muted-foreground">Loading receipt…</p>
    </div>
  )

  if (!salesOrder) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-muted-foreground mr-4">Receipt not found</p>
      <Button onClick={() => router.push("/dashboard/sales/pos")}>Back to POS</Button>
    </div>
  )

  // ── Derived totals for screen preview ───────────────────────────────────
  const subtotal  = salesOrder.subtotal    || 0
  const taxAmount = salesOrder.taxAmount   || 0
  const discount  = salesOrder.discount    || 0
  const shipping  = salesOrder.shippingCost || 0
  const total     = subtotal + taxAmount + shipping - discount

  return (
    <div className="min-h-screen bg-gray-100 p-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto mb-5">
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-3">

          {/* Navigation */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/dashboard/sales/pos"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> POS
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/dashboard"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Home className="w-4 h-4" /> Dashboard
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* Paper size picker */}
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowMenu(v => !v)} className="gap-1.5 text-xs">
                <Printer className="w-3.5 h-3.5" />
                {paperSize === "thermal80mm" ? "Thermal" : paperSize.toUpperCase()}
                <ChevronDown className="w-3 h-3" />
              </Button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border z-50 py-1">
                    {(Object.entries(PAPER_LABELS) as [PaperSize, string][]).map(([key, label]) => (
                      <button key={key}
                        onClick={() => { setPaperSize(key); setShowMenu(false); toast.info(`Paper: ${label}`) }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors
                          ${paperSize === key ? "bg-rose-50 text-rose-600 font-semibold" : "text-gray-700"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Share */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopyToClipboard}>
                  {copied
                    ? <><Check className="w-4 h-4 mr-2 text-green-600" /><span className="text-green-600">Copied!</span></>
                    : <><Copy className="w-4 h-4 mr-2" />Copy to Clipboard</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTxt}>
                  <Download className="w-4 h-4 mr-2" />Download as Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Print */}
            <Button size="sm" onClick={handlePrint} disabled={isPrinting} className="gap-1.5 text-xs min-w-[110px]">
              {isPrinting ? <Spinner className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
              {isPrinting ? "Printing…" : "Print Receipt"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Screen Preview ───────────────────────────────────────────────── */}
      {/* This preview uses Tailwind/Shadcn classes normally — only for display */}
      <div className="max-w-xs mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 font-mono text-[11px] leading-relaxed">

            {/* Store header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
              <div className="font-bold text-sm tracking-tight">AFK BERIMAH ENTERPRISE</div>
              <div className="text-gray-500 mt-0.5">Near Bokankye Police Check Point</div>
              <div className="text-gray-500">Digital Address: AA-T1257-6693</div>
              <div className="text-gray-500">Kumasi, Ghana</div>
              <div className="text-gray-500 mt-0.5">Tel: +233 546 722 768</div>
            </div>

            {/* Receipt meta */}
            <div className="text-center mb-3">
              <div className="text-gray-500">
                {new Date(salesOrder.createdAt).toLocaleDateString("en-GH", { month: "2-digit", day: "2-digit", year: "numeric" })}
                &nbsp;&nbsp;
                {new Date(salesOrder.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()}
              </div>
              <div className="font-bold mt-1">RECEIPT #{salesOrder.orderNumber}</div>
            </div>

            {/* Staff / payment method */}
            <div className="flex justify-between text-gray-500 mb-3">
              <span>TABLE 1</span>
              <span>STAFF {salesOrder.createdBy?.name?.split(" ")[0]?.toUpperCase() || "CASHIER"}</span>
            </div>
            <div className="flex justify-between text-gray-500 mb-3">
              <span>{salesOrder.paymentMethod || "CASH"}</span>
              <span className="text-gray-300">#########19883</span>
            </div>

            {/* Column headers */}
            <div className="flex justify-between font-bold border-t-2 border-b border-black py-1 mb-2">
              <span className="w-12">QTY</span>
              <span className="flex-1">DESC</span>
              <span>AMT</span>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 mb-3">
              {salesOrder.lines?.map((line: any) => {
                let displayQty  = `${line.quantity}`
                let displayDesc = line.item?.name || "Unknown"
                let displayAmt  = (line.quantity || 0) * (line.unitPrice || 0)
                try {
                  if (line.notes) {
                    const meta = JSON.parse(line.notes)
                    if (meta.tierId) {
                      displayQty  = `${meta.packQty} ${meta.tierName}`
                      displayAmt  = meta.packQty * meta.wholesalePricePerPack
                    }
                  }
                } catch { /* ok */ }

                return (
                  <div key={line.id} className="flex items-start gap-2">
                    <span className="w-12 shrink-0 font-semibold">{displayQty}</span>
                    <span className="flex-1">{displayDesc}</span>
                    <span className="shrink-0 font-semibold">GHS{displayAmt.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
              <div className="flex justify-between"><span>SUBTOTAL</span><span>GHS{subtotal.toFixed(2)}</span></div>
              {taxAmount > 0 && <div className="flex justify-between"><span>TAX</span><span>GHS{taxAmount.toFixed(2)}</span></div>}
              {discount  > 0 && <div className="flex justify-between text-red-600"><span>DISCOUNT</span><span>-GHS{discount.toFixed(2)}</span></div>}
              {shipping  > 0 && <div className="flex justify-between"><span>SHIPPING</span><span>GHS{shipping.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-sm border-t-2 border-black pt-2 mt-1">
                <span>TOTAL</span>
                <span>GHS{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Customer */}
            {salesOrder.customer && (
              <div className="border-t border-dashed border-gray-300 pt-2 mt-3">
                <div className="font-bold">CUSTOMER</div>
                <div className="text-gray-600">{salesOrder.customer.name}</div>
                {salesOrder.customer.phone && <div className="text-gray-600">Tel: {salesOrder.customer.phone}</div>}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-dashed border-gray-300 mt-3 pt-3 text-center">
              <div className="font-bold">Thank you for your patronage!</div>
              <div className="text-gray-400 text-[9px] mt-1">{salesOrder.orderNumber} • {new Date(salesOrder.createdAt).toLocaleDateString()}</div>
              <div className="mt-3 w-10 h-10 bg-gray-100 rounded mx-auto flex items-center justify-center text-[7px] text-gray-400">QR CODE</div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">
          Preview · Paper: <strong>{PAPER_LABELS[paperSize]}</strong>
        </p>
      </div>
    </div>
  )
}