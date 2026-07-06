// app/api/reports/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET reports data
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
        const reportType = url.searchParams.get("type") || "summary";
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");

        const dateFilter = startDate && endDate
            ? { start: startDate, end: endDate }
            : null;

        // Get current quarter start
        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString();

        switch (reportType) {
            case "sales":
                return await getSalesReport(supabase, dateFilter, quarterStart);
            case "inventory":
                return await getInventoryReport(supabase);
            case "financial":
                return await getFinancialReport(supabase, dateFilter, quarterStart);
            case "leads":
                return await getLeadsReport(supabase, dateFilter);
            case "expenses":
                return await getExpensesReport(supabase, dateFilter);
            default:
                return await getSummaryReport(supabase, quarterStart);
        }
    } catch (error: any) {
        console.error("Error fetching reports:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

async function getSummaryReport(supabase: any, quarterStart: string) {
    const now = new Date();
    // Total sales this quarter - use Paid Off as completed status
    const { data: salesData } = await supabase
        .from("sales_deals")
        .select("sale_price, created_at")
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("created_at", quarterStart);

    const totalSalesRevenue = salesData?.reduce((sum: number, d: any) => sum + (d.sale_price || 0), 0) || 0;
    const totalDeals = salesData?.length || 0;

    // Inventory stats
    const { count: totalVehicles } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true });

    const { count: activeVehicles } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active");

    const { count: soldVehicles } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("status", "Sold");

    // Leads stats
    const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

    const { count: newLeadsThisMonth } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("lead_creation_date", new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

    // Expenses this quarter
    const { data: expensesData } = await supabase
        .from("expenses")
        .select("amount, tax_amount")
        .eq("status", "Paid")
        .gte("expense_date", quarterStart);

    const totalExpenses = expensesData?.reduce((sum: number, e: any) => sum + (e.amount || 0) + (e.tax_amount || 0), 0) || 0;

    // Average deal price
    const avgDealPrice = totalDeals > 0 ? totalSalesRevenue / totalDeals : 0;

    // Profit calculation (estimate)
    const { data: vehiclesCostData } = await supabase
        .from("vehicles")
        .select("purchase_price, retail_price")
        .eq("status", "Sold")
        .gte("updated_at", quarterStart);

    const totalProfit = vehiclesCostData?.reduce((sum: number, v: any) => {
        return sum + ((v.retail_price || 0) - (v.purchase_price || 0));
    }, 0) || 0;

    return NextResponse.json({
        reportType: "summary",
        period: "This Quarter",
        data: {
            sales: {
                totalRevenue: totalSalesRevenue,
                totalDeals,
                avgDealPrice,
            },
            inventory: {
                totalVehicles: totalVehicles || 0,
                activeVehicles: activeVehicles || 0,
                soldVehicles: soldVehicles || 0,
            },
            leads: {
                totalLeads: totalLeads || 0,
                newLeadsThisMonth: newLeadsThisMonth || 0,
            },
            profit: {
                totalProfit,
                profitMargin: totalSalesRevenue > 0 ? (totalProfit / totalSalesRevenue) * 100 : 0,
            },
            expenses: {
                totalExpenses,
                netIncome: totalSalesRevenue - totalExpenses,
            },
        },
    });
}

async function getSalesReport(supabase: any, dateFilter: any, quarterStart: string) {
    const startDate = dateFilter?.start || quarterStart;
    const endDate = dateFilter?.end || new Date().toISOString();

    // Sales by day - use Paid Off as completed status
    const { data: dailySales } = await supabase
        .from("sales_deals")
        .select(`
            deal_date,
            sale_price,
            vehicle:vehicles(make, model, year),
            customer:customers(name)
        `)
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("deal_date", startDate.split("T")[0])
        .lte("deal_date", endDate.split("T")[0])
        .order("deal_date", { ascending: true });

    // Group by date
    const salesByDate: Record<string, { count: number; revenue: number }> = {};
    dailySales?.forEach((sale: any) => {
        const date = sale.deal_date.split("T")[0];
        if (!salesByDate[date]) salesByDate[date] = { count: 0, revenue: 0 };
        salesByDate[date].count += 1;
        salesByDate[date].revenue += sale.sale_price || 0;
    });

    // Sales by vehicle type
    const { data: vehicles } = await supabase
        .from("vehicles")
        .select("make, model, count");

    // Top performing salespeople
    const { data: topSalespeople } = await supabase
        .from("sales_deals")
        .select(`
            sale_price,
            salesperson:users(full_name)
        `)
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("created_at", startDate);

    const salesBySalesperson: Record<string, { name: string; deals: number; revenue: number }> = {};
    topSalespeople?.forEach((deal: any) => {
        const name = deal.salesperson?.full_name || "Unknown";
        if (!salesBySalesperson[name]) {
            salesBySalesperson[name] = { name, deals: 0, revenue: 0 };
        }
        salesBySalesperson[name].deals += 1;
        salesBySalesperson[name].revenue += deal.sale_price || 0;
    });

    const topSalespeopleArray = Object.values(salesBySalesperson)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);

    // Summary
    const totalRevenue = dailySales?.reduce((sum: number, d: any) => sum + (d.sale_price || 0), 0) || 0;
    const totalDeals = dailySales?.length || 0;

    return NextResponse.json({
        reportType: "sales",
        period: { startDate, endDate },
        data: {
            summary: {
                totalRevenue,
                totalDeals,
                avgDealPrice: totalDeals > 0 ? totalRevenue / totalDeals : 0,
            },
            salesByDate: Object.entries(salesByDate).map(([date, data]) => ({
                date,
                ...data as { count: number; revenue: number }
            })),
            topSalespeople: topSalespeopleArray,
        },
    });
}

