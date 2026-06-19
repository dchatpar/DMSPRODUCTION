"use client";

import {
    X,
    User,
    Mail,
    Phone,
    Calendar,
    Edit,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Car,
    Building,
} from "lucide-react";

interface Lead {
    id: string;
    customer_id: string;
    source: string;
    status: string;
    interest_vehicle_id: string | null;
    assigned_to: string | null;
    notes: string | null;
    lead_creation_date: string;
    last_engagement: string;
    created_at: string;
    updated_at: string;
    customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        avatar: string | null;
    } | null;
    vehicle: {
        id: string;
        make: string;
        model: string;
        year: number;
    } | null;
    assigned_user: {
        id: string;
        full_name: string;
        email: string;
        avatar: string | null;
    } | null;
}

interface LeadDetailsModalProps {
    lead: Lead;
    onClose: () => void;
    onEdit: () => void;
}

export default function LeadDetailsModal({
    lead,
    onClose,
    onEdit,
}: LeadDetailsModalProps) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            "Not Started": "bg-gray-100 text-gray-800",
            "In Progress": "bg-blue-100 text-blue-800",
            Qualified: "bg-green-100 text-green-800",
            Closed: "bg-purple-100 text-purple-800",
            Lost: "bg-red-100 text-red-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Not Started":
                return <Clock className="w-5 h-5 text-gray-600" />;
            case "In Progress":
                return <Loader2 className="w-5 h-5 text-blue-600" />;
            case "Qualified":
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "Closed":
                return <CheckCircle className="w-5 h-5 text-purple-600" />;
            case "Lost":
                return <XCircle className="w-5 h-5 text-red-600" />;
            default:
                return null;
        }
    };

    const getSourceColor = (source: string) => {
        const colors: Record<string, string> = {
            Website: "bg-purple-100 text-purple-800",
            Referral: "bg-green-100 text-green-800",
            Event: "bg-yellow-100 text-yellow-800",
            "Walk-in": "bg-blue-100 text-blue-800",
            Facebook: "bg-indigo-100 text-indigo-800",
            Craigslist: "bg-orange-100 text-orange-800",
            Kijiji: "bg-red-100 text-red-800",
            Phone: "bg-teal-100 text-teal-800",
        };
        return colors[source] || "bg-gray-100 text-gray-800";
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
                                    Lead Details
                                </h2>
                                <p className="text-xs text-gray-500">View lead information</p>
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
                        {/* Customer Info */}
                        <div className="flex items-center gap-4 mb-6">
                            {lead.customer?.avatar ? (
                                <img
                                    src={lead.customer.avatar}
                                    alt={lead.customer.name}
                                    className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-50"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-medium ring-4 ring-blue-50">
                                    {lead.customer?.name ? getInitials(lead.customer.name) : "C"}
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {lead.customer?.name || "Unknown Customer"}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                                        {lead.status}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getSourceColor(lead.source)}`}>
                                        {lead.source}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Email</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{lead.customer?.email || "N/A"}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Phone</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{lead.customer?.phone || "N/A"}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Vehicle Interest</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Car className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">
                                        {lead.vehicle ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : "N/A"}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Assigned To</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{lead.assigned_user?.full_name || "Unassigned"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {lead.notes && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Notes
                                </h4>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timeline</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-sm text-gray-500">Lead Created</span>
                                    <span className="text-sm text-gray-900">{formatDate(lead.lead_creation_date)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-sm text-gray-500">Last Engagement</span>
                                    <span className="text-sm text-gray-900">{formatDate(lead.last_engagement)}</span>
                                </div>
                            </div>
                        </div>

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
                                Edit Lead
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}