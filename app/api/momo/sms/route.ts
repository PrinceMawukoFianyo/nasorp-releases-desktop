// app/api/momo/sms/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Receives SMS forwarded from:
//   A) Africa's Talking (AT) SMS gateway — they host your SIM card
//   B) SMSForward / SMS Gateway Android app — app on the phone forwards via HTTP
//   C) Any other SMS-to-HTTP bridge
//
// The critical logic: SET balance = parsed "Current Balance" from SMS.
// Never add/subtract — the SMS tells you the truth after every transaction.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { parseMomoSMS } from "@/lib/momo-sms-parser";
import { db } from "@/prisma/db";

// Shared secret to verify requests come from your phone/AT, not random internet
const SMS_WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse incoming request (AT or SMSForward both use form/json) ──────
    const contentType = req.headers.get("content-type") ?? "";
    let from = "";
    let text = "";
    let to   = "";  // the SIM/line number that received this SMS

    if (contentType.includes("application/json")) {
      const body = await req.json();
      // SMSForward format: { from, message, to, secret }
      if (SMS_WEBHOOK_SECRET && body.secret !== SMS_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      from = body.from ?? body.sender ?? "";
      text = body.message ?? body.text ?? body.sms ?? "";
      to   = body.to ?? body.receiver ?? "";
    } else {
      // Africa's Talking format: multipart/form-data
      const form = await req.formData();
      from = String(form.get("from") ?? "");
      text = String(form.get("text") ?? "");
      to   = String(form.get("to")   ?? "");
    }

    if (!text) return NextResponse.json({ error: "No message text" }, { status: 400 });

    // ── 2. Parse the SMS ──────────────────────────────────────────────────────
    const parsed = parseMomoSMS(text);

    // Only process if we got a valid balance (means it's a MoMo SMS)
    if (parsed.balance === 0 && parsed.amount === 0) {
      // Not a financial SMS — ignore silently
      return NextResponse.json({ received: true, processed: false });
    }

    // ── 3. Find which MoMo line matches the recipient number ──────────────────
    // Normalize phone numbers to 0XXXXXXXXX format
    const normalize = (p: string) =>
      p.replace(/^\+?233/, "0").replace(/\s/g, "");

    const normalizedTo = normalize(to);

    // Find the line — match by number
    const line = await db.momoLine.findFirst({
      where: {
        number: { in: [normalizedTo, to, to.replace(/^0/, "+233")] },
      },
    });

    // If no line matched but we only have one line, use that
    const fallbackLine = !line ? await db.momoLine.findFirst({ where: { isActive: true } }) : null;
    const targetLine = line ?? fallbackLine;

    if (!targetLine) {
      console.warn("[SMS] No MoMo line found for number:", to);
      return NextResponse.json({ received: true, processed: false, reason: "no_line" });
    }

    // ── 4. SET balance from SMS (the authoritative source) ────────────────────
    // This is the key logic: we do NOT add/subtract.
    // The SMS always includes the correct balance AFTER the transaction.
    const newBalance = parsed.balance;

    await db.momoLine.update({
      where: { id: targetLine.id },
      data: { balance: newBalance },
    });

    // ── 5. Record the transaction ─────────────────────────────────────────────
    const txRef = parsed.reference || `SMS_${Date.now()}`;

    // Avoid duplicate transactions from the same reference
    const existing = await db.momoTransaction.findFirst({ where: { reference: txRef } });
    if (!existing) {
      await db.momoTransaction.create({
        data: {
          orgId: targetLine.orgId,
          type: parsed.type === "INCOMING" ? "INCOMING" : parsed.type === "OUTGOING" ? "OUTGOING" : "INCOMING",
          amount: parsed.amount,
          fee: parsed.fee,
          net: parsed.amount - parsed.fee,
          fromName: parsed.senderName || (parsed.type === "OUTGOING" ? "You" : "Unknown"),
          fromNumber: parsed.senderNumber || from,
          toNumber: parsed.type === "OUTGOING" ? (parsed.recipientName || "Unknown") : undefined,
          status: "COMPLETED",
          message: text, // store the EXACT original SMS text — unchanged
          reference: txRef,
        },
      });
    }

    // ── 6. Push real-time alert to dashboard via SSE ──────────────────────────
    if (parsed.type === "INCOMING") {
      await db.momoAlert.create({
        data: {
          orgId: targetLine.orgId,
          payload: JSON.stringify({
            id: `sms_${Date.now()}`,
            amount: parsed.amount,
            balance: newBalance,
            senderName: parsed.senderName || "Unknown",
            senderNumber: parsed.senderNumber || from,
            message: text,
            lineNumber: targetLine.number,
            lineName: targetLine.name,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    return NextResponse.json({
      received: true,
      processed: true,
      type: parsed.type,
      amount: parsed.amount,
      newBalance,
      line: targetLine.name,
    });

  } catch (err: any) {
    console.error("[SMS webhook]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Africa's Talking also sends GET for subscription confirmation
export async function GET() {
  return new Response("MoMo SMS webhook active", { status: 200 });
}