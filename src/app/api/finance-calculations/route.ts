import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

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

        const { data: currentUser } = await supabase
            .from("users")
            .select("dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        if (!currentUser.dealership_id && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - No dealership context" },
                { status: 403 }
            );
        }

        const url = new URL(req.url);
        const vehicleId = url.searchParams.get("vehicle_id");
        const customerId = url.searchParams.get("customer_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");

        let query = supabase
            .from("finance_calculations")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (!currentUser.is_platform_admin) {
            query = query.eq("dealership_id", currentUser.dealership_id);
        }

        if (vehicleId) {
            query = query.eq("vehicle_id", vehicleId);
        }
        if (customerId) {
            query = query.eq("customer_id", customerId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return Response.json({ data });
    } catch (error) {
        console.error("Error fetching finance calculations:", error);
        return Response.json({ error: "Failed to fetch calculations" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
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

        const { data: currentUser } = await supabase
            .from("users")
            .select("dealership_id")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const body = await req.json();

        // Validate required fields
        if (body.sale_price === undefined || body.sale_price === null) {
            return NextResponse.json({ error: "sale_price is required" }, { status: 400 });
        }
        if (typeof body.sale_price !== "number" || isNaN(body.sale_price) || body.sale_price < 0) {
            return NextResponse.json({ error: "sale_price must be a non-negative number" }, { status: 400 });
        }
        if (body.interest_rate === undefined || body.interest_rate === null) {
            return NextResponse.json({ error: "interest_rate is required" }, { status: 400 });
        }
        if (body.term_months === undefined || body.term_months === null) {
            return NextResponse.json({ error: "term_months is required" }, { status: 400 });
        }
        if (body.payment_amount === undefined || body.payment_amount === null) {
            return NextResponse.json({ error: "payment_amount is required" }, { status: 400 });
        }

        // Whitelist allowed fields (must match schema.sql finance_calculations columns)
        const allowed = [
            "vehicle_id", "customer_id", "sale_price",
            "down_payment", "trade_in_value", "interest_rate",
            "term_months", "payment_type", "payment_amount",
            "total_interest", "total_cost", "tax_amount", "admin_fee"
        ];
        const calcData: Record<string, any> = {
            dealership_id: currentUser.dealership_id,
        };
        for (const field of allowed) {
            if (body[field] !== undefined) {
                calcData[field] = body[field];
            }
        }

        const { data, error } = await supabase
            .from("finance_calculations")
            .insert(calcData)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating finance calculation:", error);
        return Response.json({ error: error?.message || "Failed to create calculation" }, { status: 500 });
    }
}
