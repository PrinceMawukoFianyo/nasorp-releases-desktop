const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function diagnose() {
  console.log('=== DIAGNOSING API KEY ISSUE ===\n');
  
  // 1. Check organizations
  const orgs = await db.organisation.findMany();
  console.log('Organizations in database:');
  orgs.forEach(org => {
    console.log(`  ${org.id}: ${org.name}`);
  });
  
  // 2. Check users and their orgId
  const users = await db.user.findMany({
    include: { organisation: true }
  });
  console.log('\nUsers in database:');
  users.forEach(user => {
    console.log(`  ${user.email}:`);
    console.log(`    User ID: ${user.id}`);
    console.log(`    User orgId: ${user.orgId || 'NULL/MISSING!'}`);
    console.log(`    Has organisation relation: ${!!user.organisation}`);
    if (user.organisation) {
      console.log(`    Organisation: ${user.organisation.name} (${user.organisation.id})`);
    }
  });
  
  // 3. Check API keys
  const apiKeys = await db.apiKey.findMany({
    include: { org: true }
  });
  console.log('\nAPI Keys in database:');
  apiKeys.forEach(key => {
    console.log(`  ${key.name}: ${key.key.substring(0, 20)}...`);
    console.log(`    orgId: ${key.orgId}`);
    console.log(`    orgName: ${key.org?.name || 'NONE'}`);
  });
  
  await db.$disconnect();
}

diagnose().catch(console.error);
