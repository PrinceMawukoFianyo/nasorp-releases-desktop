// app/dashboard/sales/order/[id]/simple-receipt/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, Printer, Share2, Home, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getSalesOrderById } from "@/actions/sales-orders"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SimpleReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [salesOrder, setSalesOrder] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [copied, setCopied] = useState(false)

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
    } catch (error) {
      console.error("Failed to load receipt:", error)
      toast.error("Failed to load receipt")
      router.push("/dashboard/sales/pos")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  const getReceiptText = () => {
    const subtotal = salesOrder.subtotal || 0
    const taxAmount = salesOrder.taxAmount || 0
    const discount = salesOrder.discount || 0
    const shippingCost = salesOrder.shippingCost || 0
    const total = subtotal + taxAmount + shippingCost - discount

    let text = `🧾 *AFK BERIMAH HARDWARE*\n`
    text += `Receipt #${salesOrder.orderNumber}\n`
    text += `${new Date(salesOrder.createdAt).toLocaleDateString()}\n\n`
    
    text += `*ITEMS:*\n`
    salesOrder.lines?.forEach((line: any) => {
      text += `${line.quantity}x ${line.item?.name} - GHS${((line.quantity || 0) * (line.unitPrice || 0)).toFixed(2)}\n`
    })
    
    text += `\n*TOTAL: GHS${total.toFixed(2)}*\n`
    text += `Payment: ${salesOrder.paymentMethod || 'CASH'}\n\n`
    text += `Thank you for your business!`
    
    return text
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getReceiptText())
      setCopied(true)
      toast.success("Receipt copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy receipt")
    }
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getReceiptText())
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleShareTelegram = () => {
    const text = encodeURIComponent(getReceiptText())
    window.open(`https://t.me/share/url?url=${window.location.href}&text=${text}`, '_blank')
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Receipt from AFK BERIMAH HARDWARE - ${salesOrder.orderNumber}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${window.location.href}`, '_blank')
  }

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Receipt ${salesOrder.orderNumber}`)
    const body = encodeURIComponent(getReceiptText())
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (!salesOrder) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Receipt not found</p>
          <Button onClick={() => router.push("/dashboard/pos")}>
            Back to POS
          </Button>
        </div>
      </div>
    )
  }

  const subtotal = salesOrder.subtotal || 0
  const taxAmount = salesOrder.taxAmount || 0
  const discount = salesOrder.discount || 0
  const shippingCost = salesOrder.shippingCost || 0
  const total = subtotal + taxAmount + shippingCost - discount

  return (
    <div className="min-h-screen bg-gray-50 p-4 print:p-0 print:bg-white">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      {/* Top Navigation Bar - No Print */}
      <div className="max-w-4xl mx-auto mb-6 no-print">
        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/sales/pos"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to POS
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleCopyToClipboard}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareWhatsApp}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareTelegram}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Telegram
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareTwitter}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Twitter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareFacebook}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareEmail}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="default" size="sm" onClick={handlePrint} disabled={isPrinting}>
              {isPrinting ? <Spinner className="w-4 h-4 mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Preview Container */}
      <div className="max-w-sm mx-auto no-print mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100">
          <ReceiptContent salesOrder={salesOrder} subtotal={subtotal} taxAmount={taxAmount} discount={discount} shippingCost={shippingCost} total={total} />
        </div>
      </div>

      {/* Print Version - Hidden on screen */}
      <div className="hidden print:block">
        <ReceiptContent salesOrder={salesOrder} subtotal={subtotal} taxAmount={taxAmount} discount={discount} shippingCost={shippingCost} total={total} />
      </div>
    </div>
  )
}

// Separate Receipt Content Component
function ReceiptContent({ salesOrder, subtotal, taxAmount, discount, shippingCost, total }: any) {
  return (
    <div className="text-center font-mono text-sm print:text-xs">
      {/* Store Header */}
      <div className="mb-4 pb-4 border-b-2 border-dashed border-gray-300">
        <h2 className="font-bold text-lg uppercase tracking-tight">AFK BERIMAH HARDWARE</h2>
        <p className="text-xs mt-1">14B, Northern Street</p>
        <p className="text-xs">Greater South Avenue</p>
        <p className="text-xs">Sunyani, Ghana</p>
        <p className="text-xs mt-1">Tel: +233 123 456 789</p>
      </div>

      {/* Date and Time */}
      <div className="mb-4">
        <p className="text-xs">
          {new Date(salesOrder.createdAt).toLocaleDateString('en-GH', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })}
          &nbsp;&nbsp;
          {new Date(salesOrder.createdAt).toLocaleTimeString('en-GH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).toUpperCase()}
        </p>
        <p className="text-xs font-bold mt-2">RECEIPT #{salesOrder.orderNumber}</p>
      </div>

      {/* Transaction Details */}
      <div className="mb-4 text-left">
        <div className="flex justify-between text-xs mb-1">
          <span>TABLE 1</span>
          <span>STAFF {salesOrder.createdBy?.name?.split(' ')[0]?.toUpperCase() || 'CASHIER'}</span>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <span>{salesOrder.paymentMethod || 'CASH'}</span>
          <span className="text-gray-400">#########19883</span>
        </div>

        {/* Header Row */}
        <div className="flex justify-between text-xs font-bold border-b-2 border-black mb-2 pb-1">
          <span className="w-8">QTY</span>
          <span className="flex-1">DESC</span>
          <span className="w-20 text-right">AMT</span>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {salesOrder.lines?.map((line: any) => (
            <div key={line.id} className="flex justify-between items-start text-xs">
              <span className="w-8 font-semibold">{line.quantity}</span>
              <span className="flex-1 text-left mx-2 leading-tight">
                {line.item?.name || "Unknown Item"}
              </span>
              <span className="w-20 text-right font-semibold">
                GHS{((line.quantity || 0) * (line.unitPrice || 0)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="border-t-2 border-dashed border-gray-400 my-3"></div>

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>SUBTOTAL</span>
            <span>GHS{subtotal.toFixed(2)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span>TAX</span>
              <span>GHS{taxAmount.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>DISCOUNT</span>
              <span>-GHS{discount.toFixed(2)}</span>
            </div>
          )}
          {shippingCost > 0 && (
            <div className="flex justify-between">
              <span>SHIPPING</span>
              <span>GHS{shippingCost.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2 mt-2">
            <span>TOTAL</span>
            <span>GHS{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      {salesOrder.customer && (
        <div className="mb-4 text-left border-t-2 border-dashed border-gray-300 pt-3">
          <p className="text-xs font-bold">CUSTOMER</p>
          <p className="text-xs mt-1">{salesOrder.customer.name}</p>
          {salesOrder.customer.phone && (
            <p className="text-xs">Tel: {salesOrder.customer.phone}</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-xs border-t-2 border-dashed border-gray-300 pt-3">
        <p className="font-semibold">Thank you for your business!</p>
        <p className="mt-2 text-[10px] text-gray-600">For returns, present receipt within 7 days</p>
        <p className="mt-2 text-[10px] text-gray-400">
          {salesOrder.orderNumber} • {new Date(salesOrder.createdAt).toLocaleDateString()}
        </p>
        <div className="mt-3 flex justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-[8px] text-gray-400">QR CODE</span>
          </div>
        </div>
      </div>
    </div>
  )
}