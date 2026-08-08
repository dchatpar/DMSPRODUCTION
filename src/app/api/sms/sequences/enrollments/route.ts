import { NextRequest, NextResponse } from "next/server";
import {
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";

/**
 * List SMS sequence enrollments for the dealership (latest first).
 * Query params: status, limit, offset, sequence_id.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);
        const url = new URL(req.url);
        const limit = Math.min(
            Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1),
            200
        );
        const offset = Math.max(
            parseInt(url.searchParams.get("offset") || "0", 10) || 0,
            0
        );
        const status = url.searchParams.get("status");
        const sequenceId = url.searchParams.get("sequence_id");

        let query = supabase
            .from("sms_sequence_enrollments")
            .select(
                "*, sequence:sms_sequences(id, name), lead:leads(id, customer_id), customer:customers(id, name, phone, sms_consent)",
                { count: "exact" }
            )
            .eq("dealership_id", auth.dealership_id)
            .order("enrolled_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status === "active" || status === "stopped" || status === "completed") {
            query = query.eq("status", status);
        }
        if (sequenceId) {
            query = query.eq("sequence_id", sequenceId);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("SMS enrollments list error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
