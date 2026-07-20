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

        // Get current user's role and permissions
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        // First fetch the deal to check ownership
        const { data: deal, error: dealError } = await supabase
            .from("sales_deals")
            .select("*, dealership_id, salesperson_id")
            .eq("id", id)
            .single();

        if (dealError || !deal) {
            if (dealError?.code === "PGRST116" || !deal) {
                return NextResponse.json(
                    { error: "Deal not found" },
                    { status: 404 }
                );
            }
            throw dealError;
        }

        // Scoping: Salesperson/Staff can only view their own deals
        const isScopedUser = currentUser.role === "Salesperson" || currentUser.role === "Staff";
        if (isScopedUser && deal.salesperson_id !== user.id) {
            return NextResponse.json(
                { error: "Access denied - you can only view your own deals" },
                { status: 403 }
            );
        }

        // Dealership check for non-platform-admin
        if (!currentUser.is_platform_admin && deal.dealership_id !== currentUser.dealership_id) {
            return NextResponse.json(
                { error: "Access denied" },
                { status: 403 }
            );
        }

        // Now fetch full deal with relations
        const { data, error: dbError } = await supabase
            .from("sales_deals")
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status, condition),
                customer:customers(id, name, email, phone, address, city, province),
                salesperson:users!sales_deals_salesperson_id_fkey(id, full_name, email, avatar)
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
                salesperson:users!sales_deals_salesperson_id_fkey(id, full_name, email, avatar)
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

        // Get current user's permissions
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userRole = currentUser.role;
        const userPerms = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        const { id } = await params;
        const payload = await req.json();

        // Check deals:close permission for closing a deal (Paid Off)
        if (payload.deal_status === 'Paid Off') {
            const canCloseDeal = isPlatformAdmin ||
                userRole === "Admin" ||
                userRole === "Manager" ||
                userPerms.includes("deals:close") ||
                userPerms.includes("*");
            if (!canCloseDeal) {
                return NextResponse.json(
                    { error: "Forbidden - You need deals:close permission to close deals" },
                    { status: 403 }
                );
            }
        }

        // Check deals:cancel permission for cancelling a deal
        if (payload.deal_status === 'Cancelled') {
            const canCancelDeal = isPlatformAdmin ||
                userRole === "Admin" ||
                userRole === "Manager" ||
                userPerms.includes("deals:cancel") ||
                userPerms.includes("*");
            if (!canCancelDeal) {
                return NextResponse.json(
                    { error: "Forbidden - You need deals:cancel permission to cancel deals" },
                    { status: 403 }
                );
            }
        }

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
                salesperson:users!sales_deals_salesperson_id_fkey(id, full_name, email, avatar)
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
