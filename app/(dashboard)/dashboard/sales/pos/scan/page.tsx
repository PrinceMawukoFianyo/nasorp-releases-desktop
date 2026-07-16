// app/(dashboard)/dashboard/sales/pos/scan/page.tsx
//
// This is the URL staff open on THEIR OWN phone — not the main POS page.
// Send/bookmark this link on each phone that will be used as a scanner:
//   /dashboard/sales/pos/scan
//
// The main POS page's "Connect Phone Scanner" option is the host/PC side
// only (it generates the code and waits) — staff should never click that
// on their own phone. This page is the other half: where the code gets
// typed in.

"use client"

import { useCallback } from "react"
import { toast } from "sonner"
import { PhoneScanSender } from "@/app/(dashboard)/dashboard/sales/pos/components/details/phone-scan-sender"
import { lookupByBarcode } from "@/actions/barcode-actions"

export default function PhoneScanPage() {
  // This standalone page has no cart of its own, so "Scan with Camera" here
  // just looks the item up and shows what it found — it's "Send scans to my
  // PC" that most staff will actually want from this page.
  const handleLocalScan = useCallback(async (value: string) => {
    const res = await lookupByBarcode(value)
    if (res.found && res.item) {
      toast.success(res.item.name, { description: `SKU: ${res.item.sku}` })
    } else if (res.found && res.serial) {
      toast.success(res.serial.item.name, { description: `Serial: ${res.serial.serialNumber}` })
    } else {
      toast.error(res.message ?? `No item found for "${value}"`)
    }
  }, [])

  return (
    <PhoneScanSender
      open={true}
      onClose={() => window.history.back()}
      onLocalScan={handleLocalScan}
    />
  )
}