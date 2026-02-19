"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, Download, Printer, Mail, Share2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getSalesOrderById } from "@/actions/sales-orders"
import { formatCurrency, formatDate } from "../../so-utils"

export default function SalesOrderInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const invoiceRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [salesOrder, setSalesOrder] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  useEffect(() => {
    loadSalesOrder()
  }, [orderId])

  const loadSalesOrder = async () => {
    try {
      setIsLoading(true)
      const order = await getSalesOrderById(orderId)
      
      if (!order) {
        toast.error("Sales order not found")
        router.push("/dashboard/sales/orders")
        return
      }
      
      setSalesOrder(order)
      toast.success("Invoice loaded successfully")
    } catch (error) {
      console.error("Failed to load sales order:", error)
      toast.error("Failed to load sales order")
      router.push("/dashboard/sales/orders")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = useCallback(() => {
    setIsPrinting(true)
    toast.info("Preparing print...")
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
      toast.success("Print dialog opened")
    }, 100)
  }, [])

  const handleDownloadPDF = useCallback(async () => {
    if (!salesOrder || !invoiceRef.current) {
      toast.error("Invoice not ready for download")
      return
    }

    setIsGeneratingPDF(true)
    
    const loadingToast = toast.loading("Generating PDF...", {
      description: "Please wait while we prepare your invoice"
    })
    
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error("Could not open print window")
      }

      toast.loading("Creating PDF document...", {
        id: loadingToast,
        description: "Almost ready..."
      })

      // Get the current date for the PDF
      const currentDate = new Date().toLocaleDateString()

      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${salesOrder.orderNumber}</title>
            <meta charset="utf-8">
            <style>
              /* Reset and base styles */
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: white;
                color: #000;
                line-height: 1.2;
                padding: 0;
                margin: 0;
              }
              
              /* Main container */
              .invoice-container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 20px;
              }
              
              /* Header styles */
              .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 2px solid #e5e7eb;
              }
              
              .logo-section {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              
              .logo {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #f43f5e, #e11d48);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 16px;
                font-weight: bold;
              }
              
              .company-info {
                text-align: right;
              }
              
              .company-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 4px;
                color: #1f2937;
              }
              
              .company-tagline {
                font-size: 9px;
                color: #6b7280;
                margin-top: 2px;
              }
              
              .company-address {
                font-size: 10px;
                color: #6b7280;
                line-height: 1.3;
              }
              
              .invoice-title {
                font-size: 24px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 6px;
              }
              
              /* Invoice details */
              .invoice-details-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 20px;
              }
              
              .invoice-details-section > div {
                background: #f9fafb;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              
              .invoice-details-section > div:last-child {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border: 1px solid #fecaca;
              }
              
              .detail-section h3 {
                font-size: 10px;
                font-weight: 700;
                color: #6b7280;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.8px;
              }
              
              .detail-section p {
                font-size: 12px;
                line-height: 1.4;
                color: #1f2937;
              }
              
              .detail-section .name {
                font-weight: 700;
                font-size: 14px;
                margin-bottom: 4px;
                color: #111827;
              }
              
              /* Dates table */
              .dates-table {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 12px;
                margin-bottom: 20px;
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              
              .dates-table h3 {
                font-size: 10px;
                font-weight: 700;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin-bottom: 6px;
              }
              
              .dates-table p {
                font-size: 12px;
                font-weight: 600;
                color: #1f2937;
              }
              
              .dates-table > div:last-child p {
                color: #f43f5e;
              }
              
              /* Items table */
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 11px;
              }
              
              .items-table th {
                background: linear-gradient(135deg, #f43f5e, #e11d48);
                color: white;
                padding: 8px 10px;
                text-align: left;
                font-weight: 700;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .items-table th.right {
                text-align: right;
              }
              
              .items-table th.center {
                text-align: center;
              }
              
              .items-table tbody {
                background: white;
              }
              
              .items-table td {
                padding: 8px 10px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 11px;
              }
              
              .items-table tr:last-child td {
                border-bottom: none;
              }
              
              .items-table td.right {
                text-align: right;
              }
              
              .items-table td.center {
                text-align: center;
              }
              
              .item-name {
                font-weight: 600;
                margin-bottom: 2px;
                font-size: 11px;
                color: #111827;
              }
              
              .item-desc {
                color: #6b7280;
                font-size: 10px;
              }
              
              /* Thank you note */
              .thank-you {
                font-size: 11px;
                color: #6b7280;
                margin-bottom: 8px;
                text-align: right;
                font-style: italic;
              }
              
              /* Totals section */
              .totals-section {
                float: right;
                width: 320px;
                margin-top: 8px;
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 11px;
                border-bottom: 1px solid #e5e7eb;
              }
              
              .total-row:last-child {
                border-bottom: none;
              }
              
              .total-row.final {
                border-top: 2px solid #f43f5e;
                border-bottom: none;
                padding-top: 8px;
                margin-top: 6px;
                font-size: 12px;
                font-weight: bold;
              }
              
              .total-row.balance {
                border-top: 1px solid #d1d5db;
                background: #fef2f2;
                padding: 8px;
                margin: 8px -16px -16px -16px;
                border-radius: 0 0 8px 8px;
                font-size: 12px;
                font-weight: bold;
              }
              
              .total-row .label {
                color: #6b7280;
                font-weight: 500;
              }
              
              .total-row .value {
                font-weight: 600;
                color: #1f2937;
              }
              
              .total-row.final .label,
              .total-row.balance .label {
                color: #111827;
                font-weight: 700;
              }
              
              .total-row.final .value,
              .total-row.balance .value {
                color: #f43f5e;
                font-size: 14px;
              }
              
              /* Notes section */
              .notes-section {
                clear: both;
                margin-top: 24px;
                padding: 12px;
                background: #fffbeb;
                border-left: 4px solid #f59e0b;
                border-radius: 8px;
              }
              
              .notes-section h3 {
                font-size: 11px;
                font-weight: 700;
                margin-bottom: 6px;
                color: #92400e;
              }
              
              .notes-section p {
                font-size: 11px;
                line-height: 1.4;
                color: #451a03;
              }
              
              /* Terms section */
              .terms-section {
                margin-top: 16px;
                padding: 12px;
                background: #f3f4f6;
                border-radius: 8px;
                border: 1px solid #d1d5db;
              }
              
              .terms-section h3 {
                font-size: 11px;
                font-weight: 700;
                margin-bottom: 6px;
                color: #1f2937;
              }
              
              .terms-section p {
                font-size: 10px;
                line-height: 1.4;
                color: #4b5563;
              }
              
              /* Footer section */
              .footer-section {
                margin-top: 16px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
              }
              
              /* Print styles - Remove headers and footers */
              @media print {
                @page {
                  margin: 0.2in;
                  size: letter;
                }
                
                body {
                  padding: 0;
                  margin: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                .invoice-container {
                  padding: 0.2in;
                  margin: 0;
                  box-shadow: none;
                }
                
                /* Hide URL and date in print */
                @page {
                  margin: 0;
                  size: auto;
                }
                
                /* Remove browser headers and footers */
                body::before,
                body::after {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              ${invoiceRef.current.innerHTML}
            </div>
            
            <script>
              // Remove any browser-added headers and ensure clean print
              window.onload = function() {
                // Focus on print immediately
                setTimeout(() => {
                  window.print();
                }, 500);
              };
              
              // Listen for afterprint to close window
              window.onafterprint = function() {
                setTimeout(() => {
                  window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `

      printWindow.document.write(invoiceHTML)
      printWindow.document.close()
      
      toast.success("PDF ready for download!", {
        id: loadingToast,
        description: "The print dialog will open automatically",
        duration: 5000
      })
      
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF", {
        id: loadingToast,
        description: "Please try again or use the print option",
        duration: 5000,
        action: {
          label: "Try Print",
          onClick: handlePrint
        }
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }, [salesOrder, handlePrint])

  const handleShare = (platform: string) => {
    if (!salesOrder) {
      toast.error("Invoice not loaded")
      return
    }

    const invoiceUrl = window.location.href
    const message = `Invoice ${salesOrder.orderNumber} from AFK Berimah Hardware Shop - Total: ${formatCurrency(salesOrder.total || 0)}`
    
    let shareUrl = ""
    let platformName = ""
    
    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(message + " " + invoiceUrl)}`
        platformName = "WhatsApp"
        break
      case "email":
        shareUrl = `mailto:?subject=Invoice ${salesOrder.orderNumber}&body=${encodeURIComponent(message + "\n\n" + invoiceUrl)}`
        platformName = "Email"
        break
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(invoiceUrl)}&text=${encodeURIComponent(message)}`
        platformName = "Telegram"
        break
      default:
        return
    }
    
    toast.info(`Opening ${platformName}...`, {
      description: `Sharing invoice ${salesOrder.orderNumber}`
    })
    
    window.open(shareUrl, '_blank')
    setShowShareMenu(false)
    
    setTimeout(() => {
      toast.success(`Shared via ${platformName}`, {
        description: "Invoice link has been shared",
        duration: 3000
      })
    }, 1000)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowShareMenu(false)
      toast.success("Invoice link copied to clipboard", {
        description: "You can now paste it anywhere",
        duration: 3000
      })
    } catch (error) {
      toast.error("Failed to copy link", {
        description: "Please try again",
        duration: 3000
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
          <Spinner className="size-8" />
          <p className="ml-4 text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!salesOrder) {
    return null
  }

  // POS Detection
  const isPOS = salesOrder?.orderNumber?.startsWith('POS-') || salesOrder?.type === 'POS'

  const subtotal = salesOrder.subtotal || 0
  const taxAmount = salesOrder.taxAmount || 0
  const shippingCost = salesOrder.shippingCost || 0
  const discount = salesOrder.discount || 0
  const total = subtotal + taxAmount + shippingCost - discount
  const taxRate = subtotal > 0 ? (taxAmount / subtotal * 100).toFixed(2) : "0.00"
  
  const getCompanyInitials = (companyName: string): string => {
    return companyName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Calculate due date (30 days from invoice date)
  const invoiceDate = salesOrder.createdAt ? new Date(salesOrder.createdAt) : new Date()
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + 30)

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: white;
            font-size: 11px;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-container,
          .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.2in !important;
            margin: 0 !important;
            background: white;
            max-height: 10.5in;
            overflow: hidden;
          }
          
          .no-print {
            display: none !important;
          }
          
          @page {
            margin: 0.2in;
            size: letter;
          }
          
          /* Remove browser headers and footers */
          @page {
            margin: 0;
          }
          
          body::before,
          body::after {
            display: none !important;
          }
          
          /* Prevent page breaks */
          .invoice-header,
          .invoice-details-section,
          .dates-table,
          .items-table,
          .totals-section,
          .notes-section,
          .terms-section,
          .footer-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Keep table headers on new pages */
          .items-table thead {
            display: table-header-group;
          }
          
          /* Avoid breaking table rows */
          .items-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Remove card shadows and borders for printing */
          .print-container .shadow-lg {
            box-shadow: none !important;
          }
          
          .print-container .border {
            border: none !important;
          }
          
          /* Compact styling for single page */
          .print-container .p-6 {
            padding: 0.5rem !important;
          }
          
          .print-container .mb-6 {
            margin-bottom: 0.75rem !important;
          }
          
          .print-container .mb-4 {
            margin-bottom: 0.5rem !important;
          }
          
          .print-container .text-2xl {
            font-size: 1.25rem !important;
          }
          
          .print-container .text-lg {
            font-size: 1rem !important;
          }
        }
        
        @media screen {
          .print-container {
            min-height: auto;
          }
        }
      `}</style>

      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          {/* Action Bar - No Print */}
          <div className="mb-6 no-print">
            <Link
              href="/dashboard/sales/orders"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sales Orders
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{isPOS ? "Receipt" : "Invoice"}</h1>
              <div className="flex items-center gap-2">
                {/* Share Button with Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setShowShareMenu(!showShareMenu)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  
                  {showShareMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="p-2">
                        <button
                          onClick={() => handleShare("whatsapp")}
                          className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-md transition-colors"
                        >
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          Share via WhatsApp
                        </button>
                        <button
                          onClick={() => handleShare("email")}
                          className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Mail className="h-4 w-4 text-blue-600" />
                          Share via Email
                        </button>
                        <button
                          onClick={() => handleShare("telegram")}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-sky-50 rounded-md transition-colors"
                        >
                          <MessageCircle className="h-4 w-4 text-sky-500" />
                          Share via Telegram
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <Share2 className="h-4 w-4 text-gray-600" />
                          Copy Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={handlePrint}
                  disabled={isPrinting}
                >
                  {isPrinting ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  Print
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || !salesOrder}
                >
                  {isGeneratingPDF ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Invoice Content - Printable */}
          <div ref={invoiceRef} className="print-container">
            <Card className="p-6 bg-white shadow-lg print:shadow-none print:border-0">
              {/* Header */}
              <div className="invoice-header flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-200">
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                    {getCompanyInitials(salesOrder.organisation?.name || "AFK Berimah Hardware Shop")}
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
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {isPOS ? "RECEIPT" : "INVOICE"}
                  </div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    {salesOrder.organisation?.phone && `${salesOrder.organisation.phone}`}<br />
                    {salesOrder.organisation?.email && salesOrder.organisation.email}
                  </div>
                </div>
              </div>

              {/* POS Specific Information */}
              {isPOS && (
                <div className="mb-4 bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                    POS Sale Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-600 font-medium">Sold By:</span>
                      <span className="text-xs font-semibold text-gray-900 ml-2">
                        {salesOrder.createdBy?.name || "Cashier"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-600 font-medium">Payment Method:</span>
                      <span className="text-xs font-semibold text-gray-900 ml-2">
                        {salesOrder.paymentMethod || "Cash"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bill To / Invoice Details */}
              <div className="invoice-details-section grid grid-cols-2 gap-6 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Bill To
                  </h3>
                  <p className="font-bold text-sm mb-1 text-gray-900">
                    {salesOrder.customer?.name || "Walk-in Customer"}
                  </p>
                  <p className="text-xs leading-relaxed text-gray-600">
                    {salesOrder.customer?.address || "N/A"}<br />
                    {salesOrder.customer?.phone && `${salesOrder.customer.phone}`}<br />
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
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                    Ship To
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-700">
                    {salesOrder.shippingAddress}
                  </p>
                </div>
              )}

              {/* Dates Section */}
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
                      {invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Items Table */}
                <table className="items-table w-full mb-4 border-collapse overflow-hidden rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
                      <th className="p-2 text-left text-xs font-bold uppercase tracking-wider w-8">#</th>
                      <th className="p-2 text-left text-xs font-bold uppercase tracking-wider">Item & Description</th>
                      <th className="p-2 text-center text-xs font-bold uppercase tracking-wider w-20">Qty</th>
                      <th className="p-2 text-right text-xs font-bold uppercase tracking-wider w-24">Rate</th>
                      <th className="p-2 text-right text-xs font-bold uppercase tracking-wider w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {salesOrder.lines && salesOrder.lines.length > 0 ? (
                      salesOrder.lines.map((line: any, index: number) => {
                        const lineTotal = (line.quantity || 0) * (line.unitPrice || 0)
                        return (
                          <tr key={line.id} className="border-b border-gray-200">
                            <td className="p-2 text-xs text-gray-600">{index + 1}</td>
                            <td className="p-2">
                              <div className="font-semibold text-xs text-gray-900 mb-1">
                                {line.item?.name || "Unknown Item"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {line.item?.description || line.item?.sku || ""}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="text-xs font-semibold text-gray-900">{line.quantity.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">
                                {/* FIX: Handle unit as object */}
                                {typeof line.item?.unit === 'object' 
                                  ? line.item?.unit?.name || line.item?.unit?.symbol || 'Piece'
                                  : line.item?.unit || 'Piece'
                                }
                              </div>
                            </td>
                            <td className="p-2 text-right text-xs text-gray-900">
                              {formatCurrency(line.unitPrice || 0)}
                            </td>
                            <td className="p-2 text-right text-xs font-bold text-gray-900">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500 text-xs">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

              {/* Thank You Note */}
              <div className="mb-3 text-right">
                <p className="text-xs text-gray-600 italic">
                  {isPOS ? "Thank you for your purchase!" : "Thank you for your business!"}
                </p>
              </div>

              {/* Totals Section */}
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
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {salesOrder.notes}
                  </p>
                </div>
              )}

              {/* Terms & Conditions - Only show for invoices, not POS receipts */}
              {!isPOS && (
                <div className="terms-section p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <h3 className="text-xs font-bold mb-2 text-gray-900 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    Terms & Conditions
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
                  {salesOrder.organisation?.email || "info@afkberimah.com"} | {salesOrder.organisation?.phone || "+233 (123) 456-7890"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isPOS ? "Thank you for your purchase!" : "Thank you for your business!"}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Overlay for closing share menu */}
      {showShareMenu && (
        <div 
          className="fixed inset-0 z-40 no-print"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </>
  )
}