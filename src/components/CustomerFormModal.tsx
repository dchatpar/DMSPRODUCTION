"use client";

import { useState, useEffect } from "react";
import {
    X,
    User,
    Mail,
    Phone,
    Building,
    MapPin,
    Save,
    Loader2,
    AlertCircle,
    UserPlus,
    Users,
    MessageSquare,
    Scan
} from "lucide-react";
import OCRScannerModal from "./OCRScannerModal";
import { apiFetch } from "@/src/lib/fetch";
import { useOverlayDismiss } from "@/src/hooks/useOverlayDismiss";

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    province: string | null;  // Changed from 'state'
    postal_code: string | null;  // Changed from 'zip'
    notes: string | null;
    marketing_consent?: boolean | null;
    sms_consent?: boolean | null;
    marketing_consent_at?: string | null;
    sms_consent_at?: string | null;
    created_at: string;
    updated_at: string;
}

interface CustomerFormModalProps {
    mode: "add" | "edit";
    customer?: Customer | null;
    onClose: () => void;
    onSuccess: () => void;
    /** Prefill name when creating (e.g. deal-link named leftovers). */
    defaultName?: string;
    /** Called with created/updated customer when API returns data. */
    onSaved?: (customer: Customer) => void;
}

interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

export default function CustomerFormModal({
    mode,
    customer,
    onClose,
    onSuccess,
    defaultName,
    onSaved,
}: CustomerFormModalProps) {
    useOverlayDismiss(onClose);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showOCR, setShowOCR] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: mode === "add" && defaultName ? defaultName : "",
        email: "",
        phone: "",
        address: "",
        city: "",
        province: "",  // Changed from 'state'
        postal_code: "",  // Changed from 'zip'
        notes: "",
        assigned_to: "",
        marketing_consent: false,
        sms_consent: false,
    });

    useEffect(() => {
        // Fetch current user info and users list
        const fetchData = async () => {
            try {
                // Get current user
                const meResponse = await fetch("/api/me", {
                });
                if (meResponse.ok) {
                    const meData = await meResponse.json();
                    setCurrentUserId(meData.data?.id);
                    setCurrentUserRole(meData.data?.role);

                    // If Admin/Manager, fetch all users in dealership to assign
                    if (meData.data?.role === "Admin" || meData.data?.role === "Manager") {
                        const usersResponse = await fetch("/api/users", {
                        });
                        if (usersResponse.ok) {
                            const usersData = await usersResponse.json();
                            setUsers(usersData.data || []);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();

        if (mode === "edit" && customer) {
            setFormData({
                name: customer.name,
                email: customer.email || "",
                phone: customer.phone || "",
                address: customer.address || "",
                city: customer.city || "",
                province: customer.province || "",
                postal_code: customer.postal_code || "",
                notes: customer.notes || "",
                assigned_to: (customer as { assigned_to?: string })?.assigned_to || "",
                marketing_consent: Boolean(customer.marketing_consent),
                sms_consent: Boolean(customer.sms_consent),
            });
        } else if (mode === "add") {
            setFormData((prev) => ({
                ...prev,
                marketing_consent: false,
                sms_consent: false,
            }));
        }
    }, [mode, customer]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = mode === "add" ? "/api/customers" : `/api/customers/${customer?.id}`;
            const method = mode === "add" ? "POST" : "PATCH";

            const payload: Record<string, unknown> = {
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                city: formData.city || null,
                province: formData.province || null,  // Changed from 'state'
                postal_code: formData.postal_code || null,  // Changed from 'zip'
                notes: formData.notes || null,
                marketing_consent: Boolean(formData.marketing_consent),
                sms_consent: Boolean(formData.sms_consent),
            };

            // Include assigned_to if Admin/Manager set it
            if (formData.assigned_to) {
                payload.assigned_to = formData.assigned_to;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${mode} customer`);
            }

            const result = await response.json().catch(() => null);
            if (result?.data && onSaved) {
                onSaved(result.data as Customer);
            }
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
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
                                {mode === "add" ? (
                                    <UserPlus className="w-5 h-5 text-white" />
                                ) : (
                                    <Users className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {mode === "add" ? "Add New Customer" : "Edit Customer"}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {mode === "add" ? "Add a new customer to your database" : "Update customer information"}
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
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Name */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Full Name *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowOCR(true)}
                                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors"
                                    >
                                        <Scan className="w-3 h-3" />
                                        Scan ID
                                    </button>
                                </div>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="John Smith"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email and Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="john@company.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Phone
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="+1 234 567 8900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Address
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="123 Main Street"
                                    />
                                </div>
                            </div>

                            {/* City, Province, Postal Code */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Province
                                    </label>
                                    <input
                                        type="text"
                                        name="province"
                                        value={formData.province}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Province"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Postal Code
                                    </label>
                                    <input
                                        type="text"
                                        name="postal_code"
                                        value={formData.postal_code}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="A1B 2C3"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Notes
                                </label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        placeholder="Additional notes about this customer..."
                                    />
                                </div>
                            </div>

                            {/* CASL consent — unchecked by default */}
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                                <p className="text-sm font-medium text-gray-900">Communication consent (CASL)</p>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="marketing_consent"
                                        checked={formData.marketing_consent}
                                        onChange={handleChange}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Marketing email consent
                                        <span className="block text-xs text-gray-500">
                                            Unchecked by default. Timestamp stored when checked.
                                            {mode === "edit" && customer?.marketing_consent_at
                                                ? ` Last recorded: ${new Date(customer.marketing_consent_at).toLocaleString()}.`
                                                : ""}
                                        </span>
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="sms_consent"
                                        checked={formData.sms_consent}
                                        onChange={handleChange}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        SMS / text consent
                                        <span className="block text-xs text-gray-500">
                                            Stored for CASL. SMS transport is not configured yet
                                            (send API returns 501). Unchecked by default.
                                            {mode === "edit" && customer?.sms_consent_at
                                                ? ` Last recorded: ${new Date(customer.sms_consent_at).toLocaleString()}.`
                                                : ""}
                                        </span>
                                    </span>
                                </label>
                            </div>

                            {/* Assign To - Only shown for Admin/Manager */}
                            {(currentUserRole === "Admin" || currentUserRole === "Manager") && users.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Assign To
                                    </label>
                                    <select
                                        name="assigned_to"
                                        value={formData.assigned_to}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    >
                                        <option value="">Unassigned (Visible to all)</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name || user.email} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Assign this customer to a specific user. Unassigned customers are visible to all.
                                    </p>
                                </div>
                            )}

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
                                            {mode === "add" ? "Add Customer" : "Save Changes"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* OCR Scanner Modal */}
            {showOCR && (
                <OCRScannerModal
                    onClose={() => setShowOCR(false)}
                    onScanComplete={(data) => {
                        console.log("OCR Data received:", data);
                        if (data.first_name || data.last_name) {
                            const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
                            console.log("Setting name to:", fullName);
                            setFormData((prev) => ({
                                ...prev,
                                name: fullName || prev.name,
                                address: data.address || prev.address,
                                city: data.city || prev.city,
                                province: data.province || prev.province,
                                postal_code: data.postal_code || prev.postal_code
                            }));
                        }
                        setShowOCR(false);
                    }}
                    onCustomerCreated={(data) => {
                        if (data.first_name || data.last_name) {
                            setFormData((prev) => ({
                                ...prev,
                                name: `${data.first_name || ""} ${data.last_name || ""}`.trim()
                            }));
                        }
                    }}
                />
            )}
        </div>
    );
}