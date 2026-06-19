"use client";

import { useState, useEffect } from "react";
import {
    X,
    Car,
    User,
    Calendar,
    Clock,
    Save,
    Loader2,
    AlertCircle,
    Users,
    FileText,
    Phone,
    Mail,
    Key,
    Image,
    Signature,
    UserPlus,
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
}

interface TestDriveFormModalProps {
    mode: "add" | "edit";
    testDrive?: TestDrive | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TestDriveFormModal({
    mode,
    testDrive,
    onClose,
    onSuccess,
}: TestDriveFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [customerType, setCustomerType] = useState<"customer" | "lead">("customer");

    const [formData, setFormData] = useState({
        customer_id: "",
        lead_id: "",
        vehicle_id: "",
        driver_license_number: "",
        driver_license_expiry: "",
        driver_license_image_url: "",
        signature_image_url: "",
        start_time: "",
        end_time: "",
        salesperson_id: "",
        notes: "",
        status: "Scheduled",
    });

    useEffect(() => {
        fetchFormData();
    }, []);

    useEffect(() => {
        if (mode === "edit" && testDrive) {
            setFormData({
                customer_id: testDrive.customer_id || "",
                lead_id: testDrive.lead_id || "",
                vehicle_id: testDrive.vehicle_id,
                driver_license_number: testDrive.driver_license_number,
                driver_license_expiry: testDrive.driver_license_expiry,
                driver_license_image_url: testDrive.driver_license_image_url || "",
                signature_image_url: testDrive.signature_image_url || "",
                start_time: testDrive.start_time.slice(0, 16),
                end_time: testDrive.end_time ? testDrive.end_time.slice(0, 16) : "",
                salesperson_id: testDrive.salesperson_id || "",
                notes: testDrive.notes || "",
                status: testDrive.status || "Scheduled",
            });
            if (testDrive.customer_id) {
                setCustomerType("customer");
            } else if (testDrive.lead_id) {
                setCustomerType("lead");
            }
        }
    }, [mode, testDrive]);

    const fetchFormData = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const [customersRes, leadsRes, vehiclesRes, usersRes] = await Promise.all([
                fetch("/api/customers?limit=1000", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("/api/leads?limit=1000", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("/api/vehicles?limit=1000&status=Active", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("/api/users?limit=1000", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const customersData = await customersRes.json();
            const leadsData = await leadsRes.json();
            const vehiclesData = await vehiclesRes.json();
            const usersData = await usersRes.json();

            setCustomers(customersData.data || []);
            setLeads(leadsData.data || []);
            setVehicles(vehiclesData.data || []);
            setUsers(usersData.data || []);
        } catch (error) {
            console.error("Error fetching form data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            const url = mode === "add" ? "/api/test-drives" : `/api/test-drives/${testDrive?.id}`;
            const method = mode === "add" ? "POST" : "PUT";

            const payload = {
                ...formData,
                customer_id: customerType === "customer" ? formData.customer_id : null,
                lead_id: customerType === "lead" ? formData.lead_id : null,
                end_time: formData.end_time || null,
                driver_license_image_url: formData.driver_license_image_url || null,
                signature_image_url: formData.signature_image_url || null,
                notes: formData.notes || null,
                salesperson_id: formData.salesperson_id || null,
            };

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
                throw new Error(errorData.error || `Failed to ${mode} test drive`);
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative min-h-screen flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                        <p className="mt-2 text-sm text-gray-500">Loading form data...</p>
                    </div>
                </div>
            </div>
        );
    }

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
                                    {mode === "add" ? "Schedule Test Drive" : "Edit Test Drive"}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {mode === "add" ? "Schedule a new vehicle test drive" : "Update test drive details"}
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
                            {/* Customer Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Customer Type *
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCustomerType("customer")}
                                        className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${customerType === "customer"
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <Users className="w-4 h-4 inline mr-2" />
                                        Existing Customer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomerType("lead")}
                                        className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${customerType === "lead"
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <UserPlus className="w-4 h-4 inline mr-2" />
                                        Lead
                                    </button>
                                </div>
                            </div>

                            {/* Customer/Lead Selection */}
                            {customerType === "customer" ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Select Customer *
                                    </label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="customer_id"
                                            value={formData.customer_id}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            required
                                        >
                                            <option value="">Select Customer</option>
                                            {customers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.name} {customer.email ? `(${customer.email})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Select Lead *
                                    </label>
                                    <div className="relative">
                                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="lead_id"
                                            value={formData.lead_id}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            required
                                        >
                                            <option value="">Select Lead</option>
                                            {leads.map((lead) => (
                                                <option key={lead.id} value={lead.id}>
                                                    {lead.customer?.name || "Unknown"} - {lead.source} ({lead.status})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Vehicle Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Vehicle *
                                </label>
                                <div className="relative">
                                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        name="vehicle_id"
                                        value={formData.vehicle_id}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        required
                                    >
                                        <option value="">Select Vehicle</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.vin} {vehicle.stock_number ? `(Stock: #${vehicle.stock_number})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Driver License */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        License Number *
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="driver_license_number"
                                            value={formData.driver_license_number}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="DL123456"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        License Expiry *
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="date"
                                            name="driver_license_expiry"
                                            value={formData.driver_license_expiry}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* License Image URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    License Image URL
                                </label>
                                <div className="relative">
                                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="url"
                                        name="driver_license_image_url"
                                        value={formData.driver_license_image_url}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="https://example.com/license.jpg"
                                    />
                                </div>
                            </div>

                            {/* Signature Image URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Signature Image URL
                                </label>
                                <div className="relative">
                                    <Signature className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="url"
                                        name="signature_image_url"
                                        value={formData.signature_image_url}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="https://example.com/signature.jpg"
                                    />
                                </div>
                            </div>

                            {/* Start and End Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Start Time *
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="datetime-local"
                                            name="start_time"
                                            value={formData.start_time}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        End Time
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="datetime-local"
                                            name="end_time"
                                            value={formData.end_time}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Salesperson and Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Salesperson
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="salesperson_id"
                                            value={formData.salesperson_id}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        >
                                            <option value="">Select Salesperson</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                        <option value="No Show">No Show</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Notes
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        placeholder="Additional notes about the test drive..."
                                    />
                                </div>
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
                                            {mode === "add" ? "Scheduling..." : "Saving..."}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {mode === "add" ? "Schedule Test Drive" : "Save Changes"}
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