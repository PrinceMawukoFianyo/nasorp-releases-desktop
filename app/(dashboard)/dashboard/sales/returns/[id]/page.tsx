// app/dashboard/sales/returns/[id]/page.ts
import ReturnDetailClient from "../components/ReturnDetailClient"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import { getSalesReturnById } from "@/actions/retuns"
import { PageHeader } from "../../../reports/stock-movements/components/PageHeader"

interface Props {
  params: { id: string }
}

export default async function ReturnDetailPage({ params }: Props) {
  const result = await getSalesReturnById(params.id)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={result.data.rmaNumber}
        description={`Sales Return — created ${new Date(result.data.createdAt).toLocaleDateString("en-GH", { dateStyle: "long" })}`}
      >
        <Link href="/dashboard/sales/returns">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Returns
          </Button>
        </Link>
      </PageHeader>

      <ReturnDetailClient returnData={result.data as any} />
    </div>
  )
}