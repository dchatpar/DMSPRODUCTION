import { NextRequest, NextResponse } from "next/server";
import {
    assertOwnership,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { assertSmsConsent, SmsConsentError } from "@/src/lib/sms-consent";

/**
 * Stub SMS send endpoint — enforces CASL sms_consent + dealership ownership
 * before any future Twilio path. Does not send messages (honest 501).
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }

        const body = await req.json().catch(() => ({}));
        const customerId = typeof body.customer_id === "string" ? body.customer_id : "";
        if (!customerId) {
            return NextResponse.json({ error: "customer_id is required" }, { status: 400 });
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);
        const { data: customer, error } = await supabase
            .from("customers")
            .select("id, phone, sms_consent, dealership_id")
            .eq("id", customerId)
            .single();

        if (error || !customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const ownership = assertOwnership(customer, auth.profile, {
            strictAssignment: false,
        });
        if (!ownership.allowed) {
            return NextResponse.json(
                { error: ownership.error },
                { status: ownership.status }
            );
        }

        try {
            assertSmsConsent(customer);
        } catch (e) {
            const msg = e instanceof SmsConsentError ? e.message : "SMS consent required";
            return NextResponse.json(
                { error: msg, code: "SMS_CONSENT_REQUIRED" },
                { status: 403 }
            );
        }

        return NextResponse.json(
            {
                error:
                    "SMS sending is not configured yet. Consent check passed; no message was sent.",
                code: "SMS_NOT_CONFIGURED",
                consented: true,
                sent: false,
            },
            { status: 501 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS stub error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
