import { NextRequest, NextResponse } from "next/server";
import {
    assertOwnershipOrDeny,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

/**
 * Enroll a customer (or lead) into an SMS sequence.
 * Body: { customer_id?, lead_id?, force? } — exactly one of customer_id/lead_id.
 */
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }
        const { id } = await params;
        const body = await req.json().catch(() => ({}));

        const customerId = typeof body.customer_id === "string" ? body.customer_id : null;
        const leadId = typeof body.lead_id === "string" ? body.lead_id : null;
        if (!customerId && !leadId) {
            return NextResponse.json(
                { error: "Provide customer_id or lead_id" },
                { status: 400 }
            );
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: sequence, error: seqErr } = await supabase
            .from("sms_sequences")
            .select("id, name, is_active, dealership_id")
            .eq("id", id)
            .eq("dealership_id", auth.dealership_id)
            .maybeSingle();
        if (seqErr) throw seqErr;
        const deny = assertOwnershipOrDeny(sequence, auth.profile);
        if (deny) return deny;
        if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (!sequence.is_active) {
            return NextResponse.json(
                { error: "SMS sequence is inactive" },
                { status: 400 }
            );
        }

        // Verify target exists within dealership.
        let targetCustomerId: string | null = customerId;
        if (leadId) {
            const { data: lead } = await supabase
                .from("leads")
                .select("id, customer_id, dealership_id")
                .eq("id", leadId)
                .maybeSingle();
            const leadDeny = assertOwnershipOrDeny(lead, auth.profile);
            if (leadDeny) return leadDeny;
            targetCustomerId = lead?.customer_id || null;
        }

        if (targetCustomerId) {
            const { data: customer } = await supabase
                .from("customers")
                .select("id, sms_consent, phone, dealership_id")
                .eq("id", targetCustomerId)
                .maybeSingle();
            const cDeny = assertOwnershipOrDeny(customer, auth.profile);
            if (cDeny) return cDeny;
            if (!customer?.sms_consent || !customer.phone?.trim()) {
                return NextResponse.json(
                    {
                        error:
                            "Customer has not consented to SMS (or has no phone). Enable SMS consent first.",
                        code: "SMS_CONSENT_REQUIRED",
                    },
                    { status: 403 }
                );
            }
        }

        const enrollment = {
            dealership_id: auth.dealership_id,
            sequence_id: id,
            lead_id: leadId,
            customer_id: targetCustomerId,
            status: "active" as const,
            current_step: 0,
            enrolled_by: auth.profile.id,
            next_send_at: new Date().toISOString(),
        };

        const { data: created, error: enrErr } = await supabase
            .from("sms_sequence_enrollments")
            .insert(enrollment)
            .select("id, status, next_send_at")
            .single();

        if (enrErr) {
            if (enrErr.code === "23505") {
                return NextResponse.json(
                    { error: "Already enrolled in this SMS sequence", code: "DUPLICATE_ENROLLMENT" },
                    { status: 409 }
                );
            }
            throw enrErr;
        }

        return NextResponse.json(
            { data: created, message: "Enrolled. First message will send when due." },
            { status: 201 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS sequence enroll error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
