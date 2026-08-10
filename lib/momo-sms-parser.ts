// lib/momo-sms-parser.ts
// ─────────────────────────────────────────────────────────────────────────────
// Parses raw MoMo SMS text from MTN, Vodafone, AirtelTigo Ghana.
// Strategy: READ the "Current Balance" or "Available Balance" field directly.
// This is ALWAYS the authoritative balance — never add/subtract manually.
//
// NOTE: senderName parsed here is the ONLY reliable source of a customer's
// registered MoMo name in this whole system — it's what powers
// actions/momo.ts -> lookupCustomerName(). Do not remove or weaken this
// extraction without breaking that feature.
// ─────────────────────────────────────────────────────────────────────────────

export type ParsedMomoSMS = {
  type: "INCOMING" | "OUTGOING" | "UNKNOWN";
  amount: number;
  balance: number;
  senderName: string;
  senderNumber: string;
  recipientName: string;
  fee: number;
  tax: number;
  reference: string;
  rawMessage: string;
  network: "MTN" | "Vodafone" | "AirtelTigo" | "Unknown";
};

function parseAmount(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function extractGHS(text: string, ...labels: string[]): number {
  for (const label of labels) {
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

  let network: ParsedMomoSMS["network"] = "Unknown";
  if (/MTN|momo/i.test(msg)) network = "MTN";
  else if (/vodafone|vcash/i.test(msg)) network = "Vodafone";
  else if (/airteltigo|airtel|tigo/i.test(msg)) network = "AirtelTigo";

  const balance = extractGHS(msg, "Current Balance", "Available Balance", "Balance", "Bal");

  let amount = 0;
  const amtMatch = msg.match(/(?:for|of)\s+(?:GHS?|GH[¢₵])\s*([\d,]+\.?\d*)/i)
    || msg.match(/(?:GHS?|GH[¢₵])\s*([\d,]+\.?\d*)\s+(?:received|sent|paid|transferred)/i)
    || msg.match(/(?:GHS?|GH[¢₵])\s*([\d,]+\.?\d*)/i);
  if (amtMatch) amount = parseAmount(amtMatch[1]);

  let type: ParsedMomoSMS["type"] = "UNKNOWN";
  if (/received from|you have received|cash received/i.test(msg)) type = "INCOMING";
  else if (/payment made|paid to|sent to|transferred to|cash out|withdrawal/i.test(msg)) type = "OUTGOING";

  let senderName = "";
  let senderNumber = "";
  let recipientName = "";

  if (type === "INCOMING") {
    const fromMatch = msg.match(/(?:received from|from)\s+([A-Za-z\s]+?)\s+(0\d{9}|\+233\d{9})/i)
      || msg.match(/(?:received from|from)\s+([A-Za-z\s]{2,40}?)(?:\.|,|\n|Transaction)/i);
    if (fromMatch) {
      senderName = fromMatch[1].trim();
      senderNumber = fromMatch[2] ?? "";
    }
    if (!senderNumber) {
      const numMatch = msg.match(/\b(0\d{9}|\+233\d{9})\b/);
      if (numMatch) senderNumber = numMatch[1];
    }
  } else if (type === "OUTGOING") {
    const toMatch = msg.match(/(?:to|paid to)\s+([A-Z\s]{3,40}?)(?:\.|,|\n|Current|Balance|Reference|Transaction)/);
    if (toMatch) recipientName = toMatch[1].trim();
  }

  const fee = extractGHS(msg, "Fee charged", "Fee", "Charge");
  const tax = extractGHS(msg, "TAX charged", "Tax", "VAT");

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
