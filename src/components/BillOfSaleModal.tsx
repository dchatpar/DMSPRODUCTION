"use client";

import { useState, useEffect } from "react";
import {
    X,
    Save,
    Loader2,
    AlertCircle,
    FileText,
    Calculator,
    Printer,
    Eye,
    Download,
    RotateCcw,
    Plus,
    Trash2,
    Car,
    User,
    DollarSign,
    Calendar,
    CreditCard,
    Truck,
    FileWarning,
    CheckCircle,
    RefreshCw,
} from "lucide-react";

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
    odometer?: number;
    stock_number?: string;
}

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
}

interface Payment {
    id?: string;
    payment_name: string;
    payment_type: string;
    amount: number;
    payment_date: string;
}

interface BillOfSale {
    id?: string;
    deal_id?: string;
    vehicle_id?: string;
    customer_id?: string;
    vehicle_description?: string;
    sale_type?: string;

    // Section B: Pricing
    price_vehicle?: number;
    additional_equipment?: number;
    services_warranties?: number;
    documentation_fees?: number;
    vsa_levy_recovery?: number;
    extra_fee_1_taxable?: number;
    discount?: number;
    subtotal?: number;

    // Trade-in
    trade_in_allowance?: number;
    net_difference?: number;

    // GST/PST
    gst_rate?: number;
    gst_amount?: number;
    pst_rate?: number;
    pst_amount?: number;
    purchase_price_with_gst_pst?: number;

    // Section C: Additional Fees
    licence_fee?: number;
    gasoline_fee?: number;
    finance_fee?: number;
    lien_payout?: number;
    extra_fee_2_non_taxable?: number;
    sub_total?: number;
    deposit?: number;
    down_payments?: number;
    insurance_life?: number;
    insurance_gap?: number;
    rst_on_insurance?: number;
    total_purchase_price?: number;
    ppsa_fee?: number;
    admin_fee?: number;
    amount_to_finance?: number;
    total_balance_due?: number;

    // Section D: Financings
    payment_type?: string;
    cost_of_borrowing?: number;
    payment_start_date?: string | null;

    // Section E: Trade-in
    trade_in_year?: number;
    trade_in_make?: string;
    trade_in_model?: string;
    trade_in_series?: string;
    trade_in_cylinders?: number;
    trade_in_odometer?: number;
    trade_in_kms_miles?: string;
    trade_in_exterior_color?: string;
    trade_in_interior_color?: string;
    trade_in_vin?: string;
    trade_in_stock_number?: string;
    trade_in_owing_to?: string;
    trade_in_odometer_delivery?: number;
    trade_in_disclosure?: string;

    // Section F: Notes
    notes?: string;

    // Section G: Status
    payment_status?: string;
    status?: string;
    is_new_version?: boolean;
    gst_enabled?: boolean;

    payments?: Payment[];
}

interface BillOfSaleModalProps {
    mode: "add" | "edit" | "view";
    deal?: any;
    billOfSale?: BillOfSale | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BillOfSaleModal({
    mode: initialMode,
    deal,
    billOfSale: initialBillOfSale,
    onClose,
    onSuccess,
}: BillOfSaleModalProps) {
    const [mode, setMode] = useState(initialMode);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savingType, setSavingType] = useState<"draft" | "sold">("draft");
    const [activeTab, setActiveTab] = useState<"pricing" | "fees" | "financing" | "tradein" | "payments">("pricing");
    const [saleType, setSaleType] = useState<"Cash" | "Finance" | "BHPH">("Cash");
    const [gstEnabled, setGstEnabled] = useState(true);

