// lib/get-db.ts
import { db as neonDb } from "@/prisma/db";
import { getLocalDb } from "@/prisma/db-local";

export function getDb() {
  // Set by Electron's main.ts when it spawns the Next.js process.
  // Absent entirely when running as the normal web app (Vercel, npm run dev).
  if (process.env.IS_DESKTOP_APP === "true") {
    return getLocalDb();
  }
  return neonDb;
}