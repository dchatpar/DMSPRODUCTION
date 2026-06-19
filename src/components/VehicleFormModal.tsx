"use client";

import { useState, useEffect } from "react";
import {
    X,
    Car,
    Save,
    Loader2,
    AlertCircle,
    Image as ImageIcon,
    Plus,
    X as XIcon,
} from "lucide-react";

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
    created_at: string;
    updated_at: string;
}

interface VehicleFormModalProps {
    mode: "add" | "edit";
    vehicle?: Vehicle | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function VehicleFormModal({
    mode,
    vehicle,
    onClose,
    onSuccess,
}: VehicleFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        vin: "",
        year: new Date().getFullYear(),
        make: "",
        model: "",
        trim: "",
        odometer: 0,
        stock_number: "",
        condition: "New",
        status: "Active",
        purchase_price: 0,
        retail_price: 0,
        extra_costs: 0,
        taxes: 0,
        image_gallery: [] as string[],
    });
    const [newImageUrl, setNewImageUrl] = useState("");

    useEffect(() => {
        if (mode === "edit" && vehicle) {
            setFormData({
                vin: vehicle.vin,
                year: vehicle.year,
                make: vehicle.make,
                model: vehicle.model,
                trim: vehicle.trim || "",
                odometer: vehicle.odometer,
                stock_number: vehicle.stock_number || "",
                condition: vehicle.condition,
                status: vehicle.status,
                purchase_price: vehicle.purchase_price,
                retail_price: vehicle.retail_price,
                extra_costs: vehicle.extra_costs,
                taxes: vehicle.taxes,
                image_gallery: vehicle.image_gallery || [],
            });
        }
    }, [mode, vehicle]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? parseFloat(value) || 0 : value,
        }));
    };

    const handleAddImage = () => {
        if (newImageUrl.trim()) {
            setFormData((prev) => ({
                ...prev,
                image_gallery: [...prev.image_gallery, newImageUrl.trim()],
            }));
            setNewImageUrl("");
        }
    };

    const handleRemoveImage = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            image_gallery: prev.image_gallery.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            const url = mode === "add" ? "/api/vehicles" : `/api/vehicles/${vehicle?.id}`;
            const method = mode === "add" ? "POST" : "PATCH";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${mode} vehicle`);
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>

                    <div className="p-6">
                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {mode === "add" ? "Add New Vehicle" : "Edit Vehicle"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {mode === "add" ? "Add a new vehicle to your inventory" : "Update vehicle details"}
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        VIN *
                                    </label>
                                    <input
                                        type="text"
                                        name="vin"
                                        value={formData.vin}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        maxLength={17}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Stock Number
                                    </label>
                                    <input
                                        type="text"
                                        name="stock_number"
                                        value={formData.stock_number}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Year *
                                    </label>
                                    <input
                                        type="number"
                                        name="year"
                                        value={formData.year}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        min={1900}
                                        max={new Date().getFullYear() + 1}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Make *
                                    </label>
                                    <input
                                        type="text"
                                        name="make"
                                        value={formData.make}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Model *
                                    </label>
                                    <input
                                        type="text"
                                        name="model"
                                        value={formData.model}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Trim
                                    </label>
                                    <input
                                        type="text"
                                        name="trim"
                                        value={formData.trim}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Odometer (miles)
                                    </label>
                                    <input
                                        type="number"
                                        name="odometer"
                                        value={formData.odometer}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min={0}
                                    />
                                </div>
                            </div>

                            {/* Status and Condition */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Condition *
                                    </label>
                                    <select
                                        name="condition"
                                        value={formData.condition}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="New">New</option>
                                        <option value="Used">Used</option>
                                        <option value="Certified Pre-Owned">Certified Pre-Owned</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Status *
                                    </label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Sold">Sold</option>
                                        <option value="Coming Soon">Coming Soon</option>
                                    </select>
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Financial Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Purchase Price *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                name="purchase_price"
                                                value={formData.purchase_price}
                                                onChange={handleChange}
                                                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                                min={0}
                                                step={0.01}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Retail Price *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                name="retail_price"
                                                value={formData.retail_price}
                                                onChange={handleChange}
                                                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                                min={0}
                                                step={0.01}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Extra Costs
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                name="extra_costs"
                                                value={formData.extra_costs}
                                                onChange={handleChange}
                                                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                min={0}
                                                step={0.01}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Taxes
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                name="taxes"
                                                value={formData.taxes}
                                                onChange={handleChange}
                                                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                min={0}
                                                step={0.01}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Image Gallery */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Images
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={newImageUrl}
                                        onChange={(e) => setNewImageUrl(e.target.value)}
                                        placeholder="Enter image URL"
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddImage}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>
                                {formData.image_gallery.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {formData.image_gallery.map((url, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={url}
                                                    alt={`Vehicle image ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {mode === "add" ? "Adding..." : "Saving..."}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {mode === "add" ? "Add Vehicle" : "Save Changes"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}