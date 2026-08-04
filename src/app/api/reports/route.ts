// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    pickSupabaseClient,
    requireDealershipAccess,
} from "@/src/lib/auth-helpers";

type DateFilter = { start: string; end: string } | null;
type SupabaseClient = ReturnType<typeof pickSupabaseClient>["supabase"];

function applyDealershipScope(
    query: any,
    dealershipId: string | null,
    _isPlatformAdmin: boolean
) {
    // Defense-in-depth on top of RLS. Platform admins without a dealership_id
    // remain unscoped (admin client). Everyone else with a dealership_id is scoped.
    if (dealershipId) {
        return query.eq("dealership_id", dealershipId);
    }
    return query;
}

function dateOnly(iso: string): string {
    return iso.includes("T") ? iso.split("T")[0]! : iso;
}

// GET reports data
export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId && !auth.profile.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - No dealership context" },
                { status: 403 }
            );
        }

        const { supabase, isPlatformAdmin } = pickSupabaseClient(
            req,
            auth.profile
        );

        const url = new URL(req.url);
        const reportType = url.searchParams.get("type") || "summary";
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");

        const dateFilter: DateFilter =
            startDate && endDate ? { start: startDate, end: endDate } : null;

        const now = new Date();
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(
            now.getFullYear(),
            currentQuarter * 3,
            1
        ).toISOString();

        const scope = {
            dealershipId: dealershipId || null,
            isPlatformAdmin,
        };

        switch (reportType) {
            case "sales":
                return await getSalesReport(
                    supabase,
                    dateFilter,
                    quarterStart,
                    scope
                );
            case "inventory":
                return await getInventoryReport(supabase, scope);
            case "financial":
                return await getFinancialReport(
                    supabase,
                    dateFilter,
                    quarterStart,
                    scope
                );
            case "leads":
                return await getLeadsReport(supabase, dateFilter, scope);
            case "expenses":
                return await getExpensesReport(supabase, dateFilter, scope);
            case "salesperson":
            case "commissions":
                return await getSalespersonReport(
                    supabase,
                    dateFilter,
                    quarterStart,
                    scope
                );
            default:
                return await getSummaryReport(supabase, quarterStart, scope);
        }
    } catch (error: unknown) {
        console.error("Error fetching reports:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 }
        );
    }
}

type Scope = {
    dealershipId: string | null;
    isPlatformAdmin: boolean;
};

async function getSummaryReport(
    supabase: SupabaseClient,
    quarterStart: string,
    scope: Scope
) {
    const now = new Date();
    let salesQ = supabase
        .from("sales_deals")
        .select("sale_price, created_at")
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("created_at", quarterStart);
    salesQ = applyDealershipScope(salesQ, scope.dealershipId, scope.isPlatformAdmin);
    const { data: salesData } = await salesQ;

    const totalSalesRevenue =
        salesData?.reduce(
            (sum: number, d: { sale_price?: number }) =>
                sum + (d.sale_price || 0),
            0
        ) || 0;
    const totalDeals = salesData?.length || 0;

    let totalVehiclesQ = supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true });
    totalVehiclesQ = applyDealershipScope(
        totalVehiclesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: totalVehicles } = await totalVehiclesQ;

    let activeVehiclesQ = supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active");
    activeVehiclesQ = applyDealershipScope(
        activeVehiclesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: activeVehicles } = await activeVehiclesQ;

    let soldVehiclesQ = supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("status", "Sold");
    soldVehiclesQ = applyDealershipScope(
        soldVehiclesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: soldVehicles } = await soldVehiclesQ;

    let totalLeadsQ = supabase
        .from("leads")
        .select("*", { count: "exact", head: true });
    totalLeadsQ = applyDealershipScope(
        totalLeadsQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: totalLeads } = await totalLeadsQ;

    let newLeadsQ = supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte(
            "lead_creation_date",
            new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        );
    newLeadsQ = applyDealershipScope(
        newLeadsQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: newLeadsThisMonth } = await newLeadsQ;

    let expensesQ = supabase
        .from("expenses")
        .select("amount, tax_amount")
        .eq("status", "Paid")
        .gte("expense_date", quarterStart);
    expensesQ = applyDealershipScope(
        expensesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: expensesData } = await expensesQ;

    const totalExpenses =
        expensesData?.reduce(
            (sum: number, e: { amount?: number; tax_amount?: number }) =>
                sum + (e.amount || 0) + (e.tax_amount || 0),
            0
        ) || 0;

    const avgDealPrice = totalDeals > 0 ? totalSalesRevenue / totalDeals : 0;

    let vehiclesCostQ = supabase
        .from("vehicles")
        .select("purchase_price, retail_price")
        .eq("status", "Sold")
        .gte("updated_at", quarterStart);
    vehiclesCostQ = applyDealershipScope(
        vehiclesCostQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: vehiclesCostData } = await vehiclesCostQ;

    const totalProfit =
        vehiclesCostData?.reduce(
            (
                sum: number,
                v: { retail_price?: number; purchase_price?: number }
            ) => sum + ((v.retail_price || 0) - (v.purchase_price || 0)),
            0
        ) || 0;

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
                profitMargin:
                    totalSalesRevenue > 0
                        ? (totalProfit / totalSalesRevenue) * 100
                        : 0,
            },
            expenses: {
                totalExpenses,
                netIncome: totalSalesRevenue - totalExpenses,
            },
        },
    });
}

