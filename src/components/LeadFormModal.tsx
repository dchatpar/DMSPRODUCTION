"use client";

import { useState, useEffect } from "react";
import {
    X,
    User,
    Mail,
    Phone,
    Calendar,
    Save,
    Loader2,
    AlertCircle,
    UserPlus,
    Users,
    Car,
    Building,
    MessageSquare,
    Plus,
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

interface LeadFormModalProps {
    mode: "add" | "edit";
    lead?: Lead | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function LeadFormModal({
    mode,
    lead,
    onClose,
    onSuccess,
}: LeadFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
    const [addingCustomer, setAddingCustomer] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: "",
        source: "Website",
        status: "Not Started",
        interest_vehicle_id: "",
        assigned_to: "",
        notes: "",
    });

    useEffect(() => {
        fetchFormData();
    }, []);

    useEffect(() => {
        if (mode === "edit" && lead) {
            setFormData({
                customer_id: lead.customer_id,
                source: lead.source,
                status: lead.status,
                interest_vehicle_id: lead.interest_vehicle_id || "",
                assigned_to: lead.assigned_to || "",
                notes: lead.notes || "",
            });
        }
    }, [mode, lead]);

    const fetchFormData = async () => {
        try {
            const token = localStorage.getItem("access_token");

            // Fetch customers, vehicles, and users in parallel
            const [customersRes, vehiclesRes, usersRes] = await Promise.all([
                fetch("/api/customers?limit=1000", {
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
            const vehiclesData = await vehiclesRes.json();
            const usersData = await usersRes.json();

            setCustomers(customersData.data || []);
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

    const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewCustomer((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddCustomer = async () => {
        if (!newCustomer.name.trim()) {
            setError("Customer name is required");
            return;
        }

        setAddingCustomer(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch("/api/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newCustomer),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to add customer");
            }

            const { data: newCustomerData } = await response.json();

            // Refresh customers list
            const customersRes = await fetch("/api/customers?limit=1000", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const customersData = await customersRes.json();
            setCustomers(customersData.data || []);

            // Select the new customer
            setFormData((prev) => ({ ...prev, customer_id: newCustomerData.id }));
            setShowAddCustomer(false);
            setNewCustomer({ name: "", email: "", phone: "" });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add customer");
        } finally {
            setAddingCustomer(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            const url = mode === "add" ? "/api/leads" : `/api/leads/${lead?.id}`;
            const method = mode === "add" ? "POST" : "PATCH";

            const payload = {
                customer_id: formData.customer_id,
                source: formData.source,
                status: formData.status,
                interest_vehicle_id: formData.interest_vehicle_id || null,
                assigned_to: formData.assigned_to || null,
                notes: formData.notes || null,
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
                throw new Error(errorData.error || `Failed to ${mode} lead`);
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
                                    {mode === "add" ? "Add New Lead" : "Edit Lead"}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {mode === "add" ? "Create a new sales lead" : "Update lead information"}
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
                            {/* Customer */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Customer *
                                    </label>
                                    {!showAddCustomer && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCustomer(true)}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add New Customer
                                        </button>
                                    )}
                                </div>

                                {showAddCustomer ? (
                                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-blue-700">Add New Customer</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddCustomer(false);
                                                    setNewCustomer({ name: "", email: "", phone: "" });
                                                    setError(null);
                                                }}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={newCustomer.name}
                                                    onChange={handleNewCustomerChange}
                                                    placeholder="Name *"
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={newCustomer.email}
                                                    onChange={handleNewCustomerChange}
                                                    placeholder="Email"
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={newCustomer.phone}
                                                    onChange={handleNewCustomerChange}
                                                    placeholder="Phone"
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddCustomer(false);
                                                    setNewCustomer({ name: "", email: "", phone: "" });
                                                }}
                                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddCustomer}
                                                disabled={addingCustomer}
                                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {addingCustomer ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-3 h-3" />
                                                        Add Customer
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                                )}
                            </div>

                            {/* Source and Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Source *
                                    </label>
                                    <select
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        required
                                    >
                                        <option value="Website">Website</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Event">Event</option>
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Craigslist">Craigslist</option>
                                        <option value="Kijiji">Kijiji</option>
                                        <option value="Phone">Phone</option>
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
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        required
                                    >
                                        <option value="Not Started">Not Started</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Qualified">Qualified</option>
                                        <option value="Closed">Closed</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </div>
                            </div>

                            {/* Vehicle Interest and Assigned To */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Vehicle Interest
                                    </label>
                                    <div className="relative">
                                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="interest_vehicle_id"
                                            value={formData.interest_vehicle_id}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        >
                                            <option value="">None</option>
                                            {vehicles.map((vehicle) => (
                                                <option key={vehicle.id} value={vehicle.id}>
                                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                                    {vehicle.stock_number ? ` (${vehicle.stock_number})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Assigned To
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            name="assigned_to"
                                            value={formData.assigned_to}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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
                                        placeholder="Additional notes about this lead..."
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
                                            {mode === "add" ? "Adding..." : "Saving..."}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {mode === "add" ? "Add Lead" : "Save Changes"}
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