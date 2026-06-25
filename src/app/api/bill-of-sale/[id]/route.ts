// app/api/bill-of-sale/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single bill of sale by ID
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const { data, error: dbError } = await supabase
            .from("bill_of_sale")
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery, status, condition, odometer),
                customer:customers(id, name, email, phone, address, city, province, postal_code),
                deal:sales_deals(id, deal_status, sale_price, down_payment, finance_term, interest_rate, finance_company, salesperson_id)
            `)
            .eq("id", id)
            .single();

        if (dbError) throw dbError;

        // Fetch payments
        const { data: payments } = await supabase
            .from("bill_of_sale_payments")
            .select("*")
            .eq("bill_of_sale_id", id)
            .order("payment_date", { ascending: true });

        data.payments = payments || [];

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching bill of sale:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update bill of sale
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const payload = await req.json();

        // Extract payments if provided for update
        const payments = payload.payments;
        delete payload.payments;

        // Convert empty date strings to null
        const cleanPayload = { ...payload };
        if (cleanPayload.payment_start_date === "") {
            cleanPayload.payment_start_date = null;
        }

        const { data, error: dbError } = await supabase
            .from("bill_of_sale")
            .update({
                ...cleanPayload,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select(`
                *,
                vehicle:vehicles(id, vin, year, make, model, retail_price, image_gallery),
                customer:customers(id, name, email, phone),
                deal:sales_deals(id, deal_status, sale_price)
            `)
            .single();

        if (dbError) throw dbError;

        // Update payments if provided
        if (payments !== undefined) {
            // Delete existing payments
            await supabase
                .from("bill_of_sale_payments")
                .delete()
                .eq("bill_of_sale_id", id);

            // Insert new payments
            if (payments.length > 0) {
                const paymentInserts = payments.map((p: any) => ({
                    ...p,
                    bill_of_sale_id: id,
                }));

                await supabase
                    .from("bill_of_sale_payments")
                    .insert(paymentInserts);
            }

            // Fetch updated payments
            const { data: updatedPayments } = await supabase
                .from("bill_of_sale_payments")
                .select("*")
                .eq("bill_of_sale_id", id)
                .order("payment_date", { ascending: true });

            data.payments = updatedPayments || [];
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating bill of sale:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE bill of sale
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Delete payments first (cascade should handle this, but being explicit)
        await supabase
            .from("bill_of_sale_payments")
            .delete()
            .eq("bill_of_sale_id", id);

        const { error: dbError } = await supabase
            .from("bill_of_sale")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting bill of sale:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
