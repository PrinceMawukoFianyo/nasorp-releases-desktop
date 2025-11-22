"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, CheckCircle2, Truck, X, Loader2 } from "lucide-react"
import { updateTransferStatus } from "@/actions/transfer-stock-history"
import { useRouter } from "next/navigation"

interface TransferActionsProps {
  transferId: string
  status: string
  onStatusChange?: (newStatus: string) => void
}

export function TransferActions({ transferId, status, onStatusChange }: TransferActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStatusUpdate = async (newStatus: "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED") => {
    setIsLoading(true)
    try {
      const result = await updateTransferStatus(transferId, newStatus)
      if (result.success) {
        onStatusChange?.(newStatus)
        router.refresh() // Refresh the page to show updated status
      } else {
        alert(result.error || "Failed to update status")
      }
    } catch (error) {
      alert("An error occurred while updating the status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = () => handleStatusUpdate("APPROVED")
  const handleInTransit = () => handleStatusUpdate("IN_TRANSIT")
  const handleComplete = () => handleStatusUpdate("COMPLETED")
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this transfer? This action cannot be undone.")) {
      handleStatusUpdate("CANCELLED")
    }
  }

  return (
    <div className="flex gap-3">
      {status === "DRAFT" && (
        <Button 
          onClick={handleApprove} 
          disabled={isLoading} 
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Approve Transfer
        </Button>
      )}

      {status === "APPROVED" && (
        <Button 
          onClick={handleInTransit} 
          disabled={isLoading} 
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Truck className="w-4 h-4" />
          )}
          Mark In Transit
        </Button>
      )}

      {status === "IN_TRANSIT" && (
        <Button 
          onClick={handleComplete} 
          disabled={isLoading} 
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Complete Transfer
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                More Actions
                <ChevronDown className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {status !== "CANCELLED" && status !== "COMPLETED" && (
            <DropdownMenuItem onClick={handleCancel} className="text-red-600 cursor-pointer">
              <X className="w-4 h-4 mr-2" />
              Cancel Transfer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}