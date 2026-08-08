/**
 * Quotation document engine — HTML print + pdf-lib download.
 * Mirrors invoice/BOS branding; estimate-only disclaimer (not a binding offer).
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type QuotationPdfDealer = {
    name?: string | null;
    business_name?: string | null;
    business_address?: string | null;
    business_phone?: string | null;
    business_email?: string | null;
    dealer_license?: string | null;
    hst_number?: string | null;
};

export type QuotationPdfPayload = {
    quoteNumber?: string | null;
    status?: string | null;
    createdAt?: string | null;
    validUntil?: string | null;
    notes?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    vehicleLabel?: string | null;
    vin?: string | null;
    stockNumber?: string | null;
    salePrice: number;
    downPayment?: number | null;
    tradeInValue?: number | null;
    taxRate?: number | null;
    taxAmount?: number | null;
    adminFee?: number | null;
    financedAmount?: number | null;
    financeTerm?: number | null;
    interestRate?: number | null;
    monthlyPayment?: number | null;
    financeCompany?: string | null;
    dealer?: QuotationPdfDealer | null;
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

function dealerDisplayName(dealer: QuotationPdfDealer | null | undefined): string {
    return (
        dealer?.business_name?.trim() ||
        dealer?.name?.trim() ||
        "Dealership"
    );
}

function dealerHtmlBlock(dealer: QuotationPdfDealer | null | undefined): string {
    if (!dealer) {
        return `<p class="muted">Dealership</p>`;
    }
    const lines: string[] = [
        `<strong>${esc(dealerDisplayName(dealer))}</strong>`,
    ];
    if (dealer.business_address?.trim()) {
        lines.push(`<p>${esc(dealer.business_address.trim())}</p>`);
    }
    const contact = [dealer.business_phone, dealer.business_email]
        .filter((x) => Boolean(x && String(x).trim()))
        .map((x) => esc(String(x).trim()))
        .join(" · ");
    if (contact) lines.push(`<p>${contact}</p>`);
    const taxBits: string[] = [];
    if (dealer.dealer_license?.trim()) {
        taxBits.push(`Dealer licence: ${esc(dealer.dealer_license.trim())}`);
    }
    if (dealer.hst_number?.trim()) {
        taxBits.push(`HST #: ${esc(dealer.hst_number.trim())}`);
    }
    if (taxBits.length) lines.push(`<p>${taxBits.join(" · ")}</p>`);
    return lines.join("\n    ");
}

function resolveTaxAmount(data: QuotationPdfPayload): number {
    if (data.taxAmount != null && Number.isFinite(Number(data.taxAmount))) {
        return Number(data.taxAmount);
    }
    const rate = Number(data.taxRate) || 0;
    return (Number(data.salePrice) || 0) * (rate / 100);
}

function resolveFinanced(data: QuotationPdfPayload): number {
    if (data.financedAmount != null && Number.isFinite(Number(data.financedAmount))) {
        return Number(data.financedAmount);
    }
    const tax = resolveTaxAmount(data);
    return Math.max(
        0,
        (Number(data.salePrice) || 0) +
            tax +
            (Number(data.adminFee) || 0) -
            (Number(data.tradeInValue) || 0) -
            (Number(data.downPayment) || 0)
    );
}

/** Fetch dealer branding from /api/me (same pattern as BOS). */
export async function fetchQuotationDealerBranding(): Promise<QuotationPdfDealer | null> {
    try {
        const meRes = await fetch("/api/me", { credentials: "include" });
        if (!meRes.ok) return null;
        const meJson = (await meRes.json()) as {
            data?: { dealership?: Record<string, unknown> };
            dealership?: Record<string, unknown>;
        };
        const d = meJson?.data?.dealership || meJson?.dealership;
        if (!d) return null;
        const settings =
            d.settings && typeof d.settings === "object"
                ? (d.settings as Record<string, unknown>)
                : {};
        return {
            name: typeof d.name === "string" ? d.name : null,
            business_name:
                typeof d.business_name === "string" ? d.business_name : null,
            business_address:
                typeof d.business_address === "string" ? d.business_address : null,
            business_phone:
                typeof d.business_phone === "string" ? d.business_phone : null,
            business_email:
                typeof d.business_email === "string" ? d.business_email : null,
            dealer_license:
                (typeof settings.dealer_license === "string"
                    ? settings.dealer_license
                    : null) ||
                (typeof settings.license_number === "string"
                    ? settings.license_number
                    : null) ||
                (typeof d.dealer_license === "string" ? d.dealer_license : null),
            hst_number:
                (typeof settings.hst_number === "string"
                    ? settings.hst_number
                    : null) ||
                (typeof d.hst_number === "string" ? d.hst_number : null),
        };
    } catch {
        return null;
    }
}

