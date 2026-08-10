// Target path: app/dashboard/inventory/cost-adjustment/layout.tsx
//
// Follows the exact same pattern as your items layout, but with a new
// permission key: "items.cost_adjustment". You'll need to register this
// key wherever your other permissions (e.g. "items.read") are defined,
// and assign it to whichever roles should be allowed to bulk-edit prices
// (e.g. Owner/Admin, not cashier/staff).

import { checkPermission } from "@/config/useAuth";
import React, { ReactNode } from "react";

export default async function CostAdjustmentLayout({ children }: { children: ReactNode }) {
  await checkPermission("cost_adjustment.read");
  return <div>{children}</div>;
}