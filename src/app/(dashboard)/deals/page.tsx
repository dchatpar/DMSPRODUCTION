"use client";

import { useState, useEffect } from "react";
import {
    FileText,
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
    DollarSign,
    Calendar,
    User,
    Car,
    Clock,
    CheckCircle,
    XCircle,
    LayoutGrid,
    List,
    FileSignature,
} from "lucide-react";
import DealDetailsModal from "@/src/components/DealDetailsModal";
import DealFormModal from "@/src/components/DealFormModal";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import BillOfSaleModal from "@/src/components/BillOfSaleModal";
import * as XLSX from "xlsx";

interface Vehicle {
    id: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    retail_price: number;
    status: string;
    condition: string;
    image_gallery?: string[];
}

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
}

interface Salesperson {
    id: string;
    full_name: string;
    email: string;
    avatar: string | null;
}

interface Deal {
    id: string;
    vehicle_id: string;
    customer_id: string;
    deal_status: string;
    finance_term: number | null;
    interest_rate: number | null;
    down_payment: number;
    sale_price: number;
    salesperson_id: string;
    finance_company: string | null;
    notes: string | null;
    deal_date: string;
    created_at: string;
    vehicle: Vehicle;
    customer: Customer;
    salesperson: Salesperson;
}

interface ApiResponse {
    data: Deal[];
    count: number;
    limit: number;
    offset: number;
}

type ViewMode = "table" | "kanban";

