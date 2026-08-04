"use client";

import { useState, useEffect } from "react";
import {
    Clock,
    Search,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Loader2,
    AlertCircle,
    LogIn,
    Monitor,
    Smartphone,
    Tablet,
    CheckCircle,
    XCircle
} from "lucide-react";
import { apiFetch } from "@/src/lib/fetch";

interface LoginHistory {
    id: string;
    user_id: string;
    email: string;
    login_at: string;
    ip_address: string;
    user_agent: string;
    device_type: string;
    success: boolean;
    failure_reason: string;
    dealership_id: string;
    created_at: string;
}

export default function LoginHistoryPage() {
    const [logins, setLogins] = useState<LoginHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [limit, setLimit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [successFilter, setSuccessFilter] = useState<string>("");
    const [userFilter, setUserFilter] = useState("");

    useEffect(() => {
        fetchLoginHistory();
    }, [offset, limit]);

    const fetchLoginHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if user is platform admin
            const meResponse = await fetch("/api/me", {
            });

            if (!meResponse.ok) throw new Error("Failed to get user info");
            const meData = await meResponse.json();
            if (!meData.data?.is_platform_admin) {
                setError("You do not have permission to access login history");
                return;
            }

            // Build query params
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });
            if (successFilter) params.set("success", successFilter);
            if (userFilter) params.set("user_id", userFilter);

            const response = await fetch(`/api/platform/login-history?${params}`, {
            });

            if (!response.ok) throw new Error("Failed to fetch login history");

            const data = await response.json();
            setLogins(data.data || []);
            setCount(data.count || 0);
        } catch (err: any) {
            console.error("Error fetching login history:", err);
            setError(err.message || "Failed to load login history");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setOffset(0);
        fetchLoginHistory();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    };

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case "Mobile":
                return <Smartphone className="w-4 h-4" />;
            case "Tablet":
                return <Tablet className="w-4 h-4" />;
            default:
                return <Monitor className="w-4 h-4" />;
        }
    };

    const totalPages = Math.ceil(count / limit);
    const successfulLogins = logins.filter((l) => l.success).length;
    const failedLogins = logins.filter((l) => !l.success).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Login History</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track user login attempts across the platform
                    </p>
                </div>
                <button
                    onClick={fetchLoginHistory}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <form onSubmit={handleSearch} className="mt-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Filter by user ID..."
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={successFilter}
                    onChange={(e) => setSuccessFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Attempts</option>
                    <option value="true">Successful</option>
                    <option value="false">Failed</option>
                </select>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Filter
                </button>
            </form>

            {/* Content */}
            <div className="p-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Stats */}
                <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Total Attempts</p>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Successful</p>
                        <p className="text-2xl font-bold text-green-600">{successfulLogins}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{failedLogins}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Showing</p>
                        <p className="text-2xl font-bold text-gray-900">{logins.length}</p>
                    </div>
                </div>

                {/* Login History Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : logins.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Clock className="w-12 h-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No login history found</h3>
                            <p className="text-sm text-gray-500">No login attempts have been recorded yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failure Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logins.map((login) => (
                                        <tr key={login.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                {login.success ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Success
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-full">
                                                        <XCircle className="w-3 h-3" />
                                                        Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900">{login.email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {getDeviceIcon(login.device_type)}
                                                    <span className="text-sm text-gray-900">{login.device_type}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-900">{formatDate(login.login_at)}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-500 font-mono">{login.ip_address || "—"}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-red-600">{login.failure_reason || "—"}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {logins.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Showing {offset + 1} to {Math.min(offset + limit, count)} of {count} results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                disabled={offset === 0}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                            <button
                                onClick={() => setOffset(offset + limit)}
                                disabled={offset + limit >= count}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