async function getInventoryReport(supabase: any) {
    try {
        // Inventory by status
        const { data: byStatus } = await supabase
            .from("vehicles")
            .select("status");

        // Group by status
        const statusCounts: Record<string, number> = {};
        byStatus?.forEach((v: any) => {
            statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
        });

        // Inventory by make
        const { data: byMake } = await supabase
            .from("vehicles")
            .select("make, model, purchase_price, retail_price, status");

        const makeCounts: Record<string, { count: number; totalValue: number; avgProfit: number }> = {};
        byMake?.forEach((v: any) => {
            if (!makeCounts[v.make]) {
                makeCounts[v.make] = { count: 0, totalValue: 0, avgProfit: 0 };
            }
            makeCounts[v.make].count += 1;
            if (v.status === "Active") {
                makeCounts[v.make].totalValue += v.retail_price || 0;
            }
        });

        // Inventory value
        const { data: activeVehicles } = await supabase
            .from("vehicles")
            .select("purchase_price, retail_price, extra_costs, taxes")
            .eq("status", "Active");

        const totalInventoryValue = activeVehicles?.reduce((sum: number, v: any) => sum + (v.retail_price || 0), 0) || 0;
        const totalInventoryCost = activeVehicles?.reduce((sum: number, v: any) => {
            return sum + (v.purchase_price || 0) + (v.extra_costs || 0) + (v.taxes || 0);
        }, 0) || 0;

        // Aging inventory - check if column exists first
        let agingCount = 0;
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: agingData } = await supabase
                .from("vehicles")
                .select("id")
                .eq("status", "Active")
                .lt("created_at", thirtyDaysAgo.toISOString());

            agingCount = agingData?.length || 0;
        } catch (e) {
            // Ignore aging query errors
        }

        return NextResponse.json({
            reportType: "inventory",
            data: {
                summary: {
                    totalVehicles: byMake?.length || 0,
                    activeVehicles: statusCounts["Active"] || 0,
                    totalInventoryValue,
                    totalInventoryCost,
                    potentialProfit: totalInventoryValue - totalInventoryCost,
                    agingCount,
                },
                byStatus: statusCounts,
                byMake: Object.entries(makeCounts).map(([make, data]) => ({
                    make,
                    ...data as { count: number; totalValue: number; avgProfit: number }
                })),
            },
        });
    } catch (error) {
        console.error("Inventory report error:", error);
        return NextResponse.json({ error: "Failed to generate inventory report" }, { status: 500 });
    }
}

