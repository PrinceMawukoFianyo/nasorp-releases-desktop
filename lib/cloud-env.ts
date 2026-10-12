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

// Cloud-only integrations (email, SMS, AI) aren't available on the desktop.
// Some SDKs throw at import time when a key is missing, which would crash pages.
const placeholders: Record<string, string> = {
  RESEND_API_KEY: "re_desktop_placeholder",
  EMAIL_FROM: "no-reply@localhost",
  FROM_EMAIL: "no-reply@localhost",
  OPENAI_API_KEY: "sk-desktop-placeholder",
  GEMINI_API_KEY: "desktop-placeholder",
  UPLOADTHING_APP_ID: "desktopapp",
  // UploadThing expects a base64 JSON token, so build a dummy one in that format
  UPLOADTHING_TOKEN: Buffer.from(
    JSON.stringify({ apiKey: "sk_live_desktop_placeholder", appId: "desktopapp", regions: ["sea1"] })
  ).toString("base64"),
};
for (const [k, v] of Object.entries(placeholders)) {
  if (!process.env[k]) process.env[k] = v;
}

process.env.NEXTAUTH_URL ??= "http://localhost:3000";
// Desktop doesn't send email. A placeholder stops modules that create the client
// at import time from crashing the page.
if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = "re_desktop_placeholder";

