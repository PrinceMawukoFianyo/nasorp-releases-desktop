// app/api/paystack/initialize/route.ts
// Initializes a Paystack card payment — returns authorization_url for redirect

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/config/useAuth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { email, amount, description } = await req.json();

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email, amount, // in pesewas
        currency: "GHS",
        metadata: { orgId: user.orgId, description },
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/momo/card-success`,
      }),
    });

    const data = await res.json();
    if (!data.status) return NextResponse.json({ error: data.message }, { status: 400 });

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}