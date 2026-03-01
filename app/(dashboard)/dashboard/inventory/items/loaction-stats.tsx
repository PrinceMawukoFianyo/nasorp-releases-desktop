// components/dashboard/items/LocationStats.tsx
"use client";

import { MapPin, Package, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationStatsProps {
  locationName: string;
  itemCount: number;
  totalValue: number;
  locationType: string;
}

export function LocationStats({ locationName, itemCount, totalValue, locationType }: LocationStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {locationName}
          <span className="text-xs text-muted-foreground ml-auto">{locationType}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              Items
            </p>
            <p className="text-2xl font-bold">{itemCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Value
            </p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat("en-GH", {
                style: "currency",
                currency: "GHS",
                minimumFractionDigits: 0,
              }).format(totalValue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}