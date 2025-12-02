import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileX, ArrowLeft } from "lucide-react"

export default function AdjustmentNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <FileX className="w-16 h-16 text-gray-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Adjustment Not Found
      </h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        The adjustment you're looking for doesn't exist or you don't have permission to view it.
      </p>
      <Link href="/dashboard/inventory/adjustments">
        <Button>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Adjustments
        </Button>
      </Link>
    </div>
  )
}