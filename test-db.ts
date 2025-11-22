// test-db.ts
import { db } from "@/prisma/db";

async function testConnection() {
  try {
    await db.$connect();
    console.log("✅ Database connected successfully");
    const result = await db.$queryRaw`SELECT 1`;
    console.log("Query result:", result);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  } finally {
    await db.$disconnect();
  }
}

testConnection();