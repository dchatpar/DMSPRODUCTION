import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

function calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

function getStartOfPeriod(period: 'month' | 'quarter' | 'year'): string {
    const now = new Date();
    if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString();
    } else {
        return new Date(now.getFullYear(), 0, 1).toISOString();
    }
}

function getStartOfPreviousPeriod(period: 'month' | 'quarter' | 'year'): string {
    const now = new Date();
    if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    } else if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        if (currentQuarter === 0) {
            return new Date(now.getFullYear() - 1, 9, 1).toISOString();
        }
        return new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1).toISOString();
    } else {
        return new Date(now.getFullYear() - 1, 0, 1).toISOString();
    }
}

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

        // Dealership scope for any service-role aggregates (defense in depth).
        const { data: profile } = await supabase
            .from("users")
            .select("dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!profile?.dealership_id && !profile?.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - No dealership context" },
                { status: 403 }
            );
        }

        const dealershipId = profile?.dealership_id ?? null;

        const monthStart = getStartOfPeriod('month');
        const previousMonthStart = getStartOfPreviousPeriod('month');
        const quarterStart = getStartOfPeriod('quarter');
        const previousQuarterStart = getStartOfPreviousPeriod('quarter');

        // Get counts - using individual queries for better error handling
        // Active inventory must match StatCard deep link `/inventory?status=Active`
        const [
            vehiclesResult,
            customersResult,
            leadsResult,
            salesResult,
            invoicesResult,
            activeVehiclesResult,
            pendingInvoicesResult,
            // Previous period counts for percentage calculations
            prevVehiclesResult,
            prevCustomersResult,
            prevLeadsResult,
            prevSalesResult,
            prevInvoicesResult,
            prevActiveVehiclesResult,
            // KPI specific queries
            closedDealsResult,
            totalDealsResult,
            usersResult,
            leadsWithEngagementResult,
        ] = await Promise.all([
            supabase.from("vehicles").select("*", { count: "exact", head: true }),
            supabase.from("customers").select("*", { count: "exact", head: true }),
            supabase.from("leads").select("*", { count: "exact", head: true }),
            supabase.from("sales_deals").select("*", { count: "exact", head: true }),
            supabase.from("invoices").select("*", { count: "exact", head: true }),
            supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "Active"),
            supabase.from("invoices").select("*", { count: "exact", head: true }).eq("status", "Pending"),
            // Previous month counts for percentage change
            supabase.from("vehicles").select("*", { count: "exact", head: true }).gte("created_at", previousMonthStart).lt("created_at", monthStart),
            supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", previousMonthStart).lt("created_at", monthStart),
            supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", previousMonthStart).lt("created_at", monthStart),
            supabase.from("sales_deals").select("*", { count: "exact", head: true }).gte("created_at", previousMonthStart).lt("created_at", monthStart),
            supabase.from("invoices").select("*", { count: "exact", head: true }).gte("created_at", previousMonthStart).lt("created_at", monthStart),
            supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "Active").gte("created_at", previousMonthStart).lt("created_at", monthStart),
            // KPI: Closed deals count
            supabase.from("sales_deals").select("*", { count: "exact", head: true }).eq("deal_status", "Closed"),
            // KPI: Total deals for completion rate
            supabase.from("sales_deals").select("*", { count: "exact", head: true }),
            // KPI: Active users count (F-06: column is is_active boolean, not status text)
            supabase.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
            // KPI: Avg response time - leads with last_engagement
            supabase.from("leads").select("lead_creation_date, last_engagement").not("last_engagement", "is", null),
        ]);

        // Calculate percentage changes (month over month)
        const totalVehicles = vehiclesResult.count || 0;
        const totalCustomers = customersResult.count || 0;
        const totalLeads = leadsResult.count || 0;
        const totalSales = salesResult.count || 0;
        const totalInvoices = invoicesResult.count || 0;
        const activeVehicles = activeVehiclesResult.count || 0;
        const pendingInvoices = pendingInvoicesResult.count || 0;

        const prevVehicles = prevVehiclesResult.count || 0;
        const prevCustomers = prevCustomersResult.count || 0;
        const prevLeads = prevLeadsResult.count || 0;
        const prevSales = prevSalesResult.count || 0;
        const prevInvoices = prevInvoicesResult.count || 0;
        const prevActiveVehicles = prevActiveVehiclesResult.count || 0;

        // Calculate KPI metrics
        const closedDeals = closedDealsResult.count || 0;
        const totalDeals = totalDealsResult.count || 0;
        const activeUsers = usersResult.count || 0;

        // Calculate completion rate
        const completionRate = totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0;

        // Calculate revenue growth (comparing this quarter to previous quarter)
        // Get sales amounts for current and previous quarter
        const { data: currentQuarterSales } = await supabase
            .from("sales_deals")
            .select("sale_price")
            .gte("created_at", quarterStart)
            .eq("deal_status", "Closed");

        const { data: previousQuarterSales } = await supabase
            .from("sales_deals")
            .select("sale_price")
            .gte("created_at", previousQuarterStart)
            .lt("created_at", quarterStart)
            .eq("deal_status", "Closed");

        const currentRevenue = currentQuarterSales?.reduce((sum, deal) => sum + (deal.sale_price || 0), 0) || 0;
        const previousRevenue = previousQuarterSales?.reduce((sum, deal) => sum + (deal.sale_price || 0), 0) || 0;
        const revenueGrowth = previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

        // Calculate average response time
        let avgResponseHours = 0;
        const leadsWithEngagement = leadsWithEngagementResult?.data || [];
        if (leadsWithEngagement.length > 0) {
            const totalResponseTime = leadsWithEngagement.reduce((sum, lead) => {
                if (lead.lead_creation_date && lead.last_engagement) {
                    const created = new Date(lead.lead_creation_date).getTime();
                    const engaged = new Date(lead.last_engagement).getTime();
                    return sum + (engaged - created);
                }
                return sum;
            }, 0);
            const avgResponseMs = totalResponseTime / leadsWithEngagement.length;
            avgResponseHours = Math.round(avgResponseMs / (1000 * 60 * 60) * 10) / 10; // Round to 1 decimal
        }

        // Total revenue = sum of sale_price across deals (real money, not a count).
        // Use supabaseAdmin to bypass flaky JWT/RLS mapping, but ALWAYS scope by
        // dealership_id — never sum every tenant (P0 tenant isolation).
        let revenueQuery = supabaseAdmin.from("sales_deals").select("sale_price");
        if (dealershipId) {
            revenueQuery = revenueQuery.eq("dealership_id", dealershipId);
        }
        const { data: allDeals } = await revenueQuery;
        const totalRevenue = (allDeals || []).reduce((sum, deal) => sum + (deal.sale_price || 0), 0);

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
                totalVehicles,
                totalCustomers,
                totalLeads,
                totalSales,
                totalInvoices,
                activeVehicles,
                pendingInvoices,
                totalRevenue,
            },
            changes: {
                vehicles: calculatePercentageChange(totalVehicles, prevVehicles),
                customers: calculatePercentageChange(totalCustomers, prevCustomers),
                leads: calculatePercentageChange(totalLeads, prevLeads),
                sales: calculatePercentageChange(totalSales, prevSales),
                invoices: calculatePercentageChange(totalInvoices, prevInvoices),
                activeVehicles: calculatePercentageChange(activeVehicles, prevActiveVehicles),
            },
            kpis: {
                completionRate,
                revenueGrowth,
                activeUsers,
                avgResponseHours,
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