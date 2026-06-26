// app/api/vendors/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all vendors
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("vendors")
            .select("*", { count: "exact" })
            .order("vendor_name", { ascending: true })
            .range(offset, offset + limit - 1);

        if (q) {
            query = query.or(
                `vendor_name.ilike.%${q}%,contact_name.ilike.%${q}%,phone.ilike.%${q}%`
            );
        }

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching vendors:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create vendor
export async function POST(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const payload = await req.json();

        if (!payload.vendor_name) {
            return NextResponse.json(
                { error: "Vendor name is required" },
                { status: 400 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("vendors")
            .insert({
                vendor_type: payload.vendor_type || 'General',
                vendor_name: payload.vendor_name,
                address: payload.address || null,
                phone: payload.phone || null,
                gst_number: payload.gst_number || null,
                hst_number: payload.hst_number || null,
                pst_number: payload.pst_number || null,
                city: payload.city || null,
                province: payload.province || null,
                postal_code: payload.postal_code || null,
                contact_name: payload.contact_name || null,
                contact_email: payload.contact_email || null,
                contact_phone: payload.contact_phone || null,
                notes: payload.notes || null,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating vendor:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