async function getSalesReport(
    supabase: SupabaseClient,
    dateFilter: DateFilter,
    quarterStart: string,
    scope: Scope
) {
    const startDate = dateFilter?.start || quarterStart;
    const endDate = dateFilter?.end || new Date().toISOString();
    const startDay = dateOnly(startDate);
    const endDay = dateOnly(endDate);

    let dailySalesQ = supabase
        .from("sales_deals")
        .select(
            `
            deal_date,
            sale_price,
            vehicle:vehicles(make, model, year),
            customer:customers(name)
        `
        )
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("deal_date", startDay)
        .lte("deal_date", endDay)
        .order("deal_date", { ascending: true });
    dailySalesQ = applyDealershipScope(
        dailySalesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: dailySales } = await dailySalesQ;

    const salesByDate: Record<string, { count: number; revenue: number }> = {};
    dailySales?.forEach((sale: { deal_date?: string; sale_price?: number }) => {
        const date = (sale.deal_date || "").split("T")[0] || "unknown";
        if (!salesByDate[date]) salesByDate[date] = { count: 0, revenue: 0 };
        salesByDate[date].count += 1;
        salesByDate[date].revenue += sale.sale_price || 0;
    });

    let topSalespeopleQ = supabase
        .from("sales_deals")
        .select(
            `
            sale_price,
            commission_amount,
            commission_rate,
            salesperson:users(full_name)
        `
        )
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("deal_date", startDay)
        .lte("deal_date", endDay);
    topSalespeopleQ = applyDealershipScope(
        topSalespeopleQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: topSalespeople } = await topSalespeopleQ;

    const salesBySalesperson: Record<
        string,
        {
            name: string;
            deals: number;
            revenue: number;
            commission: number;
        }
    > = {};
    topSalespeople?.forEach(
        (deal: {
            sale_price?: number;
            commission_amount?: number | null;
            commission_rate?: number | null;
            salesperson?: { full_name?: string } | { full_name?: string }[];
        }) => {
            const sp = Array.isArray(deal.salesperson)
                ? deal.salesperson[0]
                : deal.salesperson;
            const name = sp?.full_name || "Unknown";
            if (!salesBySalesperson[name]) {
                salesBySalesperson[name] = {
                    name,
                    deals: 0,
                    revenue: 0,
                    commission: 0,
                };
            }
            const sale = deal.sale_price || 0;
            salesBySalesperson[name].deals += 1;
            salesBySalesperson[name].revenue += sale;
            const explicit = Number(deal.commission_amount);
            if (!Number.isNaN(explicit) && deal.commission_amount != null) {
                salesBySalesperson[name].commission += explicit;
            } else {
                const rate = Number(deal.commission_rate);
                if (!Number.isNaN(rate) && deal.commission_rate != null) {
                    salesBySalesperson[name].commission +=
                        (sale * rate) / 100;
                }
            }
        }
    );

    const topSalespeopleArray = Object.values(salesBySalesperson)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    let dealsWithCostQ = supabase
        .from("sales_deals")
        .select(
            `
            sale_price,
            vehicle:vehicles(purchase_price, extra_costs, taxes)
        `
        )
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("deal_date", startDay)
        .lte("deal_date", endDay);
    dealsWithCostQ = applyDealershipScope(
        dealsWithCostQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: dealsWithCost } = await dealsWithCostQ;

    let frontEndGross = 0;
    let costOfSales = 0;
    for (const d of dealsWithCost || []) {
        const sale = Number(d.sale_price) || 0;
        const veh = Array.isArray(d.vehicle) ? d.vehicle[0] : d.vehicle;
        const cost =
            (Number(veh?.purchase_price) || 0) +
            (Number(veh?.extra_costs) || 0) +
            (Number(veh?.taxes) || 0);
        costOfSales += cost;
        frontEndGross += sale - cost;
    }

    const totalRevenue =
        dailySales?.reduce(
            (sum: number, d: { sale_price?: number }) =>
                sum + (d.sale_price || 0),
            0
        ) || 0;
    const totalDeals = dailySales?.length || 0;

    return NextResponse.json({
        reportType: "sales",
        period: { startDate, endDate },
        data: {
            summary: {
                totalRevenue,
                totalDeals,
                avgDealPrice: totalDeals > 0 ? totalRevenue / totalDeals : 0,
                frontEndGross,
                costOfSales,
            },
            salesByDate: Object.entries(salesByDate).map(([date, data]) => ({
                date,
                ...data,
            })),
            topSalespeople: topSalespeopleArray,
        },
    });
}

