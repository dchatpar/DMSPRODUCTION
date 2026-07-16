"use client";

import {
    X,
    Edit,
    Store,
    Phone,
    Mail,
    MapPin,
    Calendar,
    FileText,
    DollarSign,
} from "lucide-react";

interface Vendor {
    id: string;
    vendor_type: string;
    vendor_name: string;
    address: string | null;
    phone: string | null;
    gst_number: string | null;
    hst_number: string | null;
    pst_number: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    notes: string | null;
    created_at: string;
}

interface VendorDetailsModalProps {
    vendor: Vendor;
    onClose: () => void;
    onEdit: () => void;
    userRole?: string;
    userPermissions?: string[];
}

export default function VendorDetailsModal({
    vendor,
    onClose,
    onEdit,
    userRole,
    userPermissions = [],
}: VendorDetailsModalProps) {
    const canEdit = userRole === "Admin" || userPermissions.includes("vendors:write");
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            "Dealer": "bg-purple-100 text-purple-700",
            "Auction": "bg-blue-100 text-blue-700",
            "Finance": "bg-green-100 text-green-700",
            "Insurance": "bg-yellow-100 text-yellow-700",
            "Service Provider": "bg-orange-100 text-orange-700",
            "Parts Supplier": "bg-cyan-100 text-cyan-700",
            "General": "bg-gray-100 text-gray-700",
            "Other": "bg-slate-100 text-slate-700",
        };
        return colors[type] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <Store className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Vendor Details</h2>
                                <p className="text-xs text-gray-500">{vendor.vendor_name}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Vendor Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{vendor.vendor_name}</h3>
                                <span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded ${getTypeColor(vendor.vendor_type)}`}>
                                    {vendor.vendor_type || "General"}
                                </span>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={onEdit}
                                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                </button>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Address Section */}
                            <div className="col-span-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Address
                                </h4>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-gray-900">
                                        {vendor.address || "No address provided"}
                                    </p>
                                    {(vendor.city || vendor.province || vendor.postal_code) && (
                                        <p className="text-gray-600 mt-1">
                                            {[vendor.city, vendor.province, vendor.postal_code]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Contact Section */}
                            <div className="col-span-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Contact Information
                                </h4>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    {vendor.contact_name && (
                                        <div>
                                            <p className="text-xs text-gray-500">Contact Person</p>
                                            <p className="text-gray-900">{vendor.contact_name}</p>
                                        </div>
                                    )}
                                    {vendor.phone && (
                                        <div>
                                            <p className="text-xs text-gray-500">Primary Phone</p>
                                            <p className="text-gray-900">{vendor.phone}</p>
                                        </div>
                                    )}
                                    {vendor.contact_phone && (
                                        <div>
                                            <p className="text-xs text-gray-500">Contact Phone</p>
                                            <p className="text-gray-900">{vendor.contact_phone}</p>
                                        </div>
                                    )}
                                    {vendor.contact_email && (
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="text-gray-900">{vendor.contact_email}</p>
                                        </div>
                                    )}
                                    {!vendor.contact_name && !vendor.phone && !vendor.contact_phone && !vendor.contact_email && (
                                        <p className="text-gray-500">No contact information provided</p>
                                    )}
                                </div>
                            </div>

                            {/* Tax Numbers */}
                            <div className="col-span-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Tax Numbers
                                </h4>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">GST Number</p>
                                            <p className="text-gray-900 font-medium">{vendor.gst_number || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">HST Number</p>
                                            <p className="text-gray-900 font-medium">{vendor.hst_number || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">PST Number</p>
                                            <p className="text-gray-900 font-medium">{vendor.pst_number || "-"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {vendor.notes && (
                                <div className="col-span-2">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Notes
                                    </h4>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
                                    </div>
                                </div>
                            )}

                            {/* Created Date */}
                            <div className="col-span-2">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    Created on {formatDate(vendor.created_at)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-4 flex items-center justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
