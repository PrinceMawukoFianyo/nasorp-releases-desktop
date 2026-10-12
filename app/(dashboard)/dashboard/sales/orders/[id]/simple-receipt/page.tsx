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
import { buildReceiptHTML, getLinePricing, printHTML, type PaperSize } from "@/lib/receipt-print"

const PAPER_LABELS: Record<PaperSize, string> = {
  thermal80mm: "Thermal 80mm (Default)",
  letter: "Letter (8.5 × 11 in)",
  a4: "A4 (210 × 297 mm)",
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

  const handlePrint = async () => {
  if (!salesOrder) return
  setIsPrinting(true)
  try {
    await printHTML(buildReceiptHTML(salesOrder, paperSize))
  } catch {
    toast.error("Failed to print receipt")
  } finally {
    setTimeout(() => setIsPrinting(false), 1000)
  }
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
      const p = getLinePricing(line)
      if (p.isWholesale) {
        txt += `${p.displayQty}x ${p.displayDesc}${p.tierLabel ? ` (${p.tierLabel})` : ""} — GHS${p.displayAmt.toFixed(2)}\n`
      } else {
        txt += `${p.displayQty}x ${p.displayDesc} @ GHS${p.retailUnitPrice.toFixed(2)} — GHS${p.displayAmt.toFixed(2)}\n`
      }
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
  const ocrFont   = `'Share Tech Mono', 'Courier New', Courier, monospace`

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');`}</style>

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
              <span style={{ width: "24px", flexShrink: 0 }}>QTY</span>
              <span className="flex-1 px-1">DESC</span>
              <span style={{ width: "58px", textAlign: "right", flexShrink: 0 }}>PRICE</span>
              <span style={{ width: "62px", textAlign: "right", flexShrink: 0 }}>AMT</span>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 mb-3" style={{ fontSize: "13px" }}>
              {salesOrder.lines?.map((line: any) => {
                const p = getLinePricing(line)
                return (
                  <div key={line.id} className="flex items-start">
                    <span style={{ width: "24px", flexShrink: 0, fontWeight: 700 }}>{p.displayQty}</span>
                    <span className="flex-1 px-1">
                      {p.displayDesc}
                      {p.isWholesale && (
                        <div style={{ fontSize: "9px", marginTop: "1px" }}>
                          <span
                            className="inline-block rounded px-1 mr-1"
                            style={{ fontWeight: 800, fontSize: "9px", background: "#fff1f2", color: "#e11d48" }}
                          >
                            WHOLESALE
                          </span>
                          <span style={{ opacity: 0.65, fontWeight: 500 }}>{p.tierLabel || "pack"}</span>
                        </div>
                      )}
                    </span>
                    <span style={{ width: "58px", textAlign: "right", flexShrink: 0, fontWeight: 700 }}>
                      {p.isWholesale ? (
                        <>
                          {p.retailPerPack > 0 && (
                            <div style={{ fontSize: "9px", textDecoration: "line-through", opacity: 0.55, fontWeight: 500 }}>
                              {p.retailPerPack.toFixed(2)}
                            </div>
                          )}
                          <div>{p.wholesalePerPack.toFixed(2)}</div>
                        </>
                      ) : (
                        p.retailUnitPrice.toFixed(2)
                      )}
                    </span>
                    <span style={{ width: "62px", textAlign: "right", flexShrink: 0, fontWeight: 700 }}>
                      {p.displayAmt.toFixed(2)}
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
              <div className="mt-3 w-10 h-10 bg-gray-100 rounded mx-auto flex items-center justify-center text-gray-400"
                style={{ fontSize: "7px" }}>QR CODE</div>
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