    // Customer & Vehicle
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);

    // Payments
    const [payments, setPayments] = useState<Payment[]>([]);

    const [formData, setFormData] = useState<BillOfSale>({
        // Section B
        price_vehicle: 0,
        additional_equipment: 0,
        services_warranties: 0,
        documentation_fees: 0,
        vsa_levy_recovery: 0,
        extra_fee_1_taxable: 0,
        discount: 0,
        subtotal: 0,

        // Trade-in
        trade_in_allowance: 0,
        net_difference: 0,

        // GST/PST
        gst_rate: 5.0,
        gst_amount: 0,
        pst_rate: 7.0,
        pst_amount: 0,
        purchase_price_with_gst_pst: 0,

        // Section C
        licence_fee: 0,
        gasoline_fee: 0,
        finance_fee: 0,
        lien_payout: 0,
        extra_fee_2_non_taxable: 0,
        sub_total: 0,
        deposit: 0,
        down_payments: 0,
        insurance_life: 0,
        insurance_gap: 0,
        rst_on_insurance: 0,
        total_purchase_price: 0,
        ppsa_fee: 0,
        admin_fee: 0,
        amount_to_finance: 0,
        total_balance_due: 0,

        // Section D
        payment_type: "",
        cost_of_borrowing: 0,
        payment_start_date: "",

        // Section E
        trade_in_kms_miles: "KMS",
        trade_in_odometer_delivery: 0,

        // Section G
        payment_status: "Not Paid",
        status: "Draft",
        gst_enabled: true,
    });

    useEffect(() => {
        // If editing or viewing existing bill of sale
        if (initialBillOfSale) {
            setFormData(initialBillOfSale);
            setPayments(initialBillOfSale.payments || []);
            setSaleType((initialBillOfSale.sale_type as any) || "Cash");
            setGstEnabled(initialBillOfSale.gst_enabled ?? true);

            if (initialBillOfSale.vehicle_id) {
                fetchVehicle(initialBillOfSale.vehicle_id);
            }
            if (initialBillOfSale.customer_id) {
                fetchCustomer(initialBillOfSale.customer_id);
            }
        }
        // If creating from a deal
        else if (deal) {
            if (deal.vehicle) {
                setVehicle(deal.vehicle);
                setFormData((prev) => ({
                    ...prev,
                    vehicle_id: deal.vehicle_id,
                    vehicle_description: `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`,
                    price_vehicle: deal.vehicle.retail_price || 0,
                }));
            }
            if (deal.customer) {
                setCustomer(deal.customer);
                setFormData((prev) => ({
                    ...prev,
                    customer_id: deal.customer_id,
                }));
            }
            if (deal.id) {
                setFormData((prev) => ({
                    ...prev,
                    deal_id: deal.id,
                }));
            }
        }
    }, [deal, initialBillOfSale]);

    const fetchVehicle = async (vehicleId: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/vehicles/${vehicleId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const { data } = await response.json();
                setVehicle(data);
                setFormData((prev) => ({
                    ...prev,
                    vehicle_description: `${data.year} ${data.make} ${data.model}`,
                }));
            }
        } catch (err) {
            console.error("Error fetching vehicle:", err);
        }
    };

    const fetchCustomer = async (customerId: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/customers/${customerId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const { data } = await response.json();
                setCustomer(data);
            }
        } catch (err) {
            console.error("Error fetching customer:", err);
        }
    };

    const calculateTotals = () => {
        const priceVehicle = formData.price_vehicle || 0;
        const additionalEquip = formData.additional_equipment || 0;
        const servicesWarranties = formData.services_warranties || 0;
        const docFees = formData.documentation_fees || 0;
        const vsaLevy = formData.vsa_levy_recovery || 0;
        const extraFee1 = formData.extra_fee_1_taxable || 0;
        const discount = formData.discount || 0;

        const subtotal = priceVehicle + additionalEquip + servicesWarranties + docFees + vsaLevy + extraFee1 - discount;

        const tradeInAllowance = formData.trade_in_allowance || 0;
        const netDifference = subtotal - tradeInAllowance;

        const gstRate = formData.gst_rate || 5.0;
        const pstRate = formData.pst_rate || 7.0;

        const gstAmount = gstEnabled ? netDifference * (gstRate / 100) : 0;
        const pstAmount = gstEnabled ? netDifference * (pstRate / 100) : 0;

        const purchasePriceWithTaxes = netDifference + gstAmount + pstAmount;

        // Section C calculations
        const licenceFee = formData.licence_fee || 0;
        const gasolineFee = formData.gasoline_fee || 0;
        const financeFee = formData.finance_fee || 0;
        const lienPayout = formData.lien_payout || 0;
        const extraFee2 = formData.extra_fee_2_non_taxable || 0;

        const subTotal = purchasePriceWithTaxes + licenceFee + gasolineFee + financeFee + lienPayout + extraFee2;

        const deposit = formData.deposit || 0;
        const downPayments = formData.down_payments || 0;
        const insuranceLife = formData.insurance_life || 0;
        const insuranceGap = formData.insurance_gap || 0;
        const rstOnInsurance = formData.rst_on_insurance || 0;

        const totalPurchasePrice = subTotal + insuranceLife + insuranceGap + rstOnInsurance;

        const ppsaFee = formData.ppsa_fee || 0;
        const adminFee = formData.admin_fee || 0;

        const amountToFinance = totalPurchasePrice + ppsaFee + adminFee - deposit - downPayments;
        const totalBalanceDue = amountToFinance;

        // Calculate payments made
        const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const paymentStatus = totalBalanceDue <= totalPayments ? "Paid" : "Not Paid";

        return {
            subtotal,
            netDifference,
            gstAmount,
            pstAmount,
            purchasePriceWithTaxes,
            subTotal,
            totalPurchasePrice,
            amountToFinance,
            totalBalanceDue,
            paymentStatus,
        };
    };

    const handleChange = (field: keyof BillOfSale, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handlePaymentChange = (index: number, field: keyof Payment, value: any) => {
        setPayments((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addPayment = () => {
        setPayments((prev) => [
            ...prev,
            {
                payment_name: "",
                payment_type: "Deposit",
                amount: 0,
                payment_date: new Date().toISOString().split("T")[0],
            },
        ]);
    };

    const removePayment = (index: number) => {
        setPayments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCalculate = () => {
        const totals = calculateTotals();
        setFormData((prev) => ({
            ...prev,
            subtotal: totals.subtotal,
            net_difference: totals.netDifference,
            gst_amount: totals.gstAmount,
            pst_amount: totals.pstAmount,
            purchase_price_with_gst_pst: totals.purchasePriceWithTaxes,
            sub_total: totals.subTotal,
            total_purchase_price: totals.totalPurchasePrice,
            amount_to_finance: totals.amountToFinance,
            total_balance_due: totals.totalBalanceDue,
            payment_status: totals.paymentStatus,
            status: "Calculated",
        }));
    };

    const handleReset = () => {
        setFormData({
            price_vehicle: vehicle?.retail_price || 0,
            additional_equipment: 0,
            services_warranties: 0,
            documentation_fees: 0,
            vsa_levy_recovery: 0,
            extra_fee_1_taxable: 0,
            discount: 0,
            subtotal: 0,
            trade_in_allowance: 0,
            net_difference: 0,
            gst_rate: 5.0,
            gst_amount: 0,
            pst_rate: 7.0,
            pst_amount: 0,
            purchase_price_with_gst_pst: 0,
            licence_fee: 0,
            gasoline_fee: 0,
            finance_fee: 0,
            lien_payout: 0,
            extra_fee_2_non_taxable: 0,
            sub_total: 0,
            deposit: 0,
            down_payments: 0,
            insurance_life: 0,
            insurance_gap: 0,
            rst_on_insurance: 0,
            total_purchase_price: 0,
            ppsa_fee: 0,
            admin_fee: 0,
            amount_to_finance: 0,
            total_balance_due: 0,
            payment_type: "",
            cost_of_borrowing: 0,
            payment_start_date: null,
            trade_in_year: undefined,
            trade_in_make: "",
            trade_in_model: "",
            trade_in_series: "",
            trade_in_cylinders: undefined,
            trade_in_odometer: undefined,
            trade_in_kms_miles: "KMS",
            trade_in_exterior_color: "",
            trade_in_interior_color: "",
            trade_in_vin: "",
            trade_in_stock_number: "",
            trade_in_owing_to: "",
            trade_in_odometer_delivery: undefined,
            trade_in_disclosure: "",
            notes: "",
            payment_status: "Not Paid",
            status: "Draft",
            gst_enabled: gstEnabled,
        });
        setPayments([]);
    };

    const handleSave = async (asSold: boolean = false) => {
        setLoading(true);
        setError(null);
        setSavingType(asSold ? "sold" : "draft");

        try {
            const token = localStorage.getItem("access_token");
            const url = formData.id ? `/api/bill-of-sale/${formData.id}` : "/api/bill-of-sale";
            const method = formData.id ? "PATCH" : "POST";

            // First calculate all totals
            const totals = calculateTotals();

            // Map camelCase totals to snake_case for database
            const payload = {
                ...formData,
                subtotal: totals.subtotal,
                net_difference: totals.netDifference,
                gst_amount: totals.gstAmount,
                pst_amount: totals.pstAmount,
                purchase_price_with_gst_pst: totals.purchasePriceWithTaxes,
                sub_total: totals.subTotal,
                total_purchase_price: totals.totalPurchasePrice,
                amount_to_finance: totals.amountToFinance,
                total_balance_due: totals.totalBalanceDue,
                payment_status: totals.paymentStatus,
                sale_type: saleType,
                gst_enabled: gstEnabled,
                status: asSold ? "Sold" : (formData.status || "Draft"),
                payments: payments,
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
                throw new Error(errorData.error || "Failed to save bill of sale");
            }

            // If sold, update the deal status and vehicle status
            if (asSold && deal) {
                await fetch(`/api/deals/${deal.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ deal_status: "Paid Off", close_deal: true }),
                });
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const isReadOnly = mode === "view";

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {mode === "view" ? "Bill of Sale" : formData.id ? "Edit Bill of Sale" : "New Bill of Sale"}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Vehicle not selected"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isReadOnly && (
                                <>
                                    <button
                                        onClick={handleReset}
                                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                                        title="Reset"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleCalculate}
                                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                    >
                                        <Calculator className="w-4 h-4" />
                                        Calculate
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Sale Type Tabs */}
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                                {["Cash", "Finance", "BHPH"].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => !isReadOnly && setSaleType(type as any)}
                                        disabled={isReadOnly}
                                        className={`px-4 py-1.5 text-sm rounded-md transition-colors ${saleType === type
                                                ? "bg-blue-600 text-white"
                                                : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={gstEnabled}
                                    onChange={(e) => !isReadOnly && setGstEnabled(e.target.checked)}
                                    disabled={isReadOnly}
                                    className="rounded border-gray-300"
                                />
                                <span>GST/PST Applicable</span>
                            </label>
                            {formData.status && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${formData.status === "Sold" ? "bg-green-100 text-green-700" :
                                        formData.status === "Calculated" ? "bg-blue-100 text-blue-700" :
                                            "bg-gray-100 text-gray-600"
                                    }`}>
                                    {formData.status}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    {!isReadOnly && (
                        <div className="px-6 py-2 bg-white border-b border-gray-200 flex gap-4">
                            {[
                                { id: "pricing", label: "Pricing" },
                                { id: "fees", label: "Additional Fees" },
                                { id: "financing", label: "Financing" },
                                { id: "tradein", label: "Trade-In" },
                                { id: "payments", label: `Payments (${payments.length})` },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${activeTab === tab.id
                                            ? "bg-green-100 text-green-700 font-medium"
                                            : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Section A: Vehicle & Customer Summary */}
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            {/* Vehicle Info */}
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <Car className="w-5 h-5 text-blue-600" />
                                    <span className="font-semibold text-blue-900">Vehicle</span>
                                </div>
                                {vehicle ? (
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium text-gray-900">
                                            {vehicle.year} {vehicle.make} {vehicle.model}
                                        </p>
                                        <p className="text-gray-600">VIN: {vehicle.vin}</p>
                                        <p className="text-gray-600">Odometer: {vehicle.odometer?.toLocaleString()} km</p>
                                        <p className="text-gray-600">Stock #: {vehicle.stock_number || "N/A"}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No vehicle selected</p>
                                )}
                            </div>

                            {/* Customer Info */}
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <User className="w-5 h-5 text-purple-600" />
                                    <span className="font-semibold text-purple-900">Customer</span>
                                </div>
                                {customer ? (
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium text-gray-900">{customer.name}</p>
                                        <p className="text-gray-600">{customer.phone || "No phone"}</p>
                                        <p className="text-gray-600">{customer.email || "No email"}</p>
                                        {customer.city && customer.province && (
                                            <p className="text-gray-600">{customer.city}, {customer.province}</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No customer selected</p>
                                )}
                            </div>
                        </div>

                        {/* Main Content based on active tab */}
                        {activeTab === "pricing" && (
                            <div className="space-y-6">
                                {/* Section B: Pricing Table */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h3 className="font-semibold text-gray-900">B. Pricing & Fee Inputs</h3>
                                    </div>
                                    <div className="p-4">
                                        <table className="w-full">
                                            <tbody className="divide-y divide-gray-100">
                                                <tr>
                                                    <td className="py-2 text-gray-700">Price of Vehicle</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.price_vehicle?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.price_vehicle || ""}
                                                                onChange={(e) => handleChange("price_vehicle", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Additional Equipment</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.additional_equipment?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.additional_equipment || ""}
                                                                onChange={(e) => handleChange("additional_equipment", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Services / Warranties</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.services_warranties?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.services_warranties || ""}
                                                                onChange={(e) => handleChange("services_warranties", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Documentation Fees</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.documentation_fees?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.documentation_fees || ""}
                                                                onChange={(e) => handleChange("documentation_fees", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">VSA Levy Recovery</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.vsa_levy_recovery?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.vsa_levy_recovery || ""}
                                                                onChange={(e) => handleChange("vsa_levy_recovery", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Extra Fee 1 (Taxable)</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.extra_fee_1_taxable?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.extra_fee_1_taxable || ""}
                                                                onChange={(e) => handleChange("extra_fee_1_taxable", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Discount</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium text-red-600">-${formData.discount?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.discount || ""}
                                                                onChange={(e) => handleChange("discount", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr className="bg-gray-50 font-semibold">
                                                    <td className="py-2 text-gray-900">SUBTOTAL</td>
                                                    <td className="py-2 text-right text-green-600">${totals.subtotal.toLocaleString()}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Trade-in Allowance</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium text-red-600">-${formData.trade_in_allowance?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.trade_in_allowance || ""}
                                                                onChange={(e) => handleChange("trade_in_allowance", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr className="bg-gray-50 font-semibold">
                                                    <td className="py-2 text-gray-900">Net Difference</td>
                                                    <td className="py-2 text-right text-green-600">${totals.netDifference.toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {gstEnabled && (
                                            <table className="w-full mt-4">
                                                <tbody className="divide-y divide-gray-100">
                                                    <tr>
                                                        <td className="py-2 text-gray-700">GST ({formData.gst_rate}%)</td>
                                                        <td className="py-2 text-right text-orange-600">${totals.gstAmount.toLocaleString()}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-2 text-gray-700">PST ({formData.pst_rate}%)</td>
                                                        <td className="py-2 text-right text-orange-600">${totals.pstAmount.toLocaleString()}</td>
                                                    </tr>
                                                    <tr className="bg-green-50 font-bold">
                                                        <td className="py-2 text-gray-900">Purchase Price with GST/PST</td>
                                                        <td className="py-2 text-right text-green-700">${totals.purchasePriceWithTaxes.toLocaleString()}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "fees" && (
                            <div className="space-y-6">
                                {/* Section C: Additional Fees */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h3 className="font-semibold text-gray-900">C. Additional Fees</h3>
                                    </div>
                                    <div className="p-4">
                                        <table className="w-full">
                                            <tbody className="divide-y divide-gray-100">
                                                <tr>
                                                    <td className="py-2 text-gray-700">Licence Fee (Tax Included)</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.licence_fee?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.licence_fee || ""}
                                                                onChange={(e) => handleChange("licence_fee", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Gasoline (Tax Included)</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.gasoline_fee?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.gasoline_fee || ""}
                                                                onChange={(e) => handleChange("gasoline_fee", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Finance Fee</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.finance_fee?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.finance_fee || ""}
                                                                onChange={(e) => handleChange("finance_fee", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Lien Payout</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.lien_payout?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.lien_payout || ""}
                                                                onChange={(e) => handleChange("lien_payout", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Extra Fee 2 (Non-taxable)</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.extra_fee_2_non_taxable?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.extra_fee_2_non_taxable || ""}
                                                                onChange={(e) => handleChange("extra_fee_2_non_taxable", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr className="bg-gray-50 font-semibold">
                                                    <td className="py-2 text-gray-900">SUB-TOTAL</td>
                                                    <td className="py-2 text-right text-green-600">${totals.subTotal.toLocaleString()}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Deposit</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.deposit?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.deposit || ""}
                                                                onChange={(e) => handleChange("deposit", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Down Payments</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.down_payments?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.down_payments || ""}
                                                                onChange={(e) => handleChange("down_payments", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Insurance (Life, Loss of Inc.)</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.insurance_life?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.insurance_life || ""}
                                                                onChange={(e) => handleChange("insurance_life", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Insurance (Disability, GAP)</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.insurance_gap?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.insurance_gap || ""}
                                                                onChange={(e) => handleChange("insurance_gap", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">RST on Insurance</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.rst_on_insurance?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.rst_on_insurance || ""}
                                                                onChange={(e) => handleChange("rst_on_insurance", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr className="bg-green-50 font-semibold">
                                                    <td className="py-2 text-gray-900">Total Purchase Price</td>
                                                    <td className="py-2 text-right text-green-700">${totals.totalPurchasePrice.toLocaleString()}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">PPSA Fee</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.ppsa_fee?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.ppsa_fee || ""}
                                                                onChange={(e) => handleChange("ppsa_fee", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700">Admin Fee</td>
                                                    <td className="py-2 text-right">
                                                        {isReadOnly ? (
                                                            <span className="font-medium">${formData.admin_fee?.toLocaleString()}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={formData.admin_fee || ""}
                                                                onChange={(e) => handleChange("admin_fee", parseFloat(e.target.value) || 0)}
                                                                className="w-40 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr className="bg-green-50 font-semibold">
                                                    <td className="py-2 text-gray-900">Amount to Finance</td>
                                                    <td className="py-2 text-right text-green-700">${totals.amountToFinance.toLocaleString()}</td>
                                                </tr>
                                                <tr className="bg-blue-50 font-bold">
                                                    <td className="py-2 text-gray-900">Total Balance Due</td>
                                                    <td className="py-2 text-right text-blue-700">${totals.totalBalanceDue.toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "financing" && (
                            <div className="space-y-6">
                                {/* Section D: Financing */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h3 className="font-semibold text-gray-900">D. Financing Details</h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Payment Type
                                            </label>
                                            {isReadOnly ? (
                                                <span className="text-gray-900">{formData.payment_type || "N/A"}</span>
                                            ) : (
                                                <select
                                                    value={formData.payment_type || ""}
                                                    onChange={(e) => handleChange("payment_type", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Choose...</option>
                                                    <option value="Weekly">Weekly</option>
                                                    <option value="Bi-Weekly">Bi-Weekly</option>
                                                    <option value="Monthly">Monthly</option>
                                                </select>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Cost of Borrowing
                                            </label>
                                            {isReadOnly ? (
                                                <span className="text-gray-900">${formData.cost_of_borrowing?.toLocaleString()}</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    value={formData.cost_of_borrowing || ""}
                                                    onChange={(e) => handleChange("cost_of_borrowing", parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="0.00"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Payment Start Date
                                            </label>
                                            {isReadOnly ? (
                                                <span className="text-gray-900">{formData.payment_start_date || "N/A"}</span>
                                            ) : (
                                                <input
                                                    type="date"
                                                    value={formData.payment_start_date || ""}
                                                    onChange={(e) => handleChange("payment_start_date", e.target.value || null)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "tradein" && (
                            <div className="space-y-6">
                                {/* Section E: Trade-In Vehicle */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h3 className="font-semibold text-gray-900">E. Trade-In Vehicle</h3>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_year || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.trade_in_year || ""}
                                                        onChange={(e) => handleChange("trade_in_year", parseInt(e.target.value) || undefined)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_make || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_make || ""}
                                                        onChange={(e) => handleChange("trade_in_make", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_model || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_model || ""}
                                                        onChange={(e) => handleChange("trade_in_model", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_series || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_series || ""}
                                                        onChange={(e) => handleChange("trade_in_series", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Cylinders</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_cylinders || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.trade_in_cylinders || ""}
                                                        onChange={(e) => handleChange("trade_in_cylinders", parseInt(e.target.value) || undefined)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_odometer?.toLocaleString() || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.trade_in_odometer || ""}
                                                        onChange={(e) => handleChange("trade_in_odometer", parseInt(e.target.value) || undefined)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">KMS/Miles</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_kms_miles}</span>
                                                ) : (
                                                    <select
                                                        value={formData.trade_in_kms_miles || "KMS"}
                                                        onChange={(e) => handleChange("trade_in_kms_miles", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="KMS">KMS</option>
                                                        <option value="MILES">MILES</option>
                                                    </select>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Exterior Color</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_exterior_color || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_exterior_color || ""}
                                                        onChange={(e) => handleChange("trade_in_exterior_color", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Interior Color</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_interior_color || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_interior_color || ""}
                                                        onChange={(e) => handleChange("trade_in_interior_color", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_vin || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_vin || ""}
                                                        onChange={(e) => handleChange("trade_in_vin", e.target.value.toUpperCase())}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        maxLength={17}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Stock #</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_stock_number || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_stock_number || ""}
                                                        onChange={(e) => handleChange("trade_in_stock_number", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Owing To</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_owing_to || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.trade_in_owing_to || ""}
                                                        onChange={(e) => handleChange("trade_in_owing_to", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Delivery (KMS)</label>
                                                {isReadOnly ? (
                                                    <span>{formData.trade_in_odometer_delivery?.toLocaleString() || "N/A"}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={formData.trade_in_odometer_delivery || ""}
                                                        onChange={(e) => handleChange("trade_in_odometer_delivery", parseInt(e.target.value) || undefined)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Disclosure Notes</label>
                                            {isReadOnly ? (
                                                <p className="text-gray-900 whitespace-pre-wrap">{formData.trade_in_disclosure || "N/A"}</p>
                                            ) : (
                                                <textarea
                                                    value={formData.trade_in_disclosure || ""}
                                                    onChange={(e) => handleChange("trade_in_disclosure", e.target.value)}
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    placeholder="Additional disclosure notes for trade-in vehicle..."
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "payments" && (
                            <div className="space-y-6">
                                {/* Section G: Payments */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">G. Payments</h3>
                                        {!isReadOnly && (
                                            <button
                                                onClick={addPayment}
                                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Payment
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        {payments.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                <p>No payments recorded</p>
                                            </div>
                                        ) : (
                                            <table className="w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                                        {!isReadOnly && <th className="px-3 py-2 w-12"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {payments.map((payment, index) => (
                                                        <tr key={index}>
                                                            <td className="py-2">
                                                                {isReadOnly ? (
                                                                    <span>{payment.payment_name}</span>
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        value={payment.payment_name}
                                                                        onChange={(e) => handlePaymentChange(index, "payment_name", e.target.value)}
                                                                        className="w-full px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="py-2">
                                                                {isReadOnly ? (
                                                                    <span>{payment.payment_type}</span>
                                                                ) : (
                                                                    <select
                                                                        value={payment.payment_type}
                                                                        onChange={(e) => handlePaymentChange(index, "payment_type", e.target.value)}
                                                                        className="w-full px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    >
                                                                        <option value="Deposit">Deposit</option>
                                                                        <option value="Down Payment">Down Payment</option>
                                                                        <option value="Finance Payment">Finance Payment</option>
                                                                        <option value="Final Payment">Final Payment</option>
                                                                        <option value="Other">Other</option>
                                                                    </select>
                                                                )}
                                                            </td>
                                                            <td className="py-2">
                                                                {isReadOnly ? (
                                                                    <span className="font-medium">${payment.amount?.toLocaleString()}</span>
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        value={payment.amount || ""}
                                                                        onChange={(e) => handlePaymentChange(index, "amount", parseFloat(e.target.value) || 0)}
                                                                        className="w-32 px-3 py-1 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="py-2">
                                                                {isReadOnly ? (
                                                                    <span>{payment.payment_date}</span>
                                                                ) : (
                                                                    <input
                                                                        type="date"
                                                                        value={payment.payment_date}
                                                                        onChange={(e) => handlePaymentChange(index, "payment_date", e.target.value)}
                                                                        className="w-full px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                )}
                                                            </td>
                                                            {!isReadOnly && (
                                                                <td className="py-2">
                                                                    <button
                                                                        onClick={() => removePayment(index)}
                                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-600">Total Payments:</span>
                                                <span className="font-semibold text-green-600">${totalPayments.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-600">Balance Due:</span>
                                                <span className={`font-semibold ${totals.totalBalanceDue - totalPayments <= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    ${(totals.totalBalanceDue - totalPayments).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {totals.totalBalanceDue - totalPayments <= 0 ? (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Fully Paid
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
                                                        <AlertCircle className="w-4 h-4" />
                                                        Not Paid
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes Section */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h3 className="font-semibold text-gray-900">Notes / Disclosure</h3>
                                    </div>
                                    <div className="p-4">
                                        {isReadOnly ? (
                                            <p className="text-gray-900 whitespace-pre-wrap">{formData.notes || "No notes"}</p>
                                        ) : (
                                            <textarea
                                                value={formData.notes || ""}
                                                onChange={(e) => handleChange("notes", e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                placeholder="Additional notes or disclosure information..."
                                            />
                                        )}
                                        {formData.notes && (
                                            <p className="mt-2 text-xs text-gray-500">
                                                {formData.notes.length} characters
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {!isReadOnly && (
                        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading && savingType === "draft" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save as Draft
                                </button>
                            </div>
                            <button
                                onClick={() => handleSave(true)}
                                disabled={loading}
                                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading && savingType === "sold" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Mark as Sold
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
