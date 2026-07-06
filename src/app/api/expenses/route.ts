// app/api/expenses/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all expenses
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
        const category = url.searchParams.get("category");
        const status = url.searchParams.get("status");
        const vendor_id = url.searchParams.get("vendor_id");
        const startDate = url.searchParams.get("expense_date_from");
        const endDate = url.searchParams.get("expense_date_to");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("expenses")
            .select(`
                *,
                vendor:vendors(id, vendor_name, phone, gst_number, hst_number, pst_number),
                vehicle:vehicles(id, make, model, year, vin),
                entered_by_user:users!expenses_entered_by_fkey(id, full_name)
            `, { count: "exact" })
            .order("expense_date", { ascending: false })
            .range(offset, offset + limit - 1);

        if (category) query = query.eq("category", category);
        if (status) query = query.eq("status", status);
        if (vendor_id) query = query.eq("vendor_id", vendor_id);
        if (startDate) query = query.gte("expense_date", startDate);
        if (endDate) query = query.lte("expense_date", endDate);
        if (q) {
            query = query.or(`description.ilike.%${q}%,reference_number.ilike.%${q}%`);
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
        console.error("Error fetching expenses:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create expense
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
        if (!payload.amount || payload.amount <= 0) {
            return NextResponse.json(
                { error: "Amount must be greater than 0" },
                { status: 400 }
            );
        }

        if (!payload.category) {
            return NextResponse.json(
                { error: "Category is required" },
                { status: 400 }
            );
        }

        if (!payload.expense_date) {
            return NextResponse.json(
                { error: "Expense date is required" },
                { status: 400 }
            );
        }

        // Validate status if provided
        const validStatuses = ['Pending', 'Approved', 'Paid', 'Cancelled'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate category
        const validCategories = [
            'Vehicle Acquisition',
            'Repair & Maintenance',
            'Parts & Supplies',
            'Utilities',
            'Rent & Lease',
            'Insurance',
            'Marketing',
            'Office Supplies',
            'Professional Services',
            'Travel & Entertainment',
            'Payroll',
            'Taxes & Licenses',
            'Interest & Finance',
            'Miscellaneous'
        ];
        if (!validCategories.includes(payload.category)) {
            return NextResponse.json(
                { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            );
        }

        const expenseData = {
            description: payload.description || null,
            amount: payload.amount,
            category: payload.category,
            vendor_id: payload.vendor_id || null,
            vehicle_id: payload.vehicle_id || null,
            expense_date: payload.expense_date,
            due_date: payload.due_date || null,
            status: payload.status || 'Pending',
            reference_number: payload.reference_number || null,
            notes: payload.notes || null,
            entered_by: user.id,
            tax_amount: payload.tax_amount || 0,
            payment_method: payload.payment_method || null,
        };

        const { data, error: dbError } = await supabase
            .from("expenses")
            .insert(expenseData)
            .select(`
                *,
                vendor:vendors(id, vendor_name, phone, gst_number, hst_number, pst_number),
                vehicle:vehicles(id, make, model, year, vin),
                entered_by_user:users!expenses_entered_by_fkey(id, full_name)
            `)
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating expense:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
