import { NextRequest, NextResponse } from "next/server";
import {
    assertOwnership,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { applyConsentTimestamps } from "@/src/lib/customer-consent";

/**
 * SMS opt-in — records CASL/TCPA consent at point of capture.
 * Body: { customer_id, consent: boolean }
 * Stamps sms_consent, sms_consent_at (+ ip) via the shared consent helper.
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
        if (typeof body.consent !== "boolean") {
            return NextResponse.json({ error: "consent (boolean) is required" }, { status: 400 });
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: customer, error } = await supabase
            .from("customers")
            .select("id, dealership_id, sms_consent, sms_consent_at, sms_consent_ip")
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

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

        const next = applyConsentTimestamps(
            { sms_consent: body.consent },
            customer,
            { ip }
        );

        const { data: updated, error: updateError } = await supabase
            .from("customers")
            .update(next)
            .eq("id", customerId)
            .select("id, sms_consent, sms_consent_at, sms_consent_ip")
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({
            data: updated,
            message: body.consent
                ? "SMS consent recorded."
                : "SMS consent revoked.",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS opt-in error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
