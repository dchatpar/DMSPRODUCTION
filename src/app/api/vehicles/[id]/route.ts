// app/api/vehicles/[id]/route.ts
//
// P1-1 + P1-3 fix:
//   - All four handlers now use `pickSupabaseClient` so platform admins
//     get the service-role client (RLS bypass for cross-dealership ops)
//     while regular users keep the request-scoped RLS client.
//   - Perm checks moved AFTER ownership/404 (P1-3): a non-existent
//     vehicle is a 404, not a 403 leaking existence, regardless of the
//     caller's permissions.
//   - PATCH now applies the same field whitelist as PUT (F-09 fix).
//   - Path param accepts UUID **or** VIN (same slug as /images which is VIN).
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    assertOwnershipOrDeny,
    pickAllowed,
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";
import { VEHICLE_ALLOWED_FIELDS } from "@/src/lib/vehicle-fields";
import {
    assertDamageDisclosureForPublish,
    mergeDamageDisclosureState,
} from "@/src/lib/mvda-damage";
import { emitDealershipEvent } from "@/src/lib/api/webhooks";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolve /api/vehicles/:id where :id is either a vehicle UUID or a VIN. */
async function resolveVehicleId(
    supabase: SupabaseClient,
    raw: string
): Promise<
    | {
          id: string;
          dealership_id: string;
          status: string | null;
          known_damage: boolean | null;
          disclosure: string | null;
      }
    | null
    | { error: unknown }
> {
    const key = decodeURIComponent(raw).trim();
    if (!key) return null;

    const cols = "id, dealership_id, status, known_damage, disclosure";

    if (UUID_RE.test(key)) {
        const { data, error } = await supabase
            .from("vehicles")
            .select(cols)
            .eq("id", key)
            .single();
        if (error) {
            if (error.code === "PGRST116") return null;
            return { error };
        }
        return data;
    }

    const { data, error } = await supabase
        .from("vehicles")
        .select(cols)
        .eq("vin", key)
        .single();
    if (error) {
        if (error.code === "PGRST116") return null;
        return { error };
    }
    return data;
}

