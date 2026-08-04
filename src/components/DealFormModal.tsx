"use client";

import { useState, useEffect } from "react";
import {
    X,
    Save,
    Loader2,
    AlertCircle,
    FileText,
    DollarSign,
    Calendar,
    User,
    Car,
    Percent,
    Clock,
    Building
} from "lucide-react";
import { apiFetch } from "@/src/lib/fetch";
import { useOverlayDismiss } from "@/src/hooks/useOverlayDismiss";

interface Vehicle {
    id: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    retail_price: number;
    status: string;
    condition?: string;
    image_gallery?: string[];
}

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
}

interface Salesperson {
    id: string;
    full_name: string;
    email: string;
    avatar?: string | null;
}

interface Deal {
    id: string;
    vehicle_id: string | null;
    customer_id: string | null;
    deal_status: string;
    finance_term: number | null;
    interest_rate: number | null;
    down_payment: number;
    sale_price: number;
    salesperson_id: string | null;
    finance_company: string | null;
    notes: string | null;
    deal_date: string;
    created_at: string;
    vehicle: Vehicle | null;
    customer: Customer | null;
    salesperson: Salesperson | null;
}

interface DealFormModalProps {
    mode: "add" | "edit";
    deal?: Deal | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DealFormModal({
    mode,
    deal,
    onClose,
    onSuccess
}: DealFormModalProps) {
    useOverlayDismiss(onClose);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
    const [formData, setFormData] = useState({
        vehicle_id: "",
        customer_id: "",
        deal_status: "Negotiation",
        sale_price: 0,
        down_payment: 0,
        finance_term: "",
        interest_rate: "",
        finance_company: "",
        salesperson_id: "",
        notes: "",
        deal_date: new Date().toISOString().split("T")[0]
    });

    useEffect(() => {
        fetchDropdownData();

        if (mode === "edit" && deal) {
            setFormData({
                vehicle_id: deal.vehicle_id || "",
                customer_id: deal.customer_id || "",
                deal_status: deal.deal_status || "Negotiation",
                sale_price: deal.sale_price || 0,
                down_payment: deal.down_payment || 0,
                finance_term: deal.finance_term?.toString() || "",
                interest_rate: deal.interest_rate?.toString() || "",
                finance_company: deal.finance_company || "",
                salesperson_id: deal.salesperson_id || "",
                notes: deal.notes || "",
                deal_date: deal.deal_date || new Date().toISOString().split("T")[0]
            });
        }
    }, [mode, deal]);

    const fetchDropdownData = async () => {
        setLoadingData(true);
        try {
            // Fetch vehicles that are active (not sold)
            const vehiclesData = await apiFetch<any>("/api/vehicles?status=Active");
            setVehicles(vehiclesData.data || []);

            // Fetch customers
            const customersData = await apiFetch<any>("/api/customers?limit=100");
            setCustomers(customersData.data || []);

            // Fetch users for salespeople
            const usersData = await apiFetch<any>("/api/users?limit=100");
            setSalespersons(usersData.data || []);
        } catch (err) {
            console.error("Error fetching dropdown data:", err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? (value === "" ? "" : parseFloat(value) || 0) : value
        }));
    };

    const handleVehicleSelect = (vehicleId: string) => {
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (vehicle) {
            setFormData((prev) => ({
                ...prev,
                vehicle_id: vehicleId,
                sale_price: vehicle.retail_price || 0
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = mode === "add" ? "/api/deals" : `/api/deals/${deal?.id}`;
            const method = mode === "add" ? "POST" : "PATCH";

            const payload = {
                vehicle_id: formData.vehicle_id,
                customer_id: formData.customer_id || null,
                deal_status: formData.deal_status,
                sale_price: formData.sale_price,
                down_payment: formData.down_payment || 0,
                finance_term: formData.finance_term ? parseInt(formData.finance_term) : null,
                interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
                finance_company: formData.finance_company || null,
                salesperson_id: formData.salesperson_id || null,
                notes: formData.notes || null,
                deal_date: formData.deal_date
            };

            const response = await apiFetch(url, {
                method,
                body: payload
            });

            if (!response) {
                throw new Error(`Failed to ${mode} deal`);
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {mode === "add" ? "Create New Deal" : "Edit Deal"}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {mode === "add" ? "Create a new sales deal" : "Update deal information"}
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
                                        onChange={(e) => handleVehicleSelect(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        required
                                        disabled={loadingData}
                                    >
                                        <option value="">Select a vehicle</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.retail_price?.toLocaleString()} ({vehicle.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedVehicle && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        VIN: {selectedVehicle.vin} | Retail Price: ${selectedVehicle.retail_price?.toLocaleString()}
                                    </p>
                                )}
                            </div>

                            {/* Customer Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Customer {mode === "add" ? "*" : ""}
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        name="customer_id"
                                        value={formData.customer_id}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        required={mode === "add"}
                                        disabled={loadingData}
                                    >
                                        <option value="">
                                            {mode === "edit" ? "Unlinked / select customer" : "Select a customer"}
                                        </option>
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.name} {customer.email ? `(${customer.email})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Deal Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Deal Status *
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        name="deal_status"
                                        value={formData.deal_status}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        required
                                    >
                                        <option value="Negotiation">Negotiation</option>
                                        <option value="Down Payment">Down Payment</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Paid Off">Paid Off</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            {/* Deal Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Deal Date
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        name="deal_date"
                                        value={formData.deal_date}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Sale Price *
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            name="sale_price"
                                            value={formData.sale_price || ""}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="0.00"
                                            required
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Down Payment
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            name="down_payment"
                                            value={formData.down_payment || ""}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Desking lite — always available; term/rate persist on save */}
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                                        <Percent className="w-4 h-4" />
                                        Desking
                                    </p>
                                    <p className="text-xs text-indigo-700">
                                        Est. monthly{" "}
                                        <span className="font-bold">
                                            {(() => {
                                                const term = parseInt(formData.finance_term, 10) || 0;
                                                const rate = parseFloat(formData.interest_rate) || 0;
                                                const principal = Math.max(
                                                    0,
                                                    (formData.sale_price || 0) - (formData.down_payment || 0)
                                                );
                                                if (!term || principal <= 0) return "—";
                                                const r = rate / 100 / 12;
                                                const pay =
                                                    r <= 0
                                                        ? principal / term
                                                        : (principal * r * Math.pow(1 + r, term)) /
                                                          (Math.pow(1 + r, term) - 1);
                                                return new Intl.NumberFormat("en-CA", {
                                                    style: "currency",
                                                    currency: "CAD",
                                                }).format(pay);
                                            })()}
                                        </span>
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Term (months)
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="number"
                                                name="finance_term"
                                                value={formData.finance_term}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                placeholder="e.g. 60"
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Rate (%)
                                        </label>
                                        <div className="relative">
                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="number"
                                                name="interest_rate"
                                                value={formData.interest_rate}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                placeholder="e.g. 5.99"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Finance company
                                        </label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                name="finance_company"
                                                value={formData.finance_company}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                placeholder="e.g. TD Auto Finance"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Salesperson */}
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
                                        <option value="">Select a salesperson</option>
                                        {salespersons.map((person) => (
                                            <option key={person.id} value={person.id}>
                                                {person.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Additional notes about this deal..."
                                />
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
                                            {mode === "add" ? "Creating..." : "Saving..."}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {mode === "add" ? "Create Deal" : "Save Changes"}
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
