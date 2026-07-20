"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    RefreshCw,
    Loader2,
    AlertCircle,
    Building2,
    Users,
    TrendingUp,
    LogIn,
    DollarSign,
    Activity,
} from "lucide-react";

interface Analytics {
    period: string;
    dealerships: {
        total: number;
        active: number;
        suspended: number;
        trial: number;
    };
    users: {
        total: number;
        active: number;
    };
    logins: {
        today: number;
        this_period: number;
    };
    revenue: {
        total_monthly: number;
        by_plan: Record<string, number>;
    };
    top_dealerships: Array<{
        id: string;
        name: string;
        status: string;
        user_count: number;
        deals_closed: number;
    }>;
    trends: {
        new_users: Record<string, number>;
    };
    actions_by_type: Record<string, number>;
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState("30d");

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            if (!token) {
                window.location.href = "/login";
                return;
            }

            // Check if user is platform admin
            const meResponse = await fetch("/api/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!meResponse.ok) throw new Error("Failed to get user info");
            const meData = await meResponse.json();
            if (!meData.data?.is_platform_admin) {
                setError("You do not have permission to access platform analytics");
                return;
            }

            const response = await fetch(`/api/platform/analytics?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to fetch analytics");

            const data = await response.json();
            setAnalytics(data);
        } catch (err: any) {
            console.error("Error fetching analytics:", err);
            setError(err.message || "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat("en-US").format(num);
    };

    if (loading && !analytics) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error && !analytics) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Overview of platform metrics and performance
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                            <option value="1y">Last Year</option>
                        </select>
                        <button
                            onClick={fetchAnalytics}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {analytics && (
                    <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Dealerships</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">
                                            {formatNumber(analytics.dealerships.total)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <Building2 className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                    <span className="text-green-600">{analytics.dealerships.active} active</span>
                                    <span className="text-gray-500">{analytics.dealerships.trial} trial</span>
                                    <span className="text-red-600">{analytics.dealerships.suspended} suspended</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Users</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">
                                            {formatNumber(analytics.users.total)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <Users className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                    <span className="text-green-600">{analytics.users.active} active</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Logins This Period</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">
                                            {formatNumber(analytics.logins.this_period)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-lg">
                                        <LogIn className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                    <span className="text-gray-500">{analytics.logins.today} today</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Monthly Revenue</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">
                                            {formatCurrency(analytics.revenue.total_monthly)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded-lg">
                                        <DollarSign className="w-6 h-6 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                    <span className="text-gray-500">MRR</span>
                                </div>
                            </div>
                        </div>

                        {/* Revenue by Plan */}
                        {Object.keys(analytics.revenue.by_plan).length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {Object.entries(analytics.revenue.by_plan).map(([plan, amount]) => (
                                        <div key={plan} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">{plan}</p>
                                                <p className="text-sm text-gray-500">per month</p>
                                            </div>
                                            <p className="text-xl font-bold text-gray-900">{formatCurrency(amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Dealerships */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Dealerships</h2>
                            {analytics.top_dealerships.length === 0 ? (
                                <p className="text-sm text-gray-500">No dealership data available.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dealership</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals Closed</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {analytics.top_dealerships.map((d) => (
                                                <tr key={d.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-medium text-gray-900">{d.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                                            d.status === "Active" ? "text-green-700 bg-green-50" :
                                                            d.status === "Suspended" ? "text-red-700 bg-red-50" :
                                                            "text-blue-700 bg-blue-50"
                                                        }`}>
                                                            {d.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm text-gray-900">{d.user_count}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm text-gray-900">{d.deals_closed}</p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Actions by Type */}
                        {Object.keys(analytics.actions_by_type).length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity by Type</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {Object.entries(analytics.actions_by_type)
                                        .sort(([, a], [, b]) => (b as number) - (a as number))
                                        .slice(0, 8)
                                        .map(([action, count]) => (
                                            <div key={action} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                <span className="text-sm font-medium text-gray-700 capitalize">{action}</span>
                                                <span className="text-lg font-bold text-gray-900">{formatNumber(count as number)}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
