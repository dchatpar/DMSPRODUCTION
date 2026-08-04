// POST /api/invoices/[id]/send — email invoice via Resend
import { NextRequest, NextResponse } from "next/server";
import {
    assertOwnershipOrDeny,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { invoiceEmailHtml, type InvoicePdfPayload } from "@/src/lib/invoice-pdf";
import { isResendConfigured, sendEmail } from "@/src/lib/resend";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }

        if (!isResendConfigured()) {
            return NextResponse.json(
                {
                    error:
                        "Resend is not configured. Set RESEND_API_KEY and EMAIL_FROM (Settings → Integrations).",
                },
                { status: 503 }
            );
        }

        const { id } = await params;
        const body = (await req.json().catch(() => ({}))) as {
            to?: string;
        };

        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: existing, error: existingError } = await supabase
            .from("invoices")
            .select(
                `
                id, dealership_id, invoice_number, invoice_date, due_date, status,
                package_name, notes, payment_amount, tax_rate, tax_amount, total,
                amount_paid,
                customer:customers(id, name, email, phone, address, city, province)
            `
            )
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        const customer = Array.isArray(existing.customer)
            ? existing.customer[0]
            : existing.customer;
        const to =
            (typeof body.to === "string" && body.to.trim()) ||
            (customer?.email as string | undefined)?.trim() ||
            "";

        if (!to || !to.includes("@")) {
            return NextResponse.json(
                {
                    error:
                        "Customer has no email. Pass { to: \"email@example.com\" } or set customer email.",
                },
                { status: 400 }
            );
        }

        let dealerName: string | null = null;
        let dealerAddress: string | null = null;
        let dealerPhone: string | null = null;
        let dealerEmail: string | null = null;
        if (existing.dealership_id) {
            const { data: dealer } = await supabase
                .from("dealerships")
                .select(
                    "name, business_name, business_address, business_phone, business_email"
                )
                .eq("id", existing.dealership_id)
                .maybeSingle();
            if (dealer) {
                dealerName =
                    (dealer.business_name as string) ||
                    (dealer.name as string) ||
                    null;
                dealerAddress = (dealer.business_address as string) || null;
                dealerPhone = (dealer.business_phone as string) || null;
                dealerEmail = (dealer.business_email as string) || null;
            }
        }

        const addrParts = [
            customer?.address,
            customer?.city,
            customer?.province,
        ].filter(Boolean);

        const payload: InvoicePdfPayload = {
            invoiceNumber: existing.invoice_number,
            invoiceDate: existing.invoice_date,
            dueDate: existing.due_date,
            status: existing.status,
            packageName: existing.package_name,
            notes: existing.notes,
            subtotal: Number(existing.payment_amount) || 0,
            taxRate: Number(existing.tax_rate) || 0,
            taxAmount: Number(existing.tax_amount) || 0,
            total: Number(existing.total) || 0,
            amountPaid: Number(existing.amount_paid) || 0,
            customerName: customer?.name || null,
            customerEmail: customer?.email || null,
            customerPhone: customer?.phone || null,
            customerAddress: addrParts.join(", ") || null,
            dealerName,
            dealerAddress,
            dealerPhone,
            dealerEmail,
        };

        const { subject, html, text } = invoiceEmailHtml(payload);
        const sent = await sendEmail({ to, subject, html, text });

        if (!sent.ok) {
            return NextResponse.json(
                { error: sent.error, missingConfig: sent.missingConfig },
                { status: sent.missingConfig ? 503 : 502 }
            );
        }

        return NextResponse.json({
            success: true,
            resend_id: sent.id,
            to,
        });
    } catch (error: unknown) {
        console.error("Error sending invoice:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 }
        );
    }
}
