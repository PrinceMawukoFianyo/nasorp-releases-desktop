import { db } from "@/prisma/db";

// prisma/db.ts already returns the local database when running as the desktop app
// and Neon everywhere else, so every caller gets the right one.
export function getDb() {
  return db;
}