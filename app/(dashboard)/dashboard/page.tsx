import { getDashboardOverview } from "@/actions/analytics";
import DashboardMain from "@/components/dashboard/DashboardMain";
import { getAuthenticatedUser } from "@/config/useAuth";
import DefaultUserDashboard from "../../../components/dashboard/Tables/DefaultUserDashboard";
import { ISidebarLink, sidebarLinks } from "@/config/sidebar";
import { Layers } from "lucide-react";


export default async function Dashboard() {
  const analytics = (await getDashboardOverview()) || [];
  const user = await getAuthenticatedUser(); 
  const userPermissions= user.permissions;
  //const hasPermission = 
  // Helper function to check if user has permission
  const hasPermission = (permission: string): boolean => {
    return user.permissions?.includes(permission) ?? false;
  };

  // Filter sidebar links based on permissions
  const filterSidebarLinks = (links: ISidebarLink[]): ISidebarLink[] => {
    return links
      .filter((link) => hasPermission(link.permission))
      .map((link) => ({
        ...link,
        dropdownMenu: link.dropdownMenu?.filter((item) =>
          hasPermission(item.permission)
        ),
      }))
      .filter(
        (link) =>
          !link.dropdown || (link.dropdownMenu && link.dropdownMenu.length > 0)
      );
  };
  const filteredLinks = filterSidebarLinks(sidebarLinks);
  if (!userPermissions.includes("dashboard.read")){
    return <DefaultUserDashboard navigationLinks = {filteredLinks} user={user}/>
  }
  return (
    <main>
      {<div className="space-y-6">
        {/*<div className="space-y-1 mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Org Name: {user?.orgName?? ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            org ID : {user.orgId}
          </p>
        </div>*/}

        {/*<div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {analytics.map((item, i) => (
            <OverViewCard item={item} key={i} />
          ))}
        </div>*/}
      </div> }
      <DashboardMain />
    </main>
  );
}

