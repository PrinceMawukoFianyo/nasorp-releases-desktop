import { notFound } from "next/navigation"
import { getAdjustmentById } from "@/actions/stock-adjustments"
import AdjustmentDetail from "../components/StockAdjustmentDetail"
import { DetailedAdjustmentResponse } from "@/types/stockAdjustments"


interface AdjustmentDetailPageProps {
  params: Promise<{
    id: string
  }>
}   

export default async function AdjustmentDetailPage({ params }: AdjustmentDetailPageProps) {
    const id = await (await params).id
  const result = await getAdjustmentById(id)

  if (!result.success || !result.adjustment) {
    notFound()
  }

  return <AdjustmentDetail adjustment={result.adjustment as DetailedAdjustmentResponse} />
}