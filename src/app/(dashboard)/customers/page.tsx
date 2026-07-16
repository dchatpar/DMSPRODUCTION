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
    Building,
    MapPin,
    User,
    CheckCircle,
    XCircle,
    Clock,
    UserPlus,
} from "lucide-react";
import * as XLSX from "xlsx";
import CustomerDetailsModal from "@/src/components/CustomerDetailsModal";
import CustomerFormModal from "@/src/components/CustomerFormModal";
import ConfirmDialog from "@/src/components/ConfirmDialog";

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    province: string | null;  // Changed from 'state'
    postal_code: string | null;  // Changed from 'zip'
    status: string;
    notes: string | null;
    avatar: string | null;
    created_at: string;
    updated_at: string;
}

interface ApiResponse {
    data: Customer[];
    count: number;
    limit: number;
    offset: number;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [statusOptions, setStatusOptions] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(10);
    const [exportLoading, setExportLoading] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>("");

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        customer: Customer | null;
        loading: boolean;
    }>({ customer: null, loading: false });

    useEffect(() => {
        fetchCustomers();
        fetchStatusOptions();
        fetchUserPermissions();
    }, [currentPage, statusFilter, searchTerm]);

    const fetchUserPermissions = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch("/api/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setUserPermissions(data.data.user_permissions || []);
                setUserRole(data.data.role || "");
            }
        } catch (error) {
            console.error("Error fetching user permissions:", error);
        }
    };

    const fetchStatusOptions = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch("/api/customers?distinct_status=true", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setStatusOptions(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching status options:", error);
        }
    };

    const exportToExcel = async () => {
        setExportLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            // Fetch all customers for export (without pagination)
            const response = await fetch("/api/customers?limit=10000", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch customers for export");

            const data = await response.json();
            const exportData = data.data || [];

            // Prepare data for Excel
            const worksheetData = exportData.map((customer: Customer) => ({
                "Customer Name": customer.name || "",
                "Email": customer.email || "",
                "Phone": customer.phone || "",
                "Address": customer.address || "",
                "City": customer.city || "",
                "Province": customer.province || "",
                "Postal Code": customer.postal_code || "",
                "Status": customer.status || "",
                "Notes": customer.notes || "",
                "Created At": customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "",
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

            // Auto-size columns
            const colWidths = [
                { wch: 25 }, // Customer Name
                { wch: 30 }, // Email
                { wch: 15 }, // Phone
                { wch: 30 }, // Address
                { wch: 15 }, // City
                { wch: 15 }, // Province
                { wch: 12 }, // Postal Code
                { wch: 12 }, // Status
                { wch: 30 }, // Notes
                { wch: 15 }, // Created At
            ];
            worksheet["!cols"] = colWidths;

            XLSX.writeFile(workbook, `customers-export-${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export customers");
        } finally {
            setExportLoading(false);
        }
    };

    // Check if user has write permission for a resource
    const canWrite = (resource: string): boolean => {
        if (userRole === "Admin") return true;
        return userPermissions.includes(`${resource}:write`);
    };

    // Check if user has delete permission for a resource
    const canDelete = (resource: string): boolean => {
        if (userRole === "Admin") return true;
        return userPermissions.includes(`${resource}:delete`);
    };

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/customers?limit=${itemsPerPage}&offset=${offset}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch customers");
            }

            const data: ApiResponse = await response.json();
            setCustomers(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowDetailsModal(true);
    };

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedCustomer(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedCustomer(null);
        fetchCustomers();
    };

    const handleDelete = async (customer: Customer) => {
        setConfirmDialogData({ customer, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.customer) return;

        const customerId = confirmDialogData.customer.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/customers/${customerId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete customer");
            }

            // Clear dialog state
            setConfirmDialogData({ customer: null, loading: false });
            setShowConfirmDialog(false);

            // Remove from local state immediately for faster UX
            setCustomers((prev) => prev.filter((c) => c.id !== customerId));
            setTotalItems((prev) => prev - 1);

            // Re-fetch to ensure consistency
            fetchCustomers();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Active: "bg-green-100 text-green-800",
            Inactive: "bg-gray-100 text-gray-800",
            Lead: "bg-blue-100 text-blue-800",
            "In Progress": "bg-yellow-100 text-yellow-800",
            "Lost": "bg-red-100 text-red-800",
            "Converted": "bg-purple-100 text-purple-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Active":
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "Inactive":
                return <XCircle className="w-4 h-4 text-gray-600" />;
            case "Lead":
                return <User className="w-4 h-4 text-blue-600" />;
            case "In Progress":
                return <Clock className="w-4 h-4 text-yellow-600" />;
            default:
                return null;
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

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6 py-10">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your customer relationships
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCustomers}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    {(userRole === "Admin" || canWrite("customers")) && (
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Customer
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, or company..."
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
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
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
                                    Customer
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                </th>


                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Location
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
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
                                        <p className="mt-2 text-sm text-gray-500">Loading customers...</p>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                        <p className="mt-2 text-sm text-red-600">{error}</p>
                                        <button
                                            onClick={fetchCustomers}
                                            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Try Again
                                        </button>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto" />
                                        <p className="mt-2 text-sm text-gray-500">No customers found</p>
                                        {(userRole === "Admin" || canWrite("customers")) && (
                                            <button
                                                onClick={handleAdd}
                                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Add Your First Customer
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {customer.avatar ? (
                                                    <img
                                                        src={customer.avatar}
                                                        alt={customer.name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                                        {getInitials(customer.name)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {customer.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        ID: {customer.id.slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                {customer.email && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-sm text-gray-600 truncate max-w-[150px]">
                                                            {customer.email}
                                                        </span>
                                                    </div>
                                                )}
                                                {customer.phone && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-sm text-gray-600">
                                                            {customer.phone}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            {customer.city ? (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm text-gray-600">
                                                        {customer.city}
                                                        {customer.province && `, ${customer.province}`}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600">
                                                {formatDate(customer.created_at)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleViewDetails(customer)}
                                                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4 text-blue-500" />
                                                </button>
                                                {(userRole === "Admin" || canWrite("customers")) && (
                                                    <button
                                                        onClick={() => handleEdit(customer)}
                                                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4 text-amber-500" />
                                                    </button>
                                                )}
                                                {(userRole === "Admin" || canDelete("customers")) && (
                                                    <button
                                                        onClick={() => handleDelete(customer)}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                )}
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
                            <p className="mt-2 text-sm text-gray-500">Loading customers...</p>
                        </div>
                    ) : error ? (
                        <div className="px-4 py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                            <button
                                onClick={fetchCustomers}
                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <Users className="w-12 h-12 text-gray-300 mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">No customers found</p>
                            {(userRole === "Admin" || canWrite("customers")) && (
                                <button
                                    onClick={handleAdd}
                                    className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Add Your First Customer
                                </button>
                            )}
                        </div>
                    ) : (
                        customers.map((customer) => (
                            <div key={customer.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {customer.avatar ? (
                                            <img
                                                src={customer.avatar}
                                                alt={customer.name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                                {getInitials(customer.name)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                                            <p className="text-xs text-gray-500">ID: {customer.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleViewDetails(customer)}
                                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-4 h-4 text-blue-500" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(customer)}
                                            className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                        >
                                            <Edit className="w-4 h-4 text-amber-500" />
                                        </button>
                                        {(userRole === "Admin" || canDelete("customers")) && (
                                            <button
                                                onClick={() => handleDelete(customer)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                                    {customer.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                                            <span>{customer.phone}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {customer.city && (
                                        <span className="flex items-center gap-1 text-gray-500">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {customer.city}{customer.province && `, ${customer.province}`}
                                        </span>
                                    )}
                                    <span className="text-gray-400">Joined: {formatDate(customer.created_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {!loading && !error && customers.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} customers
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
            {showDetailsModal && selectedCustomer && (
                <CustomerDetailsModal
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedCustomer(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedCustomer);
                    }}
                    userRole={userRole}
                    userPermissions={userPermissions}
                />
            )}

            {showFormModal && (
                <CustomerFormModal
                    mode={formMode}
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedCustomer(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.customer && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Customer"
                    message={`Are you sure you want to delete ${confirmDialogData.customer.name}? This action cannot be undone.`}
                    confirmText={confirmDialogData.loading ? "Deleting..." : "Delete"}
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogData({ customer: null, loading: false });
                    }}
                />
            )}
        </div>
    );
}