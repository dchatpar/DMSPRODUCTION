"use client";

import { useState, useEffect } from "react";
import {
    Receipt,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Loader2,
    AlertCircle,
    DollarSign,
    Calendar,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    TrendingDown,
    AlertTriangle,
} from "lucide-react";
import ExpenseDetailsModal from "@/src/components/ExpenseDetailsModal";
import ExpenseFormModal from "@/src/components/ExpenseFormModal";
import ConfirmDialog from "@/src/components/ConfirmDialog";

interface Vendor {
    id: string;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
}

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    vin: string;
}

interface UserData {
    id: string;
    full_name: string;
}

interface Expense {
    id: string;
    description: string | null;
    amount: number;
    category: string;
    vendor_id: string | null;
    vehicle_id: string | null;
    expense_date: string;
    due_date: string | null;
    status: string;
    reference_number: string | null;
    notes: string | null;
    tax_amount: number;
    payment_method: string | null;
    created_at: string;
    vendor: Vendor | null;
    vehicle: Vehicle | null;
    entered_by_user: UserData | null;
}

interface ApiResponse {
    data: Expense[];
    count: number;
    limit: number;
    offset: number;
}

const EXPENSE_CATEGORIES = [
    "Vehicle Acquisition",
    "Repair & Maintenance",
    "Parts & Supplies",
    "Utilities",
    "Rent & Lease",
    "Insurance",
    "Marketing",
    "Office Supplies",
    "Professional Services",
    "Travel & Entertainment",
    "Payroll",
    "Taxes & Licenses",
    "Interest & Finance",
    "Miscellaneous",
];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(10);

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        expense: Expense | null;
        loading: boolean;
    }>({ expense: null, loading: false });

    useEffect(() => {
        fetchExpenses();
    }, [currentPage, categoryFilter, statusFilter, searchTerm]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/expenses?limit=${itemsPerPage}&offset=${offset}`;
            if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
            if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch expenses");
            }

            const data: ApiResponse = await response.json();
            setExpenses(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (expense: Expense) => {
        setSelectedExpense(expense);
        setShowDetailsModal(true);
    };

    const handleEdit = (expense: Expense) => {
        setSelectedExpense(expense);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedExpense(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedExpense(null);
        fetchExpenses();
    };

    const handleDelete = async (expense: Expense) => {
        setConfirmDialogData({ expense, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.expense) return;

        const expenseId = confirmDialogData.expense.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete expense");
            }

            setConfirmDialogData({ expense: null, loading: false });
            setShowConfirmDialog(false);
            setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
            setTotalItems((prev) => prev - 1);
            fetchExpenses();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleStatusChange = async (expense: Expense, newStatus: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/expenses/${expense.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error("Failed to update expense status");
            }

            fetchExpenses();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Pending: "bg-yellow-100 text-yellow-700",
            Approved: "bg-blue-100 text-blue-700",
            Paid: "bg-green-100 text-green-700",
            Cancelled: "bg-gray-100 text-gray-700",
        };
        return colors[status] || "bg-gray-100 text-gray-700";
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            "Vehicle Acquisition": "bg-purple-100 text-purple-700",
            "Repair & Maintenance": "bg-orange-100 text-orange-700",
            "Parts & Supplies": "bg-blue-100 text-blue-700",
            "Utilities": "bg-cyan-100 text-cyan-700",
            "Rent & Lease": "bg-yellow-100 text-yellow-700",
            "Insurance": "bg-green-100 text-green-700",
            "Marketing": "bg-pink-100 text-pink-700",
            "Office Supplies": "bg-gray-100 text-gray-700",
            "Professional Services": "bg-indigo-100 text-indigo-700",
            "Travel & Entertainment": "bg-teal-100 text-teal-700",
            "Payroll": "bg-red-100 text-red-700",
            "Taxes & Licenses": "bg-amber-100 text-amber-700",
            "Interest & Finance": "bg-rose-100 text-rose-700",
            "Miscellaneous": "bg-slate-100 text-slate-700",
        };
        return colors[category] || "bg-gray-100 text-gray-700";
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
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

    // Calculate summary stats
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount + (e.tax_amount || 0), 0);
    const pendingAmount = expenses.filter((e) => e.status === "Pending").reduce((sum, e) => sum + e.amount + (e.tax_amount || 0), 0);
    const paidAmount = expenses.filter((e) => e.status === "Paid").reduce((sum, e) => sum + e.amount + (e.tax_amount || 0), 0);
    const overdueCount = expenses.filter((e) => e.status === "Pending" && e.due_date && new Date(e.due_date) < new Date()).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track and manage business expenses
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchExpenses}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Pending</p>
                            <p className="text-xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Paid</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Overdue</p>
                            <p className="text-xl font-bold text-orange-600">{overdueCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">All Categories</option>
                            {EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Paid">Paid</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            More
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Vendor
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
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
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                        <p className="mt-2 text-sm text-gray-500">Loading expenses...</p>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                        <p className="mt-2 text-sm text-red-600">{error}</p>
                                        <button
                                            onClick={fetchExpenses}
                                            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Try Again
                                        </button>
                                    </td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Receipt className="w-12 h-12 text-gray-300 mx-auto" />
                                        <p className="mt-2 text-sm text-gray-500">No expenses found</p>
                                        <button
                                            onClick={handleAdd}
                                            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Record Your First Expense
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => {
                                    const isOverdue = expense.status === "Pending" && expense.due_date && new Date(expense.due_date) < new Date();
                                    return (
                                        <tr key={expense.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? "bg-red-50/30" : ""}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                                                        {formatDate(expense.expense_date)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                                                    {expense.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-900 truncate max-w-[200px] block">
                                                    {expense.description || "-"}
                                                </span>
                                                {expense.reference_number && (
                                                    <span className="text-xs text-gray-500">Ref: {expense.reference_number}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {expense.vendor?.name || "-"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {formatCurrency(expense.amount + (expense.tax_amount || 0))}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => {
                                                        const statuses = ["Pending", "Approved", "Paid", "Cancelled"];
                                                        const currentIndex = statuses.indexOf(expense.status);
                                                        if (currentIndex < statuses.length - 1) {
                                                            handleStatusChange(expense, statuses[currentIndex + 1]);
                                                        }
                                                    }}
                                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(expense.status)} hover:opacity-80 transition-opacity`}
                                                >
                                                    {expense.status}
                                                </button>
                                                {isOverdue && (
                                                    <p className="text-xs text-red-500 mt-1">⚠️ Overdue</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleViewDetails(expense)}
                                                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(expense)}
                                                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4 text-amber-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(expense)}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
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

                {/* Pagination */}
                {!loading && !error && expenses.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} expenses
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

            {/* Modals */}
            {showDetailsModal && selectedExpense && (
                <ExpenseDetailsModal
                    expense={selectedExpense}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedExpense(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedExpense);
                    }}
                    onDelete={() => {
                        setShowDetailsModal(false);
                        handleDelete(selectedExpense);
                    }}
                />
            )}

            {showFormModal && (
                <ExpenseFormModal
                    mode={formMode}
                    expense={selectedExpense}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedExpense(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.expense && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Expense"
                    message={`Are you sure you want to delete this expense? This action cannot be undone.`}
                    confirmText={confirmDialogData.loading ? "Deleting..." : "Delete"}
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogData({ expense: null, loading: false });
                    }}
                />
            )}
        </div>
    );
}
