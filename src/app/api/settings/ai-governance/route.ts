// AI Governance config + overview for the console.
// GET  → config, consent summary, recent corrections, recent after-hours replies
// PATCH → upsert per-dealership governance config
import { NextRequest, NextResponse } from "next/server";
import { requireDealershipAccess } from "@/src/lib/auth-helpers";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { DEFAULT_BLOCKED_CLAIMS } from "@/src/lib/ai/guard";

function canManage(profile: {
    role?: string | null;
    is_platform_admin?: boolean | null;
    user_permissions?: string[] | null;
}): boolean {
    if (profile.is_platform_admin) return true;
    if (profile.role === "Admin" || profile.role === "Manager") return true;
    const perms = profile.user_permissions || [];
    if (perms.includes("*") || perms.includes("settings:write")) return true;
    return false;
}

const DEFAULTS = {
    claims_guardrail_enabled: true,
    blocked_claims: DEFAULT_BLOCKED_CLAIMS,
    allowed_claims: [] as string[],
    quiet_hours_enabled: true,
    quiet_hours_start: "20:00",
    quiet_hours_end: "09:00",
    quiet_hours_timezone: "America/Toronto",
    auto_send_enabled: false,
    escalation_on_pricing: true,
};

export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }
        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership context" },
                { status: 400 }
            );
        }

        const { data: row } = await supabaseAdmin
            .from("ai_governance_config")
            .select("*")
            .eq("dealership_id", dealershipId)
            .maybeSingle();

        const config = {
            claims_guardrail_enabled:
                row?.claims_guardrail_enabled ?? DEFAULTS.claims_guardrail_enabled,
            blocked_claims: Array.isArray(row?.blocked_claims)
                ? row.blocked_claims
                : DEFAULTS.blocked_claims,
            allowed_claims: Array.isArray(row?.allowed_claims)
                ? row.allowed_claims
                : DEFAULTS.allowed_claims,
            quiet_hours_enabled:
                row?.quiet_hours_enabled ?? DEFAULTS.quiet_hours_enabled,
            quiet_hours_start: row?.quiet_hours_start ?? DEFAULTS.quiet_hours_start,
            quiet_hours_end: row?.quiet_hours_end ?? DEFAULTS.quiet_hours_end,
            quiet_hours_timezone:
                row?.quiet_hours_timezone ?? DEFAULTS.quiet_hours_timezone,
            auto_send_enabled: Boolean(row?.auto_send_enabled),
            escalation_on_pricing:
                row?.escalation_on_pricing ?? DEFAULTS.escalation_on_pricing,
            configured: Boolean(row),
        };

        // Consent tracking summary (CASL).
        const [
            marketingConsent,
            smsConsent,
            unsubscribed,
            corrections,
            replies,
        ] = await Promise.all([
            supabaseAdmin
                .from("customers")
                .select("*", { count: "exact", head: true })
                .eq("dealership_id", dealershipId)
                .eq("marketing_consent", true),
            supabaseAdmin
                .from("customers")
                .select("*", { count: "exact", head: true })
                .eq("dealership_id", dealershipId)
                .eq("sms_consent", true),
            supabaseAdmin
                .from("customers")
                .select("*", { count: "exact", head: true })
                .eq("dealership_id", dealershipId)
                .not("marketing_unsubscribed_at", "is", null),
            supabaseAdmin
                .from("ai_corrections")
                .select("id, kind, original_text, corrected_text, corrected_at, context")
                .eq("dealership_id", dealershipId)
                .order("corrected_at", { ascending: false })
                .limit(20),
            supabaseAdmin
                .from("ai_desk_replies")
                .select("id, status, channel, bot_disclosure, consent_ok, escalated_to_human, created_at")
                .eq("dealership_id", dealershipId)
                .order("created_at", { ascending: false })
                .limit(20),
        ]);

        return NextResponse.json({
            data: {
                config,
                can_edit: canManage(auth.profile),
                consent_summary: {
                    marketing_consent: marketingConsent.count ?? 0,
                    sms_consent: smsConsent.count ?? 0,
                    unsubscribed: unsubscribed.count ?? 0,
                },
                corrections: corrections.data ?? [],
                replies: replies.data ?? [],
            },
        });
    } catch (error: unknown) {
        console.error("[ai-governance] GET", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load governance" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }
        if (!canManage(auth.profile)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership context" },
                { status: 400 }
            );
        }

        const body = (await req.json()) as Record<string, unknown>;
        const patch: Record<string, unknown> = {};

        if (typeof body.claims_guardrail_enabled === "boolean") {
            patch.claims_guardrail_enabled = body.claims_guardrail_enabled;
        }
        if (Array.isArray(body.blocked_claims)) {
            patch.blocked_claims = (body.blocked_claims as unknown[])
                .filter((c): c is string => typeof c === "string")
                .map((c) => c.trim().toLowerCase())
                .filter(Boolean);
        }
        if (Array.isArray(body.allowed_claims)) {
            patch.allowed_claims = (body.allowed_claims as unknown[])
                .filter((c): c is string => typeof c === "string")
                .map((c) => c.trim().toLowerCase())
                .filter(Boolean);
        }
        if (typeof body.quiet_hours_enabled === "boolean") {
            patch.quiet_hours_enabled = body.quiet_hours_enabled;
        }
        if (typeof body.quiet_hours_start === "string") {
            patch.quiet_hours_start = body.quiet_hours_start.trim();
        }
        if (typeof body.quiet_hours_end === "string") {
            patch.quiet_hours_end = body.quiet_hours_end.trim();
        }
        if (typeof body.quiet_hours_timezone === "string") {
            patch.quiet_hours_timezone = body.quiet_hours_timezone.trim();
        }
        if (typeof body.auto_send_enabled === "boolean") {
            patch.auto_send_enabled = body.auto_send_enabled;
        }
        if (typeof body.escalation_on_pricing === "boolean") {
            patch.escalation_on_pricing = body.escalation_on_pricing;
        }

        const { data: existing } = await supabaseAdmin
            .from("ai_governance_config")
            .select("id")
            .eq("dealership_id", dealershipId)
            .maybeSingle();

        let upserted;
        if (existing) {
            const { data, error } = await supabaseAdmin
                .from("ai_governance_config")
                .update(patch)
                .eq("dealership_id", dealershipId)
                .select("*")
                .single();
            if (error) throw error;
            upserted = data;
        } else {
            const { data, error } = await supabaseAdmin
                .from("ai_governance_config")
                .insert({ dealership_id: dealershipId, ...patch })
                .select("*")
                .single();
            if (error) throw error;
            upserted = data;
        }

        return NextResponse.json({ data: upserted });
    } catch (error: unknown) {
        console.error("[ai-governance] PATCH", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Save failed" },
            { status: 500 }
        );
    }
}
