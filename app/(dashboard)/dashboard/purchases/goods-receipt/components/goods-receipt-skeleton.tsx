'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function GoodsReceiptListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="p-4 border rounded-lg space-y-2"
        >
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
          <div className="flex justify-between pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function GoodsReceiptDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-md" />
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-32 ml-auto" />
        <Skeleton className="h-4 w-32 ml-auto" />
        <Skeleton className="h-6 w-32 ml-auto" />
      </div>
    </div>
  )
}
