// app/api/invoices/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all invoices
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
        const invoiceDateFrom = url.searchParams.get("invoice_date_from");
        const invoiceDateTo = url.searchParams.get("invoice_date_to");

        let query = supabase
            .from("invoices")
            .select(`
                *,
                customer:customers(id, name, email, phone)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);
        if (q) {
            // Search only on invoice columns since PostgREST doesn't support FK refs in .or()
            query = query.or(`invoice_number.ilike.%${q}%,notes.ilike.%${q}%`);
        }
        if (invoiceDateFrom) query = query.gte("invoice_date", invoiceDateFrom);
        if (invoiceDateTo) query = query.lte("invoice_date", invoiceDateTo);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching invoices:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create invoice
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

        // Calculate tax and total if not provided
        const taxRate = payload.tax_rate ?? 13;
        const paymentAmount = parseFloat(payload.payment_amount) || 0;
        const taxAmount = (paymentAmount * taxRate) / 100;
        const total = paymentAmount + taxAmount;

        const { data, error: dbError } = await supabase
            .from("invoices")
            .insert({
                invoice_number: payload.invoice_number,
                customer_id: payload.customer_id,
                invoice_date: payload.invoice_date || new Date().toISOString().split("T")[0],
                due_date: payload.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                package_name: payload.package_name || null,
                payment_amount: paymentAmount,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                total: total,
                status: payload.status || 'Pending',
                notes: payload.notes || null,
            })
            .select(`
                *,
                customer:customers(id, name, email, phone)
            `)
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating invoice:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
