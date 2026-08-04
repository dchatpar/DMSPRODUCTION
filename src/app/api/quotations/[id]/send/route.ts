// POST /api/quotations/[id]/send — email quotation via Resend (honest 503 if not configured)
import { NextRequest, NextResponse } from "next/server";
import {
    assertOwnershipOrDeny,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { quotationEmailHtml } from "@/src/lib/quotation-share";
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
                        "Resend is not configured. Set RESEND_API_KEY and EMAIL_FROM (Settings → Integrations). Status was not changed — use Mark as Sent only when you delivered the quote yourself.",
                    missingConfig: true,
                },
                { status: 503 }
            );
        }

        const { id } = await params;
        const body = (await req.json().catch(() => ({}))) as {
            to?: string;
            mark_sent?: boolean;
        };

        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: existing, error: existingError } = await supabase
            .from("quotations")
            .select(
                `
                id, dealership_id, salesperson_id, quote_number, status,
                sale_price, down_payment, trade_in_value, finance_term,
                interest_rate, tax_rate, admin_fee, monthly_payment, notes, valid_until,
                vehicle:vehicles(id, year, make, model),
                customer:customers(id, name, email, phone)
            `
            )
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Quotation not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        if (existing.status === "Converted" || existing.status === "Cancelled") {
            return NextResponse.json(
                { error: `Cannot email a ${existing.status} quotation` },
                { status: 400 }
            );
        }

        const customer = Array.isArray(existing.customer)
            ? existing.customer[0]
            : existing.customer;
        const vehicle = Array.isArray(existing.vehicle)
            ? existing.vehicle[0]
            : existing.vehicle;

        const to =
            (typeof body.to === "string" && body.to.trim()) ||
            (customer?.email as string | undefined)?.trim() ||
            "";

        if (!to || !to.includes("@")) {
            return NextResponse.json(
                {
                    error:
                        'Customer has no email. Pass { to: "email@example.com" } or set customer email.',
                },
                { status: 400 }
            );
        }

        let dealerName: string | null = null;
        if (existing.dealership_id) {
            const { data: dealer } = await supabase
                .from("dealerships")
                .select("name, business_name")
                .eq("id", existing.dealership_id)
                .maybeSingle();
            if (dealer) {
                dealerName =
                    (dealer.business_name as string) ||
                    (dealer.name as string) ||
                    null;
            }
        }

        const vehicleLabel = vehicle
            ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
            : null;

        const { subject, html, text } = quotationEmailHtml({
            quoteNumber: existing.quote_number,
            status: existing.status,
            customerName: (customer?.name as string) || null,
            customerEmail: (customer?.email as string) || null,
            vehicleLabel,
            salePrice: Number(existing.sale_price) || 0,
            downPayment: Number(existing.down_payment) || 0,
            tradeInValue: Number(existing.trade_in_value) || 0,
            financeTerm: existing.finance_term,
            interestRate: existing.interest_rate,
            taxRate: existing.tax_rate,
            adminFee: Number(existing.admin_fee) || 0,
            monthlyPayment: existing.monthly_payment,
            notes: existing.notes,
            validUntil: existing.valid_until,
            dealerName,
        });

        const sent = await sendEmail({ to, subject, html, text });

        if (!sent.ok) {
            return NextResponse.json(
                { error: sent.error, missingConfig: sent.missingConfig },
                { status: sent.missingConfig ? 503 : 502 }
            );
        }

        const shouldMarkSent = body.mark_sent !== false;
        let quotation = existing;
        if (shouldMarkSent && existing.status === "Draft") {
            const { data: updated, error: updateError } = await supabase
                .from("quotations")
                .update({ status: "Sent" })
                .eq("id", id)
                .select("*")
                .single();
            if (updateError) throw updateError;
            quotation = updated;
        }

        return NextResponse.json({
            success: true,
            resend_id: sent.id,
            to,
            quotation,
        });
    } catch (error: unknown) {
        console.error("Error sending quotation:", error);
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
