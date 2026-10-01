// MUST be the first import in electron/main.ts, so DATABASE_URL is set
// before prisma/db.ts builds the Neon adapter.
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getLocalRoot } from "../prisma/db-local";
import crypto from "crypto";

// Dev: project-root .env (absent in the packaged app, which is intended)
dotenv.config({ path: path.join(__dirname, "../../.env"), quiet: true });

// Packaged: <userData>/cloud.json  ->  { "databaseUrl": "...", "directUrl": "..." }
if (!process.env.DATABASE_URL) {
  try {
    const file = path.join(getLocalRoot(), "cloud.json");
    const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
    if (cfg.databaseUrl) {
      process.env.DATABASE_URL = cfg.databaseUrl;
      process.env.DIRECT_URL = cfg.directUrl || cfg.databaseUrl;
    }
  } catch {
    // no cloud.json yet: app runs local-only
  }
}

const url = process.env.DATABASE_URL ?? "";
export const cloudConfigured = url !== "" && !url.includes("localhost");

const secretFile = path.join(getLocalRoot(), "auth-secret.txt");
if (!process.env.NEXTAUTH_SECRET) {
  try {
    process.env.NEXTAUTH_SECRET = fs.readFileSync(secretFile, "utf8").trim();
  } catch {
    const s = crypto.randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, s);
    process.env.NEXTAUTH_SECRET = s;
  }
}
process.env.NEXTAUTH_URL ??= "http://localhost:3000";