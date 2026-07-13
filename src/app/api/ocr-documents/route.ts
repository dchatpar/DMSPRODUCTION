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
        const customerId = url.searchParams.get("customer_id");
        const documentType = url.searchParams.get("document_type");

        let query = supabase
            .from("ocr_documents")
            .select("*")
            .order("created_at", { ascending: false });

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

        const body = await req.json();

        const { data, error } = await supabase
            .from("ocr_documents")
            .insert(body)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ data });
    } catch (error) {
        console.error("Error creating OCR document:", error);
        return Response.json({ error: "Failed to create document" }, { status: 500 });
    }
}
