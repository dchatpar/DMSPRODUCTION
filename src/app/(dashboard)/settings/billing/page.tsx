"use client";

import { useState, useEffect } from "react";
import {
    CreditCard,
    Building2,
    MapPin,
    Mail,
    Phone,
    Loader2,
    AlertCircle,
    RefreshCw,
    Plus,
    Trash2,
    CheckCircle,
    Edit,
} from "lucide-react";

interface BillingInfo {
    id: string;
    dealership_id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    payment_method_type: string | null;
    payment_method_last4: string | null;
    payment_method_brand: string | null;
    billing_name: string | null;
    billing_email: string | null;
    billing_phone: string | null;
    billing_address_line1: string | null;
    billing_address_line2: string | null;
    billing_city: string | null;
    billing_province: string | null;
    billing_postal_code: string | null;
    billing_country: string | null;
    tax_exempt: boolean;
    tax_id: string | null;
}

interface Dealership {
    id: string;
    name: string;
    status: string;
}

export default function BillingPage() {
    const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
    const [dealership, setDealership] = useState<Dealership | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        billing_name: "",
        billing_address_line1: "",
        billing_address_line2: "",
        billing_city: "",
        billing_province: "",
        billing_postal_code: "",
        billing_country: "Canada",
        billing_email: "",
        billing_phone: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            if (!token) {
                window.location.href = "/login";
                return;
            }

            // Get user info to find dealership
            const meResponse = await fetch("/api/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!meResponse.ok) {
                throw new Error("Failed to get user info");
            }

            const meData = await meResponse.json();
            const dealershipId = meData.data.dealership_id;

            if (!dealershipId) {
                setError("You are not associated with any dealership");
                return;
            }

            // Get dealership details
            const dealershipResponse = await fetch(`/api/dealerships/${dealershipId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (dealershipResponse.ok) {
                const dealershipData = await dealershipResponse.json();
                setDealership(dealershipData.data);

                // Get billing information from the dealership response
                if (dealershipData.data.billing_information) {
                    const bi = dealershipData.data.billing_information;
                    setBillingInfo(bi);
                    setFormData({
                        billing_name: bi.billing_name || "",
                        billing_address_line1: bi.billing_address_line1 || "",
                        billing_address_line2: bi.billing_address_line2 || "",
                        billing_city: bi.billing_city || "",
                        billing_province: bi.billing_province || "",
                        billing_postal_code: bi.billing_postal_code || "",
                        billing_country: bi.billing_country || "Canada",
                        billing_email: bi.billing_email || "",
                        billing_phone: bi.billing_phone || "",
                    });
                }
            }
        } catch (err: any) {
            console.error("Error fetching billing info:", err);
            setError(err.message || "Failed to load billing information");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSaving(true);

        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                window.location.href = "/login";
                return;
            }

            // In a real app, this would call a billing API endpoint
            // For now, we'll simulate success
            await new Promise((resolve) => setTimeout(resolve, 1000));

            setSuccess("Billing information updated successfully");
            setIsEditing(false);

            // Refresh data
            fetchData();
        } catch (err: any) {
            console.error("Error saving billing info:", err);
            setError(err.message || "Failed to save billing information");
        } finally {
            setSaving(false);
        }
    };

    const formatCardDisplay = () => {
        if (!billingInfo?.payment_method_type) return null;
        return (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                    <p className="font-medium text-gray-900">
                        {billingInfo.payment_method_brand || billingInfo.payment_method_type} ending in {billingInfo.payment_method_last4}
                    </p>
                    {billingInfo.stripe_subscription_id && (
                        <p className="text-sm text-gray-500">Subscription active</p>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your billing information and payment methods
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-600">{success}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Billing Information */}
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Billing Information</h2>
                            </div>

                            {isEditing ? (
                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    {/* Billing Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Billing Name
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="billing_name"
                                                value={formData.billing_name}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Business name for billing"
                                            />
                                        </div>
                                    </div>

                                    {/* Address Line 1 */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Street Address
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="billing_address_line1"
                                                value={formData.billing_address_line1}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="123 Business St"
                                            />
                                        </div>
                                    </div>

                                    {/* Address Line 2 */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address Line 2
                                        </label>
                                        <input
                                            type="text"
                                            name="billing_address_line2"
                                            value={formData.billing_address_line2}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Suite 100"
                                        />
                                    </div>

                                    {/* City, Province, Postal */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                name="billing_city"
                                                value={formData.billing_city}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Province/State
                                            </label>
                                            <input
                                                type="text"
                                                name="billing_province"
                                                value={formData.billing_province}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Province"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Postal/ZIP Code
                                            </label>
                                            <input
                                                type="text"
                                                name="billing_postal_code"
                                                value={formData.billing_postal_code}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="A1A 1A1"
                                            />
                                        </div>
                                    </div>

                                    {/* Country */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Country
                                        </label>
                                        <select
                                            name="billing_country"
                                            value={formData.billing_country}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Canada">Canada</option>
                                            <option value="United States">United States</option>
                                            <option value="Mexico">Mexico</option>
                                            <option value="United Kingdom">United Kingdom</option>
                                            <option value="Australia">Australia</option>
                                        </select>
                                    </div>

                                    {/* Contact */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Billing Email
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="email"
                                                    name="billing_email"
                                                    value={formData.billing_email}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="billing@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="billing_phone"
                                                    value={formData.billing_phone}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                fetchData();
                                            }}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-6">
                                    {billingInfo?.billing_name || billingInfo?.billing_address_line1 ? (
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {billingInfo.billing_name || dealership?.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {billingInfo.billing_address_line1 || "No address set"}
                                                    </p>
                                                    {billingInfo.billing_address_line2 && (
                                                        <p className="text-sm text-gray-500">
                                                            {billingInfo.billing_address_line2}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-gray-500">
                                                        {[
                                                            billingInfo.billing_city,
                                                            billingInfo.billing_province,
                                                            billingInfo.billing_postal_code,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(", ")}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {billingInfo.billing_country}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <p className="text-sm text-gray-600">
                                                    {billingInfo.billing_email || "No email set"}
                                                </p>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <p className="text-sm text-gray-600">
                                                    {billingInfo.billing_phone || "No phone set"}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 mb-4">No billing information set</p>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Billing Info
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Payment Methods */}
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
                                <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Plus className="w-4 h-4" />
                                    Add Card
                                </button>
                            </div>

                            <div className="p-6">
                                {billingInfo?.payment_method_type ? (
                                    <div className="flex items-center justify-between">
                                        {formatCardDisplay()}
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 mb-4">No payment method on file</p>
                                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                                            <Plus className="w-4 h-4" />
                                            Add Payment Method
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Dealership Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-4">Dealership</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{dealership?.name || "N/A"}</p>
                                    <p className="text-sm text-gray-500 capitalize">{dealership?.status || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-4">Current Subscription</h3>
                            <a
                                href="/settings/subscription"
                                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                View Subscription
                            </a>
                        </div>

                        {/* Help Card */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
                            <h3 className="text-sm font-medium text-amber-800 mb-2">Billing Help</h3>
                            <p className="text-sm text-amber-700 mb-4">
                                Need help with billing or invoices? Contact our billing team.
                            </p>
                            <button className="w-full px-4 py-2 text-sm font-medium text-amber-800 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors">
                                Contact Billing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
