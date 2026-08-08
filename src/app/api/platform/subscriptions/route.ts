// app/api/platform/subscriptions/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET /api/platform/subscriptions - List all subscriptions (platform admin only)
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
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
        const status = url.searchParams.get("status");
        const plan = url.searchParams.get("plan");

        let query = supabase
            .from("subscriptions")
            .select(`
                *,
                dealership:dealerships(id, name, business_email, status)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);
        if (plan) query = query.eq("plan_name", plan);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: unknown) {
        console.error("Error fetching subscriptions:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
