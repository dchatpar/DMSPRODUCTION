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
        const vin = url.searchParams.get("vin");

        let query = supabase
            .from("carfax_reports")
            .select("*")
            .order("created_at", { ascending: false });

        if (vehicleId) {
            query = query.eq("vehicle_id", vehicleId);
        }
        if (vin) {
            query = query.eq("vin", vin);
        }

        const { data, error } = await query;

        if (error) throw error;

        return Response.json({ data });
    } catch (error) {
        console.error("Error fetching Carfax reports:", error);
        return Response.json({ error: "Failed to fetch reports" }, { status: 500 });
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
            .from("carfax_reports")
            .insert(body)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ data });
    } catch (error) {
        console.error("Error creating Carfax report:", error);
        return Response.json({ error: "Failed to create report" }, { status: 500 });
    }
}
