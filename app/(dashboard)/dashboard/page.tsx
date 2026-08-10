// Target path: app/(dashboard)/dashboard/page.tsx (replaces your current version)
//
// The bug: this page previously only called getAuthenticatedUser() — that
// only checks the person is LOGGED IN, not that they have permission to
// view the dashboard overview. Every authenticated user rendered it,
// regardless of role. This version checks a real "dashboard.read"
// permission and, if missing, sends the user straight to the first page
// their role actually grants (e.g. sales staff -> /dashboard/pos).

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/config/auth";
import { getDashboardData } from "@/actions/dashboard";
import DashboardMain from "@/components/dashboard/DashboardMain";
import { getFirstAccessibleRoute } from "@/lib/permissions/getLandingRoute";

type Props = {
  searchParams: Promise<{
    range?: string; // preset : 'today' | '7d' | '30d' | '90d' | '12m'
    period?: string; // legacy support
  }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session?.user) {
    redirect("/login");
  }

  const permissions = session.user.permissions ?? [];

  // 🔒 The actual fix: gate the overview itself. If this role wasn't
  // granted "dashboard.read", never render it — send them to whatever
  // page their permissions DO cover (POS, Inventory Items, etc.).
  if (!permissions.includes("dashboard.read")) {
    redirect(getFirstAccessibleRoute(permissions));
  }

  const params = await searchParams;
  const dateRange = params.range || params.period || "7d";

  try {
    const data = await getDashboardData(dateRange);

    return <DashboardMain data={data} initialPeriod={dateRange} />;
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
      </div>
    );
  }
}