// app/dashboard/sales/orders/components/sales-order-layout.tsx
import type React from "react"
import { Card } from "@/components/ui/card"

interface SalesOrderLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function SalesOrderLayout({
  children,
  className = "",
}: SalesOrderLayoutProps) {
  return (
    <div className={`w-full h-full flex flex-col md:flex-row gap-4 ${className}`}>
      {children}
    </div>
  )
}

export function SOListPanel({
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

export function SODetailPanel({
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