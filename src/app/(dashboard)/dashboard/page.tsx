"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
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
    AlertCircle,
    Package,
} from "lucide-react";

const COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#6366F1", "#EF4444", "#14B8A6"];

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
    recentSales: RecentSale[];
    recentLeads: RecentLead[];
}

interface ChartData {
    name: string;
    value: number;
    fill?: string;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [leadsSourceData, setLeadsSourceData] = useState<ChartData[]>([]);
    const [inventoryData, setInventoryData] = useState<ChartData[]>([]);
    const [salesStatusData, setSalesStatusData] = useState<ChartData[]>([]);
    const [expensesData, setExpensesData] = useState<ChartData[]>([]);

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

                const [dashboardRes, leadsRes, vehiclesRes, dealsRes, expensesRes] = await Promise.all([
                    fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/leads?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/vehicles?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/deals?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/expenses?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                if (dashboardRes.status === 401) {
                    await supabaseBrowser.auth.signOut();
                    router.push("/login");
                    return;
                }

                if (!dashboardRes.ok) throw new Error("Failed to fetch dashboard data");

                const json = await dashboardRes.json();
                setData(json);

                // Process leads data for source chart
                if (leadsRes.ok) {
                    const leadsJson = await leadsRes.json();
                    const sourceCounts: Record<string, number> = {};
                    leadsJson.data?.forEach((l: any) => {
                        if (l.source) {
                            sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
                        }
                    });
                    const sorted = Object.entries(sourceCounts)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 6);
                    setLeadsSourceData(sorted);
                }

                // Process vehicles data for inventory chart
                if (vehiclesRes.ok) {
                    const vehiclesJson = await vehiclesRes.json();
                    const statusCounts: Record<string, number> = {};
                    vehiclesJson.data?.forEach((v: any) => {
                        const status = v.status || "Unknown";
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });
                    const chartData = Object.entries(statusCounts)
                        .map(([name, value]) => ({ name, value }))
                        .filter(item => item.value > 0);
                    setInventoryData(chartData);
                }

                // Process deals data for sales status chart
                if (dealsRes.ok) {
                    const dealsJson = await dealsRes.json();
                    const statusCounts: Record<string, number> = {};
                    dealsJson.data?.forEach((d: any) => {
                        const status = d.deal_status || "Unknown";
                        statusCounts[status] = (statusCounts[status] || 0) + 1;
                    });
                    const chartData = Object.entries(statusCounts)
                        .map(([name, value]) => ({ name, value }))
                        .filter(item => item.value > 0);
                    setSalesStatusData(chartData);
                }

                // Process expenses data for category chart
                if (expensesRes.ok) {
                    const expensesJson = await expensesRes.json();
                    const categoryCounts: Record<string, number> = {};
                    expensesJson.data?.forEach((e: any) => {
                        const category = e.category || "Unknown";
                        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                    });
                    const chartData = Object.entries(categoryCounts)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 6);
                    setExpensesData(chartData);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [router]);

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

    if (!data) return null;

    const { stats, changes, recentSales, recentLeads } = data;

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
            subtitle: "In system",
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
            "Active": "bg-blue-100 text-blue-800",
            "Sold": "bg-green-100 text-green-800",
            "Finance": "bg-purple-100 text-purple-800",
            "Down Payment": "bg-amber-100 text-amber-800",
            "Paid Off": "bg-emerald-100 text-emerald-800",
            "Cancelled": "bg-gray-100 text-gray-800",
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
                        Welcome back! Here&apos;s your dealership overview.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/reports")}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        View Reports
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
                                    <span className={`text-xs font-medium ${isTrendUp ? "text-green-600" : "text-red-600"}`}>
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Leads by Source */}
                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-900">Leads by Source</h3>
                            <p className="text-xs text-slate-500">Top channels</p>
                        </div>
                    </div>
                    {leadsSourceData.length > 0 ? (
                        <>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={leadsSourceData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {leadsSourceData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-3 space-y-1">
                                {leadsSourceData.slice(0, 4).map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                            No leads data
                        </div>
                    )}
                </div>

                {/* Inventory Status */}
                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-900">Inventory Status</h3>
                            <p className="text-xs text-slate-500">Vehicle breakdown</p>
                        </div>
                    </div>
                    {inventoryData.length > 0 ? (
                        <>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={inventoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {inventoryData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-2 space-y-1">
                                {inventoryData.map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                            No inventory data
                        </div>
                    )}
                </div>

                {/* Sales by Status */}
                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-900">Deal Status</h3>
                            <p className="text-xs text-slate-500">Pipeline overview</p>
                        </div>
                    </div>
                    {salesStatusData.length > 0 ? (
                        <>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={salesStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {salesStatusData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-2 space-y-1">
                                {salesStatusData.map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                            No deals data
                        </div>
                    )}
                </div>

                {/* Expenses by Category */}
                <div className="bg-white rounded-xl border border-slate-200/60 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-900">Expenses</h3>
                            <p className="text-xs text-slate-500">By category</p>
                        </div>
                    </div>
                    {expensesData.length > 0 ? (
                        <>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={expensesData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-2 space-y-1">
                                {expensesData.slice(0, 4).map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="text-slate-600 truncate max-w-[100px]">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                            No expenses data
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Sales */}
                <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                    <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Recent Sales</h3>
                            <p className="text-xs text-slate-600">Latest deals</p>
                        </div>
                        <button
                            onClick={() => router.push("/deals")}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            View All
                            <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-200/60 max-h-[400px] overflow-y-auto">
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
                            <p className="text-xs text-slate-600">New inquiries</p>
                        </div>
                        <button
                            onClick={() => router.push("/leads")}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            View All
                            <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-200/60 max-h-[400px] overflow-y-auto">
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
                                                    {lead.assigned_user?.full_name}
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
        </div>
    );
}
