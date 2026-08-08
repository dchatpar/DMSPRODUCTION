import { NextRequest, NextResponse } from "next/server";
import {
    assertOwnershipOrDeny,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
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
        const { data: sequence, error } = await supabase
            .from("sms_sequences")
            .select(
                "*, steps:sms_sequence_steps(id, sequence_id, step_order, delay_days, body_text, created_at, updated_at)"
            )
            .eq("id", id)
            .eq("dealership_id", auth.dealership_id)
            .maybeSingle();

        if (error) throw error;
        if (!sequence) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ data: sequence });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS sequence get error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: Params) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }
        const isAdmin =
            auth.profile.is_platform_admin ||
            auth.profile.role === "Admin" ||
            auth.profile.role === "Manager";
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden - Admin or Manager required" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: existing, error: findErr } = await supabase
            .from("sms_sequences")
            .select("*")
            .eq("id", id)
            .eq("dealership_id", auth.dealership_id)
            .maybeSingle();
        if (findErr) throw findErr;
        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        const patch: Record<string, unknown> = {};
        if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
        if (typeof body.description === "string") patch.description = body.description || null;
        if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

        const { error: updateErr } = await supabase
            .from("sms_sequences")
            .update(patch)
            .eq("id", id);
        if (updateErr) throw updateErr;

        if (Array.isArray(body.steps) && body.steps.length > 0) {
            await supabase.from("sms_sequence_steps").delete().eq("sequence_id", id);
            const stepRows = body.steps.map((s: { step_order: number; delay_days?: number; body_text: string }) => ({
                sequence_id: id,
                step_order: s.step_order,
                delay_days: typeof s.delay_days === "number" ? Math.max(0, Math.floor(s.delay_days)) : 0,
                body_text: String(s.body_text ?? "").trim(),
            }));
            const { error: stepsErr } = await supabase
                .from("sms_sequence_steps")
                .insert(stepRows);
            if (stepsErr) throw stepsErr;
        }

        return NextResponse.json({ data: { id }, message: "SMS sequence updated." });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS sequence update error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }
        const isAdmin =
            auth.profile.is_platform_admin ||
            auth.profile.role === "Admin" ||
            auth.profile.role === "Manager";
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden - Admin or Manager required" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: existing, error: findErr } = await supabase
            .from("sms_sequences")
            .select("*")
            .eq("id", id)
            .eq("dealership_id", auth.dealership_id)
            .maybeSingle();
        if (findErr) throw findErr;
        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        const { error: delErr } = await supabase
            .from("sms_sequences")
            .delete()
            .eq("id", id);
        if (delErr) throw delErr;

        return NextResponse.json({ data: { id }, message: "SMS sequence deleted." });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS sequence delete error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
