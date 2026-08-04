"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Calculator,
    FileText,
    Link2,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    ArrowRightCircle,
} from "lucide-react";
import { apiFetch } from "@/src/lib/fetch";
import { toast } from "@/src/lib/toast";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { EntityLink } from "@/src/components/ui/EntityLink";
import { RelationChip } from "@/src/components/ui/RelationChip";
import { cn } from "@/src/lib/utils";
import { useRouter } from "next/navigation";

interface Vehicle {
    id: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    retail_price: number;
    status: string;
}

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
}

interface Quotation {
    id: string;
    quote_number: string | null;
    customer_id: string | null;
    vehicle_id: string | null;
    status: string;
    sale_price: number;
    down_payment: number;
    trade_in_value: number;
    finance_term: number | null;
    interest_rate: number | null;
    finance_company: string | null;
    tax_rate: number | null;
    admin_fee: number | null;
    monthly_payment: number | null;
    notes: string | null;
    valid_until: string | null;
    converted_deal_id: string | null;
    created_at: string;
    vehicle: Vehicle | null;
    customer: Customer | null;
}

const STATUSES = ["Draft", "Sent", "Accepted", "Expired", "Converted", "Cancelled"] as const;

function estimatePayment(
    salePrice: number,
    downPayment: number,
    tradeIn: number,
    termMonths: number,
    ratePct: number,
    taxRate: number,
    adminFee: number
): number {
    const tax = salePrice * (taxRate / 100);
    const financed = Math.max(0, salePrice + tax + adminFee - tradeIn - downPayment);
    if (termMonths <= 0) return 0;
    const r = ratePct / 100 / 12;
    if (r <= 0) return financed / termMonths;
    const factor = Math.pow(1 + r, termMonths);
    return (financed * r * factor) / (factor - 1);
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount || 0);
}

