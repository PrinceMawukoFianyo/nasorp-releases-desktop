// config/sidebar.ts
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Box,
  Building2,
  Cable,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  LucideIcon,
  MapPin,
  Package,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  ArrowLeftRight,
  TrendingDown,
} from "lucide-react";

export interface ISidebarLink {
  title: string;
  href?: string;
  icon: LucideIcon;
  dropdown: boolean;
  permission: string;
  dropdownMenu?: MenuItem[];
  badge?: string;
}

type MenuItem = {
  title: string;
  href: string;
  permission: string;
  badge?: string;
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
    title: "Inventory",
    icon: Package,
    dropdown: true,
    href: "/dashboard/inventory/items",
    permission: "inventory.read",
    dropdownMenu: [
      {
        title: "Items",
        href: "/dashboard/inventory/items",
        permission: "items.read",
      },
      {
        title: "Categories",
        href: "/dashboard/inventory/categories",
        permission: "categories.read",
      },
      {
        title: "Brands",
        href: "/dashboard/inventory/brands",
        permission: "brands.read",
      },
      {
        title: "Units",
        href: "/dashboard/inventory/units",
        permission: "units.read",
      },
      {
        title: "Current Stock",
        href: "/dashboard/inventory/current-stock",
        permission: "stock.read",
      },
      {
        title: "Low Stock Items",
        href: "/dashboard/inventory/low-stock",
        permission: "stock.read",
      },
      {
        title: "Stock Transfers",
        href: "/dashboard/inventory/stock-transfers",
        permission: "transfers.read",
      },
    
      {
        title: "Stock Adjustment",
        href: "/dashboard/inventory/stock-adjustment",
        permission: "adjustment.read",
      },
      
      {
        title: "Serial Numbers",
        href: "/dashboard/inventory/serial-numbers",
        permission: "serial_numbers.read",
      },
      {
        title: "Batch/Lot Numbers",
        href: "/dashboard/inventory/batch-numbers",
        permission: "batch_numbers.read",
      },
      {
        title: "Barcode Management",
        href: "/dashboard/inventory/barcodes",
        permission: "barcodes.read",
      },
      {
        title: "Warehouses",
        href: "/dashboard/inventory/warehouses",
        permission: "warehouses.read",
      },
      {
        title: "Stock Takes",
        href: "/dashboard/inventory/stock-takes",
        permission: "stock_takes.read",
      },
    ],
  },
  {
    title: "Purchases",
    icon: ShoppingBag,
    dropdown: true,
    href: "/dashboard/purchases",
    permission: "purchases.read",
    dropdownMenu: [
      {
        title: "Purchase Orders",
        href: "/dashboard/purchases/orders",
        permission: "purchases.read",
      },
      {
        title: "Create Purchase Order",
        href: "/dashboard/purchases/orders/create",
        permission: "purchases.create",
      },
      {
        title: "Goods Receipt",
        href: "/dashboard/purchases/goods-receipt",
        permission: "goods_receipt.read",
      },
      {
        title: "Create Receipt",
        href: "/dashboard/purchases/goods-receipt/create",
        permission: "goods_receipt.create",
      },
      {
        title: "Suppliers",
        href: "/dashboard/purchases/suppliers",
        permission: "suppliers.read",
      },
      {
        title: "Add Supplier",
        href: "/dashboard/purchases/suppliers/create",
        permission: "suppliers.create",
      },
    ],
  },
  {
    title: "Sales",
    icon: TrendingUp,
    dropdown: true,
    href: "/dashboard/sales",
    permission: "sales.read",
    dropdownMenu: [
      {
        title: "POS Sales",
        href: "/dashboard/sales/pos",
        permission: "pos.read",
      },
      {
        title: "Sales Orders",
        href: "/dashboard/sales/orders",
        permission: "sales.read",
      },
      {
        title: "Create Sales Order",
        href: "/dashboard/sales/orders/create",
        permission: "sales.create",
      },
      {
        title: "Returns",
        href: "/dashboard/sales/returns",
        permission: "returns.read",
      },
      {
        title: "Backorders",
        href: "/dashboard/sales/backorders",
        permission: "backorders.read",
      },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    dropdown: true,
    href: "/dashboard/reports/stock-movement",
    permission: "reports.read",
    dropdownMenu: [
      {
        title: "Stock Movement",
        href: "/dashboard/reports/stock-movement",
        permission: "reports.read",
      },
      {
        title: "Inventory Valuation",
        href: "/dashboard/reports/inventory-valuation",
        permission: "reports.read",
      },
      {
        title: "Aging Analysis",
        href: "/dashboard/reports/aging-analysis",
        permission: "reports.read",
      },
      {
        title: "Purchase Summary",
        href: "/dashboard/reports/purchase-summary",
        permission: "reports.read",
      },
      {
        title: "Supplier Performance",
        href: "/dashboard/reports/supplier-performance",
        permission: "reports.read",
      },
      {
        title: "Sales Summary",
        href: "/dashboard/reports/sales-summary",
        permission: "reports.read",
      },
      {
        title: "Product Performance",
        href: "/dashboard/reports/product-performance",
        permission: "reports.read",
      },
    ],
  },
  {
    title: "Integrations",
    icon: Cable,
    dropdown: true,
    href: "/dashboard/integrations/pos",
    permission: "integrations.read",
    dropdownMenu: [
      {
        title: "POS Integration",
        href: "/dashboard/integrations/pos",
        permission: "integrations.read",
      },
      {
        title: "Accounting Integration",
        href: "/dashboard/integrations/accounting",
        permission: "integrations.read",
      },
      {
        title: "API Settings",
        href: "/dashboard/integrations/api-settings",
        permission: "integrations.admin",
      },
    ],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    dropdown: true,
    permission: "settings.read",
    dropdownMenu: [
      {
        title: "Locations",
        href: "/dashboard/settings/locations",
        permission: "locations.read",
      },
      {
        title: "Add Location",
        href: "/dashboard/settings/locations/create",
        permission: "locations.create",
      },
      {
        title: "Tax Rates",
        href: "/dashboard/settings/tax rate/create",
        permission: "locations.create",
      },
      {
        title: "Add Tax Rates",
        href: "/dashboard/settings/tax-rate/create",
        permission: "tax.create",
      },
      {
        title: "Users & Invites",
        href: "/dashboard/settings/users",
        permission: "users.read",
      },
      {
        title: "Roles & Permissions",
        href: "/dashboard/settings/roles",
        permission: "roles.read",
      },
      {
        title: "Company Settings",
        href: "/dashboard/settings/company",
        permission: "settings.admin",
      },
      {
        title: "Profile",
        href: "/dashboard/settings/profile",
        permission: "profile.read",
      },
      {
        title: "Change Password",
        href: "/dashboard/settings/change-password",
        permission: "settings.read",
      },
    ],
  },
];

// Helper function to filter sidebar links based on user permissions
export const filterSidebarByPermissions = (
  links: ISidebarLink[],
  userPermissions: string[]
): ISidebarLink[] => {
  return links
    .filter((link) => userPermissions.includes(link.permission))
    .map((link) => {
      if (link.dropdown && link.dropdownMenu) {
        return {
          ...link,
          dropdownMenu: link.dropdownMenu.filter((item) =>
            userPermissions.includes(item.permission)
          ),
        };
      }
      return link;
    })
    .filter((link) => {
      // Remove dropdown items with no visible menu items
      if (link.dropdown && link.dropdownMenu) {
        return link.dropdownMenu.length > 0;
      }
      return true;
    });
};