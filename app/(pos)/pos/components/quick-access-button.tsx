"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickPOSButton() {
  const router = useRouter()

  return (
    <Button
      onClick={() => router.push("/dashboard/pos")}
      className="fixed bottom-6 left-6 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
      size="icon"
    >
      <ShoppingCart className="h-6 w-6" />
    </Button>
  )
}