export default function QuotationsPage() {
    const router = useRouter();
    const [quotes, setQuotes] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [form, setForm] = useState({
        customer_id: "",
        vehicle_id: "",
        status: "Draft",
        sale_price: "",
        down_payment: "0",
        trade_in_value: "0",
        finance_term: "60",
        interest_rate: "5.99",
        tax_rate: "13",
        admin_fee: "899",
        notes: "",
        valid_until: "",
    });

    const monthlyPreview = useMemo(() => {
        return estimatePayment(
            parseFloat(form.sale_price) || 0,
            parseFloat(form.down_payment) || 0,
            parseFloat(form.trade_in_value) || 0,
            parseInt(form.finance_term, 10) || 0,
            parseFloat(form.interest_rate) || 0,
            parseFloat(form.tax_rate) || 0,
            parseFloat(form.admin_fee) || 0
        );
    }, [form]);

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            let url = "/api/quotations?limit=100";
            if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
            const data = await apiFetch<{ data: Quotation[] }>(url);
            setQuotes(data?.data || []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load quotations");
        } finally {
            setLoading(false);
        }
    };

    const fetchLookups = async () => {
        try {
            const [vRes, cRes] = await Promise.all([
                apiFetch<{ data: Vehicle[] }>("/api/vehicles?limit=200&status=Active"),
                apiFetch<{ data: Customer[] }>("/api/customers?limit=200"),
            ]);
            setVehicles(vRes?.data || []);
            setCustomers(cRes?.data || []);
        } catch {
            // lookups optional for list view
        }
    };

    useEffect(() => {
        void fetchQuotes();
    }, [statusFilter, searchTerm]);

    useEffect(() => {
        void fetchLookups();
    }, []);

    const handleVehicleSelect = (vehicleId: string) => {
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        setForm((prev) => ({
            ...prev,
            vehicle_id: vehicleId,
            sale_price: vehicle ? String(vehicle.retail_price || "") : prev.sale_price,
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                customer_id: form.customer_id || null,
                vehicle_id: form.vehicle_id || null,
                status: form.status,
                sale_price: parseFloat(form.sale_price) || 0,
                down_payment: parseFloat(form.down_payment) || 0,
                trade_in_value: parseFloat(form.trade_in_value) || 0,
                finance_term: form.finance_term ? parseInt(form.finance_term, 10) : null,
                interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
                tax_rate: form.tax_rate ? parseFloat(form.tax_rate) : 13,
                admin_fee: form.admin_fee ? parseFloat(form.admin_fee) : 0,
                monthly_payment: Math.round(monthlyPreview * 100) / 100,
                notes: form.notes || null,
                valid_until: form.valid_until || null,
            };
            await apiFetch("/api/quotations", { method: "POST", body: payload });
            toast.success("Quotation created");
            setShowForm(false);
            setForm({
                customer_id: "",
                vehicle_id: "",
                status: "Draft",
                sale_price: "",
                down_payment: "0",
                trade_in_value: "0",
                finance_term: "60",
                interest_rate: "5.99",
                tax_rate: "13",
                admin_fee: "899",
                notes: "",
                valid_until: "",
            });
            await fetchQuotes();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create quotation");
        } finally {
            setSaving(false);
        }
    };

    const handleConvert = async (quote: Quotation) => {
        if (!quote.customer_id || !quote.vehicle_id) {
            toast.error("Link a customer and vehicle before converting");
            return;
        }
        setConvertingId(quote.id);
        try {
            const result = await apiFetch<{ data: { deal: { id: string } } }>(
                `/api/quotations/${quote.id}/convert`,
                { method: "POST", body: {} }
            );
            toast.success("Converted to deal");
            await fetchQuotes();
            if (result?.data?.deal?.id) {
                router.push("/deals");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Convert failed");
        } finally {
            setConvertingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this quotation?")) return;
        try {
            await apiFetch(`/api/quotations/${id}`, { method: "DELETE" });
            toast.success("Quotation deleted");
            await fetchQuotes();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const handleMarkSent = async (id: string) => {
        try {
            await apiFetch(`/api/quotations/${id}`, {
                method: "PATCH",
                body: { status: "Sent" },
            });
            toast.success("Marked as Sent");
            await fetchQuotes();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
        }
    };

    return (
        <div className="space-y-4 pb-8">
            <PageHeader
                title="Quotations"
                description="Build shareable quotes and convert them into deals"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => void fetchQuotes()} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                            <Plus className="h-4 w-4" />
                            New Quote
                        </Button>
                    </div>
                }
            />

            {showForm && (
                <form
                    onSubmit={handleCreate}
                    className="rounded-xl border border-border bg-card p-4 space-y-4"
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <FileText className="h-4 w-4 text-primary" />
                        New quotation
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Customer</span>
                            <select
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.customer_id}
                                onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))}
                            >
                                <option value="">Select customer</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Vehicle</span>
                            <select
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.vehicle_id}
                                onChange={(e) => handleVehicleSelect(e.target.value)}
                            >
                                <option value="">Select vehicle</option>
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.year} {v.make} {v.model} — {formatCurrency(v.retail_price)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Sale price *</span>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.sale_price}
                                onChange={(e) => setForm((p) => ({ ...p, sale_price: e.target.value }))}
                            />
                        </label>
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Down payment</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.down_payment}
                                onChange={(e) => setForm((p) => ({ ...p, down_payment: e.target.value }))}
                            />
                        </label>
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Trade-in</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.trade_in_value}
                                onChange={(e) => setForm((p) => ({ ...p, trade_in_value: e.target.value }))}
                            />
                        </label>
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Term (months)</span>
                            <input
                                type="number"
                                min="1"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.finance_term}
                                onChange={(e) => setForm((p) => ({ ...p, finance_term: e.target.value }))}
                            />
                        </label>
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Rate %</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.interest_rate}
                                onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))}
                            />
                        </label>
                        <label className="text-sm space-y-1">
                            <span className="text-muted-foreground">Valid until</span>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                                value={form.valid_until}
                                onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
                            />
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-50 px-3 py-2">
                        <div className="flex items-center gap-2 text-sm text-primary">
                            <Calculator className="h-4 w-4" />
                            Est. monthly
                        </div>
                        <div className="text-lg font-bold text-primary">{formatCurrency(monthlyPreview)}</div>
                    </div>
                    <label className="block text-sm space-y-1">
                        <span className="text-muted-foreground">Notes</span>
                        <textarea
                            className="w-full rounded-lg border border-border bg-background px-3 py-2"
                            rows={2}
                            value={form.notes}
                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Save quote
                        </Button>
                    </div>
                </form>
            )}

            <div className="sticky top-0 z-10 rounded-xl border border-border bg-card/95 px-3 py-3 backdrop-blur-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search quote # or notes…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                        <option value="">All status</option>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/80">
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <th className="px-3 py-2.5">Quote</th>
                                <th className="px-3 py-2.5">Customer</th>
                                <th className="px-3 py-2.5">Vehicle</th>
                                <th className="px-3 py-2.5">Status</th>
                                <th className="px-3 py-2.5 text-right">Price</th>
                                <th className="px-3 py-2.5 text-right">Payment</th>
                                <th className="px-3 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                    </td>
                                </tr>
                            ) : quotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                                        No quotations yet
                                    </td>
                                </tr>
                            ) : (
                                quotes.map((quote) => (
                                    <tr
                                        key={quote.id}
                                        role="button"
                                        tabIndex={0}
                                        className="cursor-pointer border-l-2 border-l-transparent transition-colors hover:border-l-primary hover:bg-muted/50 focus-visible:border-l-primary focus-visible:bg-muted/50 focus-visible:outline-none"
                                        onClick={() => {
                                            if (quote.status !== "Converted" && quote.status !== "Cancelled") {
                                                void handleConvert(quote);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                quote.status !== "Converted" &&
                                                quote.status !== "Cancelled"
                                            ) {
                                                void handleConvert(quote);
                                            }
                                        }}
                                    >
                                        <td className="px-3 py-2.5">
                                            <EntityLink
                                                onClick={() => {
                                                    if (quote.status !== "Converted" && quote.status !== "Cancelled") {
                                                        void handleConvert(quote);
                                                    }
                                                }}
                                            >
                                                {quote.quote_number || quote.id.slice(0, 8)}
                                            </EntityLink>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <RelationChip
                                                customerId={quote.customer_id || quote.customer?.id}
                                                name={quote.customer?.name}
                                                emptyLabel="Unlinked"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {quote.vehicle
                                                ? `${quote.vehicle.year} ${quote.vehicle.make} ${quote.vehicle.model}`
                                                : "—"}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                            {formatCurrency(quote.sale_price)}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                                            {quote.monthly_payment != null
                                                ? formatCurrency(quote.monthly_payment)
                                                : "—"}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div
                                                className="flex justify-end gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {quote.status === "Draft" && (
                                                    <button
                                                        type="button"
                                                        title="Mark sent"
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        onClick={() => void handleMarkSent(quote.id)}
                                                    >
                                                        <Link2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {quote.status !== "Converted" && quote.status !== "Cancelled" && (
                                                    <button
                                                        type="button"
                                                        title="Convert to deal"
                                                        className="rounded-md p-1.5 text-primary hover:bg-primary-50"
                                                        disabled={convertingId === quote.id}
                                                        onClick={() => void handleConvert(quote)}
                                                    >
                                                        {convertingId === quote.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <ArrowRightCircle className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                )}
                                                {quote.status !== "Converted" && (
                                                    <button
                                                        type="button"
                                                        title="Delete"
                                                        className="rounded-md p-1.5 text-destructive hover:bg-destructive-50"
                                                        onClick={() => void handleDelete(quote.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