export function buildQuotationPrintHtml(data: QuotationPdfPayload): string {
    const taxAmount = resolveTaxAmount(data);
    const financed = resolveFinanced(data);
    const quoteLabel = data.quoteNumber?.trim() || "Quotation";

    const customerLines = [
        data.customerName
            ? `<strong>${esc(data.customerName)}</strong>`
            : "<strong>Customer</strong>",
        [data.customerPhone, data.customerEmail]
            .filter(Boolean)
            .map((x) => esc(String(x)))
            .join(" · "),
    ]
        .filter(Boolean)
        .join("\n    ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Quotation ${esc(quoteLabel)}</title>
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
  .disclaimer { margin-top: 28px; padding: 10px 12px; border: 1px solid #e6c200; background: #fffbeb; font-size: 11px; color: #664d03; }
  @media print {
    body { margin: 12mm; }
    .disclaimer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <h1>Quotation ${esc(quoteLabel)}</h1>
  <p class="meta">
    Date: ${fmtDate(data.createdAt)} · Valid until: ${fmtDate(data.validUntil)}
    ${data.status ? ` · <span class="status">${esc(data.status)}</span>` : ""}
  </p>

  <div class="grid">
    <div class="box">${dealerHtmlBlock(data.dealer)}</div>
    <div class="box">${customerLines}</div>
  </div>

  <h2>Vehicle</h2>
  <table>
    <tr><td>${esc(data.vehicleLabel || "—")}</td><td class="amt">VIN ${esc(data.vin || "—")}</td></tr>
    ${data.stockNumber ? `<tr><td>Stock</td><td class="amt">${esc(data.stockNumber)}</td></tr>` : ""}
  </table>

  <h2>Pricing</h2>
  <table>
    <tr><td>Sale price</td><td class="amt">${money(data.salePrice)}</td></tr>
    <tr><td>Tax (${Number(data.taxRate) || 0}%)</td><td class="amt">${money(taxAmount)}</td></tr>
    <tr><td>Admin fee</td><td class="amt">${money(data.adminFee)}</td></tr>
    <tr><td>Trade-in</td><td class="amt">${money(data.tradeInValue)}</td></tr>
    <tr><td>Down payment</td><td class="amt">${money(data.downPayment)}</td></tr>
  </table>
  <table class="totals">
    <tr><td>Amount financed</td><td class="amt strong">${money(financed)}</td></tr>
    ${
        data.interestRate != null
            ? `<tr><td>Rate</td><td class="amt">${Number(data.interestRate)}%</td></tr>`
            : ""
    }
    ${
        data.financeTerm != null
            ? `<tr><td>Term</td><td class="amt">${Number(data.financeTerm)} months</td></tr>`
            : ""
    }
    ${
        data.financeCompany
            ? `<tr><td>Finance company</td><td class="amt">${esc(data.financeCompany)}</td></tr>`
            : ""
    }
    ${
        data.monthlyPayment != null
            ? `<tr><td>Est. monthly payment</td><td class="amt strong">${money(data.monthlyPayment)}</td></tr>`
            : ""
    }
  </table>

  ${data.notes?.trim() ? `<h2>Notes</h2><p>${esc(data.notes.trim())}</p>` : ""}

  <div class="disclaimer">
    Estimate only — not a binding offer. Subject to lender approval, credit review, and applicable disclosure.
    Prices and payments may change. This is not an Ontario MVDA/UCDA certified form.
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}

export function openQuotationPrintWindow(data: QuotationPdfPayload): void {
    const html = buildQuotationPrintHtml(data);
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
        throw new Error("Pop-up blocked — allow pop-ups to print the quotation.");
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.opener = null;
}

export async function buildQuotationPdfBytes(
    data: QuotationPdfPayload
): Promise<Uint8Array> {
    const taxAmount = resolveTaxAmount(data);
    const financed = resolveFinanced(data);
    const quoteLabel = data.quoteNumber?.trim() || "Quotation";

    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]); // US Letter
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0.07, 0.07, 0.07);
    const muted = rgb(0.4, 0.4, 0.4);
    const line = rgb(0.82, 0.82, 0.82);

    const margin = 48;
    const pageWidth = 612;
    const contentWidth = pageWidth - margin * 2;
    let y = 744;

    const drawText = (
        text: string,
        x: number,
        yy: number,
        size: number,
        f = font,
        color = black
    ) => {
        page.drawText(text, { x, y: yy, size, font: f, color });
    };

    const drawRight = (
        text: string,
        rightX: number,
        yy: number,
        size: number,
        f = font,
        color = black
    ) => {
        const w = f.widthOfTextAtSize(text, size);
        page.drawText(text, { x: rightX - w, y: yy, size, font: f, color });
    };

    const ensureSpace = (need: number) => {
        if (y - need < 48) {
            // Single-page quotes are expected; clip gracefully rather than multi-page complexity.
            y = 48;
        }
    };

    drawText(`Quotation ${quoteLabel}`, margin, y, 18, bold);
    y -= 18;
    const metaParts = [
        `Date: ${fmtDate(data.createdAt)}`,
        `Valid until: ${fmtDate(data.validUntil)}`,
        data.status ? `Status: ${data.status}` : null,
    ].filter(Boolean);
    drawText(metaParts.join("  ·  "), margin, y, 9, font, muted);
    y -= 20;

    page.drawLine({
        start: { x: margin, y },
        end: { x: margin + contentWidth, y },
        thickness: 1,
        color: line,
    });
    y -= 16;

    // Dealer / customer columns
    const colMid = margin + contentWidth / 2 + 8;
    const dealerName = dealerDisplayName(data.dealer);
    drawText("Dealership", margin, y, 9, bold, muted);
    drawText("Customer", colMid, y, 9, bold, muted);
    y -= 14;
    drawText(dealerName, margin, y, 11, bold);
    drawText(data.customerName?.trim() || "—", colMid, y, 11, bold);
    y -= 13;

    const leftExtras: string[] = [];
    if (data.dealer?.business_address?.trim()) {
        leftExtras.push(data.dealer.business_address.trim());
    }
    const dealerContact = [data.dealer?.business_phone, data.dealer?.business_email]
        .filter((x) => Boolean(x && String(x).trim()))
        .join(" · ");
    if (dealerContact) leftExtras.push(dealerContact);
    const taxBits: string[] = [];
    if (data.dealer?.dealer_license?.trim()) {
        taxBits.push(`Licence: ${data.dealer.dealer_license.trim()}`);
    }
    if (data.dealer?.hst_number?.trim()) {
        taxBits.push(`HST #: ${data.dealer.hst_number.trim()}`);
    }
    if (taxBits.length) leftExtras.push(taxBits.join(" · "));

    const rightExtras: string[] = [];
    if (data.customerPhone) rightExtras.push(String(data.customerPhone));
    if (data.customerEmail) rightExtras.push(String(data.customerEmail));

    const maxExtra = Math.max(leftExtras.length, rightExtras.length, 1);
    for (let i = 0; i < maxExtra; i++) {
        if (leftExtras[i]) drawText(leftExtras[i], margin, y, 9, font, muted);
        if (rightExtras[i]) drawText(rightExtras[i], colMid, y, 9, font, muted);
        y -= 12;
    }
    y -= 8;

    drawText("Vehicle", margin, y, 11, bold);
    y -= 14;
    drawText(data.vehicleLabel?.trim() || "—", margin, y, 10);
    drawRight(`VIN ${data.vin?.trim() || "—"}`, margin + contentWidth, y, 9, font, muted);
    y -= 13;
    if (data.stockNumber?.trim()) {
        drawText(`Stock ${data.stockNumber.trim()}`, margin, y, 9, font, muted);
        y -= 13;
    }
    y -= 6;

    drawText("Pricing", margin, y, 11, bold);
    y -= 4;
    page.drawLine({
        start: { x: margin, y },
        end: { x: margin + contentWidth, y },
        thickness: 0.5,
        color: line,
    });
    y -= 14;

    const rows: Array<[string, string, boolean?]> = [
        ["Sale price", money(data.salePrice)],
        [`Tax (${Number(data.taxRate) || 0}%)`, money(taxAmount)],
        ["Admin fee", money(data.adminFee)],
        ["Trade-in", money(data.tradeInValue)],
        ["Down payment", money(data.downPayment)],
        ["Amount financed", money(financed), true],
    ];
    if (data.interestRate != null) {
        rows.push(["Rate", `${Number(data.interestRate)}%`]);
    }
    if (data.financeTerm != null) {
        rows.push(["Term", `${Number(data.financeTerm)} months`]);
    }
    if (data.financeCompany?.trim()) {
        rows.push(["Finance company", data.financeCompany.trim()]);
    }
    if (data.monthlyPayment != null) {
        rows.push(["Est. monthly payment", money(data.monthlyPayment), true]);
    }

    for (const [label, value, strong] of rows) {
        ensureSpace(16);
        drawText(label, margin, y, strong ? 10 : 9, strong ? bold : font);
        drawRight(
            value,
            margin + contentWidth,
            y,
            strong ? 10 : 9,
            strong ? bold : font
        );
        y -= 14;
    }

    if (data.notes?.trim()) {
        y -= 8;
        ensureSpace(40);
        drawText("Notes", margin, y, 11, bold);
        y -= 14;
        const note = data.notes.trim();
        const maxChars = 90;
        for (let i = 0; i < note.length; i += maxChars) {
            ensureSpace(14);
            drawText(note.slice(i, i + maxChars), margin, y, 9, font, muted);
            y -= 12;
        }
    }

    y -= 16;
    ensureSpace(48);
    page.drawRectangle({
        x: margin,
        y: y - 36,
        width: contentWidth,
        height: 44,
        borderColor: rgb(0.9, 0.76, 0.2),
        borderWidth: 1,
        color: rgb(1, 0.98, 0.9),
    });
    const disclaimer =
        "Estimate only — not a binding offer. Subject to lender approval and disclosure. Not an MVDA/UCDA certified form.";
    drawText(disclaimer, margin + 8, y - 12, 8, font, rgb(0.4, 0.3, 0.05));
    drawText(
        "Generated by AdaptUs DMS",
        margin + 8,
        y - 26,
        8,
        font,
        muted
    );

    return doc.save();
}

export async function downloadQuotationPdf(
    data: QuotationPdfPayload,
    filename?: string
): Promise<void> {
    const bytes = await buildQuotationPdfBytes(data);
    // Copy into a fresh ArrayBuffer-backed view (satisfies BlobPart under strict DOM typings).
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName =
        filename ||
        `Quotation-${(data.quoteNumber || "draft").replace(/[^\w.-]+/g, "_")}.pdf`;
    a.href = url;
    a.download = safeName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
