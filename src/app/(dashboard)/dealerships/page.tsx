"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Store,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Loader2,
    AlertCircle,
    CheckCircle,
    XCircle,
    Users,
    Building2,
    CreditCard,
    Calendar,
    RefreshCw,
} from "lucide-react";
import DealershipModal from "@/src/components/DealershipModal";
import ConfirmDialog from "@/src/components/ConfirmDialog";

interface Dealership {
    id: string;
    name: string;
    slug: string;
    subdomain: string | null;
    business_name: string | null;
    business_address: string | null;
    business_email: string | null;
    business_phone: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    subscription?: {
        plan_name: string;
        plan_price: number;
        billing_cycle: string;
        status: string;
    };
    user_count?: number;
}

interface ApiResponse {
    data: Dealership[];
    count: number;
    limit: number;
    offset: number;
}

export default function DealershipsPage() {
    const router = useRouter();
    const [dealerships, setDealerships] = useState<Dealership[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(10);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedDealership, setSelectedDealership] = useState<Dealership | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        dealership: Dealership | null;
        loading: boolean;
    }>({ dealership: null, loading: false });

    useEffect(() => {
        fetchDealerships();
    }, [currentPage, statusFilter, searchTerm]);

    const fetchDealerships = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            if (!token) {
                window.location.href = "/login";
                return;
            }

            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/dealerships?limit=${itemsPerPage}&offset=${offset}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    window.location.href = "/login";
                    return;
                }
                throw new Error("Failed to fetch dealerships");
            }

            const data: ApiResponse = await response.json();
            setDealerships(data.data);
            setTotalItems(data.count);
        } catch (error: any) {
            console.error("Error fetching dealerships:", error);
            setError(error.message || "Failed to load dealerships");
        } finally {
            setLoading(false);
        }
    };

    const handleAddDealership = () => {
        setFormMode("add");
        setSelectedDealership(null);
        setShowModal(true);
    };

    const handleEditDealership = (dealership: Dealership) => {
        setFormMode("edit");
        setSelectedDealership(dealership);
        setShowModal(true);
    };

    const handleDeleteDealership = (dealership: Dealership) => {
        setConfirmDialogData({ dealership, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.dealership) return;

        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/dealerships/${confirmDialogData.dealership.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete dealership");
            }

            setShowConfirmDialog(false);
            fetchDealerships();
        } catch (error: any) {
            console.error("Error deleting dealership:", error);
            alert(error.message || "Failed to delete dealership");
        } finally {
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            Active: "bg-green-100 text-green-700",
            Trial: "bg-blue-100 text-blue-700",
            Suspended: "bg-red-100 text-red-700",
            Cancelled: "bg-gray-100 text-gray-700",
            PastDue: "bg-amber-100 text-amber-700",
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || "bg-gray-100 text-gray-700"}`}>
                {status}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Dealerships</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage all registered dealerships on the platform
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchDealerships}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleAddDealership}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Dealership
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 py-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search dealerships..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Trial">Trial</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                        <p className="text-sm text-gray-500">Loading dealerships...</p>
                    </div>
                ) : dealerships.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 flex flex-col items-center justify-center">
                        <Store className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No dealerships found</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {searchTerm || statusFilter
                                ? "Try adjusting your search or filters"
                                : "Get started by adding your first dealership"}
                        </p>
                        {!searchTerm && !statusFilter && (
                            <button
                                onClick={handleAddDealership}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Dealership
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Dealership
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Plan
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Users
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {dealerships.map((dealership) => (
                                        <tr key={dealership.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                        <Store className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {dealership.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {dealership.business_email || dealership.slug}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(dealership.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {dealership.subscription?.plan_name || "No Plan"}
                                                </div>
                                                {dealership.subscription?.plan_price !== undefined && (
                                                    <div className="text-xs text-gray-500">
                                                        {formatCurrency(dealership.subscription.plan_price)}/mo
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                                        <Users className="w-4 h-4" />
                                                        {dealership.user_count || 0}
                                                    </div>
                                                    <button
                                                        onClick={() => router.push(`/dealerships/${dealership.id}/users`)}
                                                        className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                                        title="View Users"
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(dealership.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditDealership(dealership)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDealership(dealership)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                                    {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-500">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <DealershipModal
                    mode={formMode}
                    dealership={selectedDealership}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchDealerships();
                    }}
                />
            )}

            {/* Confirm Dialog */}
            {showConfirmDialog && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Dealership"
                    message={`Are you sure you want to delete "${confirmDialogData.dealership?.name}"? This action cannot be undone and will delete all associated data.`}
                    confirmText="Delete"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => setShowConfirmDialog(false)}
                    variant="danger"
                />
            )}
        </div>
    );
}
