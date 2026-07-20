// app/api/deals/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import {
    shouldScopeToAssigned,
    canViewAll,
    canCreate,
} from "@/src/lib/permission-middleware";

// GET all deals
export async function GET(req: NextRequest) {
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // Get user profile
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userRole = currentUser.role;
        const userPermissions = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("sales_deals")
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status, condition),
                customer:customers(id, name, email, phone),
                salesperson:users!sales_deals_salesperson_id_fkey(id, full_name, email, avatar)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Platform admin sees all
        if (!isPlatformAdmin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json({ error: "No dealership context" }, { status: 403 });
            }

            query = query.eq("dealership_id", currentUser.dealership_id);

            // Scope to assigned deals for Salesperson/Staff
            const scopedToAssigned = shouldScopeToAssigned(userRole, userPermissions);
            const viewAllDeals = canViewAll(userRole, userPermissions);

            if (scopedToAssigned || !viewAllDeals) {
                query = query.eq("salesperson_id", user.id);
            }
        }

        if (status) query = query.eq("deal_status", status);
        if (q) {
            const { data: matchingCustomers } = await supabase
                .from("customers")
                .select("id")
                .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

            const customerIds = matchingCustomers?.map(c => c.id) || [];

            const { data: matchingVehicles } = await supabase
                .from("vehicles")
                .select("id")
                .or(`make.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%,stock_number.ilike.%${q}%`);

            const vehicleIds = matchingVehicles?.map(v => v.id) || [];

            query = query.or(
                `notes.ilike.%${q}%,deal_status.ilike.%${q}%,finance_company.ilike.%${q}%` +
                (customerIds.length > 0 ? `,customer_id.in.(${customerIds.join(',')})` : '') +
                (vehicleIds.length > 0 ? `,vehicle_id.in.(${vehicleIds.join(',')})` : '')
            );
        }

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({ data: data || [], count: count || 0, limit, offset });
    } catch (error: any) {
        console.error("Error fetching deals:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create deal
export async function POST(req: NextRequest) {
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        // Check permission using centralized helper
        if (!canCreate(currentUser.role, currentUser.user_permissions || [], "deals")) {
            return NextResponse.json({ error: "Forbidden - You cannot create deals" }, { status: 403 });
        }

        const payload = await req.json();

        const required = ["vehicle_id", "customer_id", "sale_price"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const validStatuses = ['Negotiation', 'Down Payment', 'Finance', 'Paid Off', 'Cancelled'];
        if (payload.deal_status && !validStatuses.includes(payload.deal_status)) {
            return NextResponse.json(
                { error: `Invalid deal_status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        const dealData = {
            vehicle_id: payload.vehicle_id,
            customer_id: payload.customer_id,
            deal_status: payload.deal_status || 'Negotiation',
            finance_term: payload.finance_term || null,
            interest_rate: payload.interest_rate || null,
            down_payment: payload.down_payment || 0,
            sale_price: payload.sale_price,
            salesperson_id: payload.salesperson_id || user.id,
            finance_company: payload.finance_company || null,
            notes: payload.notes || null,
            deal_date: payload.deal_date || new Date().toISOString().split('T')[0],
            dealership_id: currentUser.dealership_id,
        };

        const { data, error: dbError } = await supabase
            .from("sales_deals")
            .insert(dealData)
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status, condition),
                customer:customers(id, name, email, phone),
                salesperson:users!sales_deals_salesperson_id_fkey(id, full_name, email, avatar)
            `)
            .single();

        if (dbError) throw dbError;

        if (payload.deal_status === 'Paid Off' || payload.close_deal) {
            await supabase
                .from("vehicles")
                .update({ status: 'Sold' })
                .eq("id", payload.vehicle_id);
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating deal:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
