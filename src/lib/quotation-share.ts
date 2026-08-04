/**
 * Shareable quotation summary (clipboard / email) — estimate only, no fake lender approval.
 */

export type QuotationShareInput = {
    quoteNumber?: string | null;
    status?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    vehicleLabel?: string | null;
    salePrice: number;
    downPayment?: number | null;
    tradeInValue?: number | null;
    financeTerm?: number | null;
    interestRate?: number | null;
    taxRate?: number | null;
    adminFee?: number | null;
    monthlyPayment?: number | null;
    notes?: string | null;
    validUntil?: string | null;
    dealerName?: string | null;
};

function money(n: number | null | undefined): string {
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

export function buildQuotationShareText(q: QuotationShareInput): string {
    const lines = [
        "Vehicle quotation — AdaptUs DMS",
        q.dealerName ? `Dealer: ${q.dealerName}` : null,
        q.quoteNumber ? `Quote #: ${q.quoteNumber}` : null,
        q.status ? `Status: ${q.status}` : null,
        q.customerName ? `Customer: ${q.customerName}` : null,
        q.vehicleLabel ? `Vehicle: ${q.vehicleLabel}` : null,
        q.validUntil ? `Valid until: ${q.validUntil}` : null,
        "",
        `Sale price:     ${money(q.salePrice)}`,
        `Tax rate:       ${q.taxRate ?? 13}%`,
        `Admin fee:      ${money(q.adminFee)}`,
        `Trade-in:       ${money(q.tradeInValue)}`,
        `Down payment:   ${money(q.downPayment)}`,
        q.interestRate != null ? `Rate:           ${q.interestRate}%` : null,
        q.financeTerm != null ? `Term:           ${q.financeTerm} months` : null,
        q.monthlyPayment != null
            ? `Est. monthly:   ${money(q.monthlyPayment)}`
            : null,
        q.notes ? `\nNotes: ${q.notes}` : null,
        "",
        "Estimate only — not a binding offer. Subject to lender approval and disclosure.",
        "Email delivery requires Resend (Settings → Integrations). Marking Sent does not send mail.",
    ];
    return lines.filter((l) => l !== null).join("\n");
}

export function quotationEmailHtml(q: QuotationShareInput): {
    subject: string;
    html: string;
    text: string;
} {
    const text = buildQuotationShareText(q);
    const subject = q.quoteNumber
        ? `Your quotation ${q.quoteNumber}`
        : "Your vehicle quotation";
    const rows: Array<[string, string]> = [
        ["Sale price", money(q.salePrice)],
        ["Tax rate", `${q.taxRate ?? 13}%`],
        ["Admin fee", money(q.adminFee)],
        ["Trade-in", money(q.tradeInValue)],
        ["Down payment", money(q.downPayment)],
    ];
    if (q.interestRate != null) rows.push(["Rate", `${q.interestRate}%`]);
    if (q.financeTerm != null) rows.push(["Term", `${q.financeTerm} months`]);
    if (q.monthlyPayment != null) {
        rows.push(["Est. monthly", money(q.monthlyPayment)]);
    }

    const tableRows = rows
        .map(
            ([k, v]) =>
                `<tr><td style="padding:6px 12px 6px 0;color:#64748b">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`
        )
        .join("");

    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5">
  ${q.dealerName ? `<p style="margin:0 0 8px;color:#2563EB;font-weight:600">${esc(q.dealerName)}</p>` : ""}
  <h1 style="font-size:18px;margin:0 0 12px">Vehicle quotation${q.quoteNumber ? ` — ${esc(q.quoteNumber)}` : ""}</h1>
  ${q.customerName ? `<p>Hi ${esc(q.customerName)},</p>` : "<p>Hello,</p>"}
  <p>Here is your quotation summary:</p>
  ${q.vehicleLabel ? `<p><strong>Vehicle:</strong> ${esc(q.vehicleLabel)}</p>` : ""}
  <table style="border-collapse:collapse;margin:12px 0">${tableRows}</table>
  ${q.notes ? `<p><strong>Notes:</strong> ${esc(q.notes)}</p>` : ""}
  ${q.validUntil ? `<p><strong>Valid until:</strong> ${esc(q.validUntil)}</p>` : ""}
  <p style="font-size:12px;color:#64748b;margin-top:24px">Estimate only — not a binding offer. Subject to lender approval and Ontario disclosure.</p>
</body></html>`;

    return { subject, html, text };
}
