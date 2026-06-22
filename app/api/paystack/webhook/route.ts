// app/api/paystack/webhook/route.ts
// Receives Paystack events → updates balance → pushes SSE alert to dashboard

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/prisma/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("x-paystack-signature") ?? "";
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET!;

  // Verify signature
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
  if (hash !== sig) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const data = event.data;
    const metadata = data.metadata ?? {};
    const orgId = metadata.orgId;
    if (!orgId) return NextResponse.json({ received: true });

    const amountGHS = data.amount / 100;
    const feeGHS    = (data.fees ?? 0) / 100;
    const netGHS    = amountGHS - feeGHS;

    // Find which MoMo line received this payment
    const recipientPhone = data.authorization?.receiver_bank_account_number
      ?? data.customer?.phone ?? "";

    // Normalize to 0XXX format
    const normalizePhone = (p: string) => p.replace(/^\+?233/, "0");
    const lineNumber = normalizePhone(recipientPhone);

    // Update line balance
    if (lineNumber) {
      await db.momoLine.updateMany({
        where: { number: lineNumber },
        data: { balance: { increment: amountGHS } },
      });
    }

    // Build the exact SMS-style message (as it appears on the phone)
    const senderName   = data.customer?.first_name ?? data.metadata?.senderName ?? "Customer";
    const senderNumber = data.customer?.phone ? normalizePhone(data.customer.phone) : "Unknown";
    const reference    = data.reference;
    const message = `MoMo: GHS ${amountGHS.toFixed(2)} received from ${senderName} ${senderNumber}. Ref:${reference}.`;

    // Record transaction
    const BUSINESS_FEE = parseFloat(process.env.BUSINESS_FEE_PCT ?? "0.01");
    const businessFee  = amountGHS * BUSINESS_FEE;
    const totalFee     = feeGHS + businessFee;

    const tx = await db.momoTransaction.create({
      data: {
        orgId, type: "INCOMING",
        amount: amountGHS, fee: totalFee, net: amountGHS - totalFee,
        fromName: senderName, fromNumber: senderNumber,
        status: "COMPLETED", message, reference,
      },
    });

    // Publish to SSE stream (stored in DB for polling fallback)
    await db.momoAlert.create({
      data: {
        orgId,
        payload: JSON.stringify({
          id: tx.id, amount: amountGHS,
          senderName, senderNumber, message,
          lineNumber, timestamp: new Date().toISOString(),
        }),
      },
    });
  }

  return NextResponse.json({ received: true });
}