const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function fix() {
  console.log('=== FIXING USER ORGANIZATION IDs ===\n');
  
  // Get the first organization (created by seed)
  const org = await db.organisation.findFirst();
  if (!org) {
    console.log('ERROR: No organization found in database!');
    console.log('Run: npx prisma db seed to create organizations');
    await db.$disconnect();
    return;
  }
  
  console.log(`Using organization: ${org.name} (${org.id})`);
  
  // Update all users to have this orgId
  const users = await db.user.findMany();
  let updatedCount = 0;
  
  for (const user of users) {
    if (!user.orgId || user.orgId !== org.id) {
      await db.user.update({
        where: { id: user.id },
        data: {
          orgId: org.id,
          orgName: org.name
        }
      });
      updatedCount++;
      console.log(`✓ Updated ${user.email} with orgId: ${org.id}`);
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} users`);
  
  // Create API key if none exists
  const apiKeys = await db.apiKey.findMany();
  if (apiKeys.length === 0) {
    const crypto = require('crypto');
    const key = 'sk_live_' + crypto.randomBytes(32).toString('hex');
    
    await db.apiKey.create({
      data: {
        name: "Default Key",
        key: key,
        orgId: org.id,
        isActive: true
      }
    });
    
    console.log(`\n✅ Created API key: ${key}`);
    console.log('\nAdd to .env file:');
    console.log(`API_KEY=${key}`);
  } else {
    console.log('\nAPI Key already exists in database:');
    console.log(`Key: ${apiKeys[0].key}`);
    console.log('\nAdd to .env file:');
    console.log(`API_KEY=${apiKeys[0].key}`);
  }
  
  await db.$disconnect();
}

fix().catch(console.error);
