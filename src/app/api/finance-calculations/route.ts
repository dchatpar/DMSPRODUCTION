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

        const url = new URL(req.url);
        const vehicleId = url.searchParams.get("vehicle_id");
        const customerId = url.searchParams.get("customer_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");

        let query = supabase
            .from("finance_calculations")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

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

        const body = await req.json();

        const { data, error } = await supabase
            .from("finance_calculations")
            .insert(body)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ data });
    } catch (error) {
        console.error("Error creating finance calculation:", error);
        return Response.json({ error: "Failed to create calculation" }, { status: 500 });
    }
}
