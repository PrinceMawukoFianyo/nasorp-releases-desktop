// permissions.ts

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
    display: "items",
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
    display: "Stock Adjustment",
    name: "adjustment",
    permissions: {
      create: "adjustment.create",
      read: "adjustment.read",
      update: "adjustment.update",
      delete: "adjustment.delete",
    },
  },
  {
    display: "Serial Numbers",
    name: "serial_numbers",
    permissions: {
      create: "serial_numbers.create",
      read: "serial_numbers.read",
      update: "serial_numbers.update",
      delete: "serial_numbers.delete",
    },
  },
  {
    display: "Batch/Lot Numbers",
    name: "batch_numbers",
    permissions: {
      create: "batch_numbers.create",
      read: "batch_numbers.read",
      update: "batch_numbers.update",
      delete: "batch_numbers.delete",
    },
  },
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
    display: "Warehouses",
    name: "warehouses",
    permissions: {
      create: "warehouses.create",
      read: "warehouses.read",
      update: "warehouses.update",
      delete: "warehouses.delete",
    },
  },
  {
    display: "Stock Takes",
    name: "stock_takes",
    permissions: {
      create: "stock_takes.create",
      read: "stock_takes.read",
      update: "stock_takes.update",
      delete: "stock_takes.delete",
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
    display: "Goods Receipt",
    name: "goods_receipt",
    permissions: {
      create: "goods_receipt.create",
      read: "goods_receipt.read",
      update: "goods_receipt.update",
      delete: "goods_receipt.delete",
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
    display: "POS",
    name: "pos",
    permissions: {
      create: "pos.create",
      read: "pos.read",
      update: "pos.update",
      delete: "pos.delete",
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
    display: "Integrations",
    name: "integrations",
    permissions: {
      create: "integrations.create",
      read: "integrations.read",
      update: "integrations.update",
      delete: "integrations.delete",
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
    display: "Settings",
    name: "settings",
    permissions: {
      create: "settings.create",
      read: "settings.read",
      update: "settings.update",
      delete: "settings.delete",
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
    name: "company_settings",
    permissions: {
      create: "company_settings.create",
      read: "company_settings.read",
      update: "company_settings.update",
      delete: "company_settings.delete",
    },
  },
  {
    display: "Tax Rates",
    name: "tax_settings",
    permissions: {
      create: "tax_settings.create",
      read: "tax_settings.read",
      update: "tax_settings.update",
      delete: "tax_settings.delete",
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
];

export const adminPermissions = [
  // Dashboard
  "dashboard.create",
  "dashboard.read",
  "dashboard.update",
  "dashboard.delete",

  // Inventory
  "inventory.read",

  // Items
  "items.create",
  "items.read",
  "items.update",
  "items.delete",

  // Categories
  "categories.create",
  "categories.read",
  "categories.update",
  "categories.delete",

  // Brands
  "brands.create",
  "brands.read",
  "brands.update",
  "brands.delete",

  // Units
  "units.create",
  "units.read",
  "units.update",
  "units.delete",

  // Stock
  "stock.create",
  "stock.read",
  "stock.update",
  "stock.delete",

  // Transfers
  "transfers.create",
  "transfers.read",
  "transfers.update",
  "transfers.delete",

  // Adjustment
  "adjustment.create",
  "adjustment.read",
  "adjustment.update",
  "adjustment.delete",

  // Serial Numbers
  "serial_numbers.create",
  "serial_numbers.read",
  "serial_numbers.update",
  "serial_numbers.delete",

  // Batch Numbers
  "batch_numbers.create",
  "batch_numbers.read",
  "batch_numbers.update",
  "batch_numbers.delete",

  // Barcodes
  "barcodes.create",
  "barcodes.read",
  "barcodes.update",
  "barcodes.delete",

  // Warehouses
  "warehouses.create",
  "warehouses.read",
  "warehouses.update",
  "warehouses.delete",

  // Stock Takes
  "stock_takes.create",
  "stock_takes.read",
  "stock_takes.update",
  "stock_takes.delete",

  // Purchases
  "purchases.create",
  "purchases.read",
  "purchases.update",
  "purchases.delete",

  // Goods Receipt
  "goods_receipt.create",
  "goods_receipt.read",
  "goods_receipt.update",
  "goods_receipt.delete",

  // Suppliers
  "suppliers.create",
  "suppliers.read",
  "suppliers.update",
  "suppliers.delete",

  // Sales
  "sales.create",
  "sales.read",
  "sales.update",
  "sales.delete",

  // POS
  "pos.create",
  "pos.read",
  "pos.update",
  "pos.delete",

  // Returns
  "returns.create",
  "returns.read",
  "returns.update",
  "returns.delete",

  // Backorders
  "backorders.create",
  "backorders.read",
  "backorders.update",
  "backorders.delete",

  // Customers
  "customers.create",
  "customers.read",
  "customers.update",
  "customers.delete",

  // Reports
  "reports.create",
  "reports.read",
  "reports.update",
  "reports.delete",

  // Integrations
  "integrations.create",
  "integrations.read",
  "integrations.update",
  "integrations.delete",

  // API Settings
  "api_settings.create",
  "api_settings.read",
  "api_settings.update",
  "api_settings.delete",

  // Settings
  "settings.create",
  "settings.read",
  "settings.update",
  "settings.delete",

  // Locations
  "locations.create",
  "locations.read",
  "locations.update",
  "locations.delete",

  // Users
  "users.create",
  "users.read",
  "users.update",
  "users.delete",

  // Roles
  "roles.create",
  "roles.read",
  "roles.update",
  "roles.delete",

  // Company Settings
  "company_settings.create",
  "company_settings.read",
  "company_settings.update",
  "company_settings.delete",

  // Tax Settings
  "tax_settings.create",
  "tax_settings.read",
  "tax_settings.update",
  "tax_settings.delete",

  // Profile
  "profile.create",
  "profile.read",
  "profile.update",
  "profile.delete",
];

export const managerPermissions = [
  // Dashboard
  "dashboard.read",

  // Inventory
  "inventory.read",
  "inventory.update",

  // Items
  "items.create",
  "items.read",
  "items.update",

  // Categories
  "categories.read",

  // Brands
  "brands.read",

  // Units
  "units.read",

  // Stock
  "stock.read",
  "stock.update",

  // Transfers
  "transfers.create",
  "transfers.read",
  "transfers.update",

  // Adjustment
  "adjustment.create",
  "adjustment.read",
  "adjustment.update",

  // Serial Numbers
  "serial_numbers.read",
  "serial_numbers.update",

  // Batch Numbers
  "batch_numbers.read",
  "batch_numbers.update",

  // Barcodes
  "barcodes.read",

  // Warehouses
  "warehouses.read",

  // Stock Takes
  "stock_takes.create",
  "stock_takes.read",
  "stock_takes.update",

  // Purchases
  "purchases.create",
  "purchases.read",
  "purchases.update",

  // Goods Receipt
  "goods_receipt.create",
  "goods_receipt.read",
  "goods_receipt.update",

  // Suppliers
  "suppliers.read",
  "suppliers.update",

  // Sales
  "sales.create",
  "sales.read",
  "sales.update",

  // POS
  "pos.create",
  "pos.read",

  // Returns
  "returns.create",
  "returns.read",
  "returns.update",

  // Backorders
  "backorders.read",
  "backorders.update",

  // Customers
  "customers.read",
  "customers.update",

  // Reports
  "reports.read",

  // Profile
  "profile.read",
  "profile.update",
];

export const userPermissions = [
  // Dashboard
  "dashboard.read",

  // Products
  "items.read",

  // Stock
  "stock.read",

  // Sales
  "sales.create",
  "sales.read",

  // POS
  "pos.create",
  "pos.read",

  // Returns
  "returns.create",
  "returns.read",

  // Customers
  "customers.read",

  // Profile
  "profile.read",
  "profile.update",
];

// Helper function to get all permission strings
export function getAllPermissions(): string[] {
  return permissions.flatMap((module) => Object.values(module.permissions));
}

// Helper function to check if a permission exists
export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}

// Helper to get module permissions by name
export function getModulePermissions(
  moduleName: string
): Permission | undefined {
  const module = permissions.find((m) => m.name === moduleName);
  return module?.permissions;
}

// Type for the permissions object
export type PermissionsType = {
  [K in (typeof permissions)[number]["name"]]: Permission;
};