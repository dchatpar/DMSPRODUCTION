"use client";

import {
    X,
    Car,
    Calendar,
    DollarSign,
    Hash,
    Package,
    Tag,
    TrendingUp,
    TrendingDown,
    FileText,
    Image as ImageIcon,
    Edit,
    ChevronLeft,
    ChevronRight,
    Gauge,
    Circle,
    CheckCircle,
    Clock,
    ExternalLink,
} from "lucide-react";
import { useState } from "react";

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
    carfax_report_url?: string;
    created_at: string;
    updated_at: string;
}

interface VehicleDetailsModalProps {
    vehicle: Vehicle;
    onClose: () => void;
    onEdit: () => void;
    userRole?: string;
    userPermissions?: string[];
}

export default function VehicleDetailsModal({
    vehicle,
    onClose,
    onEdit,
    userRole,
    userPermissions = [],
}: VehicleDetailsModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const canEdit = userRole === "Admin" || userPermissions.includes("vehicles:write");

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Active: "bg-green-100 text-green-700",
            Inactive: "bg-gray-100 text-gray-700",
            Sold: "bg-blue-100 text-blue-700",
            "Coming Soon": "bg-yellow-100 text-yellow-700",
        };
        return colors[status] || "bg-gray-100 text-gray-700";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Active": return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "Sold": return <CheckCircle className="w-4 h-4 text-blue-600" />;
            case "Coming Soon": return <Clock className="w-4 h-4 text-yellow-600" />;
            default: return <Circle className="w-4 h-4 text-gray-400" />;
        }
    };

    const getConditionColor = (condition: string) => {
        const colors: Record<string, string> = {
            New: "bg-emerald-100 text-emerald-700",
            Used: "bg-amber-100 text-amber-700",
            "Certified Pre-Owned": "bg-purple-100 text-purple-700",
        };
        return colors[condition] || "bg-gray-100 text-gray-700";
    };

    const grossProfit = vehicle.retail_price - vehicle.purchase_price - vehicle.extra_costs - vehicle.taxes;
    const images = vehicle.image_gallery || [];

    const nextImage = () => {
        if (images.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }
    };

    const prevImage = () => {
        if (images.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
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
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(vehicle.status)}`}>
                                        {vehicle.status}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">Stock #{vehicle.stock_number || "N/A"}</span>
                                </div>
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
                        {/* Image Gallery - Compact */}
                        <div className="relative bg-gray-100 rounded-xl overflow-hidden mb-6 aspect-[16/9]">
                            {images.length > 0 ? (
                                <>
                                    <img
                                        src={images[currentImageIndex]}
                                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                        className="w-full h-full object-contain"
                                    />
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                {images.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentImageIndex(idx)}
                                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? "bg-white" : "bg-white/50"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">No images</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info Grid - 3 Columns */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-500">Condition</p>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getConditionColor(vehicle.condition)}`}>
                                    {vehicle.condition}
                                </span>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-500">Odometer</p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {vehicle.odometer.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-500">VIN</p>
                                <p className="text-xs font-mono text-gray-600 truncate">{vehicle.vin}</p>
                            </div>
                        </div>

                        {/* Two Column Details */}
                        <div className="grid grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle Info</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Make</span>
                                        <span className="text-sm font-medium text-gray-900">{vehicle.make}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Model</span>
                                        <span className="text-sm font-medium text-gray-900">{vehicle.model}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Year</span>
                                        <span className="text-sm font-medium text-gray-900">{vehicle.year}</span>
                                    </div>
                                    {vehicle.trim && (
                                        <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                            <span className="text-sm text-gray-500">Trim</span>
                                            <span className="text-sm font-medium text-gray-900">{vehicle.trim}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Financial</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Purchase</span>
                                        <span className="text-sm font-medium text-gray-900">{formatCurrency(vehicle.purchase_price)}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Retail</span>
                                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(vehicle.retail_price)}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Extra Costs</span>
                                        <span className="text-sm text-gray-600">{formatCurrency(vehicle.extra_costs)}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5">
                                        <span className="text-sm text-gray-500">Income</span>
                                        <span className={`text-sm font-semibold ${grossProfit > 0 ? "text-green-600" : "text-red-600"}`}>
                                            {formatCurrency(grossProfit)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARFAX Report Section */}
                        {vehicle.carfax_report_url && (
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <div className="bg-red-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-100 rounded-lg">
                                                <FileText className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-red-700">CARFAX Report</p>
                                                <p className="text-xs text-red-500">Vehicle history report available</p>
                                            </div>
                                        </div>
                                        <a
                                            href={vehicle.carfax_report_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            View PDF
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            {canEdit && (
                                <button
                                    onClick={onEdit}
                                    className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Vehicle
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}