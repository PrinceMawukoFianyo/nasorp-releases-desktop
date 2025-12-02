"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickPOSButton() {
  const router = useRouter()

  return (
    <Button
      onClick={() => router.push("/dashboard/pos")}
      className="fixed bottom-6 riUSt-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
      size="icon"
    >
      <ShoppingCart className="h-6 w-6" />
    </Button>
  )
}