const DEAL_STAGES = ["Negotiation", "Down Payment", "Finance", "Paid Off", "Cancelled"];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    "Negotiation": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    "Down Payment": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    "Finance": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    "Paid Off": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    "Cancelled": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [exportLoading, setExportLoading] = useState(false);
    const [itemsPerPage] = useState(10);
    const [viewMode, setViewMode] = useState<ViewMode>("table");

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        deal: Deal | null;
        loading: boolean;
    }>({ deal: null, loading: false });

    // Bill of Sale modal state
    const [showBillOfSaleModal, setShowBillOfSaleModal] = useState(false);
    const [selectedDealForBillOfSale, setSelectedDealForBillOfSale] = useState<Deal | null>(null);
    const [billOfSaleModalMode, setBillOfSaleModalMode] = useState<"add" | "edit" | "view">("add");
    const [billOfSaleData, setBillOfSaleData] = useState<any>(null);
    const [loadingBillOfSale, setLoadingBillOfSale] = useState(false);

    useEffect(() => {
        fetchDeals();
    }, [currentPage, statusFilter, searchTerm]);

    const fetchDeals = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/deals?limit=${itemsPerPage}&offset=${offset}`;
            if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch deals");
            }

            const data: ApiResponse = await response.json();
            setDeals(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = async () => {
        setExportLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                throw new Error("Not authenticated. Please login again.");
            }

            const response = await fetch("/api/deals?limit=10000", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch deals (${response.status})`);
            }

            const data = await response.json();
            const exportData = data.data || [];

            if (exportData.length === 0) {
                throw new Error("No deals found to export");
            }

            const worksheetData = exportData.map((deal: any) => ({
                "Customer": deal.customer?.name || "Unknown",
                "Email": deal.customer?.email || "",
                "Phone": deal.customer?.phone || "",
                "Vehicle": deal.vehicle ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}` : "",
                "VIN": deal.vehicle?.vin || "",
                "Sale Price": deal.sale_price || 0,
                "Down Payment": deal.down_payment || 0,
                "Finance Term": deal.finance_term || "",
                "Interest Rate": deal.interest_rate || "",
                "Finance Company": deal.finance_company || "",
                "Deal Status": deal.deal_status || "",
                "Salesperson": deal.salesperson?.full_name || "",
                "Notes": deal.notes || "",
                "Deal Date": deal.deal_date ? new Date(deal.deal_date).toLocaleDateString() : "",
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Deals");

            const colWidths = [
                { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 25 },
                { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
                { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 },
            ];
            worksheet["!cols"] = colWidths;

            XLSX.writeFile(workbook, `deals-export-${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Export error:", error);
            alert(error instanceof Error ? error.message : "Failed to export deals");
        } finally {
            setExportLoading(false);
        }
    };

    const handleViewDetails = (deal: Deal) => {
        setSelectedDeal(deal);
        setShowDetailsModal(true);
    };

    const handleEdit = (deal: Deal) => {
        setSelectedDeal(deal);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedDeal(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedDeal(null);
        fetchDeals();
    };

    const handleDelete = async (deal: Deal) => {
        setConfirmDialogData({ deal, loading: false });
        setShowConfirmDialog(true);
    };

    const handleOpenBillOfSale = async (deal: Deal) => {
        setLoadingBillOfSale(true);
        try {
            const token = localStorage.getItem("access_token");
            // Check if bill of sale exists for this deal
            const response = await fetch(`/api/bill-of-sale?deal_id=${deal.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    // Bill of sale exists - open in edit mode
                    setBillOfSaleData(data.data[0]);
                    setSelectedDealForBillOfSale(deal);
                    setBillOfSaleModalMode("edit");
                    setShowBillOfSaleModal(true);
                } else {
                    // No bill of sale - open in add mode
                    setBillOfSaleData(null);
                    setSelectedDealForBillOfSale(deal);
                    setBillOfSaleModalMode("add");
                    setShowBillOfSaleModal(true);
                }
            }
        } catch (err) {
            console.error("Error fetching bill of sale:", err);
            // Open anyway in add mode
            setBillOfSaleData(null);
            setSelectedDealForBillOfSale(deal);
            setBillOfSaleModalMode("add");
            setShowBillOfSaleModal(true);
        } finally {
            setLoadingBillOfSale(false);
        }
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.deal) return;

        const dealId = confirmDialogData.deal.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/deals/${dealId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete deal");
            }

            // Clear dialog state
            setConfirmDialogData({ deal: null, loading: false });
            setShowConfirmDialog(false);

            // Remove from local state immediately for faster UX
            setDeals((prev) => prev.filter((d) => d.id !== dealId));
            setTotalItems((prev) => prev - 1);

            // Re-fetch to ensure consistency
            fetchDeals();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleStatusChange = async (deal: Deal, newStatus: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/deals/${deal.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ deal_status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update deal status");
            }

            fetchDeals();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        }
    };

    const getStatusColor = (status: string) => {
        return STATUS_COLORS[status]?.bg.replace("-50", "-100") || "bg-gray-100";
    };

    const getStatusTextColor = (status: string) => {
        return STATUS_COLORS[status]?.text || "text-gray-700";
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Group deals by status for kanban view
    const dealsByStatus = DEAL_STAGES.reduce((acc, stage) => {
        acc[stage] = deals.filter((d) => d.deal_status === stage);
        return acc;
    }, {} as Record<string, Deal[]>);

    return (
        <div className="space-y-6 py-10">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your sales pipeline and track deal progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "table"
                                    ? "bg-white shadow-sm text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                            title="Table View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban"
                                    ? "bg-white shadow-sm text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                            title="Kanban View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={fetchDeals}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Deal
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
                            placeholder="Search deals by vehicle, customer, or notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">All Status</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Down Payment">Down Payment</option>
                            <option value="Finance">Finance</option>
                            <option value="Paid Off">Paid Off</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            More Filters
                        </button>
                        <button
                            onClick={exportToExcel}
                            disabled={exportLoading}
                            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {exportLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* View Content */}
            {viewMode === "table" ? (
                // Table View
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Desktop Table - Hidden on mobile */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehicle
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sale Price
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Deal Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Salesperson
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                            <p className="mt-2 text-sm text-gray-500">Loading deals...</p>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                            <p className="mt-2 text-sm text-red-600">{error}</p>
                                            <button
                                                onClick={fetchDeals}
                                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Try Again
                                            </button>
                                        </td>
                                    </tr>
                                ) : deals.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                                            <p className="mt-2 text-sm text-gray-500">No deals found</p>
                                            <button
                                                onClick={handleAdd}
                                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Create Your First Deal
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    deals.map((deal) => (
                                        <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {deal.vehicle?.image_gallery?.[0] ? (
                                                        <img
                                                            src={deal.vehicle.image_gallery[0]}
                                                            alt={`${deal.vehicle.make} ${deal.vehicle.model}`}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                                            <Car className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {deal.vehicle
                                                                ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                                                                : "Unknown Vehicle"}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {deal.vehicle?.vin || "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                                                        {deal.customer?.name?.[0]?.toUpperCase() || "C"}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {deal.customer?.name || "Unknown"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deal.deal_status)} ${getStatusTextColor(deal.deal_status)}`}>
                                                    {deal.deal_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(deal.sale_price)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(deal.deal_date)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {deal.salesperson?.full_name || "Unassigned"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenBillOfSale(deal)}
                                                        disabled={loadingBillOfSale}
                                                        className="p-1.5 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Bill of Sale"
                                                    >
                                                        {loadingBillOfSale ? (
                                                            <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                                                        ) : (
                                                            <FileSignature className="w-4 h-4 text-green-600" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewDetails(deal)}
                                                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(deal)}
                                                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4 text-amber-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(deal)}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards - Hidden on desktop */}
                    <div className="lg:hidden divide-y divide-gray-200">
                        {loading ? (
                            <div className="px-4 py-12 text-center">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                <p className="mt-2 text-sm text-gray-500">Loading deals...</p>
                            </div>
                        ) : error ? (
                            <div className="px-4 py-12 text-center">
                                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                <p className="mt-2 text-sm text-red-600">{error}</p>
                                <button
                                    onClick={fetchDeals}
                                    className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : deals.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                                <p className="mt-2 text-sm text-gray-500">No deals found</p>
                                <button
                                    onClick={handleAdd}
                                    className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Your First Deal
                                </button>
                            </div>
                        ) : (
                            deals.map((deal) => (
                                <div key={deal.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {deal.vehicle?.image_gallery?.[0] ? (
                                                <img
                                                    src={deal.vehicle.image_gallery[0]}
                                                    alt={`${deal.vehicle.make} ${deal.vehicle.model}`}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                                    <Car className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {deal.vehicle
                                                        ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                                                        : "Unknown Vehicle"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {deal.customer?.name || "Unknown Customer"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleOpenBillOfSale(deal)}
                                                disabled={loadingBillOfSale}
                                                className="p-1.5 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {loadingBillOfSale ? (
                                                    <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                                                ) : (
                                                    <FileSignature className="w-4 h-4 text-green-600" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleViewDetails(deal)}
                                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-4 h-4 text-blue-500" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(deal)}
                                                className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4 text-amber-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(deal)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Status and Price Row */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deal.deal_status)} ${getStatusTextColor(deal.deal_status)}`}>
                                            {deal.deal_status}
                                        </span>
                                        <span className="text-sm font-semibold text-green-600">
                                            {formatCurrency(deal.sale_price)}
                                        </span>
                                    </div>
                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                        <div>
                                            <span className="font-medium text-gray-400">VIN:</span>{" "}
                                            {deal.vehicle?.vin || "N/A"}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-400">Salesperson:</span>{" "}
                                            {deal.salesperson?.full_name || "Unassigned"}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-400">Deal Date:</span>{" "}
                                            {formatDate(deal.deal_date)}
                                        </div>
                                        {deal.down_payment > 0 && (
                                            <div>
                                                <span className="font-medium text-gray-400">Down Payment:</span>{" "}
                                                {formatCurrency(deal.down_payment)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {!loading && !error && deals.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} deals
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Kanban View
                <>
                    {/* Desktop Kanban - Hidden on mobile */}
                    <div className="hidden lg:block grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {DEAL_STAGES.map((stage) => (
                            <div
                                key={stage}
                                className={`rounded-xl border-2 ${STATUS_COLORS[stage]?.border || "border-gray-200"} ${STATUS_COLORS[stage]?.bg || "bg-gray-50"} p-4`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`font-semibold ${STATUS_COLORS[stage]?.text || "text-gray-700"}`}>
                                        {stage}
                                    </h3>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[stage]?.bg || "bg-gray-100"} ${STATUS_COLORS[stage]?.text || "text-gray-600"}`}>
                                        {dealsByStatus[stage]?.length || 0}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {dealsByStatus[stage]?.map((deal) => (
                                        <div
                                            key={deal.id}
                                            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => handleViewDetails(deal)}
                                        >
                                            <div className="flex items-start gap-3">
                                                {deal.vehicle?.image_gallery?.[0] ? (
                                                    <img
                                                        src={deal.vehicle.image_gallery[0]}
                                                        alt={`${deal.vehicle.make} ${deal.vehicle.model}`}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                                        <Car className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {deal.vehicle
                                                            ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                                                            : "Unknown"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {deal.customer?.name || "Unknown Customer"}
                                                    </p>
                                                    <p className="text-sm font-semibold text-green-600 mt-1">
                                                        {formatCurrency(deal.sale_price)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                                <span className="text-xs text-gray-500">
                                                    {deal.salesperson?.full_name || "Unassigned"}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(deal.deal_date)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!dealsByStatus[stage] || dealsByStatus[stage].length === 0) && (
                                        <div className="text-center py-8 text-gray-400">
                                            <p className="text-sm">No deals</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Kanban (Card List) - Hidden on desktop */}
                    <div className="lg:hidden space-y-4">
                        {loading ? (
                            <div className="px-4 py-12 text-center">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                <p className="mt-2 text-sm text-gray-500">Loading deals...</p>
                            </div>
                        ) : error ? (
                            <div className="px-4 py-12 text-center">
                                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                <p className="mt-2 text-sm text-red-600">{error}</p>
                                <button
                                    onClick={fetchDeals}
                                    className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : deals.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                                <p className="mt-2 text-sm text-gray-500">No deals found</p>
                                <button
                                    onClick={handleAdd}
                                    className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Your First Deal
                                </button>
                            </div>
                        ) : (
                            deals.map((deal) => (
                                <div
                                    key={deal.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        {deal.vehicle?.image_gallery?.[0] ? (
                                            <img
                                                src={deal.vehicle.image_gallery[0]}
                                                alt={`${deal.vehicle.make} ${deal.vehicle.model}`}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                                <Car className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {deal.vehicle
                                                    ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                                                    : "Unknown"}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {deal.customer?.name || "Unknown Customer"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deal.deal_status)} ${getStatusTextColor(deal.deal_status)}`}>
                                            {deal.deal_status}
                                        </span>
                                        <span className="text-sm font-semibold text-green-600">
                                            {formatCurrency(deal.sale_price)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                                        <div>
                                            <span className="font-medium text-gray-400">Salesperson:</span>{" "}
                                            {deal.salesperson?.full_name || "Unassigned"}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-400">Date:</span>{" "}
                                            {formatDate(deal.deal_date)}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <span className="text-xs text-gray-400">
                                            {DEAL_STAGES.findIndex(s => s === deal.deal_status) + 1} of {DEAL_STAGES.length}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleOpenBillOfSale(deal)}
                                                disabled={loadingBillOfSale}
                                                className="p-1.5 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {loadingBillOfSale ? (
                                                    <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                                                ) : (
                                                    <FileSignature className="w-4 h-4 text-green-600" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleViewDetails(deal)}
                                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-4 h-4 text-blue-500" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(deal)}
                                                className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4 text-amber-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(deal)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Modals */}
            {showDetailsModal && selectedDeal && (
                <DealDetailsModal
                    deal={selectedDeal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedDeal(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedDeal);
                    }}
                />
            )}

            {showFormModal && (
                <DealFormModal
                    mode={formMode}
                    deal={selectedDeal}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedDeal(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.deal && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Deal"
                    message={`Are you sure you want to delete this deal?\n${confirmDialogData.deal.vehicle?.year} ${confirmDialogData.deal.vehicle?.make} ${confirmDialogData.deal.vehicle?.model}`}
                    confirmText="Delete"
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogData({ deal: null, loading: false });
                    }}
                />
            )}

            {showBillOfSaleModal && selectedDealForBillOfSale && (
                <BillOfSaleModal
                    mode={billOfSaleModalMode}
                    deal={selectedDealForBillOfSale}
                    billOfSale={billOfSaleData}
                    onClose={() => {
                        setShowBillOfSaleModal(false);
                        setSelectedDealForBillOfSale(null);
                        setBillOfSaleData(null);
                    }}
                    onSuccess={() => {
                        setShowBillOfSaleModal(false);
                        setSelectedDealForBillOfSale(null);
                        setBillOfSaleData(null);
                        fetchDeals();
                    }}
                />
            )}
        </div>
    );
}
