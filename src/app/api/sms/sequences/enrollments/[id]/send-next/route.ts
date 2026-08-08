import { NextRequest, NextResponse } from "next/server";
import {
    assertOwnershipOrDeny,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import {
    resolveRecipientForSmsEnrollment,
    sendNextSmsSequenceStep,
} from "@/src/lib/crm/sms-sequences";

type Params = { params: Promise<{ id: string }> };

/**
 * Manual "Send next" for an SMS sequence enrollment.
 * Returns honest status: sent / skipped / blocked / not configured.
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

        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: enrollment, error: enrErr } = await supabase
            .from("sms_sequence_enrollments")
            .select("*")
            .eq("id", id)
            .eq("dealership_id", auth.dealership_id)
            .maybeSingle();
        if (enrErr) throw enrErr;
        const deny = assertOwnershipOrDeny(enrollment, auth.profile);
        if (deny) return deny;
        if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const recipient = await resolveRecipientForSmsEnrollment(supabase, enrollment);
        if ("error" in recipient) {
            return NextResponse.json(
                { error: recipient.error, code: "NO_RECIPIENT" },
                { status: 400 }
            );
        }

        const result = await sendNextSmsSequenceStep(supabase, {
            enrollmentId: enrollment.id,
            dealershipId: auth.dealership_id,
            recipient,
            force: true,
        });

        if (result.ok) {
            return NextResponse.json({ data: result });
        }

        const status =
            result.code === "NOT_CONFIGURED"
                ? 501
                : result.code === "QUIET_HOURS"
                  ? 409
                  : result.code === "NO_CONSENT"
                    ? 403
                    : 400;
        return NextResponse.json(
            { error: result.error, code: result.code, missingConfig: result.missingConfig },
            { status }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS send-next error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
