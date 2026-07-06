"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import {
    TrendingUp,
    Users,
    DollarSign,
    Car,
    FileText,
    Loader2,
    AlertCircle,
    Calendar,
    Download,
    RefreshCw,
    TrendingDown,
    Target,
} from "lucide-react";

const COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#6366F1", "#EF4444", "#14B8A6"];

interface ReportData {
    reportType: string;
    period: { startDate: string; endDate: string };
    data: any;
}

const DATE_PRESETS = [
    { label: "Today", days: 0 },
    { label: "This Week", days: 7 },
    { label: "This Month", days: 30 },
    { label: "This Quarter", days: 90 },
    { label: "This Year", days: 365 },
];

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"leads" | "sales" | "inventory" | "financial" | "expenses">("leads");
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [datePreset, setDatePreset] = useState(30);
    const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
    const router = useRouter();

    const getDateRange = () => {
        if (customDateRange) return customDateRange;
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - datePreset);
        return {
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
        };
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: sessionData } = await supabaseBrowser.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (!token) {
                router.push("/login");
                return;
            }

            const { start, end } = getDateRange();
            const type = activeTab === "financial" ? "summary" : activeTab;

            const res = await fetch(`/api/reports?type=${type}&start_date=${start}&end_date=${end}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to fetch report");
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setReportData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [activeTab, datePreset, customDateRange]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value);
    };

    const exportToCSV = () => {
        if (!reportData) return;
        const { data } = reportData;
        let csvContent = "";

        if (activeTab === "leads" && data.bySource) {
            csvContent = "Source,Count\n";
            csvContent += data.bySource.map((s: any) => `${s.source},${s.count}`).join("\n");
        } if (activeTab === "sales" && data.salesByDate) {
            csvContent = "Date,Amount,Deals\n";
            csvContent += data.salesByDate.map((s: any) => `${s.date},${s.amount},${s.deals}`).join("\n");
        } else if (activeTab === "inventory" && data.byStatus) {
            csvContent = "Status,Count\n";
            csvContent += data.byStatus.map((s: any) => `${s.status},${s.count}`).join("\n");
        } else if (activeTab === "expenses" && data.byCategory) {
            csvContent = "Category,Count,Total\n";
            csvContent += data.byCategory.map((s: any) => `${s.category},${s.count},${s.total}`).join("\n");
        }

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${activeTab}-report-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const { start, end } = getDateRange();

    const tabs = [
        { id: "leads", label: "Leads", icon: Users },
        { id: "sales", label: "Sales", icon: TrendingUp },
        { id: "inventory", label: "Inventory", icon: Car },
        { id: "expenses", label: "Expenses", icon: DollarSign },
        { id: "financial", label: "Summary", icon: FileText },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                    <p className="text-sm text-slate-600 mt-1" suppressHydrationWarning>
                        {start && end ? `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}` : "Analytics & Insights"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchReport}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={exportToCSV}
                        disabled={!reportData}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.map((preset) => (
                        <button
                            key={preset.days}
                            onClick={() => {
                                setDatePreset(preset.days);
                                setCustomDateRange(null);
                            }}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                datePreset === preset.days && !customDateRange
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                    <div className="flex gap-2 ml-auto items-center">
                        <input
                            type="date"
                            value={start}
                            onChange={(e) => setCustomDateRange({ start: e.target.value, end })}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                            type="date"
                            value={end}
                            onChange={(e) => setCustomDateRange({ start, end: e.target.value })}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? "border-blue-600 text-blue-600 bg-blue-50"
                                        : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                <p className="text-red-600">{error}</p>
                                <button onClick={fetchReport} className="mt-2 text-sm text-blue-600 hover:underline">
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : reportData ? (
                        <ReportContent data={reportData.data} activeTab={activeTab} formatCurrency={formatCurrency} />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function ReportContent({ data, activeTab, formatCurrency }: { data: any; activeTab: string; formatCurrency: (v: number) => string }) {
    if (activeTab === "leads") {
        const totalLeads = data.summary?.totalLeads || 0;
        const newLeads = data.summary?.newLeads || 0;
        const convertedLeads = data.summary?.convertedLeads || 0;
        const conversionRate = data.summary?.conversionRate || 0;

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700">Total Leads</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{totalLeads}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-700">New Leads</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{newLeads}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700">Converted</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{convertedLeads}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-orange-700">Conversion Rate</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">{conversionRate.toFixed(1)}%</p>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Leads by Source */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Source</h3>
                        {data.bySource && data.bySource.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={data.bySource} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" tickFormatter={(v) => Math.round(v)} />
                                        <YAxis type="category" dataKey="source" width={80} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value: any) => [value, "Leads"]} />
                                        <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="mt-4 space-y-2">
                                    {[...data.bySource].sort((a: any, b: any) => b.count - a.count).map((item: any, idx: number) => (
                                        <div key={item.source} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                <span className="text-sm text-gray-700">{item.source}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium">{item.count}</span>
                                                <span className="text-xs text-gray-500">
                                                    ({totalLeads > 0 ? ((item.count / totalLeads) * 100).toFixed(1) : 0}%)
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                                No lead source data available
                            </div>
                        )}
                    </div>

                    {/* Leads by Status */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Status</h3>
                        {data.byStatus && data.byStatus.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.byStatus}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="count"
                                            nameKey="status"
                                        >
                                            {data.byStatus.map((_: any, idx: number) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 space-y-2">
                                    {data.byStatus.map((item: any, idx: number) => (
                                        <div key={item.status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                <span className="text-sm text-gray-700">{item.status}</span>
                                            </div>
                                            <span className="text-sm font-medium">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                                No status data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === "sales") {
        const summary = data.summary || {};
        const totalRevenue = summary.totalRevenue || 0;
        const totalDeals = summary.totalDeals || 0;
        const avgDealSize = summary.avgDealPrice || 0;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700">Total Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(totalRevenue)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700">Total Deals</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{totalDeals}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-700">Avg Deal Size</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(avgDealSize)}</p>
                    </div>
                </div>

                {/* Sales Chart */}
                {data.salesByDate && data.salesByDate.length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.salesByDate}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                                <Tooltip formatter={(value: any) => [formatCurrency(value), "Revenue"]} />
                                <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center text-gray-500">
                        No sales data available for this period
                    </div>
                )}
            </div>
        );
    }

    if (activeTab === "inventory") {
        const summary = data.summary || {};
        const totalVehicles = summary.totalVehicles || 0;
        const activeVehicles = summary.activeVehicles || 0;
        const soldVehicles = data.byStatus?.["Sold"] || 0;
        const avgPrice = summary.totalInventoryValue && totalVehicles ? summary.totalInventoryValue / totalVehicles : 0;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Car className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700">Total Vehicles</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{totalVehicles}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Car className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700">Active</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{activeVehicles}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Car className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-orange-700">Sold</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">{soldVehicles}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-gray-600" />
                            <span className="text-sm text-gray-700">Avg Price</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgPrice)}</p>
                    </div>
                </div>

                {/* Inventory Status */}
                {data.byStatus && Object.keys(data.byStatus).length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Status</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={Object.entries(data.byStatus).map(([status, count]) => ({ status, count }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={120}
                                    paddingAngle={2}
                                    dataKey="count"
                                    nameKey="status"
                                >
                                    {Object.entries(data.byStatus).map(([_, idx]) => (
                                        <Cell key={idx as number} fill={COLORS[(idx as number) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center text-gray-500">
                        No inventory data available
                    </div>
                )}
            </div>
        );
    }

    if (activeTab === "expenses") {
        const summary = data.summary || {};
        const totalExpenses = summary.totalExpenses || 0;
        const expenseCount = summary.expenseCount || 0;
        const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-red-700">Total Expenses</span>
                        </div>
                        <p className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700">Categories</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{summary.expenseCount || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-700">Avg Expense</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(avgExpense)}</p>
                    </div>
                </div>

                {/* Expenses by Category */}
                {data.byCategory && data.byCategory.length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.byCategory} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} />
                                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: any) => [formatCurrency(value), "Total"]} />
                                <Bar dataKey="total" fill="#EF4444" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                            {[...data.byCategory].sort((a: any, b: any) => (b.total as number) - (a.total as number)).map((item: any, idx: number) => (
                                <div key={item.category} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-sm text-gray-700">{item.category}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
                                        <span className="text-xs text-gray-500">({item.count})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center text-gray-500">
                        No expense data available
                    </div>
                )}
            </div>
        );
    }

    if (activeTab === "financial") {
        const summary = data.summary || {};
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700">Revenue (QTD)</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalRevenue || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-red-700">Expenses (QTD)</span>
                        </div>
                        <p className="text-2xl font-bold text-red-900">{formatCurrency(summary.totalExpenses || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Car className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700">Net Income</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.netIncome || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-700">Profit Margin</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{summary.profitMargin?.toFixed(1) || 0}%</p>
                    </div>
                </div>

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Net Income</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.netIncome || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Profit Margin</p>
                        <p className="text-xl font-bold text-gray-900">{summary.profitMargin?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Outstanding</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.outstandingInvoices?.total || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Categories</p>
                        <p className="text-xl font-bold text-gray-900">{data.expensesByCategory?.length || 0}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[300px] text-gray-500">
            Select a tab to view reports
        </div>
    );
}
