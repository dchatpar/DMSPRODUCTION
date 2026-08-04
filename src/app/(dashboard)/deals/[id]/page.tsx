"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Calculator,
    Car,
    Edit,
    FileSignature,
    FileText,
    Loader2,
} from "lucide-react";
import DealFormModal from "@/src/components/DealFormModal";
import BillOfSaleModal from "@/src/components/BillOfSaleModal";
import { ListPageShell } from "@/src/components/ListPageShell";
import { Button } from "@/src/components/ui/Button";
import {
    PropertyEmpty,
    PropertyList,
    PropertyRow,
    RecordNotes,
} from "@/src/components/ui/PropertyList";
import { ActivityTimeline } from "@/src/components/ui/ActivityTimeline";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { RelationChip } from "@/src/components/ui/RelationChip";
import { apiFetch } from "@/src/lib/fetch";
import { firstImageUrl } from "@/src/lib/vehicle-image";
import { toast } from "@/src/lib/toast";
import { formatCurrency } from "@/src/lib/utils";

interface Deal {
    id: string;
    vehicle_id: string | null;
    customer_id: string | null;
    deal_status: string;
    finance_term: number | null;
    interest_rate: number | null;
    down_payment: number;
    trade_in_value?: number | null;
    sale_price: number;
    salesperson_id: string | null;
    finance_company: string | null;
    notes: string | null;
    deal_date: string;
    created_at: string;
    updated_at?: string;
    warranty_package?: string | null;
    gap_coverage?: boolean;
    tire_coverage?: boolean;
    paint_protection?: boolean;
    extended_service?: boolean;
    admin_fee?: number | null;
    commission_rate?: number | null;
    commission_amount?: number | null;
    vehicle: {
        id: string;
        vin: string;
        year: number;
        make: string;
        model: string;
        retail_price: number;
        status: string;
        condition: string;
        image_gallery?: string[];
    } | null;
    customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        avatar: string | null;
        address?: string | null;
        city?: string | null;
        province?: string | null;
    } | null;
    salesperson: {
        id: string;
        full_name: string;
        email: string;
        avatar: string | null;
    } | null;
}

