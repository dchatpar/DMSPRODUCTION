"use client";

import {
    X,
    Car,
    User,
    Calendar,
    Clock,
    Edit,
    FileText,
    Key,
    Image,
    Signature,
    Users,
    Phone,
    Mail,
    CheckCircle,
    XCircle,
    Loader2,
} from "lucide-react";

interface TestDrive {
    id: string;
    customer_id: string | null;
    lead_id: string | null;
    vehicle_id: string;
    driver_license_number: string;
    driver_license_expiry: string;
    driver_license_image_url: string | null;
    signature_image_url: string | null;
    start_time: string;
    end_time: string | null;
    salesperson_id: string | null;
    notes: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        avatar: string | null;
    } | null;
    lead: {
        id: string;
        source: string;
        status: string;
        customer: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
        } | null;
    } | null;
    vehicle: {
        id: string;
        make: string;
        model: string;
        year: number;
        vin: string;
        stock_number: string | null;
    } | null;
    salesperson: {
        id: string;
        full_name: string;
        email: string;
        avatar: string | null;
    } | null;
}

interface TestDriveDetailsModalProps {
    testDrive: TestDrive;
    onClose: () => void;
    onEdit: () => void;
}

export default function TestDriveDetailsModal({
    testDrive,
    onClose,
    onEdit,
}: TestDriveDetailsModalProps) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Scheduled: "bg-blue-100 text-blue-800",
            "In Progress": "bg-yellow-100 text-yellow-800",
            Completed: "bg-green-100 text-green-800",
            Cancelled: "bg-red-100 text-red-800",
            "No Show": "bg-gray-100 text-gray-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Scheduled":
                return <Clock className="w-5 h-5 text-blue-600" />;
            case "In Progress":
                return <Loader2 className="w-5 h-5 text-yellow-600" />;
            case "Completed":
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "Cancelled":
                return <XCircle className="w-5 h-5 text-red-600" />;
            case "No Show":
                return <XCircle className="w-5 h-5 text-gray-600" />;
            default:
                return null;
        }
    };

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getCustomerName = () => {
        if (testDrive.customer) {
            return testDrive.customer.name;
        }
        if (testDrive.lead?.customer) {
            return testDrive.lead.customer.name;
        }
        return "Unknown";
    };

    const getCustomerEmail = () => {
        if (testDrive.customer) {
            return testDrive.customer.email;
        }
        if (testDrive.lead?.customer) {
            return testDrive.lead.customer.email;
        }
        return null;
    };

    const getCustomerPhone = () => {
        if (testDrive.customer) {
            return testDrive.customer.phone;
        }
        if (testDrive.lead?.customer) {
            return testDrive.lead.customer.phone;
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <Car className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Test Drive Details
                                </h2>
                                <p className="text-xs text-gray-500">
                                    #{testDrive.id.slice(0, 8)}
                                </p>
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
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-6">
                            {getStatusIcon(testDrive.status || "Scheduled")}
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(testDrive.status || "Scheduled")}`}>
                                {testDrive.status || "Scheduled"}
                            </span>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Customer Info */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Customer Information
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900">
                                            {getCustomerName()}
                                        </span>
                                    </div>
                                    {getCustomerEmail() && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                {getCustomerEmail()}
                                            </span>
                                        </div>
                                    )}
                                    {getCustomerPhone() && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                {getCustomerPhone()}
                                            </span>
                                        </div>
                                    )}
                                    {testDrive.lead && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <span className="text-xs text-gray-500">Lead Source: {testDrive.lead.source}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vehicle Info */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Vehicle Information
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    {testDrive.vehicle ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Car className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {testDrive.vehicle.year} {testDrive.vehicle.make} {testDrive.vehicle.model}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Key className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600 font-mono">
                                                    VIN: {testDrive.vehicle.vin}
                                                </span>
                                            </div>
                                            {testDrive.vehicle.stock_number && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">
                                                        Stock: #{testDrive.vehicle.stock_number}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-400">No vehicle information</p>
                                    )}
                                </div>
                            </div>

                            {/* Schedule Info */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Schedule
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-900">
                                            {formatDateTime(testDrive.start_time)}
                                        </span>
                                    </div>
                                    {testDrive.end_time && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                Ends: {new Date(testDrive.end_time).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {testDrive.salesperson && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    Salesperson: {testDrive.salesperson.full_name}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* License Info */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Driver's License
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Key className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900">
                                            {testDrive.driver_license_number}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            Expires: {new Date(testDrive.driver_license_expiry).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {testDrive.driver_license_image_url && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <a
                                                href={testDrive.driver_license_image_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                <Image className="w-4 h-4" />
                                                View License Image
                                            </a>
                                        </div>
                                    )}
                                    {testDrive.signature_image_url && (
                                        <div>
                                            <a
                                                href={testDrive.signature_image_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                <Signature className="w-4 h-4" />
                                                View Signature
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {testDrive.notes && (
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Notes
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-2">
                                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                            {testDrive.notes}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Timestamps */}
                        <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-400">
                            <div>
                                <p>Created: {new Date(testDrive.created_at).toLocaleString()}</p>
                            </div>
                            <div>
                                <p>Updated: {new Date(testDrive.updated_at).toLocaleString()}</p>
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
                                Edit Test Drive
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}