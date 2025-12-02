// app/(dashboard)/dashboard/page.tsx

import { getDashboardData } from "@/actions/dashboard";
import DashboardMain from "@/components/dashboard/DashboardMain";
import { getAuthenticatedUser } from "@/config/useAuth";

type Props = {
  searchParams: { period?: string };
};

export default async function DashboardPage({ searchParams }: Props) {
  const period = searchParams.period || "7d";
  
  try {
    const user = await getAuthenticatedUser();
    const data = await getDashboardData(period);
    
    return <DashboardMain
      data={data} 
      initialPeriod={period}
    />;
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