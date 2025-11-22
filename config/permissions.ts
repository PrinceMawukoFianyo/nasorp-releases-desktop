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
    name: "suppliers Items",
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
    display: "Sales Orders",
    name: "sales.orders",
    permissions: {
      create: "sales.orders.create",
      read: "sales.orders.read",
      update: "sales.orders.update",
      delete: "sales.orders.delete",
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

export const adminPermissions = [
  // Dashboard
  "dashboard.create",
  "dashboard.read",
  "dashboard.update",
  "dashboard.delete",

  // Inventory
  "inventory.create",
  "inventory.read",
  "inventory.update",
  "inventory.delete",

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

  // Adjustments
  "adjustments.create",
  "adjustments.read",
  "adjustments.update",
  "adjustments.delete",

  // Serial Numbers
  "serial.numbers.create",
  "serial.numbers.read",
  "serial.numbers.update",
  "serial.numbers.delete",

  // Purchases
  "purchases.create",
  "purchases.read",
  "purchases.update",
  "purchases.delete",

  // Purchase Orders
  "purchase.orders.create",
  "purchase.orders.read",
  "purchase.orders.update",
  "purchase.orders.delete",

  // Goods Receipts
  "goods.receipts.create",
  "goods.receipts.read",
  "goods.receipts.update",
  "goods.receipts.delete",

  // Suppliers
  "suppliers.create",
  "suppliers.read",
  "suppliers.update",
  "suppliers.delete",

  // Suppliers Items
  "suppliers.items.create",
  "suppliers.items.read",
  "suppliers.items.update",
  "suppliers.items.delete",

  // Sales
  "sales.create",
  "sales.read",
  "sales.update",
  "sales.delete",

  // Sales Orders
  "sales.orders.create",
  "sales.orders.read",
  "sales.orders.update",
  "sales.orders.delete",

  // POS
  "pos.create",
  "pos.read",
  "pos.update",
  "pos.access",

  // Returns
  "returns.create",
  "returns.read",
  "returns.update",
  "returns.delete",

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

  // Report subcategories
  "reports.inventory.read",
  "reports.purchases.read",
  "reports.sales.read",
  "reports.products.read",
  "reports.customers.read",

  // Integrations
  "integrations.create",
  "integrations.read",
  "integrations.update",
  "integrations.access",
  "integrations.pos.access",
  "integrations.accounting.read",
  "integrations.accounting.access",
  "integrations.ecommerce.access",
  "integrations.api.access",

   // API Settings
  "api_settings.create",
  "api_settings.read",
  "api_settings.update",
  "api_settings.delete",


  // Settings
  "settings.create",
  "settings.read",
  "settings.update",
  "settings.access",

  // Locations
  "locations.create",
  "locations.read",
  "locations.update",
  "locations.delete",

  // Tax Settings
  "tax.settings.create",
  "tax.settings.read",
  "tax.settings.update",
  "tax.settings.access",

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
  "company.settings.create",
  "company.settings.read",
  "company.settings.update",
  "company.settings.access",

  // Profile
  "profile.create",
  "profile.read",
  "profile.update",
  "profile.delete",

  // Password
  "password.create",
  "password.read",
  "password.update",
  "password.change",
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

  // Adjustments
  "adjustments.create",
  "adjustments.read",
  "adjustments.update",

  // Serial Numbers
  "serial.numbers.read",
  "serial.numbers.update",

  // Purchases
  "purchases.create",
  "purchases.read",
  "purchases.update",

  // Purchase Orders
  "purchase.orders.create",
  "purchase.orders.read",
  "purchase.orders.update",

  // Goods Receipts
  "goods.receipts.create",
  "goods.receipts.read",
  "goods.receipts.update",

  // Suppliers
  "suppliers.read",
  "suppliers.update",

  // Suppliers
  "suppliers.items.read",
  "suppliers.items.update",


  // Sales
  "sales.create",
  "sales.read",
  "sales.update",

  // Sales Orders
  "sales.orders.create",
  "sales.orders.read",
  "sales.orders.update",

  // POS
  "pos.create",
  "pos.read",
  "pos.access",

  // Returns
  "returns.create",
  "returns.read",
  "returns.update",

  // Customers
  "customers.read",
  "customers.update",

  // Reports - MUST HAVE PARENT PERMISSION
  "reports.read",
  "reports.inventory.read",
  "reports.purchases.read",
  "reports.sales.read",
  "reports.products.read",
  "reports.customers.read",

  // Integrations - ADD PARENT PERMISSION
  "integrations.access",
  "integrations.pos.access",
  "integrations.accounting.access",
  "integrations.api.access",
  "api.keys.read",
  

  // Settings - ADD PARENT PERMISSION
  "settings.access",
  "locations.read",
  "tax.settings.read",
  "users.read",
  "roles.read",
  "company.settings.access",

  // Profile
  "profile.read",
  "profile.update",

  // Password
  "password.update",
  "password.change",
];

export const userPermissions = [
  // Dashboard
  "dashboard.read",

  // Inventory - ADD PARENT PERMISSION TO SEE SECTION
  "inventory.read",

  // Items
  "items.read",

  // Stock
  "stock.read",

  // Sales - ALREADY HAS PARENT
  "sales.create",
  "sales.read",

  // Sales Orders
  "sales.orders.create",
  "sales.orders.read",

  // POS
  "pos.create",
  "pos.read",
  "pos.access",

  // Returns
  "returns.create",
  "returns.read",

  // Customers
  "customers.read",

  // Reports - MUST HAVE PARENT PERMISSION
  "reports.read",
  "reports.sales.read",
  "reports.products.read",

  // Purchases - ADD PARENT PERMISSION
  "purchases.read",

  // Suppliers
  "suppliers.read",

  // Settings - ADD FOR PROFILE ACCESS
  "settings.access",

  // Profile
  "profile.read",
  "profile.update",

  // Password
  "password.update",
  "password.change",
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