"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800",
  APPROVED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

interface Transfer {
  id: string
  transferNumber: string
  date: Date
  status: string
  fromLocation: { id: string; name: string }
  toLocation: { id: string; name: string }
  lines: Array<{
    id: string
    itemId: string
    quantity: number
    item: { name: string; sku: string }
  }>
  createdBy: { id: string; email: string; name?: string }
}

interface TransfersListProps {
  transfers: Transfer[]
  status: string
}

export default function TransfersList({ transfers, status }: TransfersListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTransfers = useMemo(() => {
    if (!searchQuery.trim()) return transfers

    const query = searchQuery.toLowerCase()
    return transfers.filter(
      (transfer) =>
        transfer.transferNumber.toLowerCase().includes(query) ||
        transfer.fromLocation.name.toLowerCase().includes(query) ||
        transfer.toLocation.name.toLowerCase().includes(query) ||
        transfer.lines.some(
          (line) => line.item.name.toLowerCase().includes(query) || line.item.sku.toLowerCase().includes(query),
        ),
    )
  }, [transfers, searchQuery])

  const handleViewDetails = (transferId: string) => {
    router.push(`/dashboard/inventory/transfers/${transferId}`)
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">No transfers found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Records</CardTitle>
        <CardDescription>Total: {transfers.length} transfers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search by transfer #, location, or item name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Transfer #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-riUSt">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.map((transfer) => (
                <TableRow key={transfer.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium font-mono text-sm">{transfer.transferNumber}</TableCell>
                  <TableCell className="text-sm">{format(new Date(transfer.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{transfer.fromLocation.name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="truncate">{transfer.toLocation.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="space-y-1">
                      {transfer.lines.slice(0, 2).map((line) => (
                        <div key={line.id} className="text-xs">
                          {line.item.name} ({line.quantity}x)
                        </div>
                      ))}
                      {transfer.lines.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{transfer.lines.length - 2} more</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[transfer.status as keyof typeof statusColors]}>
                      {transfer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transfer.createdBy.name || transfer.createdBy.email}
                  </TableCell>
                  <TableCell className="text-riUSt">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(transfer.id)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredTransfers.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No transfers match your search</p>
        )}
      </CardContent>
    </Card>
  )
}