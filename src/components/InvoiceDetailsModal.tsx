"use client";

import {
    X,
    User,
    Mail,
    Phone,
    Calendar,
    Edit,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
} from "lucide-react";

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

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    customer_id: string;
    package_name: string | null;
    payment_amount: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    status: string;
    notes: string | null;
    created_at: string;
    customer: Customer;
}

interface InvoiceDetailsModalProps {
    invoice: Invoice;
    onClose: () => void;
    onEdit: () => void;
}

export default function InvoiceDetailsModal({
    invoice,
    onClose,
    onEdit,
}: InvoiceDetailsModalProps) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            "Pending": "bg-yellow-100 text-yellow-800",
            "Paid": "bg-green-100 text-green-800",
            "Overdue": "bg-red-100 text-red-800",
            "Cancelled": "bg-gray-100 text-gray-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Pending":
                return <Clock className="w-5 h-5 text-yellow-600" />;
            case "Paid":
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "Overdue":
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case "Cancelled":
                return <XCircle className="w-5 h-5 text-gray-600" />;
            default:
                return <FileText className="w-5 h-5 text-gray-600" />;
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
        }).format(amount);
    };

    const isOverdue = () => {
        if (invoice.status === "Paid") return false;
        return new Date(invoice.due_date) < new Date();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Invoice Details
                                </h2>
                                <p className="text-xs text-gray-500">{invoice.invoice_number}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Status Banner */}
                        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${getStatusColor(invoice.status).replace("text-", "bg-").replace("100", "50")}`}>
                            {getStatusIcon(invoice.status)}
                            <div>
                                <p className="text-sm font-medium">Invoice Status</p>
                                <p className={`text-lg font-bold ${getStatusColor(invoice.status).replace("bg-", "text-").replace("-100", "-800")}`}>
                                    {invoice.status}
                                </p>
                            </div>
                            {isOverdue() && (
                                <div className="ml-auto text-right">
                                    <p className="text-sm font-medium text-red-600">Overdue</p>
                                    <p className="text-xs text-red-500">Due: {formatDate(invoice.due_date)}</p>
                                </div>
                            )}
                        </div>

                        {/* Invoice Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Invoice Date</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">
                                        {formatDate(invoice.invoice_date)}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Due Date</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className={`text-sm font-medium ${isOverdue() ? "text-red-600" : "text-gray-900"}`}>
                                        {formatDate(invoice.due_date)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Customer Info */}
                        {invoice.customer && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Customer</h4>
                                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4">
                                    <div className="flex items-center gap-4">
                                        {invoice.customer.avatar ? (
                                            <img
                                                src={invoice.customer.avatar}
                                                alt={invoice.customer.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-medium">
                                                {getInitials(invoice.customer.name)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-lg font-bold text-gray-900">{invoice.customer.name}</p>
                                            {invoice.customer.email && (
                                                <div className="flex items-center gap-1">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm text-gray-500">{invoice.customer.email}</span>
                                                </div>
                                            )}
                                            {invoice.customer.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm text-gray-500">{invoice.customer.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Package/Description */}
                        {invoice.package_name && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Description
                                </h4>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm font-medium text-gray-900">{invoice.package_name}</p>
                                </div>
                            </div>
                        )}

                        {/* Financial Breakdown */}
                        <div className="mb-6">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Payment Details
                            </h4>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm text-gray-600">Subtotal</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatCurrency(invoice.payment_amount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm text-gray-600">Tax ({invoice.tax_rate}%)</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatCurrency(invoice.tax_amount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <span className="text-base font-semibold text-orange-900">Total</span>
                                        <span className="text-xl font-bold text-orange-900">
                                            {formatCurrency(invoice.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {invoice.notes && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Notes
                                </h4>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{invoice.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={onEdit}
                                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit Invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