async function getSalespersonReport(
    supabase: SupabaseClient,
    dateFilter: DateFilter,
    quarterStart: string,
    scope: Scope
) {
    const startDate = dateFilter?.start || quarterStart;
    const endDate = dateFilter?.end || new Date().toISOString();
    const startDay = dateOnly(startDate);
    const endDay = dateOnly(endDate);

    let dealsQ = supabase
        .from("sales_deals")
        .select(
            `
            id,
            sale_price,
            deal_date,
            deal_status,
            commission_rate,
            commission_amount,
            salesperson_id,
            salesperson:users(id, full_name),
            vehicle:vehicles(purchase_price, extra_costs, taxes)
        `
        )
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("deal_date", startDay)
        .lte("deal_date", endDay);
    dealsQ = applyDealershipScope(
        dealsQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: deals } = await dealsQ;

    type Row = {
        name: string;
        salespersonId: string | null;
        deals: number;
        revenue: number;
        frontEndGross: number;
        commission: number;
        commissionFromDeals: number;
        commissionEstimated: number;
    };

    const byPerson: Record<string, Row> = {};

    for (const deal of deals || []) {
        const sp = Array.isArray(deal.salesperson)
            ? deal.salesperson[0]
            : deal.salesperson;
        const key =
            (deal.salesperson_id as string | null) ||
            sp?.full_name ||
            "unassigned";
        const name = sp?.full_name || "Unassigned";
        if (!byPerson[key]) {
            byPerson[key] = {
                name,
                salespersonId: (deal.salesperson_id as string | null) || null,
                deals: 0,
                revenue: 0,
                frontEndGross: 0,
                commission: 0,
                commissionFromDeals: 0,
                commissionEstimated: 0,
            };
        }
        const sale = Number(deal.sale_price) || 0;
        const veh = Array.isArray(deal.vehicle)
            ? deal.vehicle[0]
            : deal.vehicle;
        const cost =
            (Number(veh?.purchase_price) || 0) +
            (Number(veh?.extra_costs) || 0) +
            (Number(veh?.taxes) || 0);
        const gross = sale - cost;

        byPerson[key].deals += 1;
        byPerson[key].revenue += sale;
        byPerson[key].frontEndGross += gross;

        const explicit = Number(deal.commission_amount);
        if (!Number.isNaN(explicit) && deal.commission_amount != null) {
            byPerson[key].commissionFromDeals += explicit;
            byPerson[key].commission += explicit;
        } else {
            const rate = Number(deal.commission_rate);
            let est = 0;
            if (!Number.isNaN(rate) && deal.commission_rate != null) {
                est = (sale * rate) / 100;
            } else {
                // Light default: 25% of front-end gross when deal has no rate
                est = Math.max(0, gross) * 0.25;
            }
            byPerson[key].commissionEstimated += est;
            byPerson[key].commission += est;
        }
    }

    const rows = Object.values(byPerson).sort(
        (a, b) => b.revenue - a.revenue
    );

    const totals = rows.reduce(
        (acc, r) => {
            acc.deals += r.deals;
            acc.revenue += r.revenue;
            acc.frontEndGross += r.frontEndGross;
            acc.commission += r.commission;
            return acc;
        },
        { deals: 0, revenue: 0, frontEndGross: 0, commission: 0 }
    );

    return NextResponse.json({
        reportType: "salesperson",
        period: { startDate, endDate },
        data: {
            summary: totals,
            bySalesperson: rows,
            note: "Commission uses deal commission_amount/rate when set; otherwise estimates 25% of front-end gross.",
        },
    });
}

