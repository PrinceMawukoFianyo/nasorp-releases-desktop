// config/permissions.ts

import { sidebarLinks } from "./sidebar";

export type Permission = {
  create: string;
  read: string;
  update: string;
  delete: string;
};

export type ModulePermissions = {
  display: string;
  name: string;
  permissions: Permission;
};

export const permissions: ModulePermissions[] = [
  {
    display: "Dashboard",
    name: "dashboard",
    permissions: {
      create: "dashboard.create",
      read: "dashboard.read",
      update: "dashboard.update",
      delete: "dashboard.delete",
    },
  },
  {
    display: "Accounting",
    name: "accounting",
    permissions: {
      create: "accounting.create",
      read: "accounting.read",
      update: "accounting.update",
      delete: "accounting.delete",
    },
  },
  // ── Accounting sub-modules ──────────────────────────────────────
  {
    display: "Accounting - Payroll",
    name: "accounting.payroll",
    permissions: {
      create: "accounting.payroll.create",
      read: "accounting.payroll",
      update: "accounting.payroll.update",
      delete: "accounting.payroll.delete",
    },
  },
  {
    display: "Accounting - Admin",
    name: "accounting.admin",
    permissions: {
      create: "accounting.admin.create",
      read: "accounting.admin",
      update: "accounting.admin.update",
      delete: "accounting.admin.delete",
    },
  },

  // ── MoMo Payments ──────────────────────────────────────────────
  {
    display: "MoMo Payments",
    name: "momo",
    permissions: {
      create: "momo.create",
      read: "momo.read",
      update: "momo.update",
      delete: "momo.request",
    },
  },

  {
    display: "Inventory",
    name: "inventory",
    permissions: {
      create: "inventory.create",
      read: "inventory.read",
      update: "inventory.update",
      delete: "inventory.delete",
    },
  },
  {
    display: "Items",
    name: "items",
    permissions: {
      create: "items.create",
      read: "items.read",
      update: "items.update",
      delete: "items.delete",
    },
  },
  {
    display: "Categories",
    name: "categories",
    permissions: {
      create: "categories.create",
      read: "categories.read",
      update: "categories.update",
      delete: "categories.delete",
    },
  },
  {
    display: "Brands",
    name: "brands",
    permissions: {
      create: "brands.create",
      read: "brands.read",
      update: "brands.update",
      delete: "brands.delete",
    },
  },
  {
    display: "Units",
    name: "units",
    permissions: {
      create: "units.create",
      read: "units.read",
      update: "units.update",
      delete: "units.delete",
    },
  },
  {
    display: "Stock",
    name: "stock",
    permissions: {
      create: "stock.create",
      read: "stock.read",
      update: "stock.update",
      delete: "stock.delete",
    },
  },
  {
    display: "Stock Transfers",
    name: "transfers",
    permissions: {
      create: "transfers.create",
      read: "transfers.read",
      update: "transfers.update",
      delete: "transfers.delete",
    },
  },
  {
    display: "Stock Adjustments",
    name: "adjustments",
    permissions: {
      create: "adjustments.create",
      read: "adjustments.read",
      update: "adjustments.update",
      delete: "adjustments.delete",
    },
  },
  {
    display: "Serial Numbers",
    name: "serial.numbers",
    permissions: {
      create: "serial.numbers.create",
      read: "serial.numbers.read",
      update: "serial.numbers.update",
      delete: "serial.numbers.delete",
    },
  },

  // ── Barcode Management ─────────────────────────────────────────
  {
    display: "Barcode Management",
    name: "barcodes",
    permissions: {
      create: "barcodes.create",
      read: "barcodes.read",
      update: "barcodes.update",
      delete: "barcodes.delete",
    },
  },

  {
    display: "Purchases",
    name: "purchases",
    permissions: {
      create: "purchases.create",
      read: "purchases.read",
      update: "purchases.update",
      delete: "purchases.delete",
    },
  },
  {
    display: "Purchase Orders",
    name: "purchase.orders",
    permissions: {
      create: "purchase.orders.create",
      read: "purchase.orders.read",
      update: "purchase.orders.update",
      delete: "purchase.orders.delete",
    },
  },
  {
    display: "Goods Receipts",
    name: "goods.receipts",
    permissions: {
      create: "goods.receipts.create",
      read: "goods.receipts.read",
      update: "goods.receipts.update",
      delete: "goods.receipts.delete",
    },
  },
  {
    display: "Suppliers",
    name: "suppliers",
    permissions: {
      create: "suppliers.create",
      read: "suppliers.read",
      update: "suppliers.update",
      delete: "suppliers.delete",
    },
  },
  {
    display: "Suppliers Items",
    name: "suppliers.items",
    permissions: {
      create: "suppliers.items.create",
      read: "suppliers.items.read",
      update: "suppliers.items.update",
      delete: "suppliers.items.delete",
    },
  },
  {
    display: "Sales",
    name: "sales",
    permissions: {
      create: "sales.create",
      read: "sales.read",
      update: "sales.update",
      delete: "sales.delete",
    },
  },
  {
    display: "Credit Sales",
    name: "sales.orders",
    permissions: {
      create: "sales.orders.create",
      read: "sales.orders.read",
      update: "sales.orders.update",
      delete: "sales.orders.delete",
    },
  },

  // ── Backorders ────────────────────────────────────────────────
  {
    display: "Backorders",
    name: "backorders",
    permissions: {
      create: "backorders.create",
      read: "backorders.read",
      update: "backorders.update",
      delete: "backorders.delete",
    },
  },

  {
    display: "POS",
    name: "pos",
    permissions: {
      create: "pos.create",
      read: "pos.read",
      update: "pos.update",
      delete: "pos.access",
    },
  },
  // ── POS sub-modules ──────────────────────────────────────────────
  {
    display: "POS - Phone Scanner",
    name: "pos.phone_scanner",
    permissions: {
      create: "pos.phone_scanner.create",
      read: "pos.phone_scanner",
      update: "pos.phone_scanner.update",
      delete: "pos.phone_scanner.delete",
    },
  },
  {
    display: "Returns",
    name: "returns",
    permissions: {
      create: "returns.create",
      read: "returns.read",
      update: "returns.update",
      delete: "returns.delete",
    },
  },
  {
    display: "Customers",
    name: "customers",
    permissions: {
      create: "customers.create",
      read: "customers.read",
      update: "customers.update",
      delete: "customers.delete",
    },
  },
  {
    display: "Reports",
    name: "reports",
    permissions: {
      create: "reports.create",
      read: "reports.read",
      update: "reports.update",
      delete: "reports.delete",
    },
  },
  {
    display: "Inventory Reports",
    name: "reports.inventory",
    permissions: {
      create: "reports.inventory.create",
      read: "reports.inventory.read",
      update: "reports.inventory.update",
      delete: "reports.inventory.delete",
    },
  },
  {
    display: "Purchase Reports",
    name: "reports.purchases",
    permissions: {
      create: "reports.purchases.create",
      read: "reports.purchases.read",
      update: "reports.purchases.update",
      delete: "reports.purchases.delete",
    },
  },
  {
    display: "Sales Reports",
    name: "reports.sales",
    permissions: {
      create: "reports.sales.create",
      read: "reports.sales.read",
      update: "reports.sales.update",
      delete: "reports.sales.delete",
    },
  },
  {
    display: "Product Reports",
    name: "reports.products",
    permissions: {
      create: "reports.products.create",
      read: "reports.products.read",
      update: "reports.products.update",
      delete: "reports.products.delete",
    },
  },
  {
    display: "Customer Reports",
    name: "reports.customers",
    permissions: {
      create: "reports.customers.create",
      read: "reports.customers.read",
      update: "reports.customers.update",
      delete: "reports.customers.delete",
    },
  },
  {
    display: "Integrations",
    name: "integrations",
    permissions: {
      create: "integrations.create",
      read: "integrations.read",
      update: "integrations.update",
      delete: "integrations.access",
    },
  },
  {
    display: "POS Integration",
    name: "integrations.pos",
    permissions: {
      create: "integrations.pos.create",
      read: "integrations.pos.read",
      update: "integrations.pos.update",
      delete: "integrations.pos.access",
    },
  },
  {
    display: "Accounting Integration",
    name: "integrations.accounting",
    permissions: {
      create: "integrations.accounting.create",
      read: "integrations.accounting.read",
      update: "integrations.accounting.update",
      delete: "integrations.accounting.access",
    },
  },
  {
    display: "E-commerce Integration",
    name: "integrations.ecommerce",
    permissions: {
      create: "integrations.ecommerce.create",
      read: "integrations.ecommerce.read",
      update: "integrations.ecommerce.update",
      delete: "integrations.ecommerce.access",
    },
  },
  {
    display: "API Settings",
    name: "api_settings",
    permissions: {
      create: "api_settings.create",
      read: "api_settings.read",
      update: "api_settings.update",
      delete: "api_settings.delete",
    },
  },
  {
    display: "Content",
    name: "content",
    permissions: {
      create: "content.create",
      read: "content.read",
      update: "content.update",
      delete: "content.delete",
    },
  },
  {
    display: "Locations",
    name: "locations",
    permissions: {
      create: "locations.create",
      read: "locations.read",
      update: "locations.update",
      delete: "locations.delete",
    },
  },
  {
    display: "Tax Settings",
    name: "tax.settings",
    permissions: {
      create: "tax.settings.create",
      read: "tax.settings.read",
      update: "tax.settings.update",
      delete: "tax.settings.access",
    },
  },

  // ── Settings (mother module) ────────────────────────────────────
  {
    display: "Settings",
    name: "settings",
    permissions: {
      create: "settings.create",
      read: "settings.read",
      update: "settings.update",
      delete: "settings.admin",
    },
  },

  {
    display: "Users",
    name: "users",
    permissions: {
      create: "users.create",
      read: "users.read",
      update: "users.update",
      delete: "users.delete",
    },
  },
  {
    display: "Roles & Permissions",
    name: "roles",
    permissions: {
      create: "roles.create",
      read: "roles.read",
      update: "roles.update",
      delete: "roles.delete",
    },
  },
  {
    display: "Company Settings",
    name: "company.settings",
    permissions: {
      create: "company.settings.create",
      read: "company.settings.read",
      update: "company.settings.update",
      delete: "company.settings.access",
    },
  },
  {
    display: "Profile",
    name: "profile",
    permissions: {
      create: "profile.create",
      read: "profile.read",
      update: "profile.update",
      delete: "profile.delete",
    },
  },
  {
    display: "Password",
    name: "password",
    permissions: {
      create: "password.create",
      read: "password.read",
      update: "password.update",
      delete: "password.change",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — full access to everything including all sub-modules
// ─────────────────────────────────────────────────────────────────────────────
export const adminPermissions = permissions.flatMap((m) =>
  Object.values(m.permissions)
);

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER — accounting read + payroll, no admin (Paystack settings)
// ─────────────────────────────────────────────────────────────────────────────
export const managerPermissions = [
  "dashboard.read",

  "accounting.read",
  "accounting.update",
  "accounting.payroll",

  "momo.read",
  "momo.update",

  "inventory.read",
  "inventory.update",

  "items.create",
  "items.read",
  "items.update",

  "categories.read",
  "brands.read",
  "units.read",

  "stock.read",
  "stock.update",

  "barcodes.read",
  "barcodes.update",

  "transfers.create",
  "transfers.read",
  "transfers.update",

  "adjustments.create",
  "adjustments.read",
  "adjustments.update",

  "serial.numbers.read",
  "serial.numbers.update",

  "purchases.create",
  "purchases.read",
  "purchases.update",

  "purchase.orders.create",
  "purchase.orders.read",
  "purchase.orders.update",

  "goods.receipts.create",
  "goods.receipts.read",
  "goods.receipts.update",

  "suppliers.read",
  "suppliers.update",
  "suppliers.items.read",
  "suppliers.items.update",

  "sales.create",
  "sales.read",
  "sales.update",

  "sales.orders.create",
  "sales.orders.read",
  "sales.orders.update",

  "backorders.read",
  "backorders.update",

  "pos.create",
  "pos.read",
  "pos.access",
  // Lets a manager pair staff phones as remote scanners on the POS page.
  // Deliberately left out of userPermissions below — regular staff can
  // scan locally, but only a manager (or a role you explicitly grant this
  // to) can connect other people's phones.
  "pos.phone_scanner",

  "returns.create",
  "returns.read",
  "returns.update",

  "customers.read",
  "customers.update",

  "reports.read",
  "reports.inventory.read",
  "reports.purchases.read",
  "reports.sales.read",
  "reports.products.read",
  "reports.customers.read",

  "integrations.read",
  "integrations.pos.read",
  "integrations.accounting.read",
  "api_settings.read",

  "settings.read",
  "locations.read",
  "tax.settings.read",
  "users.read",
  "roles.read",
  "company.settings.access",

  "profile.read",
  "profile.update",

  "password.read",
  "password.update",
  "password.change",
];

// ─────────────────────────────────────────────────────────────────────────────
// USER — read-only day-to-day access
// ─────────────────────────────────────────────────────────────────────────────
export const userPermissions = [
  "dashboard.read",

  "accounting.read",

  "momo.read",

  "inventory.read",
  "items.read",
  "stock.read",

  "sales.create",
  "sales.read",

  "sales.orders.create",
  "sales.orders.read",

  "pos.create",
  "pos.read",
  "pos.access",

  "returns.create",
  "returns.read",

  "customers.read",

  "reports.read",
  "reports.sales.read",
  "reports.products.read",

  "purchases.read",

  "suppliers.read",

  "settings.read",

  "profile.read",
  "profile.update",

  "password.read",
  "password.update",
  "password.change",
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Every permission string that the sidebar/RoleForm UI can actually produce
// (mother + child permissions for every link, including links with no dropdown
// like "Dashboard"). This is what RoleForm.tsx uses on the client too, so the
// two can never drift apart again.
function getSidebarPermissions(): string[] {
  const perms = new Set<string>();
  sidebarLinks.forEach((link) => {
    perms.add(link.permission);
    link.dropdownMenu?.forEach((item) => perms.add(item.permission));
  });
  return Array.from(perms);
}

// FIX: this used to only return the flat create/read/update/delete list built
// from `permissions` above. That list didn't match what the sidebar/RoleForm
// UI actually lets an admin select (e.g. "dashboard.read" has no dropdown so
// it was missing here), which caused updateRole() to silently strip valid
// permissions on every save. Now it's a safe superset of both lists so
// nothing selectable in the UI is ever rejected by the server.
export function getAllPermissions(): string[] {
  const flatCrud = permissions.flatMap((module) => Object.values(module.permissions));
  return Array.from(new Set([...flatCrud, ...getSidebarPermissions()]));
}

export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}

export function getModulePermissions(
  moduleName: string
): Permission | undefined {
  const module = permissions.find((m) => m.name === moduleName);
  return module?.permissions;
}

export type PermissionsType = {
  [K in (typeof permissions)[number]["name"]]: Permission;
};

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical tree (used by RoleForm to render nested permission groups)
// ─────────────────────────────────────────────────────────────────────────────

export type PermTreeNode = {
  key: string;
  label: string;
  actions: Permission;
  children: PermTreeNode[];
};

export function buildPermissionTree(): PermTreeNode[] {
  const nodeMap = new Map<string, PermTreeNode>();
  const roots: PermTreeNode[] = [];

  permissions.forEach((m) => {
    nodeMap.set(m.name, {
      key: m.name,
      label: m.display,
      actions: m.permissions,
      children: [],
    });
  });

  permissions.forEach((m) => {
    const node = nodeMap.get(m.name)!;
    const parts = m.name.split(".");
    const parentKey = parts.slice(0, -1).join(".");
    const parent = parts.length > 1 ? nodeMap.get(parentKey) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function flattenNodeActions(node: PermTreeNode): string[] {
  const own = Object.values(node.actions);
  const child = node.children.flatMap(flattenNodeActions);
  return [...own, ...child];
}