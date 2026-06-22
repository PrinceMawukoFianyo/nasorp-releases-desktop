// app/api/paystack/split/route.ts + actions/paystack-split.ts
// ─────────────────────────────────────────────────────────────────────────────
// Paystack Split lets the super admin automatically receive a cut of every
// payment processed through the system.
//
// How it works:
//   1. Super admin creates a "Split" in Paystack dashboard (or via API)
//   2. Split has: your subaccount + business subaccount + percentages
//   3. Every Paystack transaction using that split_code auto-divides the money
//   4. No manual transfers needed — Paystack does it at settlement
//
// Super admin can set:
//   - Their own subaccount (super admin cut %)
//   - Business owner subaccount (business cut %)
//   - Paystack takes its 1.95% off the top automatically
// ─────────────────────────────────────────────────────────────────────────────

"use server";
import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

// ── Create or update a Paystack Split ────────────────────────────────────────
export async function createOrUpdateSplit(input: {
  name: string;
  superAdminSubaccount: string; // subaccount_code from Paystack
  superAdminShare: number;      // percentage e.g. 1 = 1%
  businessSubaccount: string;   // the merchant's subaccount_code
  businessShare: number;        // percentage e.g. 98.05 = rest after Paystack fee
}) {
  try {
    const totalShare = input.superAdminShare + input.businessShare;
    if (totalShare > 100) return { success: false, error: "Shares exceed 100%" };

    const body = {
      name: input.name,
      type: "percentage",
      currency: "GHS",
      subaccounts: [
        { subaccount: input.superAdminSubaccount, share: input.superAdminShare },
        { subaccount: input.businessSubaccount,   share: input.businessShare },
      ],
      bearer_type: "all",   // all subaccounts bear Paystack fee proportionally
      bearer_subaccount: input.businessSubaccount,
    };

    const res = await fetch("https://api.paystack.co/split", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.status) return { success: false, error: data.message };

    // Save split_code to DB so all transactions use it
    await db.systemConfig.upsert({
      where: { key: "paystack_split_code" },
      update: { value: data.data.split_code },
      create: { key: "paystack_split_code", value: data.data.split_code },
    });

    await db.systemConfig.upsert({
      where: { key: "paystack_split_config" },
      update: { value: JSON.stringify({ ...input, splitCode: data.data.split_code, splitId: data.data.id }) },
      create: { key: "paystack_split_config", value: JSON.stringify({ ...input, splitCode: data.data.split_code }) },
    });

    return { success: true, splitCode: data.data.split_code, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Create a Paystack subaccount (for each business/merchant) ─────────────────
export async function createSubaccount(input: {
  businessName: string;
  bankCode: string;       // e.g. "030" for Ghana Commercial Bank
  accountNumber: string;
  percentageCharge: number;
}) {
  try {
    const res = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: input.businessName,
        bank_code: input.bankCode,
        account_number: input.accountNumber,
        percentage_charge: input.percentageCharge,
        currency: "GHS",
      }),
    });
    const data = await res.json();
    if (!data.status) return { success: false, error: data.message };
    return { success: true, subaccountCode: data.data.subaccount_code, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Get current split config ──────────────────────────────────────────────────
export async function getSplitConfig() {
  try {
    const cfg = await db.systemConfig.findFirst({ where: { key: "paystack_split_config" } });
    const code = await db.systemConfig.findFirst({ where: { key: "paystack_split_code" } });
    return {
      config: cfg ? JSON.parse(cfg.value) : null,
      splitCode: code?.value ?? null,
    };
  } catch {
    return { config: null, splitCode: null };
  }
}

// ── List Ghana banks (for subaccount setup) ───────────────────────────────────
export async function getGhanaBanks() {
  try {
    const res = await fetch("https://api.paystack.co/bank?country=ghana&currency=GHS", {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await res.json();
    return data.status ? data.data : [];
  } catch {
    return [];
  }
}

// ── Use split_code when initializing any transaction ─────────────────────────
// Add this to your Paystack initialize call:
// body: { email, amount, split_code: splitCode, ... }
export async function getActiveSplitCode(): Promise<string | null> {
  try {
    const cfg = await db.systemConfig.findFirst({ where: { key: "paystack_split_code" } });
    return cfg?.value ?? null;
  } catch {
    return null;
  }
}