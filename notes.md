```
// Example usage in a client component
'use client';

import { usePermissions } from "@/lib/auth";

export default function ProtectedClientComponent() {
  const { hasPermission } = usePermissions();

  if (!hasPermission("users.read")) {
    return <NotAuthorized />;
  }

  return (
    <div>
      {/* Your component content */}
    </div>
  );
}

// Example with multiple permission checks
export default async function ComplexPage() {
  // Check if user has any of these permissions
  await checkAnyPermission(["users.create", "users.update"]);

  // Or check if user has all of these permissions
  await checkAllPermissions(["users.read", "roles.read"]);

  return (
    <div>
      {/* Your page content */}
    </div>
  );
}
```

// Example usage in a Server Component
import { getServerPermissions, PermissionGate } from "@/utils/server-permissions";

export default async function UserDashboard() {
const { hasPermission, hasAnyPermission } = await getServerPermissions();

return (
<div className="p-4">
<h1>User Dashboard</h1>

      {/* Using direct permission check */}
      {hasPermission("users.create") && (
        <button className="bg-rose-500 text-white px-4 py-2">
          Create User
        </button>
      )}

      {/* Using PermissionGate component */}
      <PermissionGate permission="users.delete">
        <button className="bg-red-500 text-white px-4 py-2">
          Delete User
        </button>
      </PermissionGate>

      {/* Checking multiple permissions */}
      {hasAnyPermission(["users.update", "users.manage"]) && (
        <div className="mt-4">
          <h2>User Management Section</h2>
          {/* Management content */}
        </div>
      )}
    </div>

);
}

// Example with multiple components and permissions
export async function UsersTable() {
const { hasPermission } = await getServerPermissions();

return (
<table className="min-w-full">
<thead>
<tr>
<th>Name</th>
<th>Email</th>
<th>Actions</th>
</tr>
</thead>
<tbody>
<tr>
<td>John Doe</td>
<td>john@example.com</td>
<td className="space-x-2">
<PermissionGate permission="users.update">
<button className="text-rose-500">Edit</button>
</PermissionGate>

            <PermissionGate permission="users.delete">
              <button className="text-red-500">Delete</button>
            </PermissionGate>
          </td>
        </tr>
      </tbody>
    </table>

);
}

// Example with nested permissions and complex UI
export async function AdminDashboard() {
const { hasAllPermissions } = await getServerPermissions();

const isFullAdmin = hasAllPermissions([
"users.manage",
"roles.manage",
"settings.manage"
]);

return (
<div>
{isFullAdmin ? (
<div className="bg-green-100 p-4 rounded">
<h2>Full Admin Access</h2>
{/_ Full admin content _/}
</div>
) : (
<div className="bg-yellow-100 p-4 rounded">
<h2>Limited Access</h2>
{/_ Limited access content _/}
</div>
)}
</div>
);
}
```
// config/sidebar.ts
import {
  BaggageClaim,
  BarChart2,
  BarChart4,
  Book,
  Cable,
  CircleDollarSign,
  FolderTree,
  Home,
  LucideIcon,
  Presentation,
  Settings,
  Users,
} from "lucide-react";

export interface ISidebarLink {
  title: string;
  href?: string;
  icon: LucideIcon;
  dropdown: boolean;
  permission: string; // Required permission to view this item
  dropdownMenu?: MenuItem[];
}

type MenuItem = {
  title: string;
  href: string;
  permission: string; // Required permission to view this menu item
};

export const sidebarLinks: ISidebarLink[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    dropdown: false,
    permission: "dashboard.read",
  },
  {
    title: "Users",
    icon: Users,
    href: "/dashboard/users",
    dropdown: true,
    permission: "users.read",
    dropdownMenu: [
      {
        title: "Users",
        href: "/dashboard/users",
        permission: "users.read",
      },
      {
        title: "Roles",
        href: "/dashboard/users/roles",
        permission: "roles.read",
      },
      {
        title: "Change Password",
        href: "/dashboard/change-password",
        permission: "roles.read",
      },
      {
        title: "Profile",
        href: "/dashboard/profile",
        permission: "roles.read",
      },
    ],
  },
  {
    title: "Inventory",
    icon: BaggageClaim,
    dropdown: true,
    href: "/dashboard/inventory/products",
    permission: "products.read",
    dropdownMenu: [
      {
        title: "Categories",
        href: "/dashboard/inventory/categories",
        permission: "categories.read",
      },
      {
        title: "Products",
        href: "/dashboard/inventory/products",
        permission: "products.read",
      },
    ],
  },
  {
    title: "Sales",
    icon: CircleDollarSign,
    dropdown: true,
    href: "/dashboard/sales",
    permission: "sales.read",
    dropdownMenu: [
      {
        title: "Sales",
        href: "/dashboard/sales",
        permission: "sales.read",
      },
      {
        title: "Customers",
        href: "/dashboard/sales/customers",
        permission: "customers.read",
      },
    ],
  },
  {
    title: "Blogs",
    icon: Book,
    dropdown: false,
    href: "/dashboard/blogs",
    permission: "blogs.read",
  },
  {
    title: "Orders",
    href: "/dashboard/orders",
    icon: BarChart2,
    dropdown: false,
    permission: "orders.read",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    dropdown: true,
    dropdownMenu: [
      {
        title: "Change Password",
        href: "/dashboard/settings/change-password",
        permission: "settings.read",
      },
      {
        title: "Feedback",
        href: "/dashboard/settings/feedback",
        permission: "settings.read",
      },
      {
        title: "Showcases",
        href: "/dashboard/settings/showcases",
        permission: "settings.read",
      },
      {
        title: "Profile",
        href: "/dashboard/settings/profile",
        permission: "settings.read",
      },
      {
        title: "Changelogs",
        href: "/dashboard/settings/change-logs",
        permission: "settings.read",
      },
    ],
    permission: "settings.read",
  },
  {
    title: "Reports",
    icon: BarChart4,
    dropdown: true,
    href: "/dashboard/reports/products",
    permission: "reports.read",
    dropdownMenu: [
      {
        title: "Product Report",
        href: "/dashboard/reports/products",
        permission: "reports.read",
      },
      {
        title: "Inventory Report",
        href: "/dashboard/reports/inventory",
        permission: "reports.read",
      },
      {
        title: "Customers Report",
        href: "/dashboard/reports/customers",
        permission: "reports.read",
      },
    ],
  },
];


```