// Dealership locations (multi-location / rooftop) CRUD.
// Additive + backward-compatible: location_id is optional on records (NULL = legacy).
import { NextRequest, NextResponse } from "next/server";
import { requireDealershipAccess } from "@/src/lib/auth-helpers";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

function canManageSettings(profile: {
    role?: string | null;
    is_platform_admin?: boolean | null;
    user_permissions?: string[] | null;
}): boolean {
    if (profile.is_platform_admin) return true;
    if (profile.role === "Admin" || profile.role === "Manager") return true;
    const perms = profile.user_permissions || [];
    if (perms.includes("*")) return true;
    return perms.includes("settings:write") || perms.includes("settings:company");
}

const SELECT_COLS =
    "id, dealership_id, name, code, address, phone, email, is_active, is_primary, hours, settings, created_at, updated_at";

function shapeLocation(row: Record<string, unknown>) {
    return {
        id: row.id,
        dealership_id: row.dealership_id,
        name: row.name,
        code: row.code ?? null,
        address: row.address ?? null,
        phone: row.phone ?? null,
        email: row.email ?? null,
        is_active: row.is_active === true,
        is_primary: row.is_primary === true,
        hours: row.hours ?? null,
        settings: (row.settings || {}) as Record<string, unknown>,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/** GET locations for the caller's dealership (or ?dealership_id= for platform admins). */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        const url = new URL(req.url);
        const requestedId = url.searchParams.get("dealership_id");
        const dealershipId = auth.profile.is_platform_admin && requestedId
            ? requestedId
            : auth.profile.dealership_id;

        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership associated with this account" },
                { status: 400 }
            );
        }

        let query = supabaseAdmin
            .from("locations")
            .select(SELECT_COLS)
            .eq("dealership_id", dealershipId)
            .order("is_primary", { ascending: false })
            .order("created_at", { ascending: true });

        const includeInactive = url.searchParams.get("include_inactive") === "1";
        if (!includeInactive) {
            query = query.eq("is_active", true);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({
            data: (data || []).map((row) =>
                shapeLocation(row as Record<string, unknown>)
            ),
            can_edit: canManageSettings(auth.profile),
        });
    } catch (error: unknown) {
        console.error("Error fetching locations:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 }
        );
    }
}

/** POST create a location. */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }
        if (!canManageSettings(auth.profile)) {
            return NextResponse.json(
                { error: "Forbidden — Admin/Manager or settings:write required" },
                { status: 403 }
            );
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership associated with this account" },
                { status: 400 }
            );
        }

        const body = (await req.json()) as Record<string, unknown>;
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) {
            return NextResponse.json(
                { error: "Location name is required" },
                { status: 400 }
            );
        }

        // Only the first location can be primary automatically; promote/demote
        // is handled via PATCH { set_primary: true }.
        const { data: existing, error: countErr } = await supabaseAdmin
            .from("locations")
            .select("id", { count: "exact", head: true })
            .eq("dealership_id", dealershipId);
        if (countErr) throw countErr;
        const isFirst = (existing?.length ?? 0) === 0;

        const { data, error } = await supabaseAdmin
            .from("locations")
            .insert({
                dealership_id: dealershipId,
                name,
                code:
                    typeof body.code === "string" && body.code.trim()
                        ? body.code.trim()
                        : null,
                address:
                    typeof body.address === "string" && body.address.trim()
                        ? body.address.trim()
                        : null,
                phone:
                    typeof body.phone === "string" && body.phone.trim()
                        ? body.phone.trim()
                        : null,
                email:
                    typeof body.email === "string" && body.email.trim()
                        ? body.email.trim()
                        : null,
                hours:
                    typeof body.hours === "string" && body.hours.trim()
                        ? body.hours.trim()
                        : null,
                is_active: body.is_active !== false,
                is_primary: isFirst,
                settings: {},
            })
            .select(SELECT_COLS)
            .single();

        if (error) throw error;

        return NextResponse.json(
            { data: shapeLocation(data as Record<string, unknown>) },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("Error creating location:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 }
        );
    }
}

/** PATCH update a location. Body: { id, name?, code?, address?, phone?, email?, hours?, is_active?, set_primary? } */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }
        if (!canManageSettings(auth.profile)) {
            return NextResponse.json(
                { error: "Forbidden — Admin/Manager or settings:write required" },
                { status: 403 }
            );
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership associated with this account" },
                { status: 400 }
            );
        }

        const body = (await req.json()) as Record<string, unknown>;
        const id = typeof body.id === "string" ? body.id : null;
        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const { data: existing, error: loadErr } = await supabaseAdmin
            .from("locations")
            .select(SELECT_COLS)
            .eq("id", id)
            .maybeSingle();
        if (loadErr) throw loadErr;
        if (!existing || existing.dealership_id !== dealershipId) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        const patch: Record<string, unknown> = {};
        if (typeof body.name === "string") {
            const name = body.name.trim();
            if (!name) {
                return NextResponse.json(
                    { error: "Location name cannot be empty" },
                    { status: 400 }
                );
            }
            patch.name = name;
        }
        for (const field of ["code", "address", "phone", "email", "hours"] as const) {
            if (typeof body[field] === "string") {
                patch[field] = body[field].trim() || null;
            }
        }
        if (typeof body.is_active === "boolean") {
            patch.is_active = body.is_active;
        }

        const setPrimary = body.set_primary === true;
        if (setPrimary) {
            // Demote existing primary, promote this one — atomically.
            await supabaseAdmin
                .from("locations")
                .update({ is_primary: false })
                .eq("dealership_id", dealershipId)
                .eq("is_primary", true);
            patch.is_primary = true;
        }

        const { data, error } = await supabaseAdmin
            .from("locations")
            .update(patch)
            .eq("id", id)
            .select(SELECT_COLS)
            .single();
        if (error) throw error;

        return NextResponse.json({
            data: shapeLocation(data as Record<string, unknown>),
        });
    } catch (error: unknown) {
        console.error("Error updating location:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 }
        );
    }
}

/** DELETE a location (records keep location_id NULL'd via ON DELETE SET NULL). */
export async function DELETE(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }
        if (!canManageSettings(auth.profile)) {
            return NextResponse.json(
                { error: "Forbidden — Admin/Manager or settings:write required" },
                { status: 403 }
            );
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership associated with this account" },
                { status: 400 }
            );
        }

        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const { data: existing, error: loadErr } = await supabaseAdmin
            .from("locations")
            .select("id, dealership_id")
            .eq("id", id)
            .maybeSingle();
        if (loadErr) throw loadErr;
        if (!existing || existing.dealership_id !== dealershipId) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        const { error } = await supabaseAdmin
            .from("locations")
            .delete()
            .eq("id", id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting location:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 }
        );
    }
}
