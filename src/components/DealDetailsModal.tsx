"use client";

import {
    X,
    User,
    Mail,
    Phone,
    Calendar,
    Edit,
    DollarSign,
    Car,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Percent,
    Building,
} from "lucide-react";

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

interface DealDetailsModalProps {
    deal: Deal;
    onClose: () => void;
    onEdit: () => void;
    userRole?: string;
    userPermissions?: string[];
}

export default function DealDetailsModal({
    deal,
    onClose,
    onEdit,
    userRole,
    userPermissions = [],
}: DealDetailsModalProps) {
    const canEdit = userRole === "Admin" || userPermissions.includes("deals:write");
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            "Negotiation": "bg-yellow-100 text-yellow-800",
            "Down Payment": "bg-blue-100 text-blue-800",
            "Finance": "bg-indigo-100 text-indigo-800",
            "Paid Off": "bg-green-100 text-green-800",
            "Cancelled": "bg-red-100 text-red-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Negotiation":
                return <Clock className="w-5 h-5 text-yellow-600" />;
            case "Down Payment":
                return <DollarSign className="w-5 h-5 text-blue-600" />;
            case "Finance":
                return <Building className="w-5 h-5 text-indigo-600" />;
            case "Paid Off":
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "Cancelled":
                return <XCircle className="w-5 h-5 text-red-600" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-600" />;
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const calculatedProfit = deal.vehicle
        ? deal.sale_price - (deal.vehicle.retail_price * 0.9) // rough estimate
        : 0;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Deal Details
                                </h2>
                                <p className="text-xs text-gray-500">View deal information</p>
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
                        {/* Deal Status Banner */}
                        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${getStatusColor(deal.deal_status).replace('text-', 'bg-').replace('100', '50').replace('text-', 'text-')}`}>
                            {getStatusIcon(deal.deal_status)}
                            <div>
                                <p className="text-sm font-medium">Deal Status</p>
                                <p className={`text-lg font-bold ${getStatusColor(deal.deal_status).replace('bg-', 'text-').replace('-100', '-800')}`}>
                                    {deal.deal_status}
                                </p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-sm font-medium">{formatDate(deal.deal_date)}</p>
                                <p className="text-xs text-gray-500">Deal Date</p>
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        {deal.vehicle && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vehicle</h4>
                                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4">
                                    <div className="flex items-start gap-4">
                                        {deal.vehicle.image_gallery?.[0] ? (
                                            <img
                                                src={deal.vehicle.image_gallery[0]}
                                                alt={`${deal.vehicle.make} ${deal.vehicle.model}`}
                                                className="w-24 h-24 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                                                <Car className="w-8 h-8 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h5 className="text-lg font-bold text-gray-900">
                                                {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                                            </h5>
                                            <p className="text-sm text-gray-500">VIN: {deal.vehicle.vin}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(deal.vehicle.status)}`}>
                                                    {deal.vehicle.status}
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">{deal.vehicle.condition}</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 mt-2">
                                                Retail Price: {formatCurrency(deal.vehicle.retail_price)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer & Salesperson */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Customer */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium mb-3">Customer</p>
                                <div className="flex items-center gap-3">
                                    {deal.customer?.avatar ? (
                                        <img
                                            src={deal.customer.avatar}
                                            alt={deal.customer.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                            {deal.customer?.name ? getInitials(deal.customer.name) : "C"}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{deal.customer?.name || "Unknown"}</p>
                                        {deal.customer?.email && (
                                            <p className="text-xs text-gray-500">{deal.customer.email}</p>
                                        )}
                                        {deal.customer?.phone && (
                                            <p className="text-xs text-gray-500">{deal.customer.phone}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Salesperson */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium mb-3">Salesperson</p>
                                <div className="flex items-center gap-3">
                                    {deal.salesperson?.avatar ? (
                                        <img
                                            src={deal.salesperson.avatar}
                                            alt={deal.salesperson.full_name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                            {deal.salesperson?.full_name ? getInitials(deal.salesperson.full_name) : "S"}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{deal.salesperson?.full_name || "Unassigned"}</p>
                                        {deal.salesperson?.email && (
                                            <p className="text-xs text-gray-500">{deal.salesperson.email}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Details */}
                        <div className="mb-6">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Financial Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 rounded-xl p-4">
                                    <p className="text-xs text-green-600 font-medium">Sale Price</p>
                                    <p className="text-xl font-bold text-green-900">{formatCurrency(deal.sale_price)}</p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <p className="text-xs text-blue-600 font-medium">Down Payment</p>
                                    <p className="text-xl font-bold text-blue-900">{formatCurrency(deal.down_payment)}</p>
                                </div>
                                {deal.finance_term && (
                                    <div className="bg-indigo-50 rounded-xl p-4">
                                        <p className="text-xs text-indigo-600 font-medium">Finance Term</p>
                                        <p className="text-xl font-bold text-indigo-900">{deal.finance_term} months</p>
                                    </div>
                                )}
                                {deal.interest_rate && (
                                    <div className="bg-purple-50 rounded-xl p-4">
                                        <p className="text-xs text-purple-600 font-medium">Interest Rate</p>
                                        <p className="text-xl font-bold text-purple-900">{deal.interest_rate}%</p>
                                    </div>
                                )}
                                {deal.finance_company && (
                                    <div className="col-span-2 bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 font-medium">Finance Company</p>
                                        <p className="text-sm font-medium text-gray-900">{deal.finance_company}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        {deal.notes && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Notes
                                </h4>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{deal.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            {canEdit && (
                                <button
                                    onClick={onEdit}
                                    className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Deal
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
