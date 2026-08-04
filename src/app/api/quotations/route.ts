// app/api/quotations/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import {
    shouldScopeToAssigned,
    canViewAll,
    canCreate,
} from "@/src/lib/permission-middleware";

function makeQuoteNumber(): string {
    const d = new Date();
    const y = d.getFullYear().toString().slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `Q${y}${m}${day}-${rand}`;
}

export async function GET(req: NextRequest) {
    try {
        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
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
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50", 10);
        const offset = parseInt(url.searchParams.get("offset") || "0", 10);
        const status = url.searchParams.get("status");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("quotations")
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status),
                customer:customers(id, name, email, phone),
                salesperson:users!quotations_salesperson_id_fkey(id, full_name, email)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (!currentUser.is_platform_admin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json({ error: "No dealership context" }, { status: 403 });
            }
            query = query.eq("dealership_id", currentUser.dealership_id);
            const scopedToAssigned = shouldScopeToAssigned(currentUser.role, currentUser.user_permissions || []);
            const viewAll = canViewAll(currentUser.role, currentUser.user_permissions || []);
            if (scopedToAssigned || !viewAll) {
                query = query.eq("salesperson_id", user.id);
            }
        }

        if (status) query = query.eq("status", status);
        if (q) {
            query = query.or(`quote_number.ilike.%${q}%,notes.ilike.%${q}%,status.ilike.%${q}%`);
        }

        const { data, error: dbError, count } = await query;
        if (dbError) throw dbError;

        return NextResponse.json({ data: data || [], count: count || 0, limit, offset });
    } catch (error: unknown) {
        console.error("Error fetching quotations:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
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
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        // Reuse deals:write as create gate (quotes feed deals)
        if (!canCreate(currentUser.role, currentUser.user_permissions || [], "deals")) {
            return NextResponse.json({ error: "Forbidden - You cannot create quotations" }, { status: 403 });
        }

        if (!currentUser.dealership_id && !currentUser.is_platform_admin) {
            return NextResponse.json({ error: "No dealership context" }, { status: 403 });
        }

        if (!currentUser.dealership_id) {
            return NextResponse.json(
                {
                    error:
                        "No dealership context — cannot create a quotation without a dealership.",
                },
                { status: 403 }
            );
        }

        const payload = await req.json();
        if (payload.sale_price === undefined || payload.sale_price === null) {
            return NextResponse.json({ error: "Missing required field: sale_price" }, { status: 400 });
        }

        const validStatuses = ["Draft", "Sent", "Accepted", "Expired", "Converted", "Cancelled"];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
                { status: 400 }
            );
        }

        const row = {
            quote_number: payload.quote_number || makeQuoteNumber(),
            customer_id: payload.customer_id || null,
            vehicle_id: payload.vehicle_id || null,
            salesperson_id: payload.salesperson_id || user.id,
            status: payload.status || "Draft",
            sale_price: payload.sale_price,
            down_payment: payload.down_payment ?? 0,
            trade_in_value: payload.trade_in_value ?? 0,
            finance_term: payload.finance_term ?? null,
            interest_rate: payload.interest_rate ?? null,
            finance_company: payload.finance_company || null,
            tax_rate: payload.tax_rate ?? 13,
            admin_fee: payload.admin_fee ?? 0,
            monthly_payment: payload.monthly_payment ?? null,
            notes: payload.notes || null,
            valid_until: payload.valid_until || null,
            dealership_id: currentUser.dealership_id,
        };

        const { data, error: dbError } = await supabase
            .from("quotations")
            .insert(row)
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status),
                customer:customers(id, name, email, phone),
                salesperson:users!quotations_salesperson_id_fkey(id, full_name, email)
            `)
            .single();

        if (dbError) throw dbError;
        return NextResponse.json({ data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating quotation:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
