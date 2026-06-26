// app/api/expenses/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single expense
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

        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("expenses")
            .select(`
                *,
                vendor:vendors(id, vendor_name, phone, gst_number, hst_number, pst_number, contact_name, contact_email, contact_phone),
                vehicle:vehicles(id, make, model, year, vin),
                entered_by_user:users!expenses_entered_by_fkey(id, full_name)
            `)
            .eq("id", id)
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Expense not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching expense:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update expense
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

        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const payload = await req.json();

        const validStatuses = ['Pending', 'Approved', 'Paid', 'Cancelled'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

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
        if (payload.category && !validCategories.includes(payload.category)) {
            return NextResponse.json(
                { error: `Invalid category.` },
                { status: 400 }
            );
        }

        const updateData: any = {};

        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.amount !== undefined) updateData.amount = payload.amount;
        if (payload.category !== undefined) updateData.category = payload.category;
        if (payload.vendor_id !== undefined) updateData.vendor_id = payload.vendor_id;
        if (payload.vehicle_id !== undefined) updateData.vehicle_id = payload.vehicle_id;
        if (payload.expense_date !== undefined) updateData.expense_date = payload.expense_date;
        if (payload.due_date !== undefined) updateData.due_date = payload.due_date;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.reference_number !== undefined) updateData.reference_number = payload.reference_number;
        if (payload.notes !== undefined) updateData.notes = payload.notes;
        if (payload.tax_amount !== undefined) updateData.tax_amount = payload.tax_amount;
        if (payload.payment_method !== undefined) updateData.payment_method = payload.payment_method;

        const { data, error: dbError } = await supabase
            .from("expenses")
            .update(updateData)
            .eq("id", id)
            .select(`
                *,
                vendor:vendors(id, vendor_name, phone, gst_number, hst_number, pst_number, contact_name, contact_email, contact_phone),
                vehicle:vehicles(id, make, model, year, vin),
                entered_by_user:users!expenses_entered_by_fkey(id, full_name)
            `)
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Expense not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating expense:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE expense
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

        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { error: dbError } = await supabase
            .from("expenses")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting expense:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
