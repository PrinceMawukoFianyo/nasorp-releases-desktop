// app/api/momo/request/route.ts
// Sends a MoMo charge request to Paystack mobile-money charge endpoint.
// Customer gets a USSD/prompt on their phone — they type PIN and approve.

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/config/useAuth";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BUSINESS_FEE_PCT = parseFloat(process.env.BUSINESS_FEE_PCT ?? "0.01"); // 1%

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.orgId) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });

    const body = await req.json();
    const { phone, amount, note } = body as { phone: string; amount: number; note?: string };

    if (!phone || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    // Paystack expects amount in pesewas (GHS × 100)
    const amountInPesewas = Math.round(amount * 100);

    // Step 1: Initialize a mobile-money charge
    const initRes = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPesewas,
        email: `${phone.replace(/^0/, "233")}@momo.afkberimah.com`, // Paystack requires email
        currency: "GHS",
        mobile_money: {
          phone: phone.startsWith("0") ? phone.replace(/^0/, "+233") : phone,
          provider: detectNetwork(phone), // "mtn", "vodafone", "tgo"
        },
        metadata: {
          orgId: user.orgId,
          note: note ?? "Payment to AFK Berimah Hardware",
          businessFee: BUSINESS_FEE_PCT,
        },
      }),
    });

    const initData = await initRes.json();

    if (!initData.status) {
      return NextResponse.json({ success: false, error: initData.message ?? "Paystack error" }, { status: 502 });
    }

    // Step 2: For some networks (MTN), Paystack sends a USSD push automatically.
    // For Vodafone, you may need to submit a token. We return the reference.
    return NextResponse.json({
      success: true,
      reference: initData.data?.reference,
      status: initData.data?.status,
      displayText: initData.data?.display_text,
    });
  } catch (err: any) {
    console.error("[POST /api/momo/request]", err);
    return NextResponse.json({ success: false, error: err?.message ?? "Server error" }, { status: 500 });
  }
}

// Simple heuristic — extend as needed for Ghana networks
function detectNetwork(phone: string): "mtn" | "vodafone" | "tgo" {
  const n = phone.replace(/^\+?233|^0/, "");
  if (/^(24|54|55|59)/.test(n)) return "mtn";
  if (/^(20|50)/.test(n)) return "vodafone";
  return "tgo"; // AirtelTigo
}