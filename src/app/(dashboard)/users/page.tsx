"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    Download,
    RefreshCw,
    Loader2,
    AlertCircle,
    Mail,
    Phone,
    Calendar,
    User,
    Shield,
    CheckCircle,
    XCircle,
    UserPlus,
    Building2
} from "lucide-react";
import UserDetailsModal from "@/src/components/UserDetailsModal";
import UserFormModal from "@/src/components/UserFormModal";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import { apiFetch } from "@/src/lib/fetch";
import { toast } from "@/src/lib/toast";
import { ListPageShell } from "@/src/components/ListPageShell";
import { MetricStrip } from "@/src/components/ui/MetricStrip";
import { Button } from "@/src/components/ui/Button";

interface User {
    id: string;
    avatar: string | null;
    full_name: string;
    role: string;
    email: string;
    phone: string | null;
    start_date: string;
    created_at: string;
    updated_at: string;
    is_platform_admin?: boolean;
    dealership_id?: string;
    dealership_name?: string;
}

interface ApiResponse {
    data: User[];
    count: number;
    limit: number;
    offset: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(10);
    const [dealershipFilter, setDealershipFilter] = useState<string>("");
    const [dealerships, setDealerships] = useState<any[]>([]);

    // Date filters
    const [startDateFrom, setStartDateFrom] = useState("");
    const [startDateTo, setStartDateTo] = useState("");
    const [showMoreFilters, setShowMoreFilters] = useState(false);

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        user: User | null;
        loading: boolean;
    }>({ user: null, loading: false });

    useEffect(() => {
        fetchUserData();
    }, []);

    useEffect(() => {
        if (userData) {
            fetchUsers();
            if (userData.is_platform_admin) {
                fetchDealerships();
            }
        }
    }, [userData, currentPage, roleFilter, searchTerm, startDateFrom, startDateTo, dealershipFilter]);

    const fetchUserData = async () => {
        try {
            const response = await fetch("/api/me", {
            });
            if (response.ok) {
                const data = await response.json();
                const me = data.data;
                // Defense in depth with middleware: non-Admin dealers leave this shell
                if (
                    me &&
                    !me.is_platform_admin &&
                    me.role !== "Admin"
                ) {
                    window.location.href = "/dashboard";
                    return;
                }
                setUserData(me);
            }
        } catch (err) {
            console.error("Error fetching user:", err);
        }
    };

    const fetchDealerships = async () => {
        try {
            const response = await fetch("/api/dealerships", {
            });
            if (response.ok) {
                const data = await response.json();
                setDealerships(data.data || []);
            }
        } catch (err) {
            console.error("Error fetching dealerships:", err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/users?limit=${itemsPerPage}&offset=${offset}`;
            if (roleFilter) url += `&role=${roleFilter}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
            if (startDateFrom) url += `&start_date_from=${startDateFrom}`;
            if (startDateTo) url += `&start_date_to=${startDateTo}`;
            if (dealershipFilter) url += `&dealership_id=${dealershipFilter}`;

            const response = await fetch(url, {
                headers: {
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data: ApiResponse = await response.json();
            setUsers(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setShowDetailsModal(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedUser(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedUser(null);
        fetchUsers();
    };

    const handleDelete = async (user: User) => {
        setConfirmDialogData({ user, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.user) return;

        const userId = confirmDialogData.user.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Failed to delete user");
            }

            setConfirmDialogData({ user: null, loading: false });
            setShowConfirmDialog(false);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            setTotalItems((prev) => prev - 1);
            fetchUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const isPlatformAdmin = userData?.is_platform_admin === true;

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            Admin: "bg-purple-100 text-purple-800",
            Manager: "bg-blue-100 text-blue-800",
            Staff: "bg-green-100 text-green-800",
            Salesperson: "bg-orange-100 text-orange-800"
        };
        return colors[role] || "bg-gray-100 text-gray-800";
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "Admin":
                return <Shield className="w-4 h-4 text-purple-600" />;
            case "Manager":
                return <User className="w-4 h-4 text-blue-600" />;
            case "Staff":
                return <Users className="w-4 h-4 text-green-600" />;
            default:
                return <User className="w-4 h-4 text-gray-600" />;
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (date: string | null | undefined) => {
        if (!date) return "—";
        const d = new Date(date);
        if (isNaN(d.getTime()) || d.getFullYear() < 1971) return "—";
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const copyToClipboard = async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error("Clipboard error:", error);
            return false;
        }
    };

    const handleExport = async () => {
        try {
            // Fetch all users (not just the current page) for a complete export.
            let rows: User[] = users;
            try {
                const res = await fetch(`/api/users?limit=200`);
                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json.data) && json.data.length > 0) rows = json.data;
                }
            } catch (e) {
                // Fall back to the currently loaded page on any fetch error.
                console.error("Full export fetch failed, using current page:", e);
            }

            if (rows.length === 0) {
                toast.error("No users to export");
                return;
            }

            const header = ["Name", "Email", "Role", "Phone", "Start Date", "Dealership"];
            const escape = (v: any) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
            const csv = [
                header.join(","),
                ...rows.map((u) =>
                    [
                        escape(u.full_name),
                        escape(u.email),
                        escape(u.role),
                        escape(u.phone),
                        escape(u.start_date ? new Date(u.start_date).toLocaleDateString() : ""),
                        escape(u.dealership_name),
                    ].join(",")
                ),
            ].join("\n");

            // Blob download works in regular browsers; some embedded browsers
            // block blob downloads silently, so ALSO copy to the clipboard as a
            // guaranteed fallback and always show feedback.
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            const csvCopied = await copyToClipboard(csv);
            toast.success(
                `Exported ${rows.length} user${rows.length === 1 ? "" : "s"}` +
                (csvCopied ? " — CSV copied to clipboard" : "")
            );
        } catch (error) {
            console.error("Export error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to export users");
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <ListPageShell
            title={isPlatformAdmin ? "All Users" : "Users & Roles"}
            description={
                isPlatformAdmin
                    ? "AdaptUs Platform — users across all dealerships. Dealership Admins cannot grant platform admin."
                    : "Manage users in your dealership only. Manager cannot create users (Admin-only)."
            }
            icon={Users}
            breadcrumbs={
                isPlatformAdmin
                    ? [
                          { label: "AdaptUs Platform", href: "/dashboard" },
                          { label: "Users" },
                      ]
                    : undefined
            }
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void fetchUsers()}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleExport()}>
                        <Download className="h-3.5 w-3.5" />
                        Export
                    </Button>
                    <Button size="sm" onClick={handleAdd}>
                        <UserPlus className="h-3.5 w-3.5" />
                        Add User
                    </Button>
                </div>
            }
            kpis={
                <MetricStrip
                    loading={loading}
                    items={[
                        { label: "Total", value: totalItems, format: "number" },
                        {
                            label: "Admins (page)",
                            value: users.filter((u) => u.role === "Admin").length,
                            format: "number",
                        },
                        {
                            label: "Active (page)",
                            value: users.length,
                            format: "number",
                            tone: "success",
                        },
                    ]}
                />
            }
        >
            {/* legacy chrome removed — filters + table below */}
            <div className="space-y-4">
            {/* Page Header (actions moved to shell) */}
            <div className="hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isPlatformAdmin ? "All Users" : "Users"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isPlatformAdmin
                            ? "Manage all users across dealerships"
                            : "Manage your team members and their roles"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {isPlatformAdmin && (
                            <select
                                value={dealershipFilter}
                                onChange={(e) => setDealershipFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                                <option value="">All Dealerships</option>
                                {dealerships.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        )}
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Staff">Staff</option>
                            <option value="Salesperson">Salesperson</option>
                        </select>
                        <div className="relative">
                            <button
                                onClick={() => setShowMoreFilters(!showMoreFilters)}
                                className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                                    showMoreFilters ? "bg-blue-50 border-blue-200 text-blue-600" : "border-gray-200 hover:bg-gray-50"
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                More Filters
                                {(startDateFrom || startDateTo) && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                            </button>
                            {showMoreFilters && (
                                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 overflow-visible">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Date Range</label>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 w-8">From</span>
                                                    <input
                                                        type="date"
                                                        value={startDateFrom}
                                                        onChange={(e) => setStartDateFrom(e.target.value)}
                                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 w-8">To</span>
                                                    <input
                                                        type="date"
                                                        value={startDateTo}
                                                        onChange={(e) => setStartDateTo(e.target.value)}
                                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => {
                                                    setStartDateFrom("");
                                                    setStartDateTo("");
                                                }}
                                                className="flex-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                            >
                                                Clear All
                                            </button>
                                            <button
                                                onClick={() => setShowMoreFilters(false)}
                                                className="flex-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleExport} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                {isPlatformAdmin && (
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Dealership
                                    </th>
                                )}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Phone
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Start Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={isPlatformAdmin ? 8 : 7} className="px-4 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                        <p className="mt-2 text-sm text-gray-500">Loading users...</p>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={isPlatformAdmin ? 8 : 7} className="px-4 py-12 text-center">
                                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                        <p className="mt-2 text-sm text-red-600">{error}</p>
                                        <button
                                            onClick={fetchUsers}
                                            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Try Again
                                        </button>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={isPlatformAdmin ? 8 : 7} className="px-4 py-12 text-center">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto" />
                                        <p className="mt-2 text-sm text-gray-500">No users found</p>
                                        <button
                                            onClick={handleAdd}
                                            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Add Your First User
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {user.avatar ? (
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.full_name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                                        {getInitials(user.full_name)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {user.full_name}
                                                        {user.is_platform_admin && (
                                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700">
                                                                Platform Admin
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        ID: {user.id.slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        {isPlatformAdmin && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm text-gray-600">
                                                        {user.dealership_name || "N/A"}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm text-gray-600">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {user.phone || "N/A"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                {getRoleIcon(user.role)}
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(user.start_date)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                <CheckCircle className="w-3 h-3" />
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleViewDetails(user)}
                                                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4 text-amber-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </button>
                                                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-gray-200">
                    {loading ? (
                        <div className="px-4 py-12 text-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">Loading users...</p>
                        </div>
                    ) : error ? (
                        <div className="px-4 py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <Users className="w-12 h-12 text-gray-300 mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">No users found</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                                {getInitials(user.full_name)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                            <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleViewDetails(user)} className="p-1.5 hover:bg-blue-50 rounded-lg">
                                            <Eye className="w-4 h-4 text-blue-500" />
                                        </button>
                                        <button onClick={() => handleEdit(user)} className="p-1.5 hover:bg-amber-50 rounded-lg">
                                            <Edit className="w-4 h-4 text-amber-500" />
                                        </button>
                                        <button onClick={() => handleDelete(user)} className="p-1.5 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        {getRoleIcon(user.role)}
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    {isPlatformAdmin && user.dealership_name && (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                            {user.dealership_name}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                        <CheckCircle className="w-3 h-3" />
                                        Active
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        <span>Started: {formatDate(user.start_date)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {!loading && !error && users.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} users
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showDetailsModal && selectedUser && (
                <UserDetailsModal
                    user={selectedUser}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedUser(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedUser);
                    }}
                />
            )}

            {showFormModal && (
                <UserFormModal
                    mode={formMode}
                    user={selectedUser}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.user && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete User"
                    message={`Are you sure you want to delete ${confirmDialogData.user.full_name}? This action cannot be undone.`}
                    confirmText={confirmDialogData.loading ? "Deleting..." : "Delete"}
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogData({ user: null, loading: false });
                    }}
                />
            )}
            </div>
        </ListPageShell>
    );
}
