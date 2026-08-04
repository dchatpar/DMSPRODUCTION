import { NextRequest, NextResponse } from "next/server";
import {
    jsonAuthError,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { createTokenClient } from "@/src/lib/server-token";
import { isResendConfigured } from "@/src/lib/resend";

function canManage(profile: {
    is_platform_admin?: boolean;
    role?: string;
    user_permissions?: string[];
}): boolean {
    if (profile.is_platform_admin) return true;
    if (profile.role === "Admin" || profile.role === "Manager") return true;
    const perms = profile.user_permissions || [];
    return (
        perms.includes("*") ||
        perms.includes("leads:write") ||
        perms.includes("follow_ups:write")
    );
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return jsonAuthError(auth);
        }
        if (!canManage(auth.profile)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership context" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = (await req.json().catch(() => ({}))) as {
            reason?: string;
        };

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

        const { data: enrollment, error: enrErr } = await supabase
            .from("email_sequence_enrollments")
            .select("id, status")
            .eq("id", id)
            .eq("dealership_id", dealershipId)
            .maybeSingle();

        if (enrErr || !enrollment) {
            return NextResponse.json(
                { error: "Enrollment not found" },
                { status: 404 }
            );
        }

        if (enrollment.status !== "active") {
            return NextResponse.json(
                {
                    data: enrollment,
                    message: `Already ${enrollment.status}`,
                    meta: { resend_configured: isResendConfigured() },
                },
                { status: 200 }
            );
        }

        const { data: updated, error: updErr } = await supabase
            .from("email_sequence_enrollments")
            .update({
                status: "stopped",
                stopped_at: new Date().toISOString(),
                stop_reason: body.reason?.trim() || "dealer_stop",
                next_send_at: null,
            })
            .eq("id", id)
            .select(
                `*,
                sequence:email_sequences(id, name, is_active),
                sends:email_sequence_sends(id, step_order, status, to_email, error, resend_id, sent_at)`
            )
            .single();

        if (updErr) {
            return NextResponse.json(
                { error: updErr.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            data: updated,
            meta: { resend_configured: isResendConfigured() },
        });
    } catch (error: unknown) {
        console.error("stop enrollment POST:", error);
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
