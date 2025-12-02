"use server";

import { getAuthenticatedUser } from "@/config/useAuth";
import { db } from "@/prisma/db";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

export type TransactionType =
  | "PURCHASE"
  | "SALE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "RETURN";

export interface StockMovementSummary {
  totalTransfers: number;
  totalAdjustments: number;
  totalTransferQuantity: number;
  totalAdjustmentQuantity: number;
  completedTransfers?: number;
  positiveAdjustments?: number;
  negativeAdjustments?: number;
}

export interface TransferByLocation {
  locationName: string;
  transfersOut: number;
  transfersIn: number;
  netMovement: number;
}

export interface AdjustmentByType {
  adjustmentType: string;
  count: number;
  quantity: number;
}

export interface TimelineData {
  date: string;
  transfers: number;
  adjustments: number;
}

export interface TransferStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface TopAdjustedItem {
  itemName: string;
  sku: string;
  totalAdjustments: number;
  quantityAdjusted: number;
}

export interface RecentActivity {
  id: string;
  type: "TRANSFER" | "ADJUSTMENT";
  number: string;
  date: string;
  fromLocation?: string;
  toLocation?: string;
  location?: string;
  adjustmentType?: string;
  status: string;
  itemCount: number;
}

export interface StockMovementData {
  summary: StockMovementSummary;
  transfersByLocation: TransferByLocation[];
  adjustmentsByType: AdjustmentByType[];
  timeline: TimelineData[];
  transferStatuses: TransferStatus[];
  topAdjustedItems: TopAdjustedItem[];
  recentActivity: RecentActivity[];
  recentTransfers?: Array<{
    id: string;
    number: string;
    date: string;
    fromLocation: string;
    toLocation: string;
    status: string;
    itemCount: number;
  }>;
  recentAdjustments?: Array<{
    id: string;
    number: string;
    date: string;
    location: string;
    adjustmentType: string;
    status: string;
    itemCount: number;
  }>;
  transferStatusData?: TransferStatus[];
}