async function getInventoryReport(supabase: SupabaseClient, scope: Scope) {
    try {
        let byStatusQ = supabase.from("vehicles").select("status");
        byStatusQ = applyDealershipScope(
            byStatusQ,
            scope.dealershipId,
            scope.isPlatformAdmin
        );
        const { data: byStatus } = await byStatusQ;

        const statusCounts: Record<string, number> = {};
        byStatus?.forEach((v: { status?: string }) => {
            if (!v.status) return;
            statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
        });

        let byMakeQ = supabase
            .from("vehicles")
            .select("make, model, purchase_price, retail_price, status");
        byMakeQ = applyDealershipScope(
            byMakeQ,
            scope.dealershipId,
            scope.isPlatformAdmin
        );
        const { data: byMake } = await byMakeQ;

        const makeCounts: Record<
            string,
            { count: number; totalValue: number; avgProfit: number }
        > = {};
        byMake?.forEach(
            (v: {
                make?: string;
                retail_price?: number;
                status?: string;
            }) => {
                const make = v.make || "Unknown";
                if (!makeCounts[make]) {
                    makeCounts[make] = {
                        count: 0,
                        totalValue: 0,
                        avgProfit: 0,
                    };
                }
                makeCounts[make].count += 1;
                if (v.status === "Active") {
                    makeCounts[make].totalValue += v.retail_price || 0;
                }
            }
        );

        let activeVehiclesQ = supabase
            .from("vehicles")
            .select("purchase_price, retail_price, extra_costs, taxes")
            .eq("status", "Active");
        activeVehiclesQ = applyDealershipScope(
            activeVehiclesQ,
            scope.dealershipId,
            scope.isPlatformAdmin
        );
        const { data: activeVehicles } = await activeVehiclesQ;

        const totalInventoryValue =
            activeVehicles?.reduce(
                (sum: number, v: { retail_price?: number }) =>
                    sum + (v.retail_price || 0),
                0
            ) || 0;
        const totalInventoryCost =
            activeVehicles?.reduce(
                (
                    sum: number,
                    v: {
                        purchase_price?: number;
                        extra_costs?: number;
                        taxes?: number;
                    }
                ) =>
                    sum +
                    (v.purchase_price || 0) +
                    (v.extra_costs || 0) +
                    (v.taxes || 0),
                0
            ) || 0;

        const agingBuckets = {
            "0-30": 0,
            "31-60": 0,
            "61-90": 0,
            "90+": 0,
        };
        let agingCount = 0;
        try {
            let agingQ = supabase
                .from("vehicles")
                .select("id, created_at")
                .eq("status", "Active");
            agingQ = applyDealershipScope(
                agingQ,
                scope.dealershipId,
                scope.isPlatformAdmin
            );
            const { data: agingData } = await agingQ;

            const nowMs = Date.now();
            for (const v of agingData || []) {
                const created = v.created_at
                    ? new Date(v.created_at).getTime()
                    : nowMs;
                const days = Math.max(
                    0,
                    Math.floor((nowMs - created) / (1000 * 60 * 60 * 24))
                );
                if (days > 30) agingCount += 1;
                if (days <= 30) agingBuckets["0-30"] += 1;
                else if (days <= 60) agingBuckets["31-60"] += 1;
                else if (days <= 90) agingBuckets["61-90"] += 1;
                else agingBuckets["90+"] += 1;
            }
        } catch {
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
                agingBuckets,
                byStatus: statusCounts,
                byMake: Object.entries(makeCounts).map(([make, data]) => ({
                    make,
                    ...data,
                })),
            },
        });
    } catch (error) {
        console.error("Inventory report error:", error);
        return NextResponse.json(
            { error: "Failed to generate inventory report" },
            { status: 500 }
        );
    }
}

