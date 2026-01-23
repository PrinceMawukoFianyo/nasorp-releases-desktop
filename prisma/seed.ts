import crypto from "crypto"
const generateAPIKey = (): string => {
    const rand = crypto.randomBytes(32).toString("hex");
    return `sk_live_${rand}` 
};
import { adminPermissions, managerPermissions, userPermissions } from "../config/permissions";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { AdjustmentStatus, AdjustmentType, PaymentStatus, PurchaseOrderStatus, SalesOrderStatus, TransferStatus } from "@prisma/client";

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

async function seedDatabase() {
  try {
    console.log("Starting to seed new data...");

    // Create organization 
    console.log("Creating organization...");
    const org = await db.organisation.create({
      data: {
        name: "Ghana Hardware Store",
        slug: "ghana-hardware-store",
        industry: "Hardware & Construction",
        country: "Ghana",
        region: "Greater Accra",
        address: "123 Hardware Street, Accra, Ghana",
        currency: "GHS",
        timezone: "Africa/Accra",
        inventoryStartDate: new Date(),
        fiscalYear: 1,
      },
    });
    console.log(`Created organisation: ${org.name}`);
    
    // Create the Default API Key
    await db.apiKey.create({
      data: {
        name: "Default Key",
        key: generateAPIKey(),
        orgId: org.id,
      },
    });
    console.log("Creating API Key...");

    // Create admin role with all permissions
    console.log("Creating admin role...");
    const adminRole = await db.role.create({
      data: {
        displayName: "Administrator",
        roleName: "admin",
        description: "Full system access",
        permissions: adminPermissions,
        orgId: org.id,
      },
    });

    // Create manager role with limited permissions
    const managerRole = await db.role.create({
      data: {
        displayName: "Manager",
        roleName: "manager",
        description: "Management access with limited administrative capabilities",
        permissions: managerPermissions,
        orgId: org.id,
      },
    });

    // Create user role with limited permissions
    console.log("Creating user role...");
    const userRole = await db.role.create({
      data: {
        displayName: "User",
        roleName: "user",
        description: "Basic user access",
        permissions: userPermissions,
        orgId: org.id,
      },
    });
    console.log(`Created roles: ${adminRole.displayName}, ${managerRole.displayName}, ${userRole.displayName}`);
    
    // Create ONLY Main Warehouse location
    console.log("Creating Main Warehouse...");
    const mainWarehouse = await db.location.create({
      data: {
        name: "Main Warehouse",
        type: "WAREHOUSE",
        address: "456 Warehouse Road, Industrial Area, Accra, Ghana",
        phone: "+233-20-123-4567",
        email: "warehouse@ghhardware.com",
        orgId: org.id,
      },
    });
    console.log(`Created Main Warehouse: ${mainWarehouse.name}`);

    // Create users - all assigned to Main Warehouse
    const adminPassword = `Admin@${currentYear}`;
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    const managerPassword = `Manager@${currentYear}`;
    const hashedManagerPassword = await bcrypt.hash(managerPassword, 10);
    const userPassword = `User@${currentYear}`;
    const hashedUserPassword = await bcrypt.hash(userPassword, 10);

    const adminUser = await db.user.create({
      data: {
        email: "admin@admin.com",
        name: "System Admin",
        firstName: "System",
        lastName: "Admin",
        phone: "1234567890",
        isVerfied: true,
        orgName: org.name,
        password: hashedAdminPassword,
        orgId: org.id,
        locationId: mainWarehouse.id,
        locationName: mainWarehouse.name,
        roles: {
          connect: { id: adminRole.id },
        },
      },
    });

    const managerUser = await db.user.create({
      data: {
        email: "manager@example.com",
        name: "Store Manager",
        firstName: "Store",
        lastName: "Manager",
        phone: "2345678901",
        isVerfied: true,
        orgName: org.name,
        password: hashedManagerPassword,
        orgId: org.id,
        locationId: mainWarehouse.id,
        locationName: mainWarehouse.name,
        roles: {
          connect: { id: managerRole.id },
        },
      },
    });

    const regularUser = await db.user.create({
      data: {
        email: "user@user.com",
        name: "Regular User",
        firstName: "Regular",
        lastName: "User",
        phone: "0987654321",
        orgName: org.name,
        isVerfied: true,
        password: hashedUserPassword,
        orgId: org.id,
        locationId: mainWarehouse.id,
        locationName: mainWarehouse.name,
        roles: {
          connect: { id: userRole.id },
        },
      },
    });

    console.log("Created users with credentials:");
    console.log("Admin credentials:", { email: "admin@admin.com", password: adminPassword });
    console.log("Manager credentials:", { email: "manager@example.com", password: managerPassword });
    console.log("User credentials:", { email: "user@user.com", password: userPassword });

    // Create brands
    const brands = await Promise.all(
      [
        "Local Supplier",
        "Import Steel",
        "Ghana Steel",
        "Quality Metals",
      ].map((name) =>
        db.brand.create({
          data: {
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-"),
            orgId: org.id,
          },
        })
      )
    );
    console.log(`Created ${brands.length} brands`);

    // Create units
    const units = await Promise.all(
      [
        { name: "Piece", symbol: "pc" },
        { name: "Bundle", symbol: "bdl" },
        { name: "Length", symbol: "len" },
      ].map((unit) =>
        db.unit.create({
          data: {
            ...unit,
            orgId: org.id,
          },
        })
      )
    );
    console.log(`Created ${units.length} units`);

    // Create tax rates
    const taxRates = await Promise.all(
      [
        { name: "Standard Rate", rate: 15 },
        { name: "Reduced Rate", rate: 5 },
      ].map((tax) =>
        db.taxRate.create({
          data: {
            ...tax,
            orgId: org.id,
          },
        })
      )
    );
    console.log(`Created ${taxRates.length} tax rates`);

    // Create suppliers
    const suppliers = await Promise.all(
      [
        {
          name: "Ghana Steel Company",
          contactPerson: "Kwame Mensah",
          email: "sales@ghanasteel.com",
          phone: "+233-20-100-2000",
          address: "Industrial Area, Tema, Ghana",
          paymentTerms: 30,
        },
        {
          name: "Accra Metal Works",
          contactPerson: "Ama Ofori",
          email: "orders@accrametal.com",
          phone: "+233-20-100-2001",
          address: "Spintex Road, Accra, Ghana",
          paymentTerms: 45,
        },
        {
          name: "West Africa Metals",
          contactPerson: "Kofi Asante",
          email: "contact@wametals.com",
          phone: "+233-20-100-2002",
          address: "Kaneshie Market, Accra, Ghana",
          paymentTerms: 30,
        },
      ].map((supplier) =>
        db.supplier.create({
          data: {
            ...supplier,
            orgId: org.id,
          },
        })
      )
    );
    console.log(`Created ${suppliers.length} suppliers`);

    // Create categories
    const categories = await Promise.all(
      [
        { title: "Steel Bars" },
        { title: "Angle Irons" },
        { title: "Plates" },
        { title: "Pipes" },
        { title: "Rods" },
      ].map((category) =>
        db.category.create({
          data: {
            title: category.title,
            slug: generateSlug(category.title),
            orgId: org.id,
          },
        })
      )
    );
    console.log(`Created ${categories.length} categories`);

    // Create items from the images provided
    const items = [
      // Flat bars from first image
      {
        name: "3/8 Flatbar",
        sku: "FLAT-038",
        barcode: "GH001",
        description: "3/8 inch flatbar for construction",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 15.00,
        sellingPrice: 21.00,
        minStockLevel: 50,
        maxStockLevel: 300,
        isSerialTracked: false,
      },
      {
        name: "3/4 Flatbar Gav",
        sku: "FLAT-034-GAV",
        barcode: "GH002",
        description: "3/4 inch flatbar galvanized",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 15.00,
        sellingPrice: 18.00,
        minStockLevel: 40,
        maxStockLevel: 250,
        isSerialTracked: false,
      },
      {
        name: "3/4 Flatbar Thick",
        sku: "FLAT-034-THK",
        barcode: "GH003",
        description: "3/4 inch flatbar thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 28.00,
        sellingPrice: 40.00,
        minStockLevel: 30,
        maxStockLevel: 200,
        isSerialTracked: false,
      },
      {
        name: "1\" Flatbar",
        sku: "FLAT-100",
        barcode: "GH004",
        description: "1 inch flatbar for construction",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 32.00,
        sellingPrice: 45.00,
        minStockLevel: 20,
        maxStockLevel: 150,
        isSerialTracked: false,
      },
      {
        name: "1½ Flatbar",
        sku: "FLAT-150",
        barcode: "GH005",
        description: "1½ inch flatbar for construction",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 16.00,
        sellingPrice: 22.00,
        minStockLevel: 100,
        maxStockLevel: 500,
        isSerialTracked: false,
      },

      // Square bars
      {
        name: "3/4 S# Light",
        sku: "SQR-034-LT",
        barcode: "GH006",
        description: "3/4 inch square bar light gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 18.00,
        sellingPrice: 25.00,
        minStockLevel: 50,
        maxStockLevel: 300,
        isSerialTracked: false,
      },
      {
        name: "3/4 S# Round M",
        sku: "SQR-034-RM",
        barcode: "GH007",
        description: "3/4 inch square bar round medium",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 46.00,
        sellingPrice: 65.00,
        minStockLevel: 50,
        maxStockLevel: 300,
        isSerialTracked: false,
      },
      {
        name: "3/4 S# Thick",
        sku: "SQR-034-THK",
        barcode: "GH008",
        description: "3/4 inch square bar thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 22.00,
        sellingPrice: 30.00,
        minStockLevel: 40,
        maxStockLevel: 250,
        isSerialTracked: false,
      },

      // 1" series
      {
        name: "1×1 Light",
        sku: "BAR-101-LT",
        barcode: "GH009",
        description: "1×1 inch bar light gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 25.00,
        sellingPrice: 35.00,
        minStockLevel: 30,
        maxStockLevel: 200,
        isSerialTracked: false,
      },
      {
        name: "1×1 Thick",
        sku: "BAR-101-THK",
        barcode: "GH010",
        description: "1×1 inch bar thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 32.00,
        sellingPrice: 45.00,
        minStockLevel: 30,
        maxStockLevel: 200,
        isSerialTracked: false,
      },

      // Larger sizes
      {
        name: "30×30",
        sku: "BAR-3030",
        barcode: "GH011",
        description: "30×30mm square bar",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 32.00,
        sellingPrice: 45.00,
        minStockLevel: 30,
        maxStockLevel: 200,
        isSerialTracked: false,
      },
      {
        name: "3/4×1½",
        sku: "BAR-034-150",
        barcode: "GH012",
        description: "3/4×1½ inch rectangular bar",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 42.00,
        sellingPrice: 58.00,
        minStockLevel: 50,
        maxStockLevel: 300,
        isSerialTracked: false,
      },
      {
        name: "40×40 Light",
        sku: "BAR-4040-LT",
        barcode: "GH013",
        description: "40×40mm square bar light gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 86.00,
        sellingPrice: 120.00,
        minStockLevel: 30,
        maxStockLevel: 200,
        isSerialTracked: false,
      },
      {
        name: "40×40 Thick",
        sku: "BAR-4040-THK",
        barcode: "GH014",
        description: "40×40mm square bar thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 42.00,
        sellingPrice: 58.00,
        minStockLevel: 30,
        maxStockLevel: 200,
        isSerialTracked: false,
      },
      {
        name: "1×2 Light",
        sku: "BAR-102-LT",
        barcode: "GH015",
        description: "1×2 inch rectangular bar light gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 86.00,
        sellingPrice: 120.00,
        minStockLevel: 25,
        maxStockLevel: 150,
        isSerialTracked: false,
      },
      {
        name: "1×2 Thick",
        sku: "BAR-102-THK",
        barcode: "GH016",
        description: "1×2 inch rectangular bar thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Steel Bars")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 100.00,
        sellingPrice: 140.00,
        minStockLevel: 30,
        maxStockLevel: 150,
        isSerialTracked: false,
      },

      // Pipes from second image
      {
        name: "50×50 Light",
        sku: "PIPE-5050-LT",
        barcode: "GH017",
        description: "50×50mm pipe light gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 60.00,
        sellingPrice: 85.00,
        minStockLevel: 30,
        maxStockLevel: 150,
        isSerialTracked: false,
      },
      {
        name: "50×50 M",
        sku: "PIPE-5050-M",
        barcode: "GH018",
        description: "50×50mm pipe medium gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 100.00,
        sellingPrice: 140.00,
        minStockLevel: 30,
        maxStockLevel: 150,
        isSerialTracked: false,
      },
      {
        name: "50×50 Thick",
        sku: "PIPE-5050-THK",
        barcode: "GH019",
        description: "50×50mm pipe thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 114.00,
        sellingPrice: 160.00,
        minStockLevel: 25,
        maxStockLevel: 120,
        isSerialTracked: false,
      },
      {
        name: "60×60 M",
        sku: "PIPE-6060-M",
        barcode: "GH020",
        description: "60×60mm pipe medium gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 128.00,
        sellingPrice: 180.00,
        minStockLevel: 20,
        maxStockLevel: 100,
        isSerialTracked: false,
      },
      {
        name: "60×60 Thick",
        sku: "PIPE-6060-THK",
        barcode: "GH021",
        description: "60×60mm pipe thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 190.00,
        sellingPrice: 265.00,
        minStockLevel: 15,
        maxStockLevel: 80,
        isSerialTracked: false,
      },
      {
        name: "40×80",
        sku: "PIPE-4080",
        barcode: "GH022",
        description: "40×80mm rectangular pipe",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 128.00,
        sellingPrice: 180.00,
        minStockLevel: 20,
        maxStockLevel: 100,
        isSerialTracked: false,
      },
      {
        name: "50×100",
        sku: "PIPE-50100",
        barcode: "GH023",
        description: "50×100mm rectangular pipe",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 214.00,
        sellingPrice: 300.00,
        minStockLevel: 15,
        maxStockLevel: 80,
        isSerialTracked: false,
      },

      // Round pipes from second image
      {
        name: "3/4 Round Pipe",
        sku: "RND-PIPE-034",
        barcode: "GH024",
        description: "3/4 inch round pipe",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 22.00,
        sellingPrice: 31.00,
        minStockLevel: 50,
        maxStockLevel: 300,
        isSerialTracked: false,
      },
      {
        name: "1\" Round Pipe",
        sku: "RND-PIPE-100",
        barcode: "GH025",
        description: "1 inch round pipe",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 32.00,
        sellingPrice: 45.00,
        minStockLevel: 40,
        maxStockLevel: 250,
        isSerialTracked: false,
      },
      {
        name: "1½ Round Pipe",
        sku: "RND-PIPE-150",
        barcode: "GH026",
        description: "1½ inch round pipe",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 50.00,
        sellingPrice: 70.00,
        minStockLevel: 30,
        maxStockLevel: 180,
        isSerialTracked: false,
      },
      {
        name: "1¾ Round Pipe",
        sku: "RND-PIPE-175",
        barcode: "GH027",
        description: "1¾ inch round pipe",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 60.00,
        sellingPrice: 85.00,
        minStockLevel: 25,
        maxStockLevel: 150,
        isSerialTracked: false,
      },
      {
        name: "2\" Round Pipe (L)",
        sku: "RND-PIPE-200-L",
        barcode: "GH028",
        description: "2 inch round pipe large",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 86.00,
        sellingPrice: 120.00,
        minStockLevel: 20,
        maxStockLevel: 120,
        isSerialTracked: false,
      },
      {
        name: "2\" Round Pipe Thick",
        sku: "RND-PIPE-200-THK",
        barcode: "GH029",
        description: "2 inch round pipe thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 100.00,
        sellingPrice: 140.00,
        minStockLevel: 15,
        maxStockLevel: 100,
        isSerialTracked: false,
      },
      {
        name: "2½ Round Pipe",
        sku: "RND-PIPE-250",
        barcode: "GH030",
        description: "2½ inch round pipe",
        categoryId: categories.find((c: { title: string }) => c.title === "Pipes")?.id,
        brandId: brands.find((b) => b.name === "Import Steel")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 143.00,
        sellingPrice: 200.00,
        minStockLevel: 12,
        maxStockLevel: 80,
        isSerialTracked: false,
      },

      // Angle irons from first image
      {
        name: "1\" Angle Iron",
        sku: "ANG-IRON-100",
        barcode: "GH031",
        description: "1 inch angle iron",
        categoryId: categories.find((c: { title: string }) => c.title === "Angle Irons")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 39.00,
        sellingPrice: 55.00,
        minStockLevel: 25,
        maxStockLevel: 150,
        isSerialTracked: false,
      },
      {
        name: "1¼ Angle Iron",
        sku: "ANG-IRON-125",
        barcode: "GH032",
        description: "1¼ inch angle iron",
        categoryId: categories.find((c: { title: string }) => c.title === "Angle Irons")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 46.00,
        sellingPrice: 65.00,
        minStockLevel: 20,
        maxStockLevel: 120,
        isSerialTracked: false,
      },
      {
        name: "1½ Angle Iron (L)",
        sku: "ANG-IRON-150-L",
        barcode: "GH033",
        description: "1½ inch angle iron large",
        categoryId: categories.find((c: { title: string }) => c.title === "Angle Irons")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 57.00,
        sellingPrice: 80.00,
        minStockLevel: 18,
        maxStockLevel: 100,
        isSerialTracked: false,
      },
      {
        name: "1½ Angle Iron (Thick)",
        sku: "ANG-IRON-150-THK",
        barcode: "GH034",
        description: "1½ inch angle iron thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Angle Irons")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 93.00,
        sellingPrice: 130.00,
        minStockLevel: 15,
        maxStockLevel: 90,
        isSerialTracked: false,
      },
      {
        name: "2\" Angle Iron (L)",
        sku: "ANG-IRON-200-L",
        barcode: "GH035",
        description: "2 inch angle iron large",
        categoryId: categories.find((c: { title: string }) => c.title === "Angle Irons")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 100.00,
        sellingPrice: 140.00,
        minStockLevel: 12,
        maxStockLevel: 80,
        isSerialTracked: false,
      },
      {
        name: "2\" Angle Iron (M)",
        sku: "ANG-IRON-200-M",
        barcode: "GH036",
        description: "2 inch angle iron medium",
        categoryId: categories.find((c: { title: string }) => c.title === "Angle Irons")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 121.00,
        sellingPrice: 170.00,
        minStockLevel: 10,
        maxStockLevel: 70,
        isSerialTracked: false,
      },
      {
        name: "2\" Angle Iron (Thick)",
        sku: "ANG-IRON-200-THK",
        barcode: "GH037",
        description: "2 inch angle iron thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Angle Irons")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 179.00,
        sellingPrice: 250.00,
        minStockLevel: 8,
        maxStockLevel: 60,
        isSerialTracked: false,
      },

      // Plates from first image
      {
        name: "Jump Plate (Light)",
        sku: "JMP-PLT-LT",
        barcode: "GH038",
        description: "Jump plate light gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Plates")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 129.00,
        sellingPrice: 180.00,
        minStockLevel: 15,
        maxStockLevel: 90,
        isSerialTracked: false,
      },
      {
        name: "Jump Plate (Thick)",
        sku: "JMP-PLT-THK",
        barcode: "GH039",
        description: "Jump plate thick gauge",
        categoryId: categories.find((c: { title: string }) => c.title === "Plates")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 136.00,
        sellingPrice: 190.00,
        minStockLevel: 12,
        maxStockLevel: 80,
        isSerialTracked: false,
      },
      {
        name: "1.25 Plate",
        sku: "PLT-125",
        barcode: "GH040",
        description: "1.25 inch metal plate",
        categoryId: categories.find((c: { title: string }) => c.title === "Plates")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 200.00,
        sellingPrice: 280.00,
        minStockLevel: 10,
        maxStockLevel: 60,
        isSerialTracked: false,
      },
      {
        name: "1.16 Plate",
        sku: "PLT-116",
        barcode: "GH041",
        description: "1.16 inch metal plate",
        categoryId: categories.find((c: { title: string }) => c.title === "Plates")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 271.00,
        sellingPrice: 380.00,
        minStockLevel: 8,
        maxStockLevel: 50,
        isSerialTracked: false,
      },
      {
        name: "China Door Plate",
        sku: "PLT-CHN-DR",
        barcode: "GH042",
        description: "China door plate",
        categoryId: categories.find((c: { title: string }) => c.title === "Plates")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 179.00,
        sellingPrice: 250.00,
        minStockLevel: 10,
        maxStockLevel: 70,
        isSerialTracked: false,
      },
      {
        name: "Nat Plate",
        sku: "PLT-NAT",
        barcode: "GH043",
        description: "Natural metal plate",
        categoryId: categories.find((c: { title: string }) => c.title === "Plates")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 171.00,
        sellingPrice: 240.00,
        minStockLevel: 10,
        maxStockLevel: 70,
        isSerialTracked: false,
      },

      // Rods from first image
      {
        name: "Roof Iron Rod (Big)",
        sku: "ROOF-ROD-BIG",
        barcode: "GH044",
        description: "Roof iron rod large size",
        categoryId: categories.find((c: { title: string }) => c.title === "Rods")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 86.00,
        sellingPrice: 120.00,
        minStockLevel: 15,
        maxStockLevel: 100,
        isSerialTracked: false,
      },
      {
        name: "Iron Rod (Small)",
        sku: "IRON-ROD-SML",
        barcode: "GH045",
        description: "Iron rod small size",
        categoryId: categories.find((c: { title: string }) => c.title === "Rods")?.id,
        brandId: brands.find((b) => b.name === "Local Supplier")?.id,
        unitId: units.find((u) => u.name === "Piece")?.id,
        taxRateId: taxRates.find((t) => t.name === "Standard Rate")?.id,
        tax: 15,
        costPrice: 36.00,
        sellingPrice: 50.00,
        minStockLevel: 20,
        maxStockLevel: 150,
        isSerialTracked: false,
      },
    ];

    const createdItems = await Promise.all(
      items.map((item) =>
        db.item.create({
          data: {
            ...item,
            slug: generateSlug(item.name),
            orgId: org.id,
          },
        })
      )
    );
    console.log(`Created ${createdItems.length} items`);

    // Link suppliers to items
    console.log("Creating item-supplier relationships...");
    for (const item of createdItems) {
      const itemSuppliers = suppliers.slice(0, Math.floor(Math.random() * 2) + 1);
      for (const supplier of itemSuppliers) {
        await db.itemSupplier.create({
          data: {
            itemId: item.id,
            supplierId: supplier.id,
            isPreferred: itemSuppliers.indexOf(supplier) === 0,
            supplierSku: `SUP-${item.sku}`,
            leadTime: Math.floor(Math.random() * 10) + 3,
            minOrderQty: Math.floor(Math.random() * 5) + 1,
            unitCost: item.costPrice * 0.9,
          },
        });
      }
    }

    // Create inventory records ONLY in Main Warehouse
    console.log("Creating inventory records in Main Warehouse...");
    const inventoryRecords = [];
    for (const item of createdItems) {
      // All items go only to Main Warehouse
      const quantity = Math.floor(Math.random() * 50) + 10; // 10-60 pieces each
      inventoryRecords.push(
        db.inventory.create({
          data: {
            itemId: item.id,
            locationId: mainWarehouse.id,
            quantity: quantity,
            reservedQuantity: 0,
            orgId: org.id,
          },
        })
      );
    }
    await Promise.all(inventoryRecords);
    console.log(`Created ${inventoryRecords.length} inventory records in Main Warehouse`);

    // Create customers
    console.log("Creating customers...");
    const customers = await Promise.all([
      db.customer.create({
        data: {
          name: "Ghana Construction Ltd",
          email: "purchasing@ghanaconstruction.com",
          phone: "+233-20-BUILD-123",
          address: "123 Construction Avenue, Accra, Ghana",
          taxId: "GCL-123456",
          notes: "Large construction company, regular orders",
          orgId: org.id,
        },
      }),
      db.customer.create({
        data: {
          name: "Accra Builders",
          email: "orders@accrabuilders.com",
          phone: "+233-20-HOME-456",
          address: "456 Builder Road, Accra, Ghana",
          taxId: "ABD-654321",
          notes: "Local building contractor",
          orgId: org.id,
        },
      }),
      db.customer.create({
        data: {
          name: "Tema Steel Works",
          email: "procurement@temasteel.com",
          phone: "+233-20-PLMB-789",
          address: "789 Steel Street, Tema, Ghana",
          taxId: "TSW-789012",
          notes: "Steel fabrication company",
          orgId: org.id,
        },
      }),
      db.customer.create({
        data: {
          name: "Kofi's Hardware Shop",
          email: "kofi@hardwareshop.com",
          phone: "+233-20-HNDY-321",
          address: "321 Market Square, Kumasi, Ghana",
          notes: "Retail hardware shop",
          orgId: org.id,
        },
      }),
      db.customer.create({
        data: {
          name: "Property Developers Ghana",
          email: "facilities@propertydev.com",
          phone: "+233-20-PROP-654",
          address: "654 Development Road, Accra, Ghana",
          taxId: "PDG-345678",
          notes: "Property development company",
          orgId: org.id,
        },
      }),
    ]);
    console.log(`Created ${customers.length} customers`);

    console.log("Seed completed successfully!");
    console.log("=== IMPORTANT INFORMATION ===");
    console.log("1. Location created: ONLY Main Warehouse");
    console.log("2. All inventory is in Main Warehouse only");
    console.log("3. You can create additional stores later and transfer stock");
    console.log("4. User credentials:");
    console.log("   Admin:", { email: "admin@admin.com", password: adminPassword });
    console.log("   Manager:", { email: "manager@example.com", password: managerPassword });
    console.log("   User:", { email: "user@user.com", password: userPassword });
    console.log("5. Total items created: 45 hardware products");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}

async function main() {
  console.log("Starting database seed process...");
  try {
    await seedDatabase();
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error in main seed process:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("Failed to seed database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });