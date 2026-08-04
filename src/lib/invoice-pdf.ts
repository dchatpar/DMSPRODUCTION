/**
 * Browser print-to-PDF helper for invoices (same pattern as BOS — no heavy PDF lib on CF Workers).
 */

export type InvoicePdfPayload = {
    invoiceNumber: string;
    invoiceDate?: string | null;
    dueDate?: string | null;
    status?: string | null;
    packageName?: string | null;
    notes?: string | null;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    amountPaid?: number;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    dealerName?: string | null;
    dealerAddress?: string | null;
    dealerPhone?: string | null;
    dealerEmail?: string | null;
    payments?: Array<{ date: string; amount: number; method?: string; note?: string }>;
};

function money(n: number | undefined): string {
    return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
    }).format(Number(n) || 0);
}

function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function fmtDate(d: string | null | undefined): string {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return esc(d);
    }
}

export function buildInvoicePrintHtml(data: InvoicePdfPayload): string {
    const balance = Math.max(0, (Number(data.total) || 0) - (Number(data.amountPaid) || 0));
    const dealerLines = [
        data.dealerName ? `<strong>${esc(data.dealerName)}</strong>` : "",
        data.dealerAddress ? `<p>${esc(data.dealerAddress)}</p>` : "",
        [data.dealerPhone, data.dealerEmail]
            .filter(Boolean)
            .map((x) => esc(String(x)))
            .join(" · "),
    ]
        .filter(Boolean)
        .join("\n    ");

    const customerLines = [
        data.customerName ? `<strong>${esc(data.customerName)}</strong>` : "<strong>Customer</strong>",
        data.customerAddress ? `<p>${esc(data.customerAddress)}</p>` : "",
        [data.customerPhone, data.customerEmail]
            .filter(Boolean)
            .map((x) => esc(String(x)))
            .join(" · "),
    ]
        .filter(Boolean)
        .join("\n    ");

    const paymentRows =
        data.payments && data.payments.length > 0
            ? data.payments
                  .map(
                      (p) =>
                          `<tr><td>${esc(fmtDate(p.date))}</td><td>${esc(p.method || "—")}</td><td class="amt">${money(p.amount)}</td><td>${esc(p.note || "")}</td></tr>`
                  )
                  .join("\n")
            : `<tr><td colspan="4" class="muted">No payments recorded</td></tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Invoice ${esc(data.invoiceNumber)}</title>
<style>
  body { font-family: Georgia, serif; color: #111; margin: 32px; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .meta { color: #444; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .box { border: 1px solid #ddd; padding: 12px; background: #fafafa; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
  th { font-size: 11px; text-transform: uppercase; color: #666; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; }
  .totals td { border: none; padding: 4px 8px; }
  .totals .strong { font-weight: 700; font-size: 15px; }
  .muted { color: #888; }
  .status { display: inline-block; padding: 2px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 11px; }
</style>
</head>
<body>
  <h1>Invoice ${esc(data.invoiceNumber)}</h1>
  <p class="meta">
    Date: ${fmtDate(data.invoiceDate)} · Due: ${fmtDate(data.dueDate)}
    ${data.status ? ` · <span class="status">${esc(data.status)}</span>` : ""}
  </p>

  <div class="grid">
    <div class="box">${dealerLines || "<p class='muted'>Dealership</p>"}</div>
    <div class="box">${customerLines}</div>
  </div>

  <h2>Charges</h2>
  <table>
    <tr><td>${esc(data.packageName?.trim() || "Services / package")}</td><td class="amt">${money(data.subtotal)}</td></tr>
    <tr><td>Tax (${Number(data.taxRate) || 0}%)</td><td class="amt">${money(data.taxAmount)}</td></tr>
  </table>
  <table class="totals">
    <tr><td>Total</td><td class="amt strong">${money(data.total)}</td></tr>
    <tr><td>Amount paid</td><td class="amt">${money(data.amountPaid)}</td></tr>
    <tr><td>Balance due</td><td class="amt strong">${money(balance)}</td></tr>
  </table>

  <h2>Payment ledger</h2>
  <table>
    <thead><tr><th>Date</th><th>Method</th><th class="amt">Amount</th><th>Note</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>

  ${data.notes?.trim() ? `<h2>Notes</h2><p>${esc(data.notes.trim())}</p>` : ""}

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}

export function openInvoicePrintWindow(data: InvoicePdfPayload): void {
    const html = buildInvoicePrintHtml(data);
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
        throw new Error("Pop-up blocked — allow pop-ups to generate the invoice PDF.");
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.opener = null;
}

export function invoiceEmailHtml(data: InvoicePdfPayload): { subject: string; html: string; text: string } {
    const balance = Math.max(0, (Number(data.total) || 0) - (Number(data.amountPaid) || 0));
    const subject = `Invoice ${data.invoiceNumber} — ${money(data.total)}`;
    const text = [
        `Invoice ${data.invoiceNumber}`,
        `Customer: ${data.customerName || "—"}`,
        `Total: ${money(data.total)}`,
        `Balance due: ${money(balance)}`,
        `Due: ${data.dueDate || "—"}`,
    ].join("\n");
    const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h1 style="font-size:20px;margin:0 0 8px">Invoice ${esc(data.invoiceNumber)}</h1>
      <p style="margin:0 0 16px;color:#555">From ${esc(data.dealerName || "your dealership")}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:6px 0;color:#555">Subtotal</td><td style="text-align:right">${money(data.subtotal)}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Tax (${Number(data.taxRate) || 0}%)</td><td style="text-align:right">${money(data.taxAmount)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700">Total</td><td style="text-align:right;font-weight:700">${money(data.total)}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Balance due</td><td style="text-align:right">${money(balance)}</td></tr>
      </table>
      <p style="margin:0;color:#888;font-size:13px">Due date: ${esc(fmtDate(data.dueDate))}. Contact the dealership with questions.</p>
    </div>`;
    return { subject, html, text };
}
