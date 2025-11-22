import type React from "react"
import { Card } from "@/components/ui/card"

interface PurchaseOrderLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function PurchaseOrderLayout({
  children,
  className = "",
}: PurchaseOrderLayoutProps) {
  return (
    <div className={`w-full h-full flex flex-col md:flex-row gap-4 ${className}`}>
      {children}
    </div>
  )
}

export function POListPanel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`w-full md:w-1/3 h-full overflow-hidden flex flex-col ${className}`}>
      {children}
    </Card>
  )
}

export function PODetailPanel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={`w-full md:w-2/3 h-full overflow-hidden flex flex-col ${className}`}>
      {children}
    </Card>
  )
}