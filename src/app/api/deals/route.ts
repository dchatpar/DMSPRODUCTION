// app/api/deals/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

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

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

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

        if (status) query = query.eq("deal_status", status);
        if (q) {
            // Search on direct columns AND via FK lookups (two-step approach)
            // Step 1: Find matching customer IDs
            const { data: matchingCustomers } = await supabase
                .from("customers")
                .select("id")
                .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

            const customerIds = matchingCustomers?.map(c => c.id) || [];

            // Step 2: Find matching vehicle IDs (make/model/vin search)
            const { data: matchingVehicles } = await supabase
                .from("vehicles")
                .select("id")
                .or(`make.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%,stock_number.ilike.%${q}%`);

            const vehicleIds = matchingVehicles?.map(v => v.id) || [];

            // Apply search - direct columns OR customer match OR vehicle match
            query = query.or(
                `notes.ilike.%${q}%,deal_status.ilike.%${q}%,finance_company.ilike.%${q}%` +
                (customerIds.length > 0 ? `,customer_id.in.(${customerIds.join(',')})` : '') +
                (vehicleIds.length > 0 ? `,vehicle_id.in.(${vehicleIds.join(',')})` : '')
            );
        }

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
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

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const payload = await req.json();

        // Validate required fields
        const required = ["vehicle_id", "customer_id", "sale_price"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Validate deal_status if provided
        const validStatuses = ['Negotiation', 'Down Payment', 'Finance', 'Paid Off', 'Cancelled'];
        if (payload.deal_status && !validStatuses.includes(payload.deal_status)) {
            return NextResponse.json(
                { error: `Invalid deal_status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Set default values
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

        // If deal is marked as Paid Off, update vehicle status to Sold
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
