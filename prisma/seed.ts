import { db } from "./db";
import bcrypt from "bcryptjs";

// Get current year for password generation
const currentYear = new Date().getFullYear();

// Helper function to generate slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to generate SKU
function generateSku(name: string): string {
  const prefix = "AFK";
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const nameCode = name.substring(0, 3).toUpperCase();
  return `${prefix}-${nameCode}-${randomNum}`;
}

async function seedDatabase() {
  try {
    console.log("🚀 Starting database seed...");

    // Create Organisation first
    let org = null;
    try {
      org = await db.organisation.create({
        data: {
          name: "AFK Berimah Hardware Store",
          slug: "ghana-hardware-store",
          industry: "Hardware & Construction",
          country: "Ghana",
          region: "Greater Accra",
          address: "Bokankye Police Checkpoint, Kumasi",
          currency: "GHS",
          timezone: "Africa/Accra",
        },
      });
      console.log(`✅ Created organisation: ${org.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log("⚠️ Organisation already exists, fetching...");
        org = await db.organisation.findUnique({
          where: { slug: "ghana-hardware-store" }
        });
        if (org) {
          console.log(`✅ Found existing organisation: ${org.name}`);
        }
      } else {
        console.log("❌ Could not create organisation:", error.message);
        throw error;
      }
    }

    if (!org) {
      throw new Error("Failed to create or find organisation");
    }

    const orgId: string = org.id;

    // Create Location (Warehouse)
    console.log("📍 Creating warehouse location...");
    let warehouse;
    try {
      warehouse = await db.location.create({
        data: {
          name: "Main Warehouse",
          type: "WAREHOUSE",
          address: "Bokankye Police Checkpoint, Kumasi",
          phone: "0546722768",
          email: "warehouse@afkberimah.com",
          orgId: orgId,
          isActive: true,
        },
      });
      console.log(`✅ Created location: ${warehouse.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log("⚠️ Location already exists, fetching...");
        warehouse = await db.location.findFirst({
          where: { orgId: orgId, type: "WAREHOUSE" }
        });
      }
    }

    // Create Unit of Measurements
    console.log("📏 Creating units...");
    const units = ["Piece", "Meter", "Bundle", "Kg", "Ton"];
    const unitMap: Record<string, any> = {};

    for (const unitName of units) {
      try {
        const unit = await db.unit.create({
          data: {
            name: unitName,
            symbol: unitName === "Piece" ? "pc" : unitName === "Meter" ? "m" : unitName === "Bundle" ? "bdl" : unitName === "Kg" ? "kg" : "tn",
            orgId: orgId,
          },
        });
        unitMap[unitName.toLowerCase()] = unit;
        console.log(`✅ Created unit: ${unit.name}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⏭️ Unit already exists: ${unitName}`);
          const existingUnit = await db.unit.findFirst({
            where: { name: unitName, orgId: orgId }
          });
          if (existingUnit) unitMap[unitName.toLowerCase()] = existingUnit;
        }
      }
    }

    // Create Brand
    console.log("🏷️ Creating brand...");
    let defaultBrand;
    try {
      defaultBrand = await db.brand.create({
        data: {
          name: "AFK Berimah",
          slug: "afk-berimah",
          orgId: orgId,
        },
      });
      console.log(`✅ Created brand: ${defaultBrand.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log("⚠️ Brand already exists, fetching...");
        defaultBrand = await db.brand.findFirst({
          where: { orgId: orgId }
        });
      }
    }

    // Create Tax Rate
    console.log("💰 Creating tax rate...");
    let taxRate;
    try {
      taxRate = await db.taxRate.create({
        data: {
          name: "VAT",
          rate: 0.0,
          orgId: orgId,
        },
      });
      console.log(`✅ Created tax rate: ${taxRate.name} (${taxRate.rate}%)`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log("⚠️ Tax rate already exists, fetching...");
        taxRate = await db.taxRate.findFirst({
          where: { orgId: orgId }
        });
      }
    }

    // ============================================
    // COMPLETE ADMIN PERMISSIONS - MATCHES SIDEBAR EXACTLY
    // ============================================
    console.log("👑 Creating roles with COMPLETE permissions...");
    
    const adminPermissions = [
      // General base permissions
      "all", "read", "write", "delete", "manage", "create", "update",
      
      // Dashboard - REQUIRED
      "dashboard.read",
      
      // ============================================
      // INVENTORY SECTION - ALL PERMISSIONS
      // ============================================
      "inventory.read",          // PARENT PERMISSION - CRITICAL!
      "inventory.create",
      "inventory.update",
      "inventory.delete",
      
      // Items
      "items.read",
      "items.create",
      "items.update",
      "items.delete",
      
      // Categories
      "categories.read",
      "categories.create",
      "categories.update",
      "categories.delete",
      
      // Brands
      "brands.read",
      "brands.create",
      "brands.update",
      "brands.delete",
      
      // Units
      "units.read",
      "units.create",
      "units.update",
      "units.delete",
      
      // Stock
      "stock.read",
      "stock.create",
      "stock.update",
      "stock.delete",
      
      // Serial Numbers
      "serial.numbers.read",
      "serial.numbers.create",
      "serial.numbers.update",
      "serial.numbers.delete",
      
      // Transfers
      "transfers.read",
      "transfers.create",
      "transfers.update",
      "transfers.delete",
      
      // Adjustments
      "adjustments.read",
      "adjustments.create",
      "adjustments.update",
      "adjustments.delete",
      
      // Batch Numbers
      "batch_numbers.read",
      "batch_numbers.create",
      "batch_numbers.update",
      "batch_numbers.delete",
      
      // Barcodes
      "barcodes.read",
      "barcodes.create",
      "barcodes.update",
      "barcodes.delete",
      
      // Warehouses
      "warehouses.read",
      "warehouses.create",
      "warehouses.update",
      "warehouses.delete",
      
      // Stock Takes
      "stock_takes.read",
      "stock_takes.create",
      "stock_takes.update",
      "stock_takes.delete",
      
      // ============================================
      // PURCHASES SECTION - ALL PERMISSIONS
      // ============================================
      "purchases.read",          // PARENT PERMISSION - CRITICAL!
      "purchases.create",
      "purchases.update",
      "purchases.delete",
      
      // Purchase Orders
      "purchase.orders.read",
      "purchase.orders.create",
      "purchase.orders.update",
      "purchase.orders.delete",
      
      // Goods Receipts
      "goods.receipts.read",
      "goods.receipts.create",
      "goods.receipts.update",
      "goods.receipts.delete",
      "goods_receipt.create",    // Alternative format
      
      // Suppliers
      "suppliers.read",
      "suppliers.create",
      "suppliers.update",
      "suppliers.delete",
      
      // Supplier Items
      "suppliers.items.read",
      "suppliers.items.create",
      "suppliers.items.update",
      "suppliers.items.delete",
      
      // ============================================
      // SALES SECTION - ALL PERMISSIONS
      // ============================================
      "sales.read",              // PARENT PERMISSION - CRITICAL!
      "sales.create",
      "sales.update",
      "sales.delete",
      
      // POS
      "pos.access",
      "pos.read",
      "pos.create",
      "pos.update",
      "pos.delete",
      
      // Sales Orders
      "sales.orders.read",
      "sales.orders.create",
      "sales.orders.update",
      "sales.orders.delete",
      
      // Returns
      "returns.read",
      "returns.create",
      "returns.update",
      "returns.delete",
      
      // Backorders
      "backorders.read",
      "backorders.create",
      "backorders.update",
      "backorders.delete",
      
      // Customers
      "customers.read",
      "customers.create",
      "customers.update",
      "customers.delete",
      
      // ============================================
      // REPORTS SECTION - ALL PERMISSIONS
      // ============================================
      "reports.read",            // PARENT PERMISSION - CRITICAL!
      "reports.create",
      "reports.update",
      "reports.delete",
      
      // Report subcategories
      "reports.inventory.read",
      "reports.inventory.create",
      "reports.inventory.update",
      "reports.inventory.delete",
      "reports.purchases.read",
      "reports.purchases.create",
      "reports.purchases.update",
      "reports.purchases.delete",
      "reports.sales.read",
      "reports.sales.create",
      "reports.sales.update",
      "reports.sales.delete",
      "reports.products.read",
      "reports.products.create",
      "reports.products.update",
      "reports.products.delete",
      "reports.customers.read",
      "reports.customers.create",
      "reports.customers.update",
      "reports.customers.delete",
      
      // ============================================
      // INTEGRATIONS SECTION - ALL PERMISSIONS
      // ============================================
      "integrations.read",       // PARENT PERMISSION - CRITICAL!
      "integrations.create",
      "integrations.update",
      "integrations.delete",
      "integrations.access",
      
      // POS Integration
      "integrations.pos.read",
      "integrations.pos.create",
      "integrations.pos.update",
      "integrations.pos.access",
      
      // Accounting Integration
      "integrations.accounting.read",
      "integrations.accounting.create",
      "integrations.accounting.update",
      "integrations.accounting.access",
      
      // E-commerce Integration
      "integrations.ecommerce.read",
      "integrations.ecommerce.create",
      "integrations.ecommerce.update",
      "integrations.ecommerce.access",
      
      // API Settings
      "api_settings.read",
      "api_settings.create",
      "api_settings.update",
      "api_settings.delete",
      "api_settings.access",
      "api.keys.read",
      
      // ============================================
      // SETTINGS SECTION - ALL PERMISSIONS
      // ============================================
      "settings.read",           // PARENT PERMISSION - CRITICAL!
      "settings.create",
      "settings.update",
      "settings.delete",
      "settings.access",
      "settings.admin",
      
      // Locations
      "locations.read",
      "locations.create",
      "locations.update",
      "locations.delete",
      
      // Tax Settings
      "tax.settings.read",
      "tax.settings.create",
      "tax.settings.update",
      "tax.settings.delete",
      "tax.settings.access",
      
      // Users
      "users.read",
      "users.create",
      "users.update",
      "users.delete",
      
      // Roles
      "roles.read",
      "roles.create",
      "roles.update",
      "roles.delete",
      
      // Company Settings
      "company.settings.read",
      "company.settings.create",
      "company.settings.update",
      "company.settings.delete",
      "company.settings.access",
      
      // Profile
      "profile.read",
      "profile.create",
      "profile.update",
      "profile.delete",
      
      // Password
      "password.read",
      "password.create",
      "password.update",
      "password.delete",
      "password.change",
    ];
    
    let adminRole;
    try {
      adminRole = await db.role.create({
        data: {
          displayName: "Administrator",
          roleName: "admin",
          description: "Full system access with all permissions",
          permissions: adminPermissions,
          orgId: orgId,
        },
      });
      console.log(`✅ Created admin role: ${adminRole.displayName}`);
      console.log(`   Total permissions: ${adminPermissions.length}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log("⚠️ Admin role already exists, fetching...");
        adminRole = await db.role.findFirst({
          where: { roleName: "admin", orgId: orgId }
        });
      } else {
        throw error;
      }
    }

    // Manager role with key parent permissions
    const managerPermissions = [
      "read", "write", "manage",
      "dashboard.read",
      "inventory.read", "items.read", "categories.read", "stock.read",
      "purchases.read", "suppliers.read",
      "sales.read", "pos.access", "customers.read",
      "reports.read",
      "settings.read", "profile.read"
    ];
    
    let managerRole;
    try {
      managerRole = await db.role.create({
        data: {
          displayName: "Manager",
          roleName: "manager",
          description: "Management access",
          permissions: managerPermissions,
          orgId: orgId,
        },
      });
      console.log(`✅ Created manager role`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        managerRole = await db.role.findFirst({
          where: { roleName: "manager", orgId: orgId }
        });
      }
    }

    // User role
    const userPermissions = [
      "read",
      "dashboard.read",
      "inventory.read", "items.read",
      "sales.read", "pos.access",
      "profile.read"
    ];
    
    let userRole;
    try {
      userRole = await db.role.create({
        data: {
          displayName: "User",
          roleName: "user",
          description: "Basic user access",
          permissions: userPermissions,
          orgId: orgId,
        },
      });
      console.log(`✅ Created user role`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        userRole = await db.role.findFirst({
          where: { roleName: "user", orgId: orgId }
        });
      }
    }

    if (!adminRole) {
      throw new Error("Failed to create or find admin role");
    }

    // Create admin user
    const adminPassword = `Admin@${currentYear}`;
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    
    console.log("👨‍💼 Creating admin user...");
    
    try {
      await db.user.create({
        data: {
          email: "felicitykaboreb@gmail.com",
          name: "Felicity Kaboreb",
          firstName: "Felicity",
          lastName: "Kaboreb",
          phone: "0546722768",
          isVerfied: true,
          password: hashedAdminPassword,
          orgId: orgId,
          orgName: org.name,
          roles: {
            connect: { id: adminRole.id },
          },
        },
      });
      console.log(`✅ Created admin user: felicitykaboreb@gmail.com`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log("⚠️ Admin user already exists");
      }
    }

    // Create categories
    console.log("\n📁 Creating categories...");
    
    const categories = [
      { title: "Angle Iron", description: "Various sizes of angle iron" },
      { title: "Flat Bars", description: "Flat steel bars of different sizes" },
      { title: "Square Bars", description: "Square steel bars" },
      { title: "Square Pipes", description: "Square steel pipes" },
      { title: "Round Pipes", description: "Round steel pipes" },
      { title: "Plates", description: "Steel plates of various thicknesses" },
      { title: "Iron Rods", description: "Iron rods for construction" },
      { title: "Rectangular Bars", description: "Rectangular steel bars" },
    ];

    const categoryMap: Record<string, any> = {};

    for (const category of categories) {
      try {
        const createdCategory = await db.category.create({
          data: {
            title: category.title,
            slug: generateSlug(category.title),
            description: category.description,
            orgId: orgId,
          },
        });
        categoryMap[category.title.toLowerCase()] = createdCategory;
        console.log(`✅ Created category: ${category.title}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          const existingCategory = await db.category.findFirst({
            where: { title: category.title, orgId: orgId }
          });
          if (existingCategory) categoryMap[category.title.toLowerCase()] = existingCategory;
        }
      }
    }

    // ============================================
    // CREATE INVENTORY ITEMS
    // ============================================
    console.log("\n📦 Creating inventory items...");

    const inventoryItems = [
      // Angle Iron items
      { 
        name: "1° Angle Iron", 
        costPrice: 55.00, 
        sellingPrice: 85.00,
        quantity: 237,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "1/4 Angle Iron", 
        costPrice: 65.00, 
        sellingPrice: 85.00,
        quantity: 237,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "1/2 Angle Iron (Light)", 
        costPrice: 80.00, 
        sellingPrice: 120.00,
        quantity: 100,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "1/2 Angle Iron (Thick)", 
        costPrice: 130.00, 
        sellingPrice: 195.00,
        quantity: 50,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "2° Angle Iron (Light)", 
        costPrice: 140.00, 
        sellingPrice: 210.00,
        quantity: 75,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "2° Angle Iron (Medium)", 
        costPrice: 170.00, 
        sellingPrice: 255.00,
        quantity: 60,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "2° Angle Iron (Thick)", 
        costPrice: 250.00, 
        sellingPrice: 375.00,
        quantity: 40,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "50x50 Angle Iron (Light)", 
        costPrice: 80.00, 
        sellingPrice: 140.00,
        quantity: 50,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "50x50 Angle Iron (Medium)", 
        costPrice: 140.00, 
        sellingPrice: 210.00,
        quantity: 30,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "50x50 Angle Iron (Thick)", 
        costPrice: 160.00, 
        sellingPrice: 240.00,
        quantity: 45,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "60x60 Angle Iron (Medium)", 
        costPrice: 180.00, 
        sellingPrice: 270.00,
        quantity: 20,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "60x60 Angle Iron (Thick)", 
        costPrice: 265.00, 
        sellingPrice: 398.00,
        quantity: 10,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "40x80 Angle Iron", 
        costPrice: 180.00, 
        sellingPrice: 270.00,
        quantity: 42,
        unit: "piece",
        category: "angle iron"
      },
      { 
        name: "50x100 Angle Iron", 
        costPrice: 300.00, 
        sellingPrice: 450.00,
        quantity: 17,
        unit: "piece",
        category: "angle iron"
      },

      // Flat Bars
      { 
        name: "5/8 Flatbar", 
        costPrice: 21.00, 
        sellingPrice: 31.50,
        quantity: 365,
        unit: "piece",
        category: "flat bars"
      },
      { 
        name: "3/4 Flatbar Gay", 
        costPrice: 18.00, 
        sellingPrice: 27.00,
        quantity: 4,
        unit: "piece",
        category: "flat bars"
      },
      { 
        name: "3/4 Flatbar Stile", 
        costPrice: 40.00, 
        sellingPrice: 60.00,
        quantity: 40,
        unit: "piece",
        category: "flat bars"
      },
      { 
        name: "1\" Flatbar", 
        costPrice: 45.00, 
        sellingPrice: 67.50,
        quantity: 20,
        unit: "piece",
        category: "flat bars"
      },
      { 
        name: "1½ Flatbar", 
        costPrice: 22.00, 
        sellingPrice: 33.00,
        quantity: 954,
        unit: "piece",
        category: "flat bars"
      },

      // Round Pipes
      { 
        name: "3/4 Round Pipe", 
        costPrice: 31.00, 
        sellingPrice: 46.50,
        quantity: 229,
        unit: "piece",
        category: "round pipes"
      },
      { 
        name: "1\" Round Pipe", 
        costPrice: 45.00, 
        sellingPrice: 67.50,
        quantity: 238,
        unit: "piece",
        category: "round pipes"
      },
      { 
        name: "1/2 Round Pipe", 
        costPrice: 70.00, 
        sellingPrice: 105.00,
        quantity: 84,
        unit: "piece",
        category: "round pipes"
      },
      { 
        name: "1/3 Round Pipe", 
        costPrice: 85.00, 
        sellingPrice: 127.50,
        quantity: 197,
        unit: "piece",
        category: "round pipes"
      },
      { 
        name: "2\" Round Pipe (Light)", 
        costPrice: 120.00, 
        sellingPrice: 180.00,
        quantity: 23,
        unit: "piece",
        category: "round pipes"
      },
      { 
        name: "2\" Round Pipe (Medium)", 
        costPrice: 140.00, 
        sellingPrice: 210.00,
        quantity: 36,
        unit: "piece",
        category: "round pipes"
      },
      { 
        name: "2½ Round Pipe", 
        costPrice: 200.00, 
        sellingPrice: 300.00,
        quantity: 14,
        unit: "piece",
        category: "round pipes"
      },

      // Square Pipes and Square Bars
      { 
        name: "3/4 S9 Light", 
        costPrice: 25.00, 
        sellingPrice: 37.50,
        quantity: 64,
        unit: "piece",
        category: "square pipes"
      },
      { 
        name: "3/4 S9 Round (Medium)", 
        costPrice: 65.00, 
        sellingPrice: 97.50,
        quantity: 296,
        unit: "piece",
        category: "square pipes"
      },
      { 
        name: "3/4 S9 Thick", 
        costPrice: 30.00, 
        sellingPrice: 45.00,
        quantity: 135,
        unit: "piece",
        category: "square pipes"
      },
      { 
        name: "1x1 Light", 
        costPrice: 35.00, 
        sellingPrice: 52.50,
        quantity: 87,
        unit: "piece",
        category: "square bars"
      },
      { 
        name: "1x1 Thick", 
        costPrice: 45.00, 
        sellingPrice: 67.50,
        quantity: 491,
        unit: "piece",
        category: "square bars"
      },
      { 
        name: "30x30 Square Bar", 
        costPrice: 45.00, 
        sellingPrice: 67.50,
        quantity: 499,
        unit: "piece",
        category: "square bars"
      },
      { 
        name: "3/4 x 1/2 Square Bar", 
        costPrice: 58.00, 
        sellingPrice: 87.00,
        quantity: 219,
        unit: "piece",
        category: "square bars"
      },
      { 
        name: "40x40 Light", 
        costPrice: 120.00, 
        sellingPrice: 180.00,
        quantity: 143,
        unit: "piece",
        category: "square bars"
      },
      { 
        name: "40x46 Thick", 
        costPrice: 58.00, 
        sellingPrice: 87.00,
        quantity: 140,
        unit: "piece",
        category: "square bars"
      },
      { 
        name: "1x2 Light", 
        costPrice: 120.00, 
        sellingPrice: 180.00,
        quantity: 50,
        unit: "piece",
        category: "rectangular bars"
      },

      // Plates
      { 
        name: "Tunnelite (Light)", 
        costPrice: 180.00, 
        sellingPrice: 270.00,
        quantity: 25,
        unit: "piece",
        category: "plates"
      },
      { 
        name: "Tunnelite (Thick)", 
        costPrice: 190.00, 
        sellingPrice: 285.00,
        quantity: 20,
        unit: "piece",
        category: "plates"
      },
      { 
        name: "1.25mm Plate", 
        costPrice: 230.00, 
        sellingPrice: 345.00,
        quantity: 15,
        unit: "piece",
        category: "plates"
      },
      { 
        name: "1-16mm Plate", 
        costPrice: 380.00, 
        sellingPrice: 570.00,
        quantity: 10,
        unit: "piece",
        category: "plates"
      },
      { 
        name: "China Door Plate", 
        costPrice: 250.00, 
        sellingPrice: 375.00,
        quantity: 12,
        unit: "piece",
        category: "plates"
      },
      { 
        name: "Metal Plate", 
        costPrice: 240.00, 
        sellingPrice: 360.00,
        quantity: 18,
        unit: "piece",
        category: "plates"
      },

      // Iron Rods
      { 
        name: "Red Iron Rod (Big)", 
        costPrice: 100.00, 
        sellingPrice: 150.00,
        quantity: 150,
        unit: "piece",
        category: "iron rods"
      },
      { 
        name: "Iron Rod (Small)", 
        costPrice: 50.00, 
        sellingPrice: 75.00,
        quantity: 300,
        unit: "piece",
        category: "iron rods"
      },
    ];

    let totalItems = 0;
    let totalInventoryValue = 0;

    for (const itemData of inventoryItems) {
      try {
        // Create item
        const item = await db.item.create({
          data: {
            name: itemData.name,
            sku: generateSku(itemData.name),
            slug: generateSlug(itemData.name),
            description: `${itemData.name} - Quality hardware material`,
            costPrice: itemData.costPrice,
            sellingPrice: itemData.sellingPrice,
            minStockLevel: 10,
            maxStockLevel: itemData.quantity * 2,
            isActive: true,
            imageUrl: ["https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP"],
            organisation: {
              connect: { id: orgId }
            },
            category: categoryMap[itemData.category] ? {
              connect: { id: categoryMap[itemData.category].id }
            } : undefined,
            brand: defaultBrand ? {
              connect: { id: defaultBrand.id }
            } : undefined,
            unit: unitMap[itemData.unit] ? {
              connect: { id: unitMap[itemData.unit].id }
            } : undefined,
            taxRate: taxRate ? {
              connect: { id: taxRate.id }
            } : undefined,
          },
        });

        // Create inventory for the item
        if (warehouse) {
          await db.inventory.create({
            data: {
              itemId: item.id,
              locationId: warehouse.id,
              quantity: itemData.quantity,
              reservedQuantity: 0,
              orgId: orgId,
              stockStatus: itemData.quantity > 20 ? "IN_STOCK" : itemData.quantity > 5 ? "LOW_STOCK" : "OUT_OF_STOCK",
            },
          });
        }

        totalItems++;
        totalInventoryValue += itemData.costPrice * itemData.quantity;
        console.log(`✅ Created item: ${itemData.name} (Qty: ${itemData.quantity}, Price: GH₵${itemData.sellingPrice})`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⏭️ Item already exists: ${itemData.name}`);
        } else {
          console.log(`⚠️ Could not create item ${itemData.name}:`, error.message);
        }
      }
    }

    console.log("\n📊 Inventory Summary:");
    console.log(`• Total Items Created: ${totalItems}`);
    console.log(`• Total Inventory Value: GH₵${totalInventoryValue.toFixed(2)}`);
    console.log(`• Warehouse: ${warehouse?.name || 'Not created'}`);

    console.log("\n🎉 === SEED COMPLETED SUCCESSFULLY ===");
    console.log("\n🔐 LOGIN CREDENTIALS:");
    console.log("-".repeat(50));
    console.log("ADMIN ACCESS:");
    console.log(`  Email: felicitykaboreb@gmail.com`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  Phone: 0546722768`);
    console.log(`  Total Permissions: ${adminPermissions.length}`);
    console.log(`  Total Items: ${totalItems}`);
    console.log(`  Inventory Value: GH₵${totalInventoryValue.toFixed(2)}`);
    console.log("-".repeat(50));
    console.log("\n✅ SIDEBAR SECTIONS ENABLED:");
    console.log("  ✓ Dashboard");
    console.log("  ✓ Inventory (with all 13 sub-items)");
    console.log("  ✓ Purchases (with all 4 sub-items)");
    console.log("  ✓ Sales (with all 5 sub-items)");
    console.log("  ✓ Reports (with all 2 sub-items)");
    console.log("  ✓ Integrations (with all 3 sub-items)");
    console.log("  ✓ Settings (with all 7 sub-items)");
    console.log("\n⚠️ NEXT STEPS:");
    console.log("  1. Log out completely");
    console.log("  2. Clear browser cache (Ctrl+Shift+Del)");
    console.log("  3. Close all browser tabs");
    console.log("  4. Login again");
    console.log("  5. Check sidebar - ALL items should be visible!");

  } catch (error: any) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting database seed process...");
  try {
    await seedDatabase();
    console.log("\n✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error in main seed process:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed to seed database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });