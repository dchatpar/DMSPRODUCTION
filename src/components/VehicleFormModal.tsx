"use client";

import { useState, useEffect } from "react";
import {
    X,
    Car,
    Save,
    Loader2,
    AlertCircle,
    Plus,
    X as XIcon,
    Image as ImageIcon,
    ChevronDown,
    Upload,
    CloudUpload,
} from "lucide-react";
import {
    vehicleMakes,
    getModelsForMake,
    yearRange,
} from "@/src/data/vehicle-makes-models";
import { supabaseBrowser } from "@/src/lib/supabase-browser";

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
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [showMakeDropdown, setShowMakeDropdown] = useState(false);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [newImageUrl, setNewImageUrl] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageInputKey, setImageInputKey] = useState(0);

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
            // Set available models for the existing vehicle's make
            setAvailableModels(getModelsForMake(vehicle.make));
        }
    }, [mode, vehicle]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? parseFloat(value) || 0 : value,
        }));
    };

    const handleMakeChange = (make: string) => {
        setFormData((prev) => ({
            ...prev,
            make,
            model: "", // Reset model when make changes
        }));
        setAvailableModels(getModelsForMake(make));
        setShowMakeDropdown(false);
        setShowModelDropdown(false);
    };

    const handleModelChange = (model: string) => {
        setFormData((prev) => ({
            ...prev,
            model,
        }));
        setShowModelDropdown(false);
    };

    const handleAddImage = () => {
        const trimmedUrl = newImageUrl.trim();

        if (!trimmedUrl) {
            setError("Please enter an image URL");
            setTimeout(() => setError(null), 3000);
            return;
        }

        // Validate URL
        try {
            new URL(trimmedUrl);
        } catch {
            setError("Please enter a valid URL (e.g., https://example.com/image.jpg)");
            setTimeout(() => setError(null), 3000);
            return;
        }

        // Check for duplicates
        if (formData.image_gallery.includes(trimmedUrl)) {
            setError("This image URL is already added");
            setTimeout(() => setError(null), 3000);
            return;
        }

        // Add image to gallery
        setFormData((prev) => ({
            ...prev,
            image_gallery: [...prev.image_gallery, trimmedUrl],
        }));

        setNewImageUrl("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddImage();
        }
    };

    const handleRemoveImage = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            image_gallery: prev.image_gallery.filter((_, i) => i !== index),
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            setError("Please upload a valid image file (JPG, PNG, WebP, or GIF)");
            setTimeout(() => setError(null), 3000);
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError("File size must be less than 5MB");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setUploadingImage(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            if (!token) throw new Error("Not authenticated");

            // Generate unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabaseBrowser.storage
                .from('vehicles')
                .upload(fileName, file, {
                    contentType: file.type,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabaseBrowser.storage
                .from('vehicles')
                .getPublicUrl(fileName);

            const imageUrl = urlData.publicUrl;

            // Check for duplicates
            if (formData.image_gallery.includes(imageUrl)) {
                setError("This image is already added");
                setTimeout(() => setError(null), 3000);
                return;
            }

            // Add to gallery
            setFormData((prev) => ({
                ...prev,
                image_gallery: [...prev.image_gallery, imageUrl],
            }));

            // Reset file input
            setImageInputKey((prev) => prev + 1);
        } catch (err) {
            console.error("Upload error:", err);
            setError(err instanceof Error ? err.message : "Failed to upload image");
            setTimeout(() => setError(null), 3000);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            const url = mode === "add" ? "/api/vehicles" : `/api/vehicles/${vehicle?.id}`;
            const method = mode === "add" ? "POST" : "PATCH";

            // Ensure image_gallery is an array
            const payload = {
                ...formData,
                image_gallery: formData.image_gallery || [],
            };

            console.log("🚀 Submitting payload:", payload);

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${mode} vehicle`);
            }

            onSuccess();
        } catch (err) {
            console.error("❌ Error:", err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
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
                                    <div className="relative">
                                        <select
                                            name="year"
                                            value={formData.year}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
                                            required
                                        >
                                            {yearRange.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Make *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowMakeDropdown(!showMakeDropdown);
                                            setShowModelDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
                                    >
                                        <span className={formData.make ? "text-gray-900" : "text-gray-400"}>
                                            {formData.make || "Select Make"}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>
                                    {showMakeDropdown && (
                                        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                                            {vehicleMakes.map((make) => (
                                                <button
                                                    key={make.name}
                                                    type="button"
                                                    onClick={() => handleMakeChange(make.name)}
                                                    className="w-full px-4 py-2 text-left hover:bg-blue-50 text-gray-900 text-sm"
                                                >
                                                    {make.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Model *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.make) {
                                                alert("Please select a Make first");
                                                return;
                                            }
                                            setShowModelDropdown(!showModelDropdown);
                                            setShowMakeDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
                                        disabled={!formData.make}
                                    >
                                        <span className={formData.model ? "text-gray-900" : "text-gray-400"}>
                                            {formData.model || "Select Model"}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>
                                    {showModelDropdown && availableModels.length > 0 && (
                                        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                                            {availableModels.map((model) => (
                                                <button
                                                    key={model}
                                                    type="button"
                                                    onClick={() => handleModelChange(model)}
                                                    className="w-full px-4 py-2 text-left hover:bg-blue-50 text-gray-900 text-sm"
                                                >
                                                    {model}
                                                </button>
                                            ))}
                                        </div>
                                    )}
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

                            {/* Image Gallery - FIXED */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    Images
                                </h3>

                                {/* File Upload Option */}
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                                    <input
                                        key={imageInputKey}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="vehicle-image-upload"
                                        disabled={uploadingImage}
                                    />
                                    <label
                                        htmlFor="vehicle-image-upload"
                                        className={`cursor-pointer flex flex-col items-center gap-2 ${uploadingImage ? 'opacity-50' : ''}`}
                                    >
                                        {uploadingImage ? (
                                            <>
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                <span className="text-sm text-gray-500">Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CloudUpload className="w-8 h-8 text-gray-400" />
                                                <span className="text-sm text-gray-500">
                                                    Click to upload an image file
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    JPG, PNG, WebP or GIF (max 5MB)
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>

                                {/* OR divider */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-xs text-gray-400">OR</span>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                </div>

                                {/* URL Upload */}
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={newImageUrl}
                                        onChange={(e) => setNewImageUrl(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddImage}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Press Enter or click Add to add images
                                </p>

                                {/* Image Gallery Preview */}
                                {formData.image_gallery.length > 0 ? (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            {formData.image_gallery.length} image{formData.image_gallery.length > 1 ? 's' : ''} added
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {formData.image_gallery.map((url, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={url}
                                                        alt={`Vehicle image ${index + 1}`}
                                                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/e2e8f0/64748b?text=Invalid+URL';
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(index)}
                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <XIcon className="w-3 h-3" />
                                                    </button>
                                                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">No images added yet</p>
                                        <p className="text-xs text-gray-400">Upload a file or add image URL above</p>
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