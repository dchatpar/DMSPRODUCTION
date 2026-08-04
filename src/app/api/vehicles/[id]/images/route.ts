// app/api/vehicles/[id]/images/route.ts
// Per-vehicle image management (param is VIN; folder named [id] to share
// the same dynamic slug as /api/vehicles/[id] — Next.js forbids sibling
// dynamic segments with different names at the same path depth):
//   POST   /api/vehicles/:vin/images  — upload one or more images (multipart or base64),
//                                        appends public URLs to the vehicle's image_gallery
//   DELETE /api/vehicles/:vin/images  — remove a URL from image_gallery
//
// Auth: any signed-in user from the vehicle's dealership (or platform_admin).
// Uses supabaseAdmin for storage + DB writes to bypass RLS — the previous
// client-side `supabaseBrowser.storage.upload()` was silently failing with
// "new row violates row-level security policy" because the user role doesn't
// have INSERT on storage.objects.
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { parseGallery, serializeGallery, type VehicleImage } from "@/src/lib/vehicle-image";

const BUCKET = "vehicles";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB per file

interface AuthedUser {
    id: string;
    role: string;
    dealership_id: string | null;
    is_platform_admin: boolean;
}

async function getAuthedUser(req: NextRequest): Promise<AuthedUser | null> {
    try {
        const supabase = createTokenClient(req);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase
            .from("users")
            .select("id, role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();
        if (!profile) return null;
        return profile as AuthedUser;
    } catch {
        return null;
    }
}

function extFromMime(mime: string): string {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    return "jpg";
}

// POST — accepts either multipart/form-data (file field) OR application/json { filename, base64 }.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const me = await getAuthedUser(req);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Param folder is [id] for slug consistency; value is the vehicle VIN.
    const { id: rawVin } = await params;
    const vin = decodeURIComponent(rawVin);

    // Look up vehicle + check dealership scope (defense in depth)
    const { data: vehicle, error: vErr } = await supabaseAdmin
        .from("vehicles")
        .select("id, vin, image_gallery, dealership_id")
        .eq("vin", vin)
        .single();
    if (vErr || !vehicle) {
        return NextResponse.json({ error: `Vehicle not found: ${vin}` }, { status: 404 });
    }
    if (!me.is_platform_admin && vehicle.dealership_id !== me.dealership_id) {
        return NextResponse.json({ error: "Vehicle belongs to another dealership" }, { status: 403 });
    }

    // Read existing gallery (so we can dedupe + preserve order)
    const existing: string[] = Array.isArray(vehicle.image_gallery) ? vehicle.image_gallery : [];
    const existingParsed: VehicleImage[] = parseGallery(existing);
    const existingUrls = new Set(existingParsed.map((g) => g.url));

    // Two ingest paths: multipart (preferred for files) or JSON { filename, base64 }
    const contentType = req.headers.get("content-type") || "";
    const candidates: { name: string; mime: string; bytes: Uint8Array }[] = [];

    if (contentType.startsWith("multipart/form-data")) {
        let form: FormData;
        try {
            form = await req.formData();
        } catch (e) {
            return NextResponse.json({ error: `Invalid multipart body: ${(e as Error).message}` }, { status: 400 });
        }
        for (const [key, val] of form.entries()) {
            if (key !== "file" && key !== "files") continue;
            if (typeof val === "string") continue; // File entry only
            if (val.size > MAX_BYTES) {
                return NextResponse.json({ error: `File "${val.name}" exceeds 5MB limit` }, { status: 413 });
            }
            if (val.type && !ALLOWED_TYPES.includes(val.type)) {
                return NextResponse.json({ error: `Unsupported file type: ${val.type}` }, { status: 415 });
            }
            const bytes = new Uint8Array(await val.arrayBuffer());
            candidates.push({ name: val.name || "upload", mime: val.type || "image/jpeg", bytes });
        }
    } else {
        let body: any;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: `Invalid JSON body: ${(e as Error).message}` }, { status: 400 });
        }
        const incoming: any[] = Array.isArray(body?.images) ? body.images : body?.image ? [body.image] : [];
        if (incoming.length === 0) {
            return NextResponse.json({ error: "No images provided (use multipart 'file' field or JSON {filename, base64})" }, { status: 400 });
        }
        for (const img of incoming) {
            if (!img?.base64) {
                return NextResponse.json({ error: "Each image requires {filename, base64}" }, { status: 400 });
            }
            const buf = Buffer.from(img.base64, "base64");
            if (buf.length > MAX_BYTES) {
                return NextResponse.json({ error: `File "${img.filename}" exceeds 5MB limit` }, { status: 413 });
            }
            const mime = img.contentType || "image/jpeg";
            if (!ALLOWED_TYPES.includes(mime)) {
                return NextResponse.json({ error: `Unsupported file type: ${mime}` }, { status: 415 });
            }
            candidates.push({ name: img.filename || "upload", mime, bytes: buf });
        }
    }

    if (candidates.length === 0) {
        return NextResponse.json({ error: "No files received" }, { status: 400 });
    }

    // Upload each file via supabaseAdmin (bypasses RLS) — add a timestamp prefix
    // to avoid collisions when two clients upload the same filename.
    const uploaded: { url: string; name: string }[] = [];
    const failed: { name: string; error: string }[] = [];
    const ts = Date.now();
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const safeName = c.name.replace(/[^\w.\-]/g, "_");
        const storagePath = `${vin}/${ts}-${i}-${safeName}`;
        const { error: upErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(storagePath, c.bytes, {
                contentType: c.mime,
                upsert: true,
            });
        if (upErr) {
            failed.push({ name: c.name, error: upErr.message });
            continue;
        }
        const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
        uploaded.push({ url: pub.publicUrl, name: c.name });
    }

    if (uploaded.length === 0) {
        return NextResponse.json({ error: "All uploads failed", failed }, { status: 500 });
    }

    // Build new gallery: keep existing order, append new unique URLs.
    // For the first new image of an empty gallery, mark it as the cover.
    const newEntries: VehicleImage[] = [...existingParsed];
    for (const u of uploaded) {
        if (existingUrls.has(u.url)) continue;
        newEntries.push({
            url: u.url,
            role: null,
            is_cover: newEntries.length === 0, // first image = cover
            sort_order: newEntries.length,
        });
    }
    const newGallerySerialized = serializeGallery(newEntries);

    const { data: updated, error: updErr } = await supabaseAdmin
        .from("vehicles")
        .update({ image_gallery: newGallerySerialized })
        .eq("id", vehicle.id)
        .select("id, vin, image_gallery")
        .single();
    if (updErr) {
        return NextResponse.json({ error: `DB update failed: ${updErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        vin,
        uploaded: uploaded.length,
        failed,
        added_urls: uploaded.map((u) => u.url),
        image_gallery: updated?.image_gallery,
    });
}

// DELETE — body: { url: string }. Removes the URL from the vehicle's image_gallery.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const me = await getAuthedUser(req);
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Param folder is [id] for slug consistency; value is the vehicle VIN.
    const { id: rawVin } = await params;
    const vin = decodeURIComponent(rawVin);
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const urlToRemove = body?.url;
    if (!urlToRemove || typeof urlToRemove !== "string") {
        return NextResponse.json({ error: "Body must include { url: string }" }, { status: 400 });
    }

    const { data: vehicle, error: vErr } = await supabaseAdmin
        .from("vehicles")
        .select("id, vin, image_gallery, dealership_id")
        .eq("vin", vin)
        .single();
    if (vErr || !vehicle) {
        return NextResponse.json({ error: `Vehicle not found: ${vin}` }, { status: 404 });
    }
    if (!me.is_platform_admin && vehicle.dealership_id !== me.dealership_id) {
        return NextResponse.json({ error: "Vehicle belongs to another dealership" }, { status: 403 });
    }

    const existing: string[] = Array.isArray(vehicle.image_gallery) ? vehicle.image_gallery : [];
    const filtered = existing.filter((u) => u !== urlToRemove);

    if (filtered.length === existing.length) {
        return NextResponse.json({ ok: true, vin, removed: 0, image_gallery: existing });
    }

    const { data: updated, error: updErr } = await supabaseAdmin
        .from("vehicles")
        .update({ image_gallery: filtered })
        .eq("id", vehicle.id)
        .select("id, vin, image_gallery")
        .single();
    if (updErr) {
        return NextResponse.json({ error: `DB update failed: ${updErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        vin,
        removed: 1,
        image_gallery: updated?.image_gallery,
    });
}