function formatDate(date: string | null | undefined) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(date: string) {
    return new Date(date).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function DealDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params?.id === "string" ? params.id : "";

    const [deal, setDeal] = useState<Deal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showBos, setShowBos] = useState(false);
    const [bosData, setBosData] = useState<Record<string, unknown> | null>(null);
    const [bosMode, setBosMode] = useState<"add" | "edit" | "view">("add");
    const [bosLoading, setBosLoading] = useState(false);

    const load = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const [dealRes, meRes] = await Promise.all([
                apiFetch<{ data: Deal }>(`/api/deals/${id}`),
                apiFetch<{
                    data: {
                        role?: string;
                        user_permissions?: string[];
                        effective_permissions?: string[];
                        is_platform_admin?: boolean;
                    };
                }>("/api/me", { silent: true }).catch(() => null),
            ]);
            setDeal(dealRes.data);
            if (meRes?.data) {
                const role = meRes.data.role || "";
                const perms =
                    meRes.data.effective_permissions ||
                    meRes.data.user_permissions ||
                    [];
                setCanEdit(
                    Boolean(meRes.data.is_platform_admin) ||
                        role === "Admin" ||
                        perms.includes("deals:write") ||
                        perms.includes("*")
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Deal not found");
            setDeal(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const openBillOfSale = async () => {
        if (!deal) return;
        setBosLoading(true);
        try {
            const res = await apiFetch<{ data: Record<string, unknown>[] }>(
                `/api/bill-of-sale?deal_id=${deal.id}`,
                { silent: true }
            );
            if (res.data?.length) {
                const first = res.data[0] as Record<string, unknown> | undefined;
                setBosData(first ?? null);
                setBosMode("edit");
            } else {
                setBosData(null);
                setBosMode("add");
            }
            setShowBos(true);
        } catch {
            setBosData(null);
            setBosMode("add");
            setShowBos(true);
        } finally {
            setBosLoading(false);
        }
    };

    const vehicleTitle = deal?.vehicle
        ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
        : "Deal";
    const thumb = deal?.vehicle
        ? firstImageUrl(deal.vehicle.image_gallery)
        : null;
    const fiProducts = [
        deal?.gap_coverage ? "GAP" : null,
        deal?.tire_coverage ? "Tire" : null,
        deal?.paint_protection ? "Paint" : null,
        deal?.extended_service ? "Extended service" : null,
    ].filter(Boolean);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (error || !deal) {
        return (
            <ListPageShell
                title="Deal"
                description={error || "Not found"}
                icon={FileText}
                breadcrumbs={[
                    { label: "Deals", href: "/deals" },
                    { label: "Detail" },
                ]}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/deals")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to deals
                    </Button>
                }
            >
                <p className="text-sm text-destructive">{error || "Deal not found"}</p>
            </ListPageShell>
        );
    }

    return (
        <ListPageShell
            title={vehicleTitle}
            description={`Deal · ${deal.deal_status}`}
            icon={FileText}
            breadcrumbs={[
                { label: "Deals", href: "/deals" },
                { label: vehicleTitle },
            ]}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/deals")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    {canEdit && (
                        <Button
                            size="sm"
                            onClick={() => setShowEdit(true)}
                            leftIcon={<Edit className="h-3.5 w-3.5" />}
                        >
                            Edit
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={bosLoading}
                        onClick={() => void openBillOfSale()}
                        leftIcon={
                            bosLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <FileSignature className="h-3.5 w-3.5" />
                            )
                        }
                    >
                        Bill of Sale
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const qs = new URLSearchParams();
                            qs.set("deal_id", deal.id);
                            qs.set("sale_price", String(deal.sale_price || 0));
                            qs.set(
                                "down_payment",
                                String(deal.down_payment || 0)
                            );
                            qs.set(
                                "trade_in_value",
                                String(deal.trade_in_value || 0)
                            );
                            if (deal.finance_term) {
                                qs.set(
                                    "term_months",
                                    String(deal.finance_term)
                                );
                            }
                            if (deal.interest_rate != null) {
                                qs.set(
                                    "interest_rate",
                                    String(deal.interest_rate)
                                );
                            }
                            if (deal.vehicle) {
                                qs.set(
                                    "vehicle",
                                    `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                                );
                            }
                            if (deal.customer?.name) {
                                qs.set("customer", deal.customer.name);
                            }
                            router.push(`/finance?${qs.toString()}`);
                        }}
                        leftIcon={<Calculator className="h-3.5 w-3.5" />}
                    >
                        Desk F&I
                    </Button>
                </div>
            }
        >
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <div className="space-y-6">
                    {deal.vehicle && (
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                            {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={thumb}
                                    alt=""
                                    className="h-16 w-24 rounded-md border border-border object-cover"
                                />
                            ) : (
                                <div className="flex h-16 w-24 items-center justify-center rounded-md border border-border bg-muted">
                                    <Car className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-foreground">
                                    {vehicleTitle}
                                </p>
                                <p className="font-mono text-xs text-muted-foreground">
                                    {deal.vehicle.vin || "—"}
                                </p>
                                <StatusBadge
                                    status={deal.deal_status}
                                    resource="deal"
                                />
                            </div>
                        </div>
                    )}

                    <PropertyList title="Deal">
                        <PropertyRow label="Customer">
                            {deal.customer ? (
                                <RelationChip
                                    customerId={deal.customer.id}
                                    name={deal.customer.name}
                                    avatarUrl={deal.customer.avatar}
                                />
                            ) : (
                                <PropertyEmpty label="Cash / unlinked" />
                            )}
                        </PropertyRow>
                        <PropertyRow label="Sale price">
                            {formatCurrency(deal.sale_price)}
                        </PropertyRow>
                        <PropertyRow label="Down payment">
                            {formatCurrency(deal.down_payment || 0)}
                        </PropertyRow>
                        <PropertyRow label="Trade-in">
                            {formatCurrency(deal.trade_in_value || 0)}
                        </PropertyRow>
                        <PropertyRow label="Finance">
                            {deal.finance_term
                                ? `${deal.finance_term} mo`
                                : "—"}
                            {deal.interest_rate != null
                                ? ` @ ${deal.interest_rate}%`
                                : ""}
                            {deal.finance_company
                                ? ` · ${deal.finance_company}`
                                : ""}
                        </PropertyRow>
                        <PropertyRow label="Salesperson">
                            {deal.salesperson?.full_name || (
                                <PropertyEmpty label="Unassigned" />
                            )}
                        </PropertyRow>
                        <PropertyRow label="Deal date">
                            {formatDate(deal.deal_date)}
                        </PropertyRow>
                        {(deal.warranty_package || fiProducts.length > 0) && (
                            <PropertyRow label="F&I products">
                                {[
                                    deal.warranty_package,
                                    ...fiProducts,
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </PropertyRow>
                        )}
                        {(deal.commission_rate != null ||
                            deal.commission_amount != null) && (
                            <PropertyRow label="Commission">
                                {deal.commission_rate != null
                                    ? `${deal.commission_rate}%`
                                    : ""}
                                {deal.commission_amount != null
                                    ? ` · ${formatCurrency(deal.commission_amount)}`
                                    : ""}
                            </PropertyRow>
                        )}
                    </PropertyList>

                    {deal.notes?.trim() && (
                        <RecordNotes>{deal.notes}</RecordNotes>
                    )}
                </div>

                <div className="space-y-4">
                    <ActivityTimeline
                        title="Activity"
                        items={[
                            {
                                id: "created",
                                title: "Deal created",
                                timestamp: formatDateTime(deal.created_at),
                            },
                            ...(deal.updated_at
                                ? [
                                      {
                                          id: "updated",
                                          title: "Last updated",
                                          timestamp: formatDateTime(
                                              deal.updated_at
                                          ),
                                      },
                                  ]
                                : []),
                        ]}
                    />
                </div>
            </div>

            {showEdit && (
                <DealFormModal
                    mode="edit"
                    deal={deal}
                    onClose={() => setShowEdit(false)}
                    onSuccess={() => {
                        setShowEdit(false);
                        void load();
                        toast.success("Deal updated");
                    }}
                />
            )}

            {showBos && (
                <BillOfSaleModal
                    mode={bosMode}
                    deal={deal}
                    billOfSale={bosData as never}
                    onClose={() => {
                        setShowBos(false);
                        setBosData(null);
                    }}
                    onSuccess={() => {
                        setShowBos(false);
                        setBosData(null);
                        void load();
                    }}
                />
            )}
        </ListPageShell>
    );
}
