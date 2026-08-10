// lib/notify.ts
// ─────────────────────────────────────────────────────────────────────────────
// Outbound alerts to a real human, independent of whether anyone has the
// dashboard open or has internet at all. Two channels:
//   - SMS via Africa's Talking: works on plain cell signal, no data needed.
//     This is the one that reaches someone when "the phone is not around" the
//     dashboard — it just needs to be a phone, anywhere, with signal.
//   - WhatsApp via Twilio: richer, but needs at least some data connection.
// Both are best-effort. A failed notification should NEVER block or fail the
// underlying payment recording — we log and move on.
// ─────────────────────────────────────────────────────────────────────────────

const AT_API_KEY = process.env.AT_API_KEY!;
const AT_USERNAME = process.env.AT_USERNAME!;
const AT_SENDER_ID = process.env.AT_SENDER_ID;

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WA_FROM = process.env.TWILIO_WHATSAPP_FROM;

// Ghana numbers as +233XXXXXXXXX for both providers
function toIntl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) return `+${digits}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  return `+${digits}`;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!AT_API_KEY || !AT_USERNAME) {
    console.warn("[notify] AT_API_KEY/AT_USERNAME not set — skipping SMS");
    return false;
  }
  try {
    const body = new URLSearchParams({
      username: AT_USERNAME,
      to: toIntl(to),
      message,
      ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}),
    });

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey: AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    const data = await res.json();
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    const ok = recipient?.status === "Success";
    if (!ok) console.warn("[notify] SMS not confirmed sent:", data);
    return ok;
  } catch (err) {
    console.error("[notify] SMS send failed:", err);
    return false;
  }
}

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WA_FROM) {
    // Optional channel — silently skip if not configured, no warning needed.
    return false;
  }
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
    const body = new URLSearchParams({
      From: TWILIO_WA_FROM,
      To: `whatsapp:${toIntl(to)}`,
      Body: message,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
    return res.ok;
  } catch (err) {
    console.error("[notify] WhatsApp send failed:", err);
    return false;
  }
}

// Fire both channels for a payment alert. Never throws — a notification
// failure must never take down the webhook/SMS route that called it.
export async function notifyPaymentReceived(
  phones: string[],
  message: string
): Promise<void> {
  await Promise.allSettled(
    phones.flatMap((p) => [sendSMS(p, message), sendWhatsApp(p, message)])
  );
}