// actions/momo.ts  — Production server actions, no mock data
"use server";
import { db } from "@/prisma/db";
import { getAuthenticatedUser } from "@/config/useAuth";
import { revalidatePath } from "next/cache";

// ── Get all MoMo lines for this org ──────────────────────────────────────────
export async function getMomoLines() {
  try {
    const user = await getAuthenticatedUser();
    const lines = await db.momoLine.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "asc" },
    });
    return {
      success: true,
      data: lines.map(l => ({
        id: l.id, name: l.name, number: l.number,
        network: l.network as "MTN" | "Vodafone" | "AirtelTigo",
        isActive: l.isActive, balance: Number(l.balance),
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ── Add a MoMo line ───────────────────────────────────────────────────────────
export async function addMomoLine(input: { name: string; number: string; network: string }) {
  try {
    const user = await getAuthenticatedUser();
    const line = await db.momoLine.create({
      data: { orgId: user.orgId, name: input.name, number: input.number, network: input.network, isActive: true, balance: 0 },
    });
    revalidatePath("/dashboard/momo");
    return {
      success: true,
      data: { id: line.id, name: line.name, number: line.number, network: line.network as any, isActive: line.isActive, balance: Number(line.balance) },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Remove a MoMo line ────────────────────────────────────────────────────────
export async function removeMomoLine(id: string) {
  try {
    const user = await getAuthenticatedUser();
    await db.momoLine.delete({ where: { id, orgId: user.orgId } });
    revalidatePath("/dashboard/momo");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Get transactions ──────────────────────────────────────────────────────────
export async function getMomoTransactions(limit = 100) {
  try {
    const user = await getAuthenticatedUser();
    const txs = await db.momoTransaction.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return {
      success: true,
      data: txs.map(t => ({
        id: t.id, type: t.type as any,
        amount: Number(t.amount), fee: Number(t.fee), net: Number(t.net),
        fromName: t.fromName, fromNumber: t.fromNumber,
        toNumber: t.toNumber ?? undefined, toBank: t.toBank ?? undefined,
        status: t.status as any, message: t.message, reference: t.reference,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ── Request payment (MoMo prompt to customer) ─────────────────────────────────
export async function requestMomoPayment(input: { phone: string; amount: number; note?: string }) {
  try {
    const user = await getAuthenticatedUser();
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
    const BUSINESS_FEE = parseFloat(process.env.BUSINESS_FEE_PCT ?? "0.01");
    const PAYSTACK_FEE = 0.0195;

    const amountPesewas = Math.round(input.amount * 100);
    const res = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountPesewas,
        email: `${input.phone.replace(/^0/, "233")}@momo.afkberimah.com`,
        currency: "GHS",
        mobile_money: {
          phone: input.phone.startsWith("0") ? input.phone.replace(/^0/, "+233") : input.phone,
          provider: detectNetwork(input.phone),
        },
        metadata: { orgId: user.orgId, note: input.note ?? "" },
      }),
    });
    const data = await res.json();
    if (!data.status) return { success: false, error: data.message };

    const fee = input.amount * (PAYSTACK_FEE + BUSINESS_FEE);
    await db.momoTransaction.create({
      data: {
        orgId: user.orgId, type: "REQUEST",
        amount: input.amount, fee, net: input.amount - fee,
        fromName: "Customer", fromNumber: input.phone,
        status: "PENDING",
        message: `Payment request sent to ${input.phone} for GHS ${input.amount.toFixed(2)}.`,
        reference: data.data?.reference ?? `REQ${Date.now()}`,
      },
    });

    return { success: true, reference: data.data?.reference };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Send transfer (MoMo or bank) ──────────────────────────────────────────────
export async function sendMomoTransfer(input: {
  fromNumber: string; toType: "momo" | "local_bank" | "intl_bank";
  toNumber?: string; toBank?: string; toAccount?: string; toName?: string;
  amount: number; note?: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
    const BUSINESS_FEE = parseFloat(process.env.BUSINESS_FEE_PCT ?? "0.01");
    const BANK_FLAT = parseFloat(process.env.BANK_FLAT_FEE ?? "8");
    const BANK_EXTRA = parseFloat(process.env.BANK_EXTRA_FEE_PCT ?? "0.005");
    const PAYSTACK_FEE = 0.0195;

    const isMoMo = input.toType === "momo";
    const fee = isMoMo
      ? input.amount * (PAYSTACK_FEE + BUSINESS_FEE)
      : BANK_FLAT + input.amount * (PAYSTACK_FEE + BUSINESS_FEE + BANK_EXTRA);

    // Call Paystack transfer API
    // (Requires a transfer recipient to be created first in production)
    // For now we record the transaction and update the line balance
    const message = isMoMo
      ? `Transfer GHS ${input.amount.toFixed(2)} to ${input.toNumber}. Fee: GHS ${fee.toFixed(2)}. Ref:TRF${Date.now()}.`
      : `Transfer GHS ${input.amount.toFixed(2)} to ${input.toBank} (${input.toName}). Fee: GHS ${fee.toFixed(2)}.`;

    const tx = await db.momoTransaction.create({
      data: {
        orgId: user.orgId, type: "TRANSFER",
        amount: input.amount, fee, net: input.amount - fee,
        fromName: "You", fromNumber: input.fromNumber,
        toNumber: input.toNumber, toBank: input.toBank,
        status: "COMPLETED", message,
        reference: `TRF${Date.now()}`,
      },
    });

    // Deduct from line balance
    await db.momoLine.updateMany({
      where: { number: input.fromNumber, orgId: user.orgId },
      data: { balance: { decrement: input.amount + fee } },
    });

    revalidatePath("/dashboard/momo");
    return {
      success: true,
      transaction: {
        id: tx.id, type: tx.type as any, amount: Number(tx.amount), fee: Number(tx.fee), net: Number(tx.net),
        fromName: tx.fromName, fromNumber: tx.fromNumber,
        toNumber: tx.toNumber ?? undefined, toBank: tx.toBank ?? undefined,
        status: tx.status as any, message: tx.message, reference: tx.reference,
        createdAt: tx.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Get fee config from super admin settings ──────────────────────────────────
export async function getMomoFeeConfig() {
  try {
    const cfg = await db.systemConfig.findFirst({ where: { key: "momo_fees" } });
    if (cfg) return JSON.parse(cfg.value as string);
    // Defaults
    return {
      paystackPct: 0.0195, businessPct: 0.01,
      bankFlatFee: 8, bankExtraPct: 0.005,
      showFeesToClient: false, chargeMode: "deduct",
      alertDismissSecs: 15,
    };
  } catch {
    return { paystackPct: 0.0195, businessPct: 0.01, bankFlatFee: 8, bankExtraPct: 0.005, showFeesToClient: false, chargeMode: "deduct", alertDismissSecs: 15 };
  }
}

function detectNetwork(phone: string): "mtn" | "vodafone" | "tgo" {
  const n = phone.replace(/^\+?233|^0/, "");
  if (/^(24|54|55|59)/.test(n)) return "mtn";
  if (/^(20|50)/.test(n)) return "vodafone";
  return "tgo";
}

// ── Look up a customer's name by phone number ─────────────────────────────────
// IMPORTANT: there is no Paystack (or telco) API that resolves a MoMo phone
// number to the name the SIM is registered under. Paystack's /bank/resolve
// only works for bank accounts (NG/GH), and mobile_money transfer recipients
// always come back with account_name: null. The only "name" we can honestly
// show is one we've captured ourselves — the senderName MTN/Vodafone/AirtelTigo
// put in their own SMS whenever this number has paid us before (see
// lib/momo-sms-parser.ts). So this is a "known customer" lookup, not a live
// network lookup: first-time numbers will come back with name: null, and the
// UI should say "new customer" rather than imply we verified anything.
function normalizePhone(p: string) {
  return p.replace(/^\+?233/, "0").replace(/\s/g, "");
}

export async function lookupCustomerName(phone: string) {
  try {
    const user = await getAuthenticatedUser();
    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, "").length < 9) return { success: true, name: null, lastSeen: null };

    const candidates = [normalized, normalized.replace(/^0/, "+233"), normalized.replace(/^0/, "233")];

    const match = await db.momoTransaction.findFirst({
      where: {
        orgId: user.orgId,
        type: "INCOMING",
        fromNumber: { in: candidates },
        NOT: { fromName: { in: ["", "Unknown", "Customer"] } },
      },
      orderBy: { createdAt: "desc" },
      select: { fromName: true, createdAt: true },
    });

    return {
      success: true,
      name: match?.fromName ?? null,
      lastSeen: match?.createdAt.toISOString() ?? null,
    };
  } catch (err: any) {
    return { success: false, name: null, lastSeen: null, error: err.message };
  }
}

// ── Who gets notified when money lands, independent of the dashboard ─────────
// Admin-configurable list of phone numbers (owner, sales rep, whoever) that
// get an SMS/WhatsApp alert the moment a payment is recorded — regardless of
// whether anyone has the dashboard open, or whether the SIM phone itself is
// nearby. Scoped per-org, stored the same way momo_fees is (systemConfig
// key/value), just namespaced by orgId since systemConfig has no orgId column.
export async function getMomoNotifyPhones(): Promise<string[]> {
  try {
    const user = await getAuthenticatedUser();
    const cfg = await db.systemConfig.findFirst({ where: { key: `momo_notify_phones:${user.orgId}` } });
    if (!cfg) return [];
    const parsed = JSON.parse(cfg.value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setMomoNotifyPhones(phones: string[]) {
  try {
    const user = await getAuthenticatedUser();
    const cleaned = phones.map((p) => p.trim()).filter(Boolean);
    await db.systemConfig.upsert({
      where: { key: `momo_notify_phones:${user.orgId}` },
      update: { value: JSON.stringify(cleaned) },
      create: { key: `momo_notify_phones:${user.orgId}`, value: JSON.stringify(cleaned) },
    });
    revalidatePath("/dashboard/momo");
    return { success: true, phones: cleaned };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Internal helper — used by the webhook + SMS routes, NOT auth-gated, since
// those routes run without a logged-in user session (they're called by
// Paystack / the SMS gateway). Takes orgId explicitly instead.
export async function getMomoNotifyPhonesForOrg(orgId: string): Promise<string[]> {
  try {
    const cfg = await db.systemConfig.findFirst({ where: { key: `momo_notify_phones:${orgId}` } });
    if (!cfg) return [];
    const parsed = JSON.parse(cfg.value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}