async function getFinancialReport(supabase: any, dateFilter: any, quarterStart: string) {
    const startDate = dateFilter?.start || quarterStart;
    const endDate = dateFilter?.end || new Date().toISOString();

    // Revenue from sales
    const { data: salesData } = await supabase
        .from("sales_deals")
        .select("sale_price")
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("deal_date", startDate.split("T")[0])
        .lte("deal_date", endDate.split("T")[0]);

    const totalRevenue = salesData?.reduce((sum: number, d: any) => sum + (d.sale_price || 0), 0) || 0;

    // Expenses
    const { data: expensesData } = await supabase
        .from("expenses")
        .select("amount, category")
        .eq("status", "Paid")
        .gte("expense_date", startDate.split("T")[0])
        .lte("expense_date", endDate.split("T")[0]);

    const totalExpenses = expensesData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    expensesData?.forEach((e: any) => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (e.amount || 0);
    });

    // Outstanding invoices
    const { data: outstandingInvoices } = await supabase
        .from("invoices")
        .select("total")
        .neq("status", "Paid");

    const totalOutstanding = outstandingInvoices?.reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0;

    // Net income
    const netIncome = totalRevenue - totalExpenses;

    return NextResponse.json({
        reportType: "financial",
        period: { startDate, endDate },
        data: {
            summary: {
                totalRevenue,
                totalExpenses,
                netIncome,
                profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
            },
            expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
                category,
                amount,
            })),
            outstandingInvoices: {
                count: outstandingInvoices?.length || 0,
                total: totalOutstanding,
            },
        },
    });
}

async function getLeadsReport(supabase: any, dateFilter: any) {
    const now = new Date();
    const startDate = dateFilter?.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = dateFilter?.end || now.toISOString();

    // Lead stats
    const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

    const { count: newLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("lead_creation_date", startDate.split("T")[0])
        .lte("lead_creation_date", endDate.split("T")[0]);

    // Leads by source
    const { data: leadsBySource } = await supabase
        .from("leads")
        .select("source");

    const sourceCounts: Record<string, number> = {};
    leadsBySource?.forEach((l: any) => {
        sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
    });

    // Leads by status
    const { data: leadsByStatus } = await supabase
        .from("leads")
        .select("status");

    const statusCounts: Record<string, number> = {};
    leadsByStatus?.forEach((l: any) => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });

    // Conversion rate (leads that became deals)
    const { count: convertedLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "Closed");

    const conversionRate = totalLeads && totalLeads > 0
        ? ((convertedLeads || 0) / totalLeads) * 100
        : 0;

    return NextResponse.json({
        reportType: "leads",
        period: { startDate, endDate },
        data: {
            summary: {
                totalLeads: totalLeads || 0,
                newLeads: newLeads || 0,
                convertedLeads: convertedLeads || 0,
                conversionRate,
            },
            bySource: Object.entries(sourceCounts).map(([source, count]) => ({
                source,
                count,
            })),
            byStatus: Object.entries(statusCounts).map(([status, count]) => ({
                status,
                count,
            })),
        },
    });
}

async function getExpensesReport(supabase: any, dateFilter: any) {
    const now = new Date();
    const startDate = dateFilter?.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = dateFilter?.end || now.toISOString();

    // All expenses
    const { data: allExpenses } = await supabase
        .from("expenses")
        .select("amount, category, status, expense_date");

    // By category
    const byCategory: Record<string, { count: number; total: number }> = {};
    allExpenses?.forEach((e: any) => {
        if (!byCategory[e.category]) {
            byCategory[e.category] = { count: 0, total: 0 };
        }
        byCategory[e.category].count += 1;
        byCategory[e.category].total += e.amount || 0;
    });

    // By status
    const byStatus: Record<string, number> = {};
    allExpenses?.forEach((e: any) => {
        byStatus[e.status] = (byStatus[e.status] || 0) + (e.amount || 0);
    });

    // Paid vs pending
    const paidExpenses = allExpenses?.filter((e: any) => e.status === "Paid").reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const pendingExpenses = allExpenses?.filter((e: any) => e.status === "Pending" || e.status === "Approved").reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

    const totalExpenses = allExpenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

    return NextResponse.json({
        reportType: "expenses",
        period: { startDate, endDate },
        data: {
            summary: {
                totalExpenses,
                paidExpenses,
                pendingExpenses,
                expenseCount: allExpenses?.length || 0,
            },
            byCategory: Object.entries(byCategory).map(([category, data]) => ({
                category,
                ...data as { count: number; total: number }
            })),
            byStatus: Object.entries(byStatus).map(([status, amount]) => ({
                status,
                amount,
            })),
        },
    });
}