async function getFinancialReport(
    supabase: SupabaseClient,
    dateFilter: DateFilter,
    quarterStart: string,
    scope: Scope
) {
    const startDate = dateFilter?.start || quarterStart;
    const endDate = dateFilter?.end || new Date().toISOString();
    const startDay = dateOnly(startDate);
    const endDay = dateOnly(endDate);

    let salesQ = supabase
        .from("sales_deals")
        .select("sale_price")
        .not("deal_status", "in", '("Cancelled","Negotiation")')
        .gte("deal_date", startDay)
        .lte("deal_date", endDay);
    salesQ = applyDealershipScope(
        salesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: salesData } = await salesQ;

    const totalRevenue =
        salesData?.reduce(
            (sum: number, d: { sale_price?: number }) =>
                sum + (d.sale_price || 0),
            0
        ) || 0;

    let expensesQ = supabase
        .from("expenses")
        .select("amount, category")
        .eq("status", "Paid")
        .gte("expense_date", startDay)
        .lte("expense_date", endDay);
    expensesQ = applyDealershipScope(
        expensesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: expensesData } = await expensesQ;

    const totalExpenses =
        expensesData?.reduce(
            (sum: number, e: { amount?: number }) => sum + (e.amount || 0),
            0
        ) || 0;

    const expensesByCategory: Record<string, number> = {};
    expensesData?.forEach((e: { category?: string; amount?: number }) => {
        const cat = e.category || "Uncategorized";
        expensesByCategory[cat] =
            (expensesByCategory[cat] || 0) + (e.amount || 0);
    });

    let outstandingQ = supabase
        .from("invoices")
        .select("total")
        .neq("status", "Paid");
    outstandingQ = applyDealershipScope(
        outstandingQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: outstandingInvoices } = await outstandingQ;

    const totalOutstanding =
        outstandingInvoices?.reduce(
            (sum: number, i: { total?: number }) => sum + (i.total || 0),
            0
        ) || 0;

    const netIncome = totalRevenue - totalExpenses;

    return NextResponse.json({
        reportType: "financial",
        period: { startDate, endDate },
        data: {
            summary: {
                totalRevenue,
                totalExpenses,
                netIncome,
                profitMargin:
                    totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
            },
            expensesByCategory: Object.entries(expensesByCategory).map(
                ([category, amount]) => ({
                    category,
                    amount,
                })
            ),
            outstandingInvoices: {
                count: outstandingInvoices?.length || 0,
                total: totalOutstanding,
            },
        },
    });
}

