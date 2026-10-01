// scripts/seed-local-from-neon.ts
import { PrismaClient } from "../generated/prisma-client";
import { startLocalPostgres, getLocalDb } from "../prisma/db-local";

const neonDb = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  console.log("Connecting to local Postgres...");
  await startLocalPostgres();
  const localDb = getLocalDb();

  console.log("Reading one organisation from Neon...");
  const org = await neonDb.organisation.findFirst();
  if (!org) throw new Error("No organisation found in Neon.");

  console.log("Reading one location for that org...");
  const location = await neonDb.location.findFirst({ where: { orgId: org.id } });
  if (!location) throw new Error("No location found for this org in Neon.");

  console.log("Reading a couple of items with stock...");
  const items = await neonDb.item.findMany({
    where: { orgId: org.id, isActive: true },
    take: 3,
  });
  if (items.length === 0) throw new Error("No active items found in Neon.");

    console.log("Reading one user for that org...");
  const user = await neonDb.user.findFirst({
    where: { orgId: org.id },
    include: { roles: true },
  });
  if (!user) throw new Error("No user found for this org in Neon.");

  console.log("Writing role(s) into local Postgres...");
  for (const role of user.roles) {
    await localDb.role.upsert({
      where: { id: role.id },
      create: role,
      update: role,
    });
  }

  console.log("Writing user into local Postgres...");
  const { roles, ...userScalarFields } = user;
  await localDb.user.upsert({
    where: { id: user.id },
    create: {
      ...userScalarFields,
      roles: { connect: roles.map((r) => ({ id: r.id })) },
    },
    update: {
      ...userScalarFields,
      roles: { connect: roles.map((r) => ({ id: r.id })) },
    },
  });

  console.log("- User:", user.email, "| Roles:", user.roles.map(r => r.roleName).join(", "));

  // Collect the lookup IDs these items actually reference
  const categoryIds = [...new Set(items.map(i => i.categoryId).filter(Boolean))] as string[];
  const brandIds = [...new Set(items.map(i => i.brandId).filter(Boolean))] as string[];
  const unitIds = [...new Set(items.map(i => i.unitId).filter(Boolean))] as string[];
  const taxRateIds = [...new Set(items.map(i => i.taxRateId).filter(Boolean))] as string[];

  console.log("Reading referenced categories/brands/units/tax rates...");
  const categories = categoryIds.length
    ? await neonDb.category.findMany({ where: { id: { in: categoryIds } } })
    : [];
  const brands = brandIds.length
    ? await neonDb.brand.findMany({ where: { id: { in: brandIds } } })
    : [];
  const units = unitIds.length
    ? await neonDb.unit.findMany({ where: { id: { in: unitIds } } })
    : [];
  const taxRates = taxRateIds.length
    ? await neonDb.taxRate.findMany({ where: { id: { in: taxRateIds } } })
    : [];

  console.log("Reading inventory rows for those items at that location...");
  const inventories = await neonDb.inventory.findMany({
    where: {
      orgId: org.id,
      locationId: location.id,
      itemId: { in: items.map((i) => i.id) },
    },
  });

  console.log("Writing into local Postgres...");
  await localDb.organisation.upsert({ where: { id: org.id }, create: org, update: org });
  await localDb.location.upsert({ where: { id: location.id }, create: location, update: location });

  // Category may self-reference (parentId) — a category can point to its own
  // parent, which might not be in our small slice. Null out parentId if the
  // parent isn't part of what we pulled, so the FK doesn't fail here too.
  const categoryIdSet = new Set(categories.map(c => c.id));
  for (const cat of categories) {
    await localDb.category.upsert({
      where: { id: cat.id },
      create: { ...cat, parentId: categoryIdSet.has(cat.parentId ?? "") ? cat.parentId : null },
      update: { ...cat, parentId: categoryIdSet.has(cat.parentId ?? "") ? cat.parentId : null },
    });
  }

  for (const brand of brands) {
    await localDb.brand.upsert({ where: { id: brand.id }, create: brand, update: brand });
  }
  for (const unit of units) {
    await localDb.unit.upsert({ where: { id: unit.id }, create: unit, update: unit });
  }
  for (const taxRate of taxRates) {
    await localDb.taxRate.upsert({ where: { id: taxRate.id }, create: taxRate, update: taxRate });
  }

  for (const item of items) {
    await localDb.item.upsert({ where: { id: item.id }, create: item, update: item });
  }

  for (const inv of inventories) {
    await localDb.inventory.upsert({ where: { id: inv.id }, create: inv, update: inv });
  }

  console.log("Done. Seeded into local:");
  console.log("- Organisation:", org.name);
  console.log("- Location:", location.name);
  console.log("- Categories:", categories.length, "Brands:", brands.length, "Units:", units.length, "TaxRates:", taxRates.length);
  console.log("- Items:", items.map((i) => i.name).join(", "));
  console.log("- Inventory rows:", inventories.length);
}

main()
  .catch(console.error)
  .finally(() => process.exit());