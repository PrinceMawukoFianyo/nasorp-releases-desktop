import { db } from "./db";
import bcrypt from "bcryptjs";

async function seedDatabase() {
  try {
    console.log("🚀 Starting database seed...");

    // ── Organisation ──────────────────────────────────────────────────────────
    let org = null;
    try {
      org = await db.organisation.create({
        data: {
          name: "Habifazzy Enterprise",
          slug: "habifazzy-enterprise",
          industry: "Hardware & Construction",
          country: "Ghana",
          region: "Ashanti",
          address: "Bokankye Police Checkpoint, Kumasi",
          currency: "GHS",
          timezone: "Africa/Accra",
        },
      });
      console.log(`✅ Created organisation: ${org.name}`);
    } catch (error: any) {
      if (error.code === "P2002") {
        console.log("⚠️ Organisation already exists, fetching...");
        org = await db.organisation.findUnique({
          where: { slug: "habifazzy-enterprise" },
        });
      } else {
        throw error;
      }
    }

    if (!org) throw new Error("Failed to create or find organisation");
    const orgId: string = org.id;

    // ── Default Location ──────────────────────────────────────────────────────
    let warehouse;
    try {
      warehouse = await db.location.create({
        data: {
          name: "Main Store",
          type: "WAREHOUSE",
          address: "Bokankye Police Checkpoint, Kumasi",
          phone: "0546722768",
          email: "store@rich83ventures.com",
          orgId,
          isActive: true,
        },
      });
      console.log(`✅ Created location: ${warehouse.name}`);
    } catch (error: any) {
      if (error.code === "P2002") {
        warehouse = await db.location.findFirst({
          where: { orgId, type: "WAREHOUSE" },
        });
        console.log("⚠️ Location already exists, using existing.");
      }
    }

    // ── Admin Role ────────────────────────────────────────────────────────────
    console.log("👑 Creating admin role...");

    const adminPermissions = [
      "all", "read", "write", "delete", "manage", "create", "update",
      "dashboard.read",
      "inventory.read", "inventory.create", "inventory.update", "inventory.delete",
      "items.read", "items.create", "items.update", "items.delete",
      "categories.read", "categories.create", "categories.update", "categories.delete",
      "brands.read", "brands.create", "brands.update", "brands.delete",
      "units.read", "units.create", "units.update", "units.delete",
      "stock.read", "stock.create", "stock.update", "stock.delete",
      "transfers.read", "transfers.create", "transfers.update", "transfers.delete",
      "adjustments.read", "adjustments.create", "adjustments.update", "adjustments.delete",
      "barcodes.read", "barcodes.create", "barcodes.update", "barcodes.delete",
      "warehouses.read", "warehouses.create", "warehouses.update", "warehouses.delete",
      "purchases.read", "purchases.create", "purchases.update", "purchases.delete",
      "purchase.orders.read", "purchase.orders.create", "purchase.orders.update", "purchase.orders.delete",
      "goods.receipts.read", "goods.receipts.create", "goods.receipts.update", "goods.receipts.delete",
      "suppliers.read", "suppliers.create", "suppliers.update", "suppliers.delete",
      "sales.read", "sales.create", "sales.update", "sales.delete",
      "pos.access", "pos.read", "pos.create", "pos.update", "pos.delete",
      "sales.orders.read", "sales.orders.create", "sales.orders.update", "sales.orders.delete",
      "returns.read", "returns.create", "returns.update", "returns.delete",
      "customers.read", "customers.create", "customers.update", "customers.delete",
      "reports.read", "reports.create", "reports.update", "reports.delete",
      "reports.sales.read", "reports.inventory.read", "reports.purchases.read",
      "integrations.read", "integrations.create", "integrations.update", "integrations.access",
      "api_settings.read", "api_settings.create", "api_settings.update", "api_settings.delete", "api_settings.access",
      "settings.read", "settings.create", "settings.update", "settings.delete", "settings.access", "settings.admin",
      "locations.read", "locations.create", "locations.update", "locations.delete",
      "tax.settings.read", "tax.settings.create", "tax.settings.update", "tax.settings.delete",
      "users.read", "users.create", "users.update", "users.delete",
      "roles.read", "roles.create", "roles.update", "roles.delete",
      "profile.read", "profile.update",
      "password.update", "password.change",
    ];

    let adminRole;
    try {
      adminRole = await db.role.create({
        data: {
          displayName: "Administrator",
          roleName:    "admin",
          description: "Full system access with all permissions",
          permissions: adminPermissions,
          orgId,
        },
      });
      console.log(`✅ Created admin role (${adminPermissions.length} permissions)`);
    } catch (error: any) {
      if (error.code === "P2002") {
        adminRole = await db.role.findFirst({ where: { roleName: "admin", orgId } });
        console.log("⚠️ Admin role already exists, using existing.");
      } else {
        throw error;
      }
    }

    if (!adminRole) throw new Error("Failed to create or find admin role");

    const hashedPassword = await bcrypt.hash("Admin@2026", 10);

    // ── Admin 1: faizadramani@gmail.com ───────────────────────────────────────
    // Strategy: create user with scalar orgId first, then connect role in a
    // separate update — this avoids the Prisma "cannot mix scalar + relation" error.
    try {
      await db.user.create({
        data: {
          email:     "faizadramani@gmail.com",
          name:      "Faiza Dramani",
          firstName: "Faiza",
          lastName:  "Dramani",
          phone:     "0000000001",  // placeholder — change in Settings → Profile
          isVerfied: true,
          password:  hashedPassword,
          orgId,
          orgName:   org.name,
        },
      });
      await db.user.update({
        where: { email: "faizadramani@gmail.com" },
        data:  { roles: { connect: { id: adminRole.id } } },
      });
      console.log("✅ Created admin 1: faizadramani@gmail.com");
    } catch (error: any) {
      if (error.code === "P2002") {
        console.log("⚠️ Admin 1 already exists.");
      } else {
        console.log("⚠️ Could not create admin 1:", error.message);
      }
    }

    // ── Admin 2: princefianyo8@gmail.com ──────────────────────────────────────
    try {
      await db.user.create({
        data: {
          email:     "princefianyo8@gmail.com",
          name:      "Prince Fianyo",
          firstName: "Prince",
          lastName:  "Fianyo",
          phone:     "0000000002",  // placeholder — change in Settings → Profile
          isVerfied: true,
          password:  hashedPassword,
          orgId,
          orgName:   org.name,
        },
      });
      await db.user.update({
        where: { email: "princefianyo8@gmail.com" },
        data:  { roles: { connect: { id: adminRole.id } } },
      });
      console.log("✅ Created admin 2: princefianyo8@gmail.com");
    } catch (error: any) {
      if (error.code === "P2002") {
        console.log("⚠️ Admin 2 already exists.");
      } else {
        console.log("⚠️ Could not create admin 2:", error.message);
      }
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log("\n🎉 === SEED COMPLETED ===");
    console.log("\n🔐 LOGIN CREDENTIALS:");
    console.log("-".repeat(50));
    console.log("ADMIN 1 (Primary):");
    console.log("  Email   : faizadramani@gmail.com");
    console.log("  Password: Admin@2026");
    console.log("\nADMIN 2:");
    console.log("  Email   : princefianyo8@gmail.com");
    console.log("  Password: Admin@2026");
    console.log("-".repeat(50));
    console.log("\n📌 No inventory items seeded — add them manually after login.");
    console.log("⚠️  Update placeholder phone numbers in Settings → Profile.");

  } catch (error: any) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

async function main() {
  try {
    await seedDatabase();
    console.log("\n✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });