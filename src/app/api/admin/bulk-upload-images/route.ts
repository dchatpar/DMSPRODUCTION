// app/api/admin/bulk-upload-images/route.ts
// One-time bulk image upload + vehicle image_gallery re-link.
// Auth: requires platform_admin OR dealership Admin.
// Body: { vin: string, images: [{name, base64}], mode?: "upload_and_link" | "list_only" | "link_only" }
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "vehicles";

async function getAuthedUser(req: NextRequest) {
    try {
        const supabase = createTokenClient(req);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: currentUser } = await supabase
            .from("users")
            .select("id, role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();
        return currentUser;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const me = await getAuthedUser(req);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!me.is_platform_admin && me.role !== "Admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const payload = await req.json();
    const { vin, images, mode = "upload_and_link", dryRun = false } = payload;
    if (!vin) return NextResponse.json({ error: "vin required" }, { status: 400 });
    if (!Array.isArray(images) || images.length === 0) {
        return NextResponse.json({ error: "images array required (e.g. [{name:'01.jpg', base64:'...' }])" }, { status: 400 });
    }

    // Find vehicle
    const { data: vehicle } = await supabaseAdmin
        .from("vehicles")
        .select("id, vin, image_gallery, dealership_id")
        .eq("vin", vin)
        .single();
    if (!vehicle) return NextResponse.json({ error: `Vehicle not found: ${vin}` }, { status: 404 });

    if (!me.is_platform_admin && vehicle.dealership_id !== me.dealership_id) {
        return NextResponse.json({ error: "Vehicle belongs to another dealership" }, { status: 403 });
    }

    const uploadedUrls: string[] = [];
    const failed: { name: string; error: string }[] = [];

    if ((mode === "upload_and_link") && !dryRun) {
        for (const img of images) {
            const { name, base64, contentType } = img;
            if (!name || !base64) {
                failed.push({ name: name || "?", error: "missing name or base64" });
                continue;
            }
            const buf = Buffer.from(base64, "base64");
            const storagePath = `${vin}/${name}`;
            const { error: upErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(storagePath, buf, {
                    contentType: contentType || (name.toLowerCase().endsWith(".png") ? "image/png"
                        : name.toLowerCase().endsWith(".webp") ? "image/webp"
                        : name.toLowerCase().endsWith(".gif") ? "image/gif"
                        : "image/jpeg"),
                    upsert: true,
                });
            if (upErr) {
                failed.push({ name, error: upErr.message });
                continue;
            }
            const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
            uploadedUrls.push(pub.publicUrl);
        }
    } else if (mode === "list_only" || dryRun) {
        // Just compute what URLs WOULD be
        for (const img of images) {
            const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(`${vin}/${img.name}`);
            uploadedUrls.push(pub.publicUrl);
        }
    }

    // Update vehicle.image_gallery
    let updatedVehicle = null;
    if (!dryRun) {
        const unique = Array.from(new Set(uploadedUrls));
        const { data, error } = await supabaseAdmin
            .from("vehicles")
            .update({ image_gallery: unique })
            .eq("id", vehicle.id)
            .select("id, vin, image_gallery")
            .single();
        if (error) {
            return NextResponse.json({ error: `DB update failed: ${error.message}`, uploadedUrls, failed }, { status: 500 });
        }
        updatedVehicle = data;
    }

    return NextResponse.json({
        ok: true,
        vin,
        vehicle_id: vehicle.id,
        images_received: images.length,
        uploaded: uploadedUrls.length,
        failed,
        new_image_gallery: updatedVehicle?.image_gallery,
        dryRun,
        mode,
    });
}
