"use client";

import {
    X,
    Edit,
    Trash2,
    DollarSign,
    Calendar,
    Receipt,
    FileText,
    User,
    Truck,
    CheckCircle,
    AlertCircle,
    Clock,
} from "lucide-react";

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

interface ExpenseDetailsModalProps {
    expense: Expense;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    userRole?: string;
    userPermissions?: string[];
}

export default function ExpenseDetailsModal({
    expense,
    onClose,
    onEdit,
    onDelete,
    userRole,
    userPermissions = [],
}: ExpenseDetailsModalProps) {
    const canEdit = userRole === "Admin" || userPermissions.includes("expenses:write");
    const canDelete = userRole === "Admin" || userPermissions.includes("expenses:delete");
    const isOverdue =
        expense.status === "Pending" &&
        expense.due_date &&
        new Date(expense.due_date) < new Date();

    const totalAmount = expense.amount + (expense.tax_amount || 0);

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

    const formatDate = (date: string | null) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl">
                                <Receipt className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Expense Details</h2>
                                <p className="text-xs text-gray-500">
                                    {expense.category}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <button
                                    onClick={onEdit}
                                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit className="w-5 h-5 text-blue-600" />
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={onDelete}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Amount & Status */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-sm text-gray-500">Total Amount</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {formatCurrency(totalAmount)}
                                    </p>
                                    {expense.tax_amount > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ({formatCurrency(expense.amount)} + {formatCurrency(expense.tax_amount)} tax)
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                                        {expense.category}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                                        {expense.status}
                                    </span>
                                    {isOverdue && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Overdue
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {expense.description && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                                    {expense.description}
                                </p>
                            </div>
                        )}

                        {/* Date Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-700">Expense Date</span>
                                </div>
                                <p className="text-sm font-semibold text-blue-900">
                                    {formatDate(expense.expense_date)}
                                </p>
                            </div>
                            {expense.due_date && (
                                <div className={`rounded-xl p-4 border ${
                                    isOverdue ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"
                                }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className={`w-4 h-4 ${isOverdue ? "text-red-600" : "text-yellow-600"}`} />
                                        <span className={`text-xs font-medium ${isOverdue ? "text-red-700" : "text-yellow-700"}`}>
                                            Due Date
                                        </span>
                                    </div>
                                    <p className={`text-sm font-semibold ${isOverdue ? "text-red-900" : "text-yellow-900"}`}>
                                        {formatDate(expense.due_date)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Vendor & Vehicle */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {expense.vendor && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-gray-600" />
                                        <span className="text-xs font-medium text-gray-500">Vendor</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{expense.vendor.name}</p>
                                    {expense.vendor.contact_name && (
                                        <p className="text-xs text-gray-600 mt-1">{expense.vendor.contact_name}</p>
                                    )}
                                    {expense.vendor.contact_phone && (
                                        <p className="text-xs text-gray-600">{expense.vendor.contact_phone}</p>
                                    )}
                                </div>
                            )}

                            {expense.vehicle && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Truck className="w-4 h-4 text-gray-600" />
                                        <span className="text-xs font-medium text-gray-500">Related Vehicle</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {expense.vehicle.year} {expense.vehicle.make} {expense.vehicle.model}
                                    </p>
                                    <p className="text-xs text-gray-600">VIN: {expense.vehicle.vin}</p>
                                </div>
                            )}
                        </div>

                        {/* Reference & Payment Method */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {expense.reference_number && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Reference Number</h4>
                                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                                        {expense.reference_number}
                                    </p>
                                </div>
                            )}
                            {expense.payment_method && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Method</h4>
                                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                                        {expense.payment_method}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {expense.notes && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                                    {expense.notes}
                                </p>
                            </div>
                        )}

                        {/* Entered By */}
                        {expense.entered_by_user && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <FileText className="w-4 h-4" />
                                <span>Entered by {expense.entered_by_user.full_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
