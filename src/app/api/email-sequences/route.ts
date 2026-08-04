// List / create email sequences (dealership-scoped). Soft-lock via requireDealershipAccess.
import { NextRequest, NextResponse } from "next/server";
import {
    jsonAuthError,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { createTokenClient } from "@/src/lib/server-token";
import { isResendConfigured } from "@/src/lib/resend";
import {
    ensureDefaultLeadNurtureSequence,
    type SequenceStepInput,
} from "@/src/lib/crm/email-sequences";

function canManageSequences(profile: {
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

export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return jsonAuthError(auth);
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId && !auth.profile.is_platform_admin) {
            return NextResponse.json(
                { error: "No dealership context" },
                { status: 403 }
            );
        }

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
            .select(
                "id, name, description, is_active, created_at, updated_at, dealership_id, email_sequence_steps(count)"
            )
            .order("created_at", { ascending: true });

        if (dealershipId) {
            query = query.eq("dealership_id", dealershipId);
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data: data || [],
            meta: {
                resend_configured: isResendConfigured(),
            },
        });
    } catch (error: unknown) {
        console.error("email-sequences GET:", error);
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

export async function POST(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile || !auth.user) {
            return jsonAuthError(auth);
        }

        if (!canManageSequences(auth.profile)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership context" },
                { status: 403 }
            );
        }

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

        const body = (await req.json().catch(() => ({}))) as {
            ensure_default?: boolean;
            name?: string;
            description?: string;
            steps?: SequenceStepInput[];
        };

        if (body.ensure_default !== false && !body.name) {
            const ensured = await ensureDefaultLeadNurtureSequence(supabase, {
                dealershipId,
                userId: auth.user.id,
            });
            if (!ensured.ok) {
                return NextResponse.json(
                    { error: ensured.error },
                    { status: 500 }
                );
            }
            const { data: sequence } = await supabase
                .from("email_sequences")
                .select(
                    "*, email_sequence_steps(*)"
                )
                .eq("id", ensured.sequenceId)
                .single();

            return NextResponse.json(
                {
                    data: sequence,
                    created: ensured.created,
                    meta: { resend_configured: isResendConfigured() },
                },
                { status: ensured.created ? 201 : 200 }
            );
        }

        if (!body.name?.trim()) {
            return NextResponse.json(
                { error: "name is required" },
                { status: 400 }
            );
        }

        const steps = Array.isArray(body.steps) ? body.steps : [];
        if (steps.length === 0) {
            return NextResponse.json(
                { error: "At least one step is required" },
                { status: 400 }
            );
        }

        const { data: sequence, error: createErr } = await supabase
            .from("email_sequences")
            .insert({
                dealership_id: dealershipId,
                name: body.name.trim(),
                description: body.description?.trim() || null,
                is_active: true,
                created_by: auth.user.id,
            })
            .select("*")
            .single();

        if (createErr || !sequence) {
            return NextResponse.json(
                { error: createErr?.message || "Failed to create sequence" },
                { status: 500 }
            );
        }

        const stepRows = steps.map((s, idx) => ({
            sequence_id: sequence.id,
            step_order: s.step_order ?? idx + 1,
            delay_days: Math.max(0, Number(s.delay_days) || 0),
            subject: String(s.subject || "").trim(),
            body_html: String(s.body_html || "").trim(),
            body_text: s.body_text ? String(s.body_text) : null,
        }));

        if (stepRows.some((s) => !s.subject || !s.body_html)) {
            await supabase.from("email_sequences").delete().eq("id", sequence.id);
            return NextResponse.json(
                { error: "Each step needs subject and body_html" },
                { status: 400 }
            );
        }

        const { error: stepsErr } = await supabase
            .from("email_sequence_steps")
            .insert(stepRows);

        if (stepsErr) {
            await supabase.from("email_sequences").delete().eq("id", sequence.id);
            return NextResponse.json(
                { error: stepsErr.message },
                { status: 500 }
            );
        }

        const { data: full } = await supabase
            .from("email_sequences")
            .select("*, email_sequence_steps(*)")
            .eq("id", sequence.id)
            .single();

        return NextResponse.json(
            {
                data: full,
                created: true,
                meta: { resend_configured: isResendConfigured() },
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("email-sequences POST:", error);
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
