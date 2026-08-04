import { NextRequest, NextResponse } from "next/server";
import {
    jsonAuthError,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { createTokenClient } from "@/src/lib/server-token";
import { isResendConfigured } from "@/src/lib/resend";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return jsonAuthError(auth);
        }

        const { id } = await params;
        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                error.message === "MISSING_BEARER_TOKEN"
            ) {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        let query = supabase
            .from("email_sequences")
            .select("*, email_sequence_steps(*)")
            .eq("id", id);

        if (auth.profile.dealership_id) {
            query = query.eq("dealership_id", auth.profile.dealership_id);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!data) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const steps = Array.isArray(data.email_sequence_steps)
            ? [...data.email_sequence_steps].sort(
                  (a: { step_order: number }, b: { step_order: number }) =>
                      a.step_order - b.step_order
              )
            : [];

        return NextResponse.json({
            data: { ...data, email_sequence_steps: steps },
            meta: { resend_configured: isResendConfigured() },
        });
    } catch (error: unknown) {
        console.error("email-sequences/[id] GET:", error);
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
