import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

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

        // Get counts - using individual queries for better error handling
        const [
            vehiclesResult,
            customersResult,
            leadsResult,
            salesResult,
            invoicesResult,
            activeVehiclesResult,
            pendingInvoicesResult,
        ] = await Promise.all([
            supabase.from("vehicles").select("*", { count: "exact", head: true }),
            supabase.from("customers").select("*", { count: "exact", head: true }),
            supabase.from("leads").select("*", { count: "exact", head: true }),
            supabase.from("sales_deals").select("*", { count: "exact", head: true }),
            supabase.from("invoices").select("*", { count: "exact", head: true }),
            // Count vehicles that are not sold (Active or Available)
            supabase.from("vehicles")
                .select("*", { count: "exact", head: true })
                .neq("status", "Sold"),
            supabase.from("invoices").select("*", { count: "exact", head: true }).eq("status", "Pending"),
        ]);

        // Get recent sales
        const { data: recentSales, error: salesError } = await supabase
            .from("sales_deals")
            .select(`
                *,
                vehicle:vehicles(make, model, year),
                customer:customers(name),
                salesperson:users(full_name)
            `)
            .order("created_at", { ascending: false })
            .limit(5);

        if (salesError) {
            console.error("Error fetching recent sales:", salesError);
        }

        // Get recent leads
        const { data: recentLeads, error: leadsError } = await supabase
            .from("leads")
            .select(`
                *,
                customer:customers(name),
                assigned_user:users(full_name)
            `)
            .order("created_at", { ascending: false })
            .limit(5);

        if (leadsError) {
            console.error("Error fetching recent leads:", leadsError);
        }

        return NextResponse.json({
            stats: {
                totalVehicles: vehiclesResult.count || 0,
                totalCustomers: customersResult.count || 0,
                totalLeads: leadsResult.count || 0,
                totalSales: salesResult.count || 0,
                totalInvoices: invoicesResult.count || 0,
                activeVehicles: activeVehiclesResult.count || 0,
                pendingInvoices: pendingInvoicesResult.count || 0,
            },
            recentSales: recentSales || [],
            recentLeads: recentLeads || [],
        });
    } catch (error: any) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}