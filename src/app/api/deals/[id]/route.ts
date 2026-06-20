// app/api/deals/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single deal
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const { data, error: dbError } = await supabase
            .from("sales_deals")
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status, condition),
                customer:customers(id, name, email, phone, address, city, province),
                salesperson:users(id, full_name, email, avatar)
            `)
            .eq("id", id)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Deal not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching deal:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update deal (full update)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
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

        const { data, error: dbError } = await supabase
            .from("sales_deals")
            .update({
                vehicle_id: payload.vehicle_id,
                customer_id: payload.customer_id,
                deal_status: payload.deal_status,
                finance_term: payload.finance_term,
                interest_rate: payload.interest_rate,
                down_payment: payload.down_payment,
                sale_price: payload.sale_price,
                salesperson_id: payload.salesperson_id,
                finance_company: payload.finance_company,
                notes: payload.notes,
                deal_date: payload.deal_date,
            })
            .eq("id", id)
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status, condition),
                customer:customers(id, name, email, phone),
                salesperson:users(id, full_name, email, avatar)
            `)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Deal not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        // Handle vehicle status change when deal is closed
        if (payload.deal_status === 'Paid Off') {
            await supabase
                .from("vehicles")
                .update({ status: 'Sold' })
                .eq("id", payload.vehicle_id);
        } else if (payload.deal_status === 'Cancelled') {
            // Optionally reset vehicle to Active when deal is cancelled
            await supabase
                .from("vehicles")
                .update({ status: 'Active' })
                .eq("id", payload.vehicle_id);
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating deal:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update deal (partial update)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const payload = await req.json();

        // Validate deal_status if being updated
        if (payload.deal_status) {
            const validStatuses = ['Negotiation', 'Down Payment', 'Finance', 'Paid Off', 'Cancelled'];
            if (!validStatuses.includes(payload.deal_status)) {
                return NextResponse.json(
                    { error: `Invalid deal_status. Must be one of: ${validStatuses.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        // Get current deal to know the vehicle_id for status updates
        const { data: currentDeal } = await supabase
            .from("sales_deals")
            .select("vehicle_id")
            .eq("id", id)
            .single();

        const { data, error: dbError } = await supabase
            .from("sales_deals")
            .update(payload)
            .eq("id", id)
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status, condition),
                customer:customers(id, name, email, phone),
                salesperson:users(id, full_name, email, avatar)
            `)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Deal not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        // Handle vehicle status change when deal status changes to Paid Off
        if (payload.deal_status === 'Paid Off' && currentDeal?.vehicle_id) {
            await supabase
                .from("vehicles")
                .update({ status: 'Sold' })
                .eq("id", currentDeal.vehicle_id);
        } else if (payload.deal_status === 'Cancelled' && currentDeal?.vehicle_id) {
            await supabase
                .from("vehicles")
                .update({ status: 'Active' })
                .eq("id", currentDeal.vehicle_id);
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating deal:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE deal
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        // Get the deal first to reset vehicle status
        const { data: deal } = await supabase
            .from("sales_deals")
            .select("vehicle_id, deal_status")
            .eq("id", id)
            .single();

        if (!deal) {
            return NextResponse.json(
                { error: "Deal not found" },
                { status: 404 }
            );
        }

        // If deal was Paid Off, reset vehicle to Active
        if (deal.deal_status === 'Paid Off' && deal.vehicle_id) {
            await supabase
                .from("vehicles")
                .update({ status: 'Active' })
                .eq("id", deal.vehicle_id);
        }

        const { error: dbError } = await supabase
            .from("sales_deals")
            .delete()
            .eq("id", id);

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Deal not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({
            success: true,
            message: "Deal deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting deal:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