async function getLeadsReport(
    supabase: SupabaseClient,
    dateFilter: DateFilter,
    scope: Scope
) {
    const now = new Date();
    const startDate =
        dateFilter?.start ||
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = dateFilter?.end || now.toISOString();
    const startDay = dateOnly(startDate);
    const endDay = dateOnly(endDate);

    let totalLeadsQ = supabase
        .from("leads")
        .select("*", { count: "exact", head: true });
    totalLeadsQ = applyDealershipScope(
        totalLeadsQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: totalLeads } = await totalLeadsQ;

    let newLeadsQ = supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("lead_creation_date", startDay)
        .lte("lead_creation_date", endDay);
    newLeadsQ = applyDealershipScope(
        newLeadsQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: newLeads } = await newLeadsQ;

    let leadsBySourceQ = supabase.from("leads").select("source");
    leadsBySourceQ = applyDealershipScope(
        leadsBySourceQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: leadsBySource } = await leadsBySourceQ;

    const sourceCounts: Record<string, number> = {};
    leadsBySource?.forEach((l: { source?: string }) => {
        const source = l.source || "Unknown";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    let leadsByStatusQ = supabase.from("leads").select("status");
    leadsByStatusQ = applyDealershipScope(
        leadsByStatusQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: leadsByStatus } = await leadsByStatusQ;

    const statusCounts: Record<string, number> = {};
    leadsByStatus?.forEach((l: { status?: string }) => {
        const status = l.status || "Unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    let convertedQ = supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "Closed");
    convertedQ = applyDealershipScope(
        convertedQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { count: convertedLeads } = await convertedQ;

    const conversionRate =
        totalLeads && totalLeads > 0
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

async function getExpensesReport(
    supabase: SupabaseClient,
    dateFilter: DateFilter,
    scope: Scope
) {
    const now = new Date();
    const startDate =
        dateFilter?.start ||
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = dateFilter?.end || now.toISOString();
    const startDay = dateOnly(startDate);
    const endDay = dateOnly(endDate);

    // Apply date filters on expense_date (was previously ignored).
    let expensesQ = supabase
        .from("expenses")
        .select("amount, category, status, expense_date")
        .gte("expense_date", startDay)
        .lte("expense_date", endDay);
    expensesQ = applyDealershipScope(
        expensesQ,
        scope.dealershipId,
        scope.isPlatformAdmin
    );
    const { data: allExpenses } = await expensesQ;

    const byCategory: Record<string, { count: number; total: number }> = {};
    allExpenses?.forEach(
        (e: { category?: string; amount?: number }) => {
            const cat = e.category || "Uncategorized";
            if (!byCategory[cat]) {
                byCategory[cat] = { count: 0, total: 0 };
            }
            byCategory[cat].count += 1;
            byCategory[cat].total += e.amount || 0;
        }
    );

    const byStatus: Record<string, number> = {};
    allExpenses?.forEach((e: { status?: string; amount?: number }) => {
        const status = e.status || "Unknown";
        byStatus[status] = (byStatus[status] || 0) + (e.amount || 0);
    });

    const paidExpenses =
        allExpenses
            ?.filter((e: { status?: string }) => e.status === "Paid")
            .reduce(
                (sum: number, e: { amount?: number }) =>
                    sum + (e.amount || 0),
                0
            ) || 0;
    const pendingExpenses =
        allExpenses
            ?.filter(
                (e: { status?: string }) =>
                    e.status === "Pending" || e.status === "Approved"
            )
            .reduce(
                (sum: number, e: { amount?: number }) =>
                    sum + (e.amount || 0),
                0
            ) || 0;

    const totalExpenses =
        allExpenses?.reduce(
            (sum: number, e: { amount?: number }) => sum + (e.amount || 0),
            0
        ) || 0;

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
                ...data,
            })),
            byStatus: Object.entries(byStatus).map(([status, amount]) => ({
                status,
                amount,
            })),
        },
    });
}
