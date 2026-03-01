// app/dashboard/sales/returns/new/page.tsx
import { getPOSLocations } from "@/actions/pos"
import { getPOSCustomers } from "@/actions/pos"
import NewReturnForm from "../components/NewReturnForm"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getEligibleSalesOrders } from "@/actions/retuns"
import { PageHeader } from "../../../reports/stock-movements/components/PageHeader"

export default async function NewReturnPage() {
  const [ordersRes, locationsRes, customersRes] = await Promise.all([
    getEligibleSalesOrders(),
    getPOSLocations(),
    getPOSCustomers(),
  ])

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <PageHeader title="New Sales Return" description="Record a customer return and restock inventory">
        <Link href="/dashboard/sales/returns">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Returns
          </Button>
        </Link>
      </PageHeader>

      <NewReturnForm
        salesOrders={(ordersRes.success ? ordersRes.data : []) as any}
        locations={(locationsRes.success ? locationsRes.data : []) as any}
        customers={(customersRes.success ? customersRes.data : []) as any}
      />
    </div>
  )
}