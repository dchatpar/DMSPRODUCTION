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
        const customerId = url.searchParams.get("customer_id");
        const documentType = url.searchParams.get("document_type");

        let query = supabase
            .from("ocr_documents")
            .select("*")
            .order("created_at", { ascending: false });

        if (!currentUser.is_platform_admin) {
            query = query.eq("dealership_id", currentUser.dealership_id);
        }

        if (customerId) {
            query = query.eq("customer_id", customerId);
        }
        if (documentType) {
            query = query.eq("document_type", documentType);
        }

        const { data, error } = await query;

        if (error) throw error;

        return Response.json({ data });
    } catch (error) {
        console.error("Error fetching OCR documents:", error);
        return Response.json({ error: "Failed to fetch documents" }, { status: 500 });
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
        const validTypes = ["drivers_license", "government_id", "passport", "other"];
        if (!body.document_type || !validTypes.includes(body.document_type)) {
            return NextResponse.json(
                { error: `document_type is required and must be one of: ${validTypes.join(", ")}` },
                { status: 400 }
            );
        }

        // Whitelist allowed fields (must match schema.sql ocr_documents columns)
        const allowed = [
            "customer_id", "document_type", "document_number",
            "first_name", "last_name", "date_of_birth", "expiry_date",
            "address", "city", "province", "postal_code", "issue_date", "country",
            "raw_ocr_text", "confidence_score", "image_url"
        ];
        const docData: Record<string, any> = {
            dealership_id: currentUser.dealership_id,
            verified_by: user.id,
        };
        for (const field of allowed) {
            if (body[field] !== undefined) {
                docData[field] = body[field];
            }
        }

        const { data, error } = await supabase
            .from("ocr_documents")
            .insert(docData)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating OCR document:", error);
        return Response.json({ error: error?.message || "Failed to create document" }, { status: 500 });
    }
}
