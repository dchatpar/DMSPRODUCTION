// app/api/vendors/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single vendor
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("vendors")
            .select("*")
            .eq("id", id)
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Vendor not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching vendor:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update vendor
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

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

        const updateData: any = {
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
        };

        const { data, error: dbError } = await supabase
            .from("vendors")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Vendor not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating vendor:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE vendor
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { error: dbError } = await supabase
            .from("vendors")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting vendor:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
