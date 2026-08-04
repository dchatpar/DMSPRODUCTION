// app/api/invoices/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import { assertOwnershipOrDeny, pickAllowed, requireDealershipAccess } from "@/src/lib/auth-helpers";

const INVOICE_ALLOWED_FIELDS = [
    "customer_id", "deal_id", "package_name", "tax_rate", "status",
    "due_date", "notes", "line_items", "invoice_number", "invoice_date",
    "payment_amount",
] as const;

// GET single invoice
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
            .from("invoices")
            .select("id, dealership_id")
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Re-fetch the full row with relations now that ownership is verified
        const { data, error: dbError } = await supabase
            .from("invoices")
            .select(`
                *,
                customer:customers(id, name, email, phone, address, city, province)
            `)
            .eq("id", id)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching invoice:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update invoice (full update)
export async function PUT(
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

        // Validate required fields
        const required = ["invoice_number", "customer_id", "payment_amount"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Validate status if provided
        const validStatuses = ['Pending', 'Paid', 'Overdue', 'Cancelled'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Assert ownership before any write
        const { data: existing, error: existingError } = await supabase
            .from("invoices")
            .select("id, dealership_id")
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Recalculate tax and total
        const taxRate = payload.tax_rate ?? 13;
        const paymentAmount = parseFloat(payload.payment_amount) || 0;
        const taxAmount = (paymentAmount * taxRate) / 100;
        const total = paymentAmount + taxAmount;

        // Whitelist the update payload and block dealership_id changes
        const safePayload = pickAllowed(payload, INVOICE_ALLOWED_FIELDS);
        delete (safePayload as any).dealership_id;

        const { data, error: dbError } = await supabase
            .from("invoices")
            .update({
                ...safePayload,
                payment_amount: paymentAmount,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                total: total,
            })
            .eq("id", id)
            .select(`
                *,
                customer:customers(id, name, email, phone)
            `)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating invoice:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update invoice (partial update)
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

        // Validate status if being updated
        if (payload.status) {
            const validStatuses = ['Pending', 'Paid', 'Overdue', 'Cancelled'];
            if (!validStatuses.includes(payload.status)) {
                return NextResponse.json(
                    { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        // Assert ownership before any write (include tax_rate for recalc)
        const { data: existing, error: existingError } = await supabase
            .from("invoices")
            .select("id, dealership_id, tax_rate, payment_amount")
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Whitelist the update payload and block dealership_id changes
        const safePayload = pickAllowed(payload, INVOICE_ALLOWED_FIELDS);
        delete (safePayload as any).dealership_id;

        // If payment_amount is being updated, recalculate tax and total
        const updates: Record<string, unknown> = { ...safePayload };
        if (payload.payment_amount !== undefined) {
            const paymentAmount = parseFloat(payload.payment_amount) || 0;
            const taxRate =
                payload.tax_rate !== undefined && payload.tax_rate !== null
                    ? parseFloat(payload.tax_rate)
                    : Number(existing.tax_rate) || 13;
            updates.tax_rate = taxRate;
            updates.tax_amount = (paymentAmount * taxRate) / 100;
            updates.total = paymentAmount + (updates.tax_amount as number);
            updates.payment_amount = paymentAmount;
        } else if (payload.tax_rate !== undefined && payload.tax_rate !== null) {
            const paymentAmount = Number(existing.payment_amount) || 0;
            const taxRate = parseFloat(payload.tax_rate);
            updates.tax_rate = taxRate;
            updates.tax_amount = (paymentAmount * taxRate) / 100;
            updates.total = paymentAmount + (updates.tax_amount as number);
        }

        const { data, error: dbError } = await supabase
            .from("invoices")
            .update(updates)
            .eq("id", id)
            .select(`
                *,
                customer:customers(id, name, email, phone)
            `)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating invoice:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE invoice
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
            .from("invoices")
            .select("id, dealership_id")
            .eq("id", id)
            .single();

        if (existingError) {
            if (existingError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw existingError;
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        const { error: dbError } = await supabase
            .from("invoices")
            .delete()
            .eq("id", id);

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Invoice not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({
            success: true,
            message: "Invoice deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting invoice:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
