"use client";

import {
    X,
    User,
    Mail,
    Phone,
    Building,
    MapPin,
    Edit,
    Users,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    MessageSquare,
} from "lucide-react";

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;

    address: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    notes: string | null;
    avatar: string | null;
    created_at: string;
    updated_at: string;
}

interface CustomerDetailsModalProps {
    customer: Customer;
    onClose: () => void;
    onEdit: () => void;
}

export default function CustomerDetailsModal({
    customer,
    onClose,
    onEdit,
}: CustomerDetailsModalProps) {
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
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "Inactive":
                return <CheckCircle className="w-5 h-5 text-gray-600" />;
            case "Lead":
                return <User className="w-5 h-5 text-blue-600" />;
            case "In Progress":
                return <Clock className="w-5 h-5 text-yellow-600" />;
            default:
                return <User className="w-5 h-5 text-gray-600" />;
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
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Customer Details
                                </h2>
                                <p className="text-xs text-gray-500">View customer information</p>
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
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 mb-6">
                            {customer.avatar ? (
                                <img
                                    src={customer.avatar}
                                    alt={customer.name}
                                    className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-medium ring-4 ring-blue-50">
                                    {getInitials(customer.name)}
                                </div>
                            )}

                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Email</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{customer.email || "N/A"}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Phone</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{customer.phone || "N/A"}</span>
                                </div>
                            </div>


                        </div>

                        {/* Address */}
                        {(customer.address || customer.city || customer.province || customer.postal_code) && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Address
                                </h4>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div>
                                            {customer.address && (
                                                <p className="text-sm text-gray-900">{customer.address}</p>
                                            )}
                                            {(customer.city || customer.province || customer.postal_code) && (
                                                <p className="text-sm text-gray-600">
                                                    {[customer.city, customer.province, customer.postal_code]
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {customer.notes && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Notes
                                </h4>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Information</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-sm text-gray-500">Created</span>
                                    <span className="text-sm text-gray-900">{formatDateTime(customer.created_at)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-sm text-gray-500">Last Updated</span>
                                    <span className="text-sm text-gray-900">{formatDateTime(customer.updated_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={onEdit}
                                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit Customer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}