export async function getStockMovementReport(
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
): Promise<StockMovementData> {
  const user = await getAuthenticatedUser();
  const orgId = user.orgId;

  const startDate = fromDate || startOfDay(subDays(new Date(), days));
  const endDate = toDate || endOfDay(new Date());

  const transfers = await db.transfer.findMany({
    where: {
      orgId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      fromLocation: true,
      toLocation: true,
      lines: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const adjustments = await db.adjustment.findMany({
    where: {
      orgId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      location: true,
      lines: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalTransferQuantity = transfers.reduce(
    (sum: number, transfer: any) =>
      sum +
      transfer.lines.reduce((lineSum: number, line: any) => lineSum + line.quantity, 0),
    0
  );

  const totalAdjustmentQuantity = adjustments.reduce(
    (sum: number, adjustment: any) =>
      sum +
      adjustment.lines.reduce(
        (lineSum: number, line: any) => lineSum + Math.abs(line.adjustedQuantity || 0),
        0
      ),
    0
  );

  const completedTransfers = transfers.filter(t => t.status === "COMPLETED").length;
  const positiveAdjustments = adjustments.filter(a => 
    a.lines.some((line: any) => line.adjustedQuantity > 0)
  ).length;
  const negativeAdjustments = adjustments.filter(a => 
    a.lines.some((line: any) => line.adjustedQuantity < 0)
  ).length;

  const summary: StockMovementSummary = {
    totalTransfers: transfers.length,
    totalAdjustments: adjustments.length,
    totalTransferQuantity,
    totalAdjustmentQuantity,
    completedTransfers,
    positiveAdjustments,
    negativeAdjustments: -Math.abs(negativeAdjustments),
  };

  const locationMap = new Map<
    string,
    { transfersOut: number; transfersIn: number }
  >();

  transfers.forEach((transfer: any) => {
    const quantity = transfer.lines.reduce(
      (sum: number, line: any) => sum + line.quantity,
      0
    );

    const fromLoc = locationMap.get(transfer.fromLocation.name) || {
      transfersOut: 0,
      transfersIn: 0,
    };
    fromLoc.transfersOut += quantity;
    locationMap.set(transfer.fromLocation.name, fromLoc);

    const toLoc = locationMap.get(transfer.toLocation.name) || {
      transfersOut: 0,
      transfersIn: 0,
    };
    toLoc.transfersIn += quantity;
    locationMap.set(transfer.toLocation.name, toLoc);
  });

  const transfersByLocation: TransferByLocation[] = Array.from(
    locationMap.entries()
  ).map(([locationName, data]) => ({
    locationName,
    transfersOut: data.transfersOut,
    transfersIn: data.transfersIn,
    netMovement: data.transfersIn - data.transfersOut,
  }));

  const adjustmentMap = new Map<string, { count: number; quantity: number }>();

  adjustments.forEach((adjustment: any) => {
    const quantity = adjustment.lines.reduce(
      (sum: number, line: any) => sum + Math.abs(line.adjustedQuantity || 0),
      0
    );

    const current = adjustmentMap.get(adjustment.adjustmentType) || {
      count: 0,
      quantity: 0,
    };
    current.count += 1;
    current.quantity += quantity;
    adjustmentMap.set(adjustment.adjustmentType, current);
  });

  const adjustmentsByType: AdjustmentByType[] = Array.from(
    adjustmentMap.entries()
  ).map(([adjustmentType, data]) => ({
    adjustmentType,
    count: data.count,
    quantity: data.quantity,
  }));

  const statusMap = new Map<string, number>();
  transfers.forEach((transfer: any) => {
    const count = statusMap.get(transfer.status) || 0;
    statusMap.set(transfer.status, count + 1);
  });

  const transferStatuses: TransferStatus[] = Array.from(statusMap.entries()).map(
    ([status, count]) => ({
      status,
      count,
      percentage: transfers.length > 0 ? (count / transfers.length) * 100 : 0,
    })
  );

  const itemAdjustmentMap = new Map<
    string,
    { itemName: string; sku: string; count: number; quantity: number }
  >();

  adjustments.forEach((adjustment: any) => {
    adjustment.lines.forEach((line: any) => {
      const itemKey = line.item.id;
      const current = itemAdjustmentMap.get(itemKey) || {
        itemName: line.item.name,
        sku: line.item.sku,
        count: 0,
        quantity: 0,
      };
      current.count += 1;
      current.quantity += Math.abs(line.adjustedQuantity || 0);
      itemAdjustmentMap.set(itemKey, current);
    });
  });

  const topAdjustedItems: TopAdjustedItem[] = Array.from(
    itemAdjustmentMap.values()
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({
      itemName: item.itemName,
      sku: item.sku,
      totalAdjustments: item.count,
      quantityAdjusted: item.quantity,
    }));

  const timelineMap = new Map<string, { transfers: number; adjustments: number }>();

  transfers.forEach((transfer: any) => {
    const dateKey = format(new Date(transfer.createdAt), "MMM dd");
    const current = timelineMap.get(dateKey) || { transfers: 0, adjustments: 0 };
    current.transfers += 1;
    timelineMap.set(dateKey, current);
  });

  adjustments.forEach((adjustment: any) => {
    const dateKey = format(new Date(adjustment.createdAt), "MMM dd");
    const current = timelineMap.get(dateKey) || { transfers: 0, adjustments: 0 };
    current.adjustments += 1;
    timelineMap.set(dateKey, current);
  });

  const timeline: TimelineData[] = Array.from(timelineMap.entries())
    .map(([date, data]) => ({
      date,
      transfers: data.transfers,
      adjustments: data.adjustments,
    }))
    .sort((a: TimelineData, b: TimelineData) => {
      const dateA = new Date(a.date + " 2024");
      const dateB = new Date(b.date + " 2024");
      return dateA.getTime() - dateB.getTime();
    });

  const recentTransfers = transfers.slice(0, 5).map((t: any) => ({
    id: t.id,
    type: "TRANSFER" as const,
    number: t.transferNumber,
    date: format(new Date(t.createdAt), "MMM dd, yyyy"),
    fromLocation: t.fromLocation.name,
    toLocation: t.toLocation.name,
    status: t.status,
    itemCount: t.lines.length,
  }));

  const recentAdjustments = adjustments
    .slice(0, 5)
    .map((a: any) => ({
      id: a.id,
      type: "ADJUSTMENT" as const,
      number: a.adjustmentNumber,
      date: format(new Date(a.createdAt), "MMM dd, yyyy"),
      location: a.location.name,
      adjustmentType: a.adjustmentType,
      status: a.status,
      itemCount: a.lines.length,
    }));

  const recentActivity = [...recentTransfers, ...recentAdjustments]
    .sort((a: RecentActivity, b: RecentActivity) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  return {
    summary,
    transfersByLocation,
    adjustmentsByType,
    timeline,
    transferStatuses,
    topAdjustedItems,
    recentActivity,
    recentTransfers,
    recentAdjustments,
    transferStatusData: transferStatuses,
  };
}