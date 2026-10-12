export type PaperSize = "thermal80mm" | "letter" | "a4"

export function getLinePricing(line: any) {
  const qty = line.quantity || 0
  const retailUnitPrice = line.unitPrice || line.item?.sellingPrice || 0

  let isWholesale = false
  let displayQty: string | number = qty
  let tierLabel = ""            // e.g. "Half Box" — shown under the item name, not in the QTY column
  let wholesalePerPack = 0
  let retailPerPack = 0
  let displayAmt = qty * retailUnitPrice

  try {
    if (line.notes) {
      const meta = JSON.parse(line.notes)
      if (meta.tierId) {
        isWholesale = true
        displayQty = meta.packQty ?? qty   // just the number — stays short, never wraps
        tierLabel = meta.tierName || ""
        wholesalePerPack = meta.wholesalePricePerPack || 0
        // Retail equivalent for the same pack, so the customer can see the saving
        const unitsPerPack = meta.unitsPerPack || 0
        const retailFallback = line.item?.sellingPrice || 0
        retailPerPack = unitsPerPack ? unitsPerPack * retailFallback : 0
        displayAmt = (meta.packQty || 0) * wholesalePerPack
      }
    }
  } catch {
    /* plain notes, not JSON — treat as normal retail line */
  }

  return {
    displayQty,
    displayDesc: line.item?.name || "Unknown Item",
    tierLabel,
    isWholesale,
    retailUnitPrice,
    retailPerPack,
    wholesalePerPack,
    displayAmt,
  }
}

// ─── Shared helper: work out what a line item should display ────────────────
// Handles three cases per your instructions:
//   1. Plain retail line  -> just the retail unit price
//   2. Wholesale/pack line -> retail per-pack price struck through + wholesale price
//   3. Mixed order        -> each line decides for itself, independently


// ─── Build self-contained receipt HTML ───────────────────────────────────────
export function buildReceiptHTML(order: any, paperSize: PaperSize): string {
  const subtotal  = order.subtotal     || 0
  const taxAmount = order.taxAmount    || 0
  const discount  = order.discount     || 0
  const shipping  = order.shippingCost || 0
  const total     = subtotal + taxAmount + shipping - discount

  const createdAt   = new Date(order.createdAt)
  const dateStr     = createdAt.toLocaleDateString("en-GH", { month: "2-digit", day: "2-digit", year: "numeric" })
  const timeStr     = createdAt.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()
  const cashierName = order.createdBy?.name?.split(" ")[0]?.toUpperCase() || "CASHIER"

  // ── Items rows HTML ──────────────────────────────────────────────────────
  // Back to the QTY | DESC | PRICE | AMT column layout — but fixed this time:
  // QTY always stays a plain short number (never the tier name, which is what
  // caused "Half"/"Box" to wrap onto broken lines before). The tier name lives
  // as a small subtitle under the item name instead, and the PRICE column
  // shows the retail price struck through above the wholesale price for
  // wholesale lines.
  const itemRows = (order.lines ?? []).map((line: any) => {
    const p = getLinePricing(line)

    const priceCell = p.isWholesale
      ? (p.retailPerPack > 0
          ? `<div style="font-size:9px;line-height:1.15;text-decoration:line-through;opacity:0.55;">${p.retailPerPack.toFixed(2)}</div><div>${p.wholesalePerPack.toFixed(2)}</div>`
          : `${p.wholesalePerPack.toFixed(2)}`)
      : `${p.retailUnitPrice.toFixed(2)}`

    const descCell = p.isWholesale
      ? `${p.displayDesc}<div style="font-size:9px;opacity:0.65;font-weight:500;margin-top:1px;"><span style="font-weight:800;">WHOLESALE</span> · ${p.tierLabel || "pack"}</div>`
      : p.displayDesc

    return `
      <tr>
        <td style="padding:3px 0;vertical-align:top;width:24px;white-space:nowrap;">${p.displayQty}</td>
        <td style="padding:3px 3px;vertical-align:top;word-break:break-word;">${descCell}</td>
        <td style="padding:3px 3px;vertical-align:top;text-align:right;white-space:nowrap;width:58px;">${priceCell}</td>
        <td style="padding:3px 0 3px 3px;vertical-align:top;text-align:right;white-space:nowrap;width:62px;">${p.displayAmt.toFixed(2)}</td>
      </tr>`
  }).join("")

  // ── Totals rows ──────────────────────────────────────────────────────────
  let totalRows = `
    <tr>
      <td colspan="3" style="padding:3px 0;">SUBTOTAL</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;">GHS${subtotal.toFixed(2)}</td>
    </tr>`

  if (taxAmount > 0) totalRows += `
    <tr>
      <td colspan="3" style="padding:3px 0;">TAX</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;">GHS${taxAmount.toFixed(2)}</td>
    </tr>`

  if (discount > 0) totalRows += `
    <tr>
      <td colspan="3" style="padding:3px 0;color:#c00;">DISCOUNT</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;color:#c00;">-GHS${discount.toFixed(2)}</td>
    </tr>`

  if (shipping > 0) totalRows += `
    <tr>
      <td colspan="3" style="padding:3px 0;">SHIPPING</td>
      <td style="text-align:right;padding:3px 0 3px 3px;white-space:nowrap;">GHS${shipping.toFixed(2)}</td>
    </tr>`

  totalRows += `
    <tr style="border-top:2px solid #000;font-size:${paperSize === "thermal80mm" ? "14px" : "15px"};">
      <td colspan="3" style="padding:6px 0 3px;">TOTAL</td>
      <td style="text-align:right;padding:6px 0 3px 3px;white-space:nowrap;">GHS${total.toFixed(2)}</td>
    </tr>`

  const customerSection = order.customer ? `
    <div style="border-top:1px dashed #000;margin:8px 0;padding-top:8px;font-size:13px;">
      <strong>CUSTOMER</strong><br>
      ${order.customer.name}
      ${order.customer.phone ? `<br>Tel: ${order.customer.phone}` : ""}
    </div>` : ""

  // Font stack: 'Share Tech Mono' with 'Courier New' fallback. Ported over from
  // the older receipt template — Courier New renders every ASCII character
  // reliably on thermal printers, avoiding bleed/garbling on #, +, 0, etc.
  const ocrFontStack = `'Share Tech Mono', 'Courier New', Courier, monospace`

  const boldPrintBase = `
    * {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body, table, td, div, span, p {
      font-weight: 700;
      color: #000000 !important;
      text-shadow: 0.3px 0 0 #000, -0.3px 0 0 #000 !important;
      letter-spacing: 0.03em;
    }
    strong, b {
      font-weight: 800;
      text-shadow: 0.4px 0 0 #000, -0.4px 0 0 #000, 0 0.3px 0 #000 !important;
    }
    table { border-collapse: collapse; width: 100%; }
    td { vertical-align: top; }
    @media print { .no-print { display: none !important; } }`

  const thermalCSS = `
    @page { size: 80mm auto; margin: 0; }
    html, body {
      width: 70mm; margin: 0 auto; padding: 3mm 3mm 5mm 3mm;
      font-family: ${ocrFontStack}; font-size: 13px; line-height: 1.4; background: white;
    }`

  const letterCSS = `
    @page { size: letter; margin: 0.5in; }
    html, body { width: 100%; max-width: 3.5in; margin: 0 auto; padding: 0; font-family: ${ocrFontStack}; font-size: 14px; background: white; }`

  const a4CSS = `
    @page { size: A4; margin: 15mm; }
    html, body { width: 100%; max-width: 90mm; margin: 0 auto; padding: 0; font-family: ${ocrFontStack}; font-size: 14px; background: white; }`

  const pageCSS = paperSize === "a4" ? a4CSS : paperSize === "letter" ? letterCSS : thermalCSS

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${order.orderNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <style>${boldPrintBase} ${pageCSS}</style>
</head>
<body>
    <div style="text-align:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1.5px dashed #000;">
        <div style="font-weight:800;font-size:15px;letter-spacing:1px;">HABIFAZZY ENTERPRISE</div>
        <div style="font-size:13px;margin-top:2px;">Aprade-mesewam junction</div>
        <div style="font-size:13px;">Digital Address: AA-T1257-6693</div>
        <div style="font-size:13px;">Aprade, Ghana</div>
        <div style="font-size:13px;margin-top:2px;">Tel: 0246668686/ 0593041947</div>
  </div>

  <div style="text-align:center;margin-bottom:8px;font-size:13px;">
    ${dateStr}&nbsp;&nbsp;${timeStr}<br>
    <span style="font-size:13px;font-weight:800;">RECEIPT NO. ${order.orderNumber}</span>
  </div>

  <table style="margin-bottom:6px;font-size:13px;table-layout:fixed;">
    <tr>
      <td>TABLE 1</td>
      <td style="text-align:right;">STAFF ${cashierName}</td>
    </tr>
    <tr>
      <td>${order.paymentMethod || "CASH"}</td>
      <td style="text-align:right;">REF: 19883</td>
    </tr>
  </table>

  <!-- Column headers -->
  <table style="border-top:2.5px solid #000;border-bottom:1.5px solid #000;margin:6px 0;font-size:13px;table-layout:fixed;">
    <tr>
      <td style="padding:4px 0;width:24px;">QTY</td>
      <td style="padding:4px 3px;">DESC</td>
      <td style="padding:4px 3px;text-align:right;width:58px;">PRICE</td>
      <td style="padding:4px 0 4px 3px;text-align:right;width:62px;">AMT</td>
    </tr>
  </table>

  <!-- Items -->
  <table style="margin-bottom:6px;font-size:13px;table-layout:fixed;">
    ${itemRows}
  </table>

  <!-- Totals -->
  <div style="border-top:1.5px dashed #000;margin:6px 0;"></div>
  <table style="font-size:13px;table-layout:fixed;">
    ${totalRows}
  </table>

  ${customerSection}

  <div style="margin-top:10px;padding-top:8px;border-top:1.5px dashed #000;text-align:center;font-size:13px;">
    <strong>Thank you for your patronage!</strong><br>
    <span style="font-size:10px;">${order.orderNumber} - ${dateStr}</span>
    <div style="margin-top:6px;width:40px;height:40px;background:#f0f0f0;display:inline-flex;
                align-items:center;justify-content:center;font-size:7px;">
      QR CODE
    </div>
  </div>
</body>
</html>`
}

export function printHTML(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;"

    const cleanup = () => setTimeout(() => iframe.remove(), 1000)

    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) { cleanup(); return reject(new Error("No print window")) }
      setTimeout(() => {
        try {
          win.focus()
          win.print()
          resolve()
        } catch (e) {
          reject(e)
        } finally {
          cleanup()
        }
      }, 500)
    }

    document.body.appendChild(iframe)
    iframe.srcdoc = html
  })
}