// GET single vehicle
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);
        const { id: rawId } = await params;

        const resolved = await resolveVehicleId(supabase, rawId);
        if (resolved && "error" in resolved) throw resolved.error;
        if (!resolved) {
            return NextResponse.json(
                { error: "Vehicle not found" },
                { status: 404 }
            );
        }

        const deny = assertOwnershipOrDeny(resolved, auth.profile);
        if (deny) return deny;

        // Re-fetch the full row now that ownership is verified
        const { data: full } = await supabase
            .from("vehicles")
            .select("*")
            .eq("id", resolved.id)
            .single();

        return NextResponse.json({ data: full });
    } catch (error: unknown) {
        console.error("Error fetching vehicle:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update vehicle
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);
        const { id: rawId } = await params;
        const payload = await req.json();

        // P1-3: ownership check FIRST so a non-existent row returns 404
        // (not 403, which would leak existence to a Salesperson who
        // happened to know the id). Path accepts UUID or VIN.
        const existing = await resolveVehicleId(supabase, rawId);
        if (existing && "error" in existing) throw existing.error;
        if (!existing) {
            return NextResponse.json(
                { error: "Vehicle not found" },
                { status: 404 }
            );
        }
        const id = existing.id;

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Whitelist the update payload and block dealership_id changes
        const safePayload = pickAllowed(payload, VEHICLE_ALLOWED_FIELDS);
        delete (safePayload as { dealership_id?: unknown }).dealership_id;

        if (typeof (safePayload as { features?: unknown }).features === "string") {
            const raw = (safePayload as { features: string }).features;
            (safePayload as { features: string[] }).features = raw
                .split(",")
                .map((f) => f.trim())
                .filter(Boolean);
        }

        if (Object.keys(safePayload).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        try {
            assertDamageDisclosureForPublish(
                mergeDamageDisclosureState(existing, {
                    status: (safePayload as { status?: string }).status,
                    known_damage: (safePayload as { known_damage?: boolean })
                        .known_damage,
                    disclosure: (safePayload as { disclosure?: string | null })
                        .disclosure,
                })
            );
        } catch (e) {
            return NextResponse.json(
                { error: e instanceof Error ? e.message : "Disclosure required" },
                { status: 400 }
            );
        }

        // Per-field permission gates run AFTER the 404 check above. P1-3.
        const userRole = auth.profile.role;
        const userPerms = auth.profile?.user_permissions || [];
        const isPlatformAdmin = auth.profile.is_platform_admin;

        const canManagePricing = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:pricing") ||
            userPerms.includes("*");

        const canManagePhotos = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:photos") ||
            userPerms.includes("vehicles:write") ||
            userPerms.includes("*");

        if (payload.retail_price !== undefined && !canManagePricing) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:pricing permission to modify pricing" },
                { status: 403 }
            );
        }
        if (payload.image_gallery !== undefined && !canManagePhotos) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:photos or vehicles:write permission to modify photos" },
                { status: 403 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("vehicles")
            .update(safePayload)
            .eq("id", id)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                );
            }
            if (dbError.code === "23505") {
                return NextResponse.json(
                    { error: "A vehicle with this VIN already exists" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        // Webhook dispatch (fire-and-forget; failures never fail the write).
        void emitDealershipEvent({
            dealershipId: auth.dealership_id,
            event: "inventory.updated",
            payload: {
                vehicle_id: data.id,
                vin: data.vin,
                year: data.year,
                make: data.make,
                model: data.model,
                status: data.status,
            },
        }).catch((err: unknown) =>
            console.error("inventory.updated webhook dispatch failed:", err)
        );

        return NextResponse.json({ data });
    } catch (error: unknown) {
        console.error("Error updating vehicle:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update vehicle (partial update)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);
        const { id: rawId } = await params;
        const payload = await req.json();

        // P1-3: ownership check FIRST. Path accepts UUID or VIN.
        const existing = await resolveVehicleId(supabase, rawId);
        if (existing && "error" in existing) throw existing.error;
        if (!existing) {
            return NextResponse.json(
                { error: "Vehicle not found" },
                { status: 404 }
            );
        }
        const id = existing.id;

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // F-09 fix: PATCH now uses the same field whitelist as PUT, so a
        // caller can't sneak in `dealership_id` or `user_id` and have it
        // pass through to the UPDATE.
        const safePayload = pickAllowed(payload, VEHICLE_ALLOWED_FIELDS);
        delete (safePayload as { dealership_id?: unknown }).dealership_id;

        if (typeof (safePayload as { features?: unknown }).features === "string") {
            const raw = (safePayload as { features: string }).features;
            (safePayload as { features: string[] }).features = raw
                .split(",")
                .map((f) => f.trim())
                .filter(Boolean);
        }

        if (Object.keys(safePayload).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        try {
            assertDamageDisclosureForPublish(
                mergeDamageDisclosureState(existing, {
                    status: (safePayload as { status?: string }).status,
                    known_damage: (safePayload as { known_damage?: boolean })
                        .known_damage,
                    disclosure: (safePayload as { disclosure?: string | null })
                        .disclosure,
                })
            );
        } catch (e) {
            return NextResponse.json(
                { error: e instanceof Error ? e.message : "Disclosure required" },
                { status: 400 }
            );
        }

        // Per-field permission gates run AFTER the 404 check (P1-3).
        const userRole = auth.profile.role;
        const userPerms = auth.profile?.user_permissions || [];
        const isPlatformAdmin = auth.profile.is_platform_admin;

        const canManagePricing = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:pricing") ||
            userPerms.includes("*");

        const canManagePhotos = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:photos") ||
            userPerms.includes("vehicles:write") ||
            userPerms.includes("*");

        if (payload.retail_price !== undefined && !canManagePricing) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:pricing permission to modify pricing" },
                { status: 403 }
            );
        }
        if (payload.image_gallery !== undefined && !canManagePhotos) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:photos or vehicles:write permission to modify photos" },
                { status: 403 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("vehicles")
            .update(safePayload)
            .eq("id", id)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                );
            }
            if (dbError.code === "23505") {
                return NextResponse.json(
                    { error: "A vehicle with this VIN already exists" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        // Webhook dispatch (fire-and-forget; failures never fail the write).
        void emitDealershipEvent({
            dealershipId: auth.dealership_id,
            event: "inventory.updated",
            payload: {
                vehicle_id: data.id,
                vin: data.vin,
                year: data.year,
                make: data.make,
                model: data.model,
                status: data.status,
            },
        }).catch((err: unknown) =>
            console.error("inventory.updated webhook dispatch failed:", err)
        );

        return NextResponse.json({ data });
    } catch (error: unknown) {
        console.error("Error updating vehicle:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE vehicle
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);
        const { id: rawId } = await params;

        // Assert ownership before any write. Path accepts UUID or VIN.
        const existing = await resolveVehicleId(supabase, rawId);
        if (existing && "error" in existing) throw existing.error;
        if (!existing) {
            return NextResponse.json(
                { error: "Vehicle not found" },
                { status: 404 }
            );
        }
        const id = existing.id;

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        const { error: dbError } = await supabase
            .from("vehicles")
            .delete()
            .eq("id", id);

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({
            success: true,
            message: "Vehicle deleted successfully"
        });
    } catch (error: unknown) {
        console.error("Error deleting vehicle:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
