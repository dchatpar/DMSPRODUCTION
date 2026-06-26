"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import {
    Car,
    Users,
    User,
    DollarSign,
    FileText,
    TrendingUp,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Mail,
    MoreVertical,
    Loader2,
    Package,
    CheckCircle,
    AlertCircle,
    Plus,
    Download,
    Phone,
    MapPin,
} from "lucide-react";

interface DashboardStats {
    totalVehicles: number;
    totalCustomers: number;
    totalLeads: number;
    totalSales: number;
    totalInvoices: number;
    activeVehicles: number;
    pendingInvoices: number;
}

interface RecentSale {
    id: string;
    sale_price: number;
    deal_date: string;
    deal_status: string;
    vehicle: {
        make: string;
        year: number;
        model: string;
    };
    customer: {
        name: string;
    };
    salesperson: {
        full_name: string;
    };
}

interface RecentLead {
    id: string;
    source: string;
    status: string;
    lead_creation_date: string;
    customer: {
        name: string;
    };
    assigned_user: {
        full_name: string;
    };
    notes?: string;
}

interface DashboardData {
    stats: DashboardStats;
    changes: {
        vehicles: number;
        customers: number;
        leads: number;
        sales: number;
        invoices: number;
        activeVehicles: number;
    };
    kpis: {
        completionRate: number;
        revenueGrowth: number;
        activeUsers: number;
        avgResponseHours: number;
    };
    recentSales: RecentSale[];
    recentLeads: RecentLead[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const { data: sessionData } = await supabaseBrowser.auth.getSession();
                const token = sessionData?.session?.access_token;

                if (!token) {
                    router.push("/login");
                    return;
                }

                const res = await fetch("/api/dashboard", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.status === 401) {
                    await supabaseBrowser.auth.signOut();
                    router.push("/login");
                    return;
                }

                if (!res.ok) {
                    throw new Error("Failed to fetch dashboard data");
                }

                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [router]);

    // Handle Export Report
    const handleExportReport = async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                router.push("/login");
                return;
            }

            // Fetch all data for export
            const [vehiclesRes, customersRes, leadsRes, dealsRes, invoicesRes] = await Promise.all([
                fetch("/api/vehicles?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/customers?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/leads?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/deals?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                fetch("/api/invoices?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const [vehicles, customers, leads, deals, invoices] = await Promise.all([
                vehiclesRes.json(),
                customersRes.json(),
                leadsRes.json(),
                dealsRes.json(),
                invoicesRes.json(),
            ]);

            // Convert to CSV
            const csvRows: string[] = [];

            // Vehicles sheet
            csvRows.push("=== VEHICLES ===");
            csvRows.push("VIN,Stock#,Year,Make,Model,Condition,Status,Purchase Price,Retail Price");
            vehicles.data?.forEach((v: any) => {
                csvRows.push(`${v.vin},${v.stock_number || ""},${v.year},${v.make},${v.model},${v.condition},${v.status},${v.purchase_price},${v.retail_price}`);
            });

            csvRows.push("");
            csvRows.push("=== CUSTOMERS ===");
            csvRows.push("Name,Email,Phone,Address,City,Province,Status");
            customers.data?.forEach((c: any) => {
                csvRows.push(`${c.name},${c.email || ""},${c.phone || ""},${c.address || ""},${c.city || ""},${c.province || ""},${c.status}`);
            });

            csvRows.push("");
            csvRows.push("=== LEADS ===");
            csvRows.push("Customer,Source,Status,Notes,Created Date");
            leads.data?.forEach((l: any) => {
                csvRows.push(`${l.customer?.name || ""},${l.source},${l.status},${l.notes || ""},${l.lead_creation_date}`);
            });

            csvRows.push("");
            csvRows.push("=== DEALS ===");
            csvRows.push("Vehicle,Customer,Salesperson,Status,Sale Price,Down Payment,Deal Date");
            deals.data?.forEach((d: any) => {
                csvRows.push(`${d.vehicle?.year} ${d.vehicle?.make} ${d.vehicle?.model},${d.customer?.name},${d.salesperson?.full_name},${d.deal_status},${d.sale_price},${d.down_payment},${d.deal_date}`);
            });

            csvRows.push("");
            csvRows.push("=== INVOICES ===");
            csvRows.push("Invoice#,Customer,Amount,Tax,Total,Status,Invoice Date,Due Date");
            invoices.data?.forEach((i: any) => {
                csvRows.push(`${i.invoice_number},${i.customer?.name},${i.payment_amount},${i.tax_amount},${i.total},${i.status},${i.invoice_date},${i.due_date}`);
            });

            // Download CSV
            const csvContent = csvRows.join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `dms-export-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
            alert("Failed to export data. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-sm text-slate-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <div className="text-red-600 text-sm font-medium mb-2">Error loading dashboard</div>
                    <p className="text-slate-600 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    const { stats, changes, kpis, recentSales, recentLeads } = data;

    // Stats cards configuration
    const statCards = [
        {
            title: "Total Vehicles",
            value: stats.totalVehicles,
            icon: Car,
            color: "blue",
            change: changes.vehicles,
            subtitle: "Active: " + stats.activeVehicles,
        },
        {
            title: "Total Customers",
            value: stats.totalCustomers,
            icon: Users,
            color: "green",
            change: changes.customers,
            subtitle: "New this month",
        },
        {
            title: "Total Leads",
            value: stats.totalLeads,
            icon: User,
            color: "purple",
            change: changes.leads,
            subtitle: "In progress",
        },
        {
            title: "Total Sales",
            value: stats.totalSales,
            icon: DollarSign,
            color: "orange",
            change: changes.sales,
            subtitle: "This quarter",
        },
        {
            title: "Total Invoices",
            value: stats.totalInvoices,
            icon: FileText,
            color: "red",
            change: changes.invoices,
            subtitle: stats.pendingInvoices + " pending",
        },
        {
            title: "Active Vehicles",
            value: stats.activeVehicles,
            icon: Package,
            color: "teal",
            change: changes.activeVehicles,
            subtitle: "Available",
        },
    ];

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            "Negotiation": "bg-yellow-100 text-yellow-800",
            "Closed": "bg-green-100 text-green-800",
            "In Progress": "bg-blue-100 text-blue-800",
            "Lost": "bg-red-100 text-red-800",
            "Pending": "bg-orange-100 text-orange-800",
            "New": "bg-purple-100 text-purple-800",
            "Completed": "bg-emerald-100 text-emerald-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getColorStyles = (color: string) => {
        const styles: Record<string, { bg: string; text: string; hover: string }> = {
            blue: { bg: "bg-blue-50", text: "text-blue-600", hover: "hover:bg-blue-100" },
            green: { bg: "bg-green-50", text: "text-green-600", hover: "hover:bg-green-100" },
            purple: { bg: "bg-purple-50", text: "text-purple-600", hover: "hover:bg-purple-100" },
            orange: { bg: "bg-orange-50", text: "text-orange-600", hover: "hover:bg-orange-100" },
            red: { bg: "bg-red-50", text: "text-red-600", hover: "hover:bg-red-100" },
            teal: { bg: "bg-teal-50", text: "text-teal-600", hover: "hover:bg-teal-100" },
        };
        return styles[color] || styles.blue;
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Welcome back! Here's what's happening with your dealership today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportReport}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                    {/* <button
                        disabled
                        className="px-4 py-2 text-sm font-medium text-slate-400 bg-white border border-slate-200 rounded-lg cursor-not-allowed flex items-center gap-2"
                        title="Deals module coming soon"
                    >
                        <Plus className="w-4 h-4" />
                        New Deal
                    </button> */}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    const isTrendUp = stat.change >= 0;
                    const colors = getColorStyles(stat.color);
                    const changeText = stat.change >= 0 ? `+${stat.change}%` : `${stat.change}%`;

                    return (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-md transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 rounded-lg ${colors.bg} ${colors.hover} transition-colors`}>
                                    <Icon className={`w-5 h-5 ${colors.text}`} />
                                </div>
                                <div className="flex items-center gap-1">
                                    {isTrendUp ? (
                                        <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                                    ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                                    )}
                                    <span
                                        className={`text-xs font-medium ${isTrendUp ? "text-green-600" : "text-red-600"
                                            }`}
                                    >
                                        {changeText}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                <p className="text-xs text-slate-600 font-medium">{stat.title}</p>
                                {stat.subtitle && (
                                    <p className="text-[10px] text-slate-400">{stat.subtitle}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Sales */}
                <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                    <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Recent Sales</h3>
                            <p className="text-xs text-slate-600">Latest deals closed</p>
                        </div>
                        <button
                            onClick={() => router.push("/deals")}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            View All
                            <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-200/60">
                        {recentSales.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm">No recent sales</p>
                            </div>
                        ) : (
                            recentSales.map((sale) => (
                                <div key={sale.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-slate-900 truncate">
                                                    {sale.vehicle.year} {sale.vehicle.make} {sale.vehicle.model}
                                                </p>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(sale.deal_status)}`}>
                                                    {sale.deal_status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {sale.customer.name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    ${sale.sale_price.toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(sale.deal_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                            <MoreVertical className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                    <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Recent Leads</h3>
                            <p className="text-xs text-slate-600">New inquiries & prospects</p>
                        </div>
                        <button
                            onClick={() => router.push("/leads")}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            View All
                            <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-200/60">
                        {recentLeads.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm">No recent leads</p>
                            </div>
                        ) : (
                            recentLeads.map((lead) => (
                                <div key={lead.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium text-slate-900 truncate">
                                                    {lead.customer.name}
                                                </p>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                                                    {lead.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {lead.source}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {lead.assigned_user.full_name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(lead.lead_creation_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {lead.notes && (
                                                <p className="mt-1 text-xs text-slate-500 truncate">
                                                    {lead.notes}
                                                </p>
                                            )}
                                        </div>
                                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                            <MoreVertical className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                    onClick={() => router.push("/inventory")}
                    className="p-4 bg-white rounded-xl border border-slate-200/60 hover:shadow-md transition-all text-left group"
                >
                    <div className="p-2 rounded-lg bg-blue-50 w-fit mb-2 group-hover:bg-blue-100 transition-colors">
                        <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">Add Vehicle</p>
                    <p className="text-xs text-slate-600">List new inventory</p>
                </button>
                <button
                    onClick={() => router.push("/customers")}
                    className="p-4 bg-white rounded-xl border border-slate-200/60 hover:shadow-md transition-all text-left group"
                >
                    <div className="p-2 rounded-lg bg-green-50 w-fit mb-2 group-hover:bg-green-100 transition-colors">
                        <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">Add Customer</p>
                    <p className="text-xs text-slate-600">New client profile</p>
                </button>
                <button
                    onClick={() => router.push("/leads")}
                    className="p-4 bg-white rounded-xl border border-slate-200/60 hover:shadow-md transition-all text-left group"
                >
                    <div className="p-2 rounded-lg bg-purple-50 w-fit mb-2 group-hover:bg-purple-100 transition-colors">
                        <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">Add Lead</p>
                    <p className="text-xs text-slate-600">New prospect</p>
                </button>
                <button
                    onClick={() => router.push("/invoices")}
                    className="p-4 bg-white rounded-xl border border-slate-200/60 hover:shadow-md transition-all text-left group"
                >
                    <div className="p-2 rounded-lg bg-orange-50 w-fit mb-2 group-hover:bg-orange-100 transition-colors">
                        <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">Create Invoice</p>
                    <p className="text-xs text-slate-600">Generate bill</p>
                </button>
            </div>

            {/* Quick Stats Footer */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/60 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-700 font-medium">Completion Rate</p>
                            <p className="text-lg font-bold text-blue-900">{kpis.completionRate}%</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100/50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/60 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-green-700 font-medium">Revenue Growth</p>
                            <p className="text-lg font-bold text-green-900">{kpis.revenueGrowth >= 0 ? '+' : ''}{kpis.revenueGrowth}%</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100/50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/60 rounded-lg">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-purple-700 font-medium">Active Users</p>
                            <p className="text-lg font-bold text-purple-900">{kpis.activeUsers}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100/50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/60 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs text-orange-700 font-medium">Avg. Response</p>
                            <p className="text-lg font-bold text-orange-900">{kpis.avgResponseHours}h</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}