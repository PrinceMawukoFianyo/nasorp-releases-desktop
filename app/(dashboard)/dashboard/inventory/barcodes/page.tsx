import { Suspense } from "react"
import BarcodeManagementPage from "./barcode-management-page"

export const metadata = {
  title: "Barcode Management",
  description: "Scan, generate, assign and print barcodes for your inventory items",
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading Barcode Manager…</p>
      </div>
    </div>
  )
}

export default function BarcodesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BarcodeManagementPage />
    </Suspense>
  )
}