"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

interface Adjustment {
  id: string;
  number: string;
  date: string;
  location: string;
  adjustmentType: string;
  status: string;
  itemCount: number;
  netQuantity?: number;
}

interface RecentAdjustmentsTableProps {
  adjustments: Adjustment[];
}

const formatAdjustmentType = (type: string): string => {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "PENDING":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "CANCELLED":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    COMPLETED: "default",
    PENDING: "secondary",
    CANCELLED: "destructive",
    REVIEW: "outline",
    DRAFT: "secondary",
  };
  return statusColors[status] || "secondary";
};

export function RecentAdjustmentsTable({ adjustments }: RecentAdjustmentsTableProps) {
  const totalItems = adjustments.reduce((sum, adj) => sum + adj.itemCount, 0);
  const totalNetQuantity = adjustments.reduce((sum, adj) => sum + (adj.netQuantity || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Adjustments</CardTitle>
            <CardDescription>Latest inventory adjustments</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-semibold">{totalItems}</p>
              <p className="text-muted-foreground">Total Items</p>
            </div>
            <div className="text-center">
              <p className={`font-semibold ${totalNetQuantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalNetQuantity >= 0 ? '+' : ''}{totalNetQuantity}
              </p>
              <p className="text-muted-foreground">Net Quantity</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adjustment #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Net Qty</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.map((adjustment) => (
              <TableRow key={adjustment.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(adjustment.status)}
                    {adjustment.number}
                  </div>
                </TableCell>
                <TableCell>{adjustment.date}</TableCell>
                <TableCell>
                  <div className="font-medium">{adjustment.location}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {formatAdjustmentType(adjustment.adjustmentType)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-center font-medium">{adjustment.itemCount}</div>
                </TableCell>
                <TableCell>
                  <div className={`text-center font-semibold ${(adjustment.netQuantity || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(adjustment.netQuantity || 0) >= 0 ? '+' : ''}{adjustment.netQuantity || 0}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(adjustment.status) as any} className="gap-1">
                    {getStatusIcon(adjustment.status)}
                    {adjustment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {adjustments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <p>No recent adjustments found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}