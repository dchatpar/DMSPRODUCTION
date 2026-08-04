import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

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

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const vin = formData.get("vin") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
        }

        // Generate unique file name
        const fileExt = "pdf";
        const fileName = `carfax-${vin || "unknown"}-${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from("carfax-reports")
            .upload(fileName, buffer, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError.message);
            const msg = uploadError.message || "Upload failed";
            const bucketMissing = /bucket|not found|does not exist/i.test(msg);
            return NextResponse.json(
                {
                    error: bucketMissing
                        ? "CARFAX storage is not configured (missing 'carfax-reports' bucket). Contact an administrator."
                        : `Failed to upload CARFAX report: ${msg}`,
                },
                { status: bucketMissing ? 503 : 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from("carfax-reports")
            .getPublicUrl(fileName);

        const url = urlData.publicUrl;

        return NextResponse.json({ url, fileName });
    } catch (error) {
        console.error("Error uploading CARFAX report:", error);
        return NextResponse.json({ error: "Failed to upload CARFAX report" }, { status: 500 });
    }
}
