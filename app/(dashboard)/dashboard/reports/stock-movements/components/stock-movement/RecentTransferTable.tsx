"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";

interface Transfer {
  id: string;
  number: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  status: string;
  itemCount: number;
}

interface RecentTransfersTableProps {
  transfers: Transfer[];
}

const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    DRAFT: "secondary",
    APPROVED: "default",
    IN_TRANSIT: "default",
    COMPLETED: "default",
    CANCELLED: "destructive",
  };
  return statusColors[status] || "secondary";
};

export function RecentTransfersTable({ transfers }: RecentTransfersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transfers</CardTitle>
        <CardDescription>Latest stock transfers</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transfer #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell className="font-medium">{transfer.number}</TableCell>
                <TableCell>{transfer.date}</TableCell>
                <TableCell>
                  <span className="text-sm flex items-center gap-1">
                    {transfer.fromLocation}{" "}
                    <ArrowRightLeft className="inline h-3 w-3" />{" "}
                    {transfer.toLocation}
                  </span>
                </TableCell>
                <TableCell>{transfer.itemCount}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(transfer.status) as any}>
                    {transfer.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {transfers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No recent transfers
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}