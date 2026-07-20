// app/api/platform/audit-logs/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET /api/platform/audit-logs - List audit logs (platform admin only)
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Verify platform admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json({ error: "Unauthorized - Platform admin access required" }, { status: 403 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const action = url.searchParams.get("action");
        const entityType = url.searchParams.get("entity_type");
        const actorId = url.searchParams.get("actor_id");
        const targetId = url.searchParams.get("target_id");
        const fromDate = url.searchParams.get("from_date");
        const toDate = url.searchParams.get("to_date");

        let query = supabase
            .from("audit_logs")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (action) query = query.ilike("action", `%${action}%`);
        if (entityType) query = query.eq("entity_type", entityType);
        if (actorId) query = query.eq("actor_id", actorId);
        if (targetId) query = query.eq("target_id", targetId);
        if (fromDate) query = query.gte("created_at", fromDate);
        if (toDate) query = query.lte("created_at", toDate);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching audit logs:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
