// app/api/expenses/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import { assertOwnershipOrDeny, pickAllowed, requireDealershipAccess } from "@/src/lib/auth-helpers";

const EXPENSE_ALLOWED_FIELDS = [
    "category", "amount", "description", "status", "vendor_id",
    // Schema-actual columns used by the expenses table
    "expense_date", "due_date", "reference_number", "notes", "tax_amount",
    "payment_method", "vehicle_id",
] as const;

// GET single expense
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

        // Narrow fetch first to assert ownership
        const { data: existing, error: existingError } = await supabase
            .from("expenses")
            .select("id, dealership_id")
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Expense not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Re-fetch the full row with relations
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
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

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

        // Assert ownership before any write
        const { data: existing, error: existingError } = await supabase
            .from("expenses")
            .select("id, dealership_id")
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Expense not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Whitelist the update payload and block dealership_id changes
        const safePayload = pickAllowed(payload, EXPENSE_ALLOWED_FIELDS);
        delete (safePayload as any).dealership_id;

        const { data, error: dbError } = await supabase
            .from("expenses")
            .update(safePayload)
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
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

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

        // Assert ownership before any write
        const { data: existing, error: existingError } = await supabase
            .from("expenses")
            .select("id, dealership_id")
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Expense not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

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
