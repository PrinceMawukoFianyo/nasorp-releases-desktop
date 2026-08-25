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
function buildReceiptHTML(order: any, paperSize: PaperSize): string {
  const subtotal  = order.subtotal     || 0
  const taxAmount = order.taxAmount    || 0
  const discount  = order.discount     || 0
  const shipping  = order.shippingCost || 0
  const total     = subtotal + taxAmount + shipping - discount

  const createdAt   = new Date(order.createdAt)
  const dateStr     = createdAt.toLocaleDateString("en-GH", { month: "2-digit", day: "2-digit", year: "numeric" })
  const timeStr     = createdAt.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()
  const cashierName = order.createdBy?.name?.split(" ")[0]?.toUpperCase() || "CASHIER"

  // ── Items rows HTML ──────────────────────────────────────────────────────
  const itemRows = (order.lines ?? []).map((line: any) => {
    let displayQty   = line.quantity
    let displayDesc  = line.item?.name || "Unknown Item"
    let unitPrice    = line.unitPrice || 0
    let displayAmt   = (line.quantity || 0) * unitPrice

    try {
      if (line.notes) {
        const meta = JSON.parse(line.notes)
        if (meta.tierId) {
          displayQty   = `${meta.packQty} ${meta.tierName}`
          unitPrice   = meta.wholesalePricePerPack
          displayAmt  = meta.packQty * unitPrice
        }
      }
    } catch { /* plain notes */ }

    return `
      <tr>
        <td style="padding:3px 0;vertical-align:top;width:28px;white-space:nowrap;">${displayQty}</td>
        <td style="padding:3px 3px;vertical-align:top;word-break:break-word;">${displayDesc}</td>
        <td style="padding:3px 3px;vertical-align:top;text-align:right;white-space:nowrap;width:58px;">${unitPrice.toFixed(2)}</td>
        <td style="padding:3px 0 3px 3px;vertical-align:top;text-align:right;white-space:nowrap;width:62px;">${displayAmt.toFixed(2)}</td>
      </tr>`
  }).join("")

  // ── Totals rows ──────────────────────────────────────────────────────────
  let totalRows = `
    <tr>
      <td colspan="3" style="padding:3px 0;">SUBTOTAL</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;">GHS${subtotal.toFixed(2)}</td>
    </tr>`

  if (taxAmount > 0) totalRows += `
    <tr>
      <td colspan="3" style="padding:3px 0;">TAX</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;">GHS${taxAmount.toFixed(2)}</td>
    </tr>`

  if (discount > 0) totalRows += `
    <tr>
      <td colspan="3" style="padding:3px 0;color:#c00;">DISCOUNT</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;color:#c00;">-GHS${discount.toFixed(2)}</td>
    </tr>`

  if (shipping > 0) totalRows += `
    <tr>
      <td colspan="3" style="padding:3px 0;">SHIPPING</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;">GHS${shipping.toFixed(2)}</td>
    </tr>`

  totalRows += `
    <tr style="border-top:2px solid #000;font-size:${paperSize === "thermal80mm" ? "14px" : "15px"};">
      <td colspan="3" style="padding:6px 0 3px;">TOTAL</td>
      <td style="text-align:right;padding:6px 0 3px 3px;white-space:nowrap;">GHS${total.toFixed(2)}</td>
    </tr>`

  const customerSection = order.customer ? `
    <div style="border-top:1px dashed #000;margin:8px 0;padding-top:8px;font-size:13px;">
      <strong>CUSTOMER</strong><br>
      ${order.customer.name}
      ${order.customer.phone ? `<br>Tel: ${order.customer.phone}` : ""}
    </div>` : ""

  const ocrFontStack = `'Courier Prime', 'Courier New', Courier, monospace`

  const boldPrintBase = `
    * {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body, table, td, div, span, p {
      font-weight: 700;
      color: #000000 !important;
      text-shadow: 0.3px 0 0 #000, -0.3px 0 0 #000 !important;
      letter-spacing: 0.03em;
    }
    strong, b {
      font-weight: 800;
      text-shadow: 0.4px 0 0 #000, -0.4px 0 0 #000, 0 0.3px 0 #000 !important;
    }
    table { border-collapse: collapse; width: 100%; }
    td { vertical-align: top; }
    @media print { .no-print { display: none !important; } }`

  const thermalCSS = `
    @page { size: 80mm auto; margin: 0; }
    html, body {
      width: 70mm; margin: 0 auto; padding: 3mm;
      font-family: ${ocrFontStack}; font-size: 13px; line-height: 1.4; background: white;
    }`

  const letterCSS = `
    @page { size: letter; margin: 0.5in; }
    html, body { width: 100%; max-width: 3.5in; margin: 0 auto; padding: 0; font-family: ${ocrFontStack}; font-size: 14px; background: white; }`

  const a4CSS = `
    @page { size: A4; margin: 15mm; }
    html, body { width: 100%; max-width: 90mm; margin: 0 auto; padding: 0; font-family: ${ocrFontStack}; font-size: 14px; background: white; }`

  const pageCSS = paperSize === "a4" ? a4CSS : paperSize === "letter" ? letterCSS : thermalCSS

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${order.orderNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
  <style>${boldPrintBase} ${pageCSS}</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1.5px dashed #000;">
    <div style="font-weight:800;font-size:15px;letter-spacing:1px;">HABIFAZZY ENTERPRISE</div>
    <div style="font-size:13px;margin-top:2px;">Aprade-Mesewam Junction</div>
    <div style="font-size:13px;">Digital Address: AA-T1257-6693</div>
    <div style="font-size:13px;">Kumasi, Ghana</div>
    <div style="font-size:13px;margin-top:2px;">Tel: +233 246 668 686</div>
  </div>

  <div style="text-align:center;margin-bottom:8px;font-size:13px;">
    ${dateStr}&nbsp;&nbsp;${timeStr}<br>
    <span style="font-size:13px;font-weight:800;">RECEIPT NO. ${order.orderNumber}</span>
  </div>

  <table style="margin-bottom:6px;font-size:13px;table-layout:fixed;">
    <tr>
      <td>TABLE 1</td>
      <td style="text-align:right;">STAFF ${cashierName}</td>
    </tr>
    <tr>
      <td>${order.paymentMethod || "CASH"}</td>
      <td style="text-align:right;">REF: 19883</td>
    </tr>
  </table>

  <!-- Column headers with UNIT PRICE -->
  <table style="border-top:2.5px solid #000;border-bottom:1.5px solid #000;margin:6px 0;font-size:13px;table-layout:fixed;">
    <tr>
      <td style="padding:4px 0;width:28px;">QTY</td>
      <td style="padding:4px 3px;">DESC</td>
      <td style="padding:4px 3px;text-align:right;width:58px;">PRICE</td>
      <td style="padding:4px 0 4px 3px;text-align:right;width:62px;">AMT</td>
    </tr>
  </table>

  <!-- Items -->
  <table style="margin-bottom:6px;font-size:13px;table-layout:fixed;">
    ${itemRows}
  </table>

  <!-- Totals -->
  <div style="border-top:1.5px dashed #000;margin:6px 0;"></div>
  <table style="font-size:13px;table-layout:fixed;">
    ${totalRows}
  </table>

  ${customerSection}

  <div style="margin-top:10px;padding-top:8px;border-top:1.5px dashed #000;text-align:center;font-size:13px;">
    <strong>Thank you for your patronage!</strong><br>
    <span style="font-size:10px;">${order.orderNumber} - ${dateStr}</span>
  </div>
</body>
</html>`
}

export default function SimpleReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [salesOrder, setSalesOrder] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [paperSize, setPaperSize] = useState<PaperSize>("thermal80mm")
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => { loadSalesOrder() }, [orderId])

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

  const handlePrint = () => {
    if (!salesOrder) return
    setIsPrinting(true)
    const html = buildReceiptHTML(salesOrder, paperSize)
    const win = window.open("", "_blank", "width=400,height=600")
    if (!win) {
      toast.error("Please allow pop-ups for printing")
      setIsPrinting(false)
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.onload = () => {
      setTimeout(() => { win.print(); setTimeout(() => win.close(), 500) }, 800)
    }
    setTimeout(() => setIsPrinting(false), 1500)
  }

  const getReceiptText = () => {
    if (!salesOrder) return ""
    const s  = salesOrder.subtotal     || 0
    const t  = salesOrder.taxAmount    || 0
    const d  = salesOrder.discount     || 0
    const sh = salesOrder.shippingCost || 0
    const total = s + t + sh - d
    let txt = `🧾 *HABIFAZZY ENTERPRISE*\nReceipt ${salesOrder.orderNumber}\n${new Date(salesOrder.createdAt).toLocaleDateString()}\n\n*ITEMS:*\n`
    salesOrder.lines?.forEach((line: any) => {
      txt += `${line.quantity}x ${line.item?.name} @ GHS${(line.unitPrice||0).toFixed(2)} — GHS${((line.quantity||0)*(line.unitPrice||0)).toFixed(2)}\n`
    })
    txt += `\n*TOTAL: GHS${total.toFixed(2)}*\nPayment: ${salesOrder.paymentMethod || "CASH"}\n\nThank you for your patronage!`
    return txt
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getReceiptText())
      setCopied(true)
      toast.success("Receipt copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error("Failed to copy receipt") }
  }

  const handleDownloadTxt = () => {
    const blob = new Blob([getReceiptText()], { type: "text/plain" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `receipt-${salesOrder?.orderNumber}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast.success("Receipt downloaded")
  }

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

  const subtotal  = salesOrder.subtotal     || 0
  const taxAmount = salesOrder.taxAmount    || 0
  const discount  = salesOrder.discount     || 0
  const shipping  = salesOrder.shippingCost || 0
  const total     = subtotal + taxAmount + shipping - discount
  const ocrFont   = `'Courier Prime', 'Courier New', Courier, monospace`

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');`}</style>

      {/* Toolbar */}
      <div className="max-w-lg mx-auto mb-5">
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/dashboard/sales/pos" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> POS
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Home className="w-4 h-4" /> Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopyToClipboard}>
                  {copied ? <><Check className="w-4 h-4 mr-2 text-green-600" /><span className="text-green-600">Copied!</span></>
                          : <><Copy className="w-4 h-4 mr-2" />Copy to Clipboard</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTxt}>
                  <Download className="w-4 h-4 mr-2" />Download as Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={handlePrint} disabled={isPrinting} className="gap-1.5 text-xs min-w-[110px]">
              {isPrinting ? <Spinner className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
              {isPrinting ? "Printing…" : "Print Receipt"}
            </Button>
          </div>
        </div>
      </div>

      {/* Screen Preview */}
      <div className="max-w-xs mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-5 leading-relaxed" style={{ fontFamily: ocrFont, fontSize: "13px", fontWeight: 700 }}>

            {/* Store header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
              <div style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "1px" }}>HABIFAZZY ENTERPRISE</div>
              <div className="text-gray-700 mt-0.5" style={{ fontSize: "13px" }}>Aprade-mesewam junction</div>
              <div className="text-gray-700" style={{ fontSize: "13px" }}>Digital Address: AA-T1257-6693</div>
              <div className="text-gray-700" style={{ fontSize: "13px" }}>Aprade, Ghana</div>
              <div className="text-gray-700 mt-0.5" style={{ fontSize: "13px" }}>Tel: 0246668686/ 0593041947</div>
            </div>

            {/* Receipt meta */}
            <div className="text-center mb-3" style={{ fontSize: "13px" }}>
              <div className="text-gray-800">
                {new Date(salesOrder.createdAt).toLocaleDateString("en-GH", { month: "2-digit", day: "2-digit", year: "numeric" })}
                &nbsp;&nbsp;
                {new Date(salesOrder.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()}
              </div>
              <div style={{ fontWeight: 800, fontSize: "14px" }} className="mt-1">RECEIPT NO. {salesOrder.orderNumber}</div>
            </div>

            <div className="flex justify-between text-gray-800 mb-1" style={{ fontSize: "13px" }}>
              <span>TABLE 1</span>
              <span>STAFF {salesOrder.createdBy?.name?.split(" ")[0]?.toUpperCase() || "CASHIER"}</span>
            </div>
            <div className="flex justify-between text-gray-800 mb-3" style={{ fontSize: "13px" }}>
              <span>{salesOrder.paymentMethod || "CASH"}</span>
              <span className="text-gray-500">REF: 19883</span>
            </div>

            {/* Column headers */}
            <div className="flex justify-between border-t-2 border-b border-black py-1.5 mb-2" style={{ fontWeight: 800, fontSize: "13px" }}>
              <span style={{ width: "28px", flexShrink: 0 }}>QTY</span>
              <span className="flex-1 px-1">DESC</span>
              <span style={{ width: "58px", textAlign: "right", flexShrink: 0 }}>PRICE</span>
              <span style={{ width: "62px", textAlign: "right", flexShrink: 0 }}>AMT</span>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 mb-3" style={{ fontSize: "13px" }}>
              {salesOrder.lines?.map((line: any) => {
                let displayQty  = `${line.quantity}`
                let displayDesc = line.item?.name || "Unknown"
                let unitPrice   = line.unitPrice || 0
                let displayAmt  = (line.quantity || 0) * unitPrice

                try {
                  if (line.notes) {
                    const meta = JSON.parse(line.notes)
                    if (meta.tierId) {
                      displayQty = `${meta.packQty} ${meta.tierName}`
                      unitPrice  = meta.wholesalePricePerPack
                      displayAmt = meta.packQty * unitPrice
                    }
                  }
                } catch { /* ok */ }

                return (
                  <div key={line.id} className="flex items-start">
                    <span style={{ width: "28px", flexShrink: 0, fontWeight: 700 }}>{displayQty}</span>
                    <span className="flex-1 px-1">{displayDesc}</span>
                    <span style={{ width: "58px", textAlign: "right", flexShrink: 0, fontWeight: 700 }}>
                      {unitPrice.toFixed(2)}
                    </span>
                    <span style={{ width: "62px", textAlign: "right", flexShrink: 0, fontWeight: 700 }}>
                      {displayAmt.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-gray-400 pt-2 space-y-1" style={{ fontSize: "13px" }}>
              {[
                { label: "SUBTOTAL", value: subtotal,  show: true },
                { label: "TAX",      value: taxAmount,  show: taxAmount > 0 },
                { label: "SHIPPING", value: shipping,   show: shipping > 0 },
              ].filter(r => r.show).map(r => (
                <div key={r.label} className="flex items-center">
                  <span className="flex-1">{r.label}</span>
                  <span style={{ width: "90px", textAlign: "right", flexShrink: 0 }}>GHS{r.value.toFixed(2)}</span>
                </div>
              ))}
              {discount > 0 && (
                <div className="flex items-center text-red-600">
                  <span className="flex-1">DISCOUNT</span>
                  <span style={{ width: "90px", textAlign: "right", flexShrink: 0 }}>-GHS{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center border-t-2 border-black pt-2 mt-1" style={{ fontWeight: 800, fontSize: "14px" }}>
                <span className="flex-1">TOTAL</span>
                <span style={{ width: "90px", textAlign: "right", flexShrink: 0 }}>GHS{total.toFixed(2)}</span>
              </div>
            </div>

            {salesOrder.customer && (
              <div className="border-t border-dashed border-gray-400 pt-2 mt-3" style={{ fontSize: "13px" }}>
                <div style={{ fontWeight: 800 }}>CUSTOMER</div>
                <div className="text-gray-800">{salesOrder.customer.name}</div>
                {salesOrder.customer.phone && <div className="text-gray-800">Tel: {salesOrder.customer.phone}</div>}
              </div>
            )}

            <div className="border-t border-dashed border-gray-400 mt-3 pt-3 text-center" style={{ fontSize: "13px" }}>
              <div style={{ fontWeight: 800 }}>Thank you for your patronage!</div>
              <div className="text-gray-500 mt-1" style={{ fontSize: "10px" }}>
                {salesOrder.orderNumber} - {new Date(salesOrder.createdAt).toLocaleDateString()}
              </div>
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