// app/api/invoices/route.ts
import { getCurrentUser, handleApiError } from "@/src/lib/auth-helpers";
import { supabase } from "@/src/lib/supabase";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    try {
        const { user, error } = await getCurrentUser(req);
        if (error) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");

        let query = supabase
            .from("invoices")
            .select(`
        *,
        customer:customers(*)
      `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({ data: data || [], count: count || 0, limit, offset });
    } catch (error) {
        const { error: msg, status } = handleApiError(error);
        return NextResponse.json({ error: msg }, { status });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await getCurrentUser(req);
        if (error) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const payload = await req.json();
        const required = ["invoice_number", "customer_id", "payment_amount"];

        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Calculate tax and total
        const taxRate = payload.tax_rate || 13;
        const taxAmount = (payload.payment_amount * taxRate) / 100;
        const total = payload.payment_amount + taxAmount;

        const { data, error: dbError } = await supabase
            .from("invoices")
            .insert({
                ...payload,
                tax_amount: taxAmount,
                total: total,
                invoice_date: payload.invoice_date || new Date().toISOString().split("T")[0],
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        const { error: msg, status } = handleApiError(error);
        return NextResponse.json({ error: msg }, { status });
    }
}