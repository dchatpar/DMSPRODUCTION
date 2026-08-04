// Dealership self-service business profile (not platform-admin-only).
import { NextRequest, NextResponse } from "next/server";
import {
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";

type DealershipSettings = Record<string, unknown>;

function asSettings(raw: unknown): DealershipSettings {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        return raw as DealershipSettings;
    }
    return {};
}

function canManageSettings(profile: {
    role?: string | null;
    is_platform_admin?: boolean | null;
    user_permissions?: string[] | null;
}): boolean {
    if (profile.is_platform_admin) return true;
    if (profile.role === "Admin" || profile.role === "Manager") return true;
    const perms = profile.user_permissions || [];
    if (perms.includes("*")) return true;
    return (
        perms.includes("settings:write") ||
        perms.includes("settings:company") ||
        perms.includes("settings:taxes")
    );
}

function canReadSettings(profile: {
    role?: string | null;
    is_platform_admin?: boolean | null;
    user_permissions?: string[] | null;
}): boolean {
    if (canManageSettings(profile)) return true;
    if (profile.role === "Salesperson" || profile.role === "Staff") return true;
    const perms = profile.user_permissions || [];
    return perms.includes("settings:read") || perms.includes("*");
}

const SELECT_COLS =
    "id, name, slug, business_name, business_address, business_phone, business_email, settings, status";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        if (!canReadSettings(auth.profile)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership associated with this account" },
                { status: 400 }
            );
        }

        const { supabase } = pickSupabaseClient(req, auth.profile);
        const { data, error } = await supabase
            .from("dealerships")
            .select(SELECT_COLS)
            .eq("id", dealershipId)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { error: "Dealership not found" },
                { status: 404 }
            );
        }

        const settings = asSettings(data.settings);
        return NextResponse.json({
            data: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                business_name: data.business_name,
                business_address: data.business_address,
                business_phone: data.business_phone,
                business_email: data.business_email,
                status: data.status,
                hst_number:
                    typeof settings.hst_number === "string"
                        ? settings.hst_number
                        : "",
                dealer_license:
                    typeof settings.dealer_license === "string"
                        ? settings.dealer_license
                        : typeof settings.license_number === "string"
                          ? settings.license_number
                          : "",
                autotrader_company_id:
                    typeof settings.autotrader_company_id === "string"
                        ? settings.autotrader_company_id
                        : "",
                autotrader_category_id:
                    typeof settings.autotrader_category_id === "string"
                        ? settings.autotrader_category_id
                        : "",
                settings,
                can_edit: canManageSettings(auth.profile),
            },
        });
    } catch (error: unknown) {
        console.error("Error fetching business settings:", error);
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
                { error: "Forbidden — settings:write or Admin/Manager required" },
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
        const { supabase } = pickSupabaseClient(req, auth.profile);

        const { data: existing, error: existingError } = await supabase
            .from("dealerships")
            .select(SELECT_COLS)
            .eq("id", dealershipId)
            .single();

        if (existingError || !existing) {
            return NextResponse.json(
                { error: "Dealership not found" },
                { status: 404 }
            );
        }

        const nextSettings = { ...asSettings(existing.settings) };
        if (typeof body.hst_number === "string") {
            nextSettings.hst_number = body.hst_number.trim();
        }
        if (typeof body.dealer_license === "string") {
            nextSettings.dealer_license = body.dealer_license.trim();
            nextSettings.license_number = body.dealer_license.trim();
        }
        if (typeof body.autotrader_company_id === "string") {
            nextSettings.autotrader_company_id =
                body.autotrader_company_id.trim();
        }
        if (typeof body.autotrader_category_id === "string") {
            nextSettings.autotrader_category_id =
                body.autotrader_category_id.trim();
        }

        const updatePayload: Record<string, unknown> = {
            settings: nextSettings,
        };

        if (typeof body.name === "string" && body.name.trim()) {
            updatePayload.name = body.name.trim();
        }
        if (typeof body.business_name === "string") {
            updatePayload.business_name = body.business_name.trim() || null;
        }
        if (typeof body.business_address === "string") {
            updatePayload.business_address =
                body.business_address.trim() || null;
        }
        if (typeof body.business_phone === "string") {
            updatePayload.business_phone = body.business_phone.trim() || null;
        }
        if (typeof body.business_email === "string") {
            updatePayload.business_email = body.business_email.trim() || null;
        }

        const { data, error } = await supabase
            .from("dealerships")
            .update(updatePayload)
            .eq("id", dealershipId)
            .select(SELECT_COLS)
            .single();

        if (error || !data) {
            throw error || new Error("Update failed");
        }

        const settings = asSettings(data.settings);
        return NextResponse.json({
            data: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                business_name: data.business_name,
                business_address: data.business_address,
                business_phone: data.business_phone,
                business_email: data.business_email,
                status: data.status,
                hst_number:
                    typeof settings.hst_number === "string"
                        ? settings.hst_number
                        : "",
                dealer_license:
                    typeof settings.dealer_license === "string"
                        ? settings.dealer_license
                        : typeof settings.license_number === "string"
                          ? settings.license_number
                          : "",
                autotrader_company_id:
                    typeof settings.autotrader_company_id === "string"
                        ? settings.autotrader_company_id
                        : "",
                autotrader_category_id:
                    typeof settings.autotrader_category_id === "string"
                        ? settings.autotrader_category_id
                        : "",
                settings,
                can_edit: true,
            },
        });
    } catch (error: unknown) {
        console.error("Error updating business settings:", error);
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
