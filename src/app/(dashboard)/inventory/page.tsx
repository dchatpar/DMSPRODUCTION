"use client";

import { useState, useEffect } from "react";
import {
    Car,
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
    CheckCircle,
    XCircle,
    Clock,
    Image as ImageIcon,
    X,
    Calendar,
    DollarSign,
    Hash,
    MapPin,
    Info,
    Package,
    Tag,
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
} from "lucide-react";
import VehicleDetailsModal from "@/src/components/VehicleDetailsModal";
import VehicleFormModal from "@/src/components/VehicleFormModal";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import * as XLSX from "xlsx";

interface Vehicle {
    id: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    odometer: number;
    stock_number: string | null;
    condition: string;
    status: string;
    purchase_price: number;
    retail_price: number;
    extra_costs: number;
    taxes: number;
    image_gallery: string[];
    created_at: string;
    updated_at: string;
}

interface ApiResponse {
    data: Vehicle[];
    count: number;
    limit: number;
    offset: number;
}

export default function InventoryPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [exportLoading, setExportLoading] = useState(false);
    const [itemsPerPage] = useState(10);

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        vehicle: Vehicle | null;
        loading: boolean;
    }>({ vehicle: null, loading: false });

    useEffect(() => {
        fetchVehicles();
    }, [currentPage, statusFilter, searchTerm]);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/vehicles?limit=${itemsPerPage}&offset=${offset}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch vehicles");
            }

            const data: ApiResponse = await response.json();
            setVehicles(data.data);
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

            const response = await fetch("/api/vehicles?limit=10000", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch vehicles (${response.status})`);
            }

            const data = await response.json();
            const exportData = data.data || [];

            if (exportData.length === 0) {
                throw new Error("No vehicles found to export");
            }

            const worksheetData = exportData.map((vehicle: any) => ({
                "VIN": vehicle.vin || "",
                "Stock #": vehicle.stock_number || "",
                "Year": vehicle.year || "",
                "Make": vehicle.make || "",
                "Model": vehicle.model || "",
                "Trim": vehicle.trim || "",
                "Condition": vehicle.condition || "",
                "Status": vehicle.status || "",
                "Odometer": vehicle.odometer || 0,
                "Exterior Color": vehicle.exterior_color || "",
                "Interior Color": vehicle.interior_color || "",
                "Purchase Price": vehicle.purchase_price || 0,
                "Retail Price": vehicle.retail_price || 0,
                "Description": vehicle.description || "",
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");

            const colWidths = [
                { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 },
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
                { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 },
            ];
            worksheet["!cols"] = colWidths;

            XLSX.writeFile(workbook, `vehicles-export-${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Export error:", error);
            alert(error instanceof Error ? error.message : "Failed to export vehicles");
        } finally {
            setExportLoading(false);
        }
    };

    const handleViewDetails = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setShowDetailsModal(true);
    };

    const handleEdit = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedVehicle(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedVehicle(null);
        fetchVehicles();
    };

    const handleDelete = async (vehicle: Vehicle) => {
        setConfirmDialogData({ vehicle, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.vehicle) return;

        const vehicleId = confirmDialogData.vehicle.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/vehicles/${vehicleId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete vehicle");
            }

            // Clear dialog state
            setConfirmDialogData({ vehicle: null, loading: false });
            setShowConfirmDialog(false);

            // Remove from local state immediately for faster UX
            setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
            setTotalItems((prev) => prev - 1);

            // Re-fetch to ensure consistency
            fetchVehicles();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Active: "bg-green-100 text-green-800",
            Inactive: "bg-gray-100 text-gray-800",
            Sold: "bg-blue-100 text-blue-800",
            "Coming Soon": "bg-yellow-100 text-yellow-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Active":
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "Inactive":
                return <XCircle className="w-4 h-4 text-gray-600" />;
            case "Sold":
                return <CheckCircle className="w-4 h-4 text-blue-600" />;
            case "Coming Soon":
                return <Clock className="w-4 h-4 text-yellow-600" />;
            default:
                return null;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const calculateGrossProfit = (vehicle: Vehicle) => {
        return vehicle.retail_price - vehicle.purchase_price - vehicle.extra_costs - vehicle.taxes;
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6 py-10">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your vehicle inventory
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchVehicles}
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
                        Add Vehicle
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
                            placeholder="Search by VIN, make, model, or stock number..."
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
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Sold">Sold</option>
                            <option value="Coming Soon">Coming Soon</option>
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

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Image
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Stock #
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    VIN
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Year
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Make
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Model
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Purchase
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Retail
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gross Profit
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Active
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="px-4 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                        <p className="mt-2 text-sm text-gray-500">Loading vehicles...</p>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={12} className="px-4 py-12 text-center">
                                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                        <p className="mt-2 text-sm text-red-600">{error}</p>
                                        <button
                                            onClick={fetchVehicles}
                                            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Try Again
                                        </button>
                                    </td>
                                </tr>
                            ) : vehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-4 py-12 text-center">
                                        <Car className="w-12 h-12 text-gray-300 mx-auto" />
                                        <p className="mt-2 text-sm text-gray-500">No vehicles found</p>
                                        <button
                                            onClick={handleAdd}
                                            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Add Your First Vehicle
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                vehicles.map((vehicle) => {
                                    const grossProfit = calculateGrossProfit(vehicle);
                                    const isProfitable = grossProfit > 0;
                                    const imageUrl = vehicle.image_gallery?.[0] || null;

                                    return (
                                        <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <ImageIcon className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {vehicle.stock_number || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono text-gray-600">
                                                    {vehicle.vin}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-900">{vehicle.year}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-900">{vehicle.make}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-900">{vehicle.model}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {getStatusIcon(vehicle.status)}
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(vehicle.status)}`}>
                                                        {vehicle.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm text-gray-600">
                                                    {formatCurrency(vehicle.purchase_price)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(vehicle.retail_price)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-medium ${isProfitable ? "text-green-600" : "text-red-600"}`}>
                                                    {formatCurrency(grossProfit)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${vehicle.status === "Active"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}>
                                                    {vehicle.status === "Active" ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleViewDetails(vehicle)}
                                                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(vehicle)}
                                                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4 text-amber-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(vehicle)}
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-gray-200">
                    {loading ? (
                        <div className="px-4 py-12 text-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">Loading vehicles...</p>
                        </div>
                    ) : error ? (
                        <div className="px-4 py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                            <button
                                onClick={fetchVehicles}
                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <Car className="w-12 h-12 text-gray-300 mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">No vehicles found</p>
                            <button
                                onClick={handleAdd}
                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Add Your First Vehicle
                            </button>
                        </div>
                    ) : (
                        vehicles.map((vehicle) => {
                            const grossProfit = calculateGrossProfit(vehicle);
                            const isProfitable = grossProfit > 0;
                            const imageUrl = vehicle.image_gallery?.[0] || null;
                            return (
                                <div key={vehicle.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                                </p>
                                                <p className="text-xs text-gray-500 font-mono">{vehicle.vin}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleViewDetails(vehicle)}
                                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-4 h-4 text-blue-500" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(vehicle)}
                                                className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4 text-amber-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(vehicle)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(vehicle.status)}`}>
                                            {vehicle.status}
                                        </span>
                                        {vehicle.stock_number && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                                Stock: {vehicle.stock_number}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                                        <div>
                                            <span className="font-medium text-gray-400">Purchase:</span> {formatCurrency(vehicle.purchase_price)}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-400">Retail:</span> {formatCurrency(vehicle.retail_price)}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-400">Profit:</span>{" "}
                                            <span className={isProfitable ? "text-green-600" : "text-red-600"}>
                                                {formatCurrency(grossProfit)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {!loading && !error && vehicles.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} vehicles
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
            {showDetailsModal && selectedVehicle && (
                <VehicleDetailsModal
                    vehicle={selectedVehicle}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedVehicle(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedVehicle);
                    }}
                />
            )}

            {showFormModal && (
                <VehicleFormModal
                    mode={formMode}
                    vehicle={selectedVehicle}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedVehicle(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.vehicle && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Vehicle"
                    message={`Are you sure you want to delete this vehicle?\n${confirmDialogData.vehicle.year} ${confirmDialogData.vehicle.make} ${confirmDialogData.vehicle.model}`}
                    confirmText="Delete"
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogData({ vehicle: null, loading: false });
                    }}
                />
            )}
        </div>
    );
}