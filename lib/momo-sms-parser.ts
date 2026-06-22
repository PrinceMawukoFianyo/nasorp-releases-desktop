// lib/momo-sms-parser.ts
// ─────────────────────────────────────────────────────────────────────────────
// Parses raw MoMo SMS text from MTN, Vodafone, AirtelTigo Ghana.
// Strategy: READ the "Current Balance" or "Available Balance" field directly.
// This is ALWAYS the authoritative balance — never add/subtract manually.
//
// Example SMS (MTN):
//   "Payment made for GHS 14.50 to WISDOM KWAME FIANYO.
//    Current Balance: GHS 57.13. Available Balance: GHS 57.13.
//    Reference: Rich. Transaction ID: 79418503296. Fee charged: GHS 0.00"
//
// Example SMS (MTN received):
//   "GHS 350.00 received from Ama Boateng 0277654321.
//    Current Balance: GHS 12,830.50. Transaction ID: 894512349"
// ─────────────────────────────────────────────────────────────────────────────

export type ParsedMomoSMS = {
  type: "INCOMING" | "OUTGOING" | "UNKNOWN";
  amount: number;           // transaction amount
  balance: number;          // authoritative balance from SMS
  senderName: string;       // who sent (if incoming)
  senderNumber: string;     // phone number (if present)
  recipientName: string;    // who received (if outgoing)
  fee: number;              // fee from SMS (GHS 0.00 for MoMo-to-MoMo)
  tax: number;              // tax from SMS
  reference: string;        // Reference or Transaction ID
  rawMessage: string;       // original SMS text unchanged
  network: "MTN" | "Vodafone" | "AirtelTigo" | "Unknown";
};

// Strip commas from numbers like "12,830.50" → 12830.50
function parseAmount(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}

// Extract a labelled GHS value: "Current Balance: GHS 57.13" → 57.13
function extractGHS(text: string, ...labels: string[]): number {
  for (const label of labels) {
    // Match label followed by optional GHS/GH¢ and a number
    const re = new RegExp(label + "\\s*:?\\s*(?:GHS?|GH[¢₵])?\\s*([\\d,]+\\.?\\d*)", "i");
    const m = text.match(re);
    if (m) return parseAmount(m[1]);
  }
  return 0;
}

function extractText(text: string, label: string, endChar = "."): string {
  const re = new RegExp(label + "\\s*:?\\s*(.+?)(?:[" + endChar + "\\n]|$)", "i");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

export function parseMomoSMS(rawMessage: string): ParsedMomoSMS {
  const msg = rawMessage.trim();

  // ── Detect network ────────────────────────────────────────────────────────
  let network: ParsedMomoSMS["network"] = "Unknown";
  if (/MTN|momo/i.test(msg)) network = "MTN";
  else if (/vodafone|vcash/i.test(msg)) network = "Vodafone";
  else if (/airteltigo|airtel|tigo/i.test(msg)) network = "AirtelTigo";

  // ── Extract balance (the most important field) ────────────────────────────
  const balance = extractGHS(msg,
    "Current Balance", "Available Balance", "Balance", "Bal"
  );

  // ── Extract transaction amount ────────────────────────────────────────────
  let amount = 0;
  // "Payment made for GHS 14.50" or "GHS 350.00 received"
  const amtMatch = msg.match(/(?:for|of)\s+(?:GHS?|GH[¢₵])\s*([\d,]+\.?\d*)/i)
    || msg.match(/(?:GHS?|GH[¢₵])\s*([\d,]+\.?\d*)\s+(?:received|sent|paid|transferred)/i)
    || msg.match(/(?:GHS?|GH[¢₵])\s*([\d,]+\.?\d*)/i);
  if (amtMatch) amount = parseAmount(amtMatch[1]);

  // ── Detect type ───────────────────────────────────────────────────────────
  let type: ParsedMomoSMS["type"] = "UNKNOWN";
  if (/received from|you have received|cash received/i.test(msg)) type = "INCOMING";
  else if (/payment made|paid to|sent to|transferred to|cash out|withdrawal/i.test(msg)) type = "OUTGOING";

  // ── Extract sender / recipient ────────────────────────────────────────────
  let senderName = "";
  let senderNumber = "";
  let recipientName = "";

  if (type === "INCOMING") {
    // "received from Ama Boateng 0277654321"
    const fromMatch = msg.match(/(?:received from|from)\s+([A-Za-z\s]+?)\s+(0\d{9}|\+233\d{9})/i)
      || msg.match(/(?:received from|from)\s+([A-Za-z\s]{2,40}?)(?:\.|,|\n|Transaction)/i);
    if (fromMatch) {
      senderName = fromMatch[1].trim();
      senderNumber = fromMatch[2] ?? "";
    }
    // Also try extracting standalone phone number
    if (!senderNumber) {
      const numMatch = msg.match(/\b(0\d{9}|\+233\d{9})\b/);
      if (numMatch) senderNumber = numMatch[1];
    }
  } else if (type === "OUTGOING") {
    // "Payment made for GHS 14.50 to WISDOM KWAME FIANYO"
    const toMatch = msg.match(/(?:to|paid to)\s+([A-Z\s]{3,40}?)(?:\.|,|\n|Current|Balance|Reference|Transaction)/);
    if (toMatch) recipientName = toMatch[1].trim();
  }

  // ── Extract fee and tax ───────────────────────────────────────────────────
  const fee = extractGHS(msg, "Fee charged", "Fee", "Charge");
  const tax = extractGHS(msg, "TAX charged", "Tax", "VAT");

  // ── Extract reference / transaction ID ───────────────────────────────────
  let reference = extractText(msg, "Reference") || extractText(msg, "Ref");
  const txIdMatch = msg.match(/(?:Transaction ID|TxID|Trans ID)[:\s]+(\d+)/i);
  if (txIdMatch) reference = txIdMatch[1];
  if (!reference) reference = `SMS_${Date.now()}`;

  return {
    type, amount, balance,
    senderName, senderNumber, recipientName,
    fee, tax, reference, rawMessage: msg, network,
  };
}

// ── Test against your exact SMS ───────────────────────────────────────────────
// const result = parseMomoSMS(
//   "Payment made for GHS 14.50 to WISDOM KWAME FIANYO. " +
//   "Current Balance: GHS 57.13. Available Balance: GHS 57.13. " +
//   "Reference: Rich. Transaction ID: 79418503296. Fee charged: GHS 0.00 TAX charged: GHS 0.00."
// );
// → { type: "OUTGOING", amount: 14.50, balance: 57.13, recipientName: "WISDOM KWAME FIANYO", fee: 0, tax: 0, reference: "79418503296" }