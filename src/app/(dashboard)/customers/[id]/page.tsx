"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Loader2, Mail, Phone, UserRound } from "lucide-react";
import CustomerFormModal from "@/src/components/CustomerFormModal";
import { ListPageShell } from "@/src/components/ListPageShell";
import { Button } from "@/src/components/ui/Button";
import {
    PropertyEmpty,
    PropertyList,
    PropertyRow,
    RecordNotes,
} from "@/src/components/ui/PropertyList";
import { ActivityTimeline } from "@/src/components/ui/ActivityTimeline";
import { apiFetch } from "@/src/lib/fetch";

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    notes: string | null;
    avatar: string | null;
    created_at: string;
    updated_at: string;
}

function formatDateTime(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params?.id === "string" ? params.id : "";

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [showEdit, setShowEdit] = useState(false);

    const load = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const [custRes, meRes] = await Promise.all([
                apiFetch<{ data: Customer }>(`/api/customers/${id}`),
                apiFetch<{
                    data: {
                        role?: string;
                        user_permissions?: string[];
                        effective_permissions?: string[];
                        is_platform_admin?: boolean;
                    };
                }>("/api/me", { silent: true }).catch(() => null),
            ]);
            setCustomer(custRes.data);
            if (meRes?.data) {
                const role = meRes.data.role || "";
                const perms =
                    meRes.data.effective_permissions ||
                    meRes.data.user_permissions ||
                    [];
                setCanEdit(
                    Boolean(meRes.data.is_platform_admin) ||
                        role === "Admin" ||
                        perms.includes("customers:write") ||
                        perms.includes("*")
                );
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Customer not found"
            );
            setCustomer(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const addressLine = customer
        ? [customer.city, customer.province, customer.postal_code]
              .filter(Boolean)
              .join(", ")
        : "";

    return (
        <ListPageShell
            title={customer?.name || "Customer"}
            description="Customer profile"
            icon={UserRound}
            breadcrumbs={[
                { label: "Customers", href: "/customers" },
                { label: customer?.name || "Detail" },
            ]}
            actions={
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/customers")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Directory
                    </Button>
                    {canEdit && customer && (
                        <Button size="sm" onClick={() => setShowEdit(true)}>
                            <Edit className="h-4 w-4" />
                            Edit
                        </Button>
                    )}
                </div>
            }
        >
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : error || !customer ? (
                <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {error || "Customer not found"}
                    </p>
                    <Button
                        className="mt-4"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/customers")}
                    >
                        Back to directory
                    </Button>
                </div>
            ) : (
                <div className="max-w-2xl space-y-6 rounded-lg border border-border bg-card p-5">
                    <div className="flex flex-wrap gap-2">
                        {customer.phone && (
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Phone className="h-3.5 w-3.5" />}
                                onClick={() => {
                                    window.location.href = `tel:${customer.phone}`;
                                }}
                            >
                                Call
                            </Button>
                        )}
                        {customer.email && (
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Mail className="h-3.5 w-3.5" />}
                                onClick={() => {
                                    window.location.href = `mailto:${customer.email}`;
                                }}
                            >
                                Email
                            </Button>
                        )}
                    </div>

                    <PropertyList title="Contact">
                        <PropertyRow label="Email">
                            {customer.email?.trim() ? (
                                <a
                                    href={`mailto:${customer.email}`}
                                    className="text-primary hover:underline"
                                >
                                    {customer.email}
                                </a>
                            ) : (
                                <PropertyEmpty />
                            )}
                        </PropertyRow>
                        <PropertyRow label="Phone">
                            {customer.phone?.trim() ? (
                                <a
                                    href={`tel:${customer.phone}`}
                                    className="text-primary hover:underline"
                                >
                                    {customer.phone}
                                </a>
                            ) : (
                                <PropertyEmpty />
                            )}
                        </PropertyRow>
                        <PropertyRow label="Street">
                            {customer.address?.trim() ? (
                                customer.address
                            ) : (
                                <PropertyEmpty />
                            )}
                        </PropertyRow>
                        <PropertyRow label="City / region">
                            {addressLine || <PropertyEmpty />}
                        </PropertyRow>
                    </PropertyList>

                    {customer.notes?.trim() && (
                        <RecordNotes>{customer.notes}</RecordNotes>
                    )}

                    <ActivityTimeline
                        items={[
                            {
                                id: "created",
                                title: "Created",
                                timestamp: formatDateTime(customer.created_at),
                            },
                            {
                                id: "updated",
                                title: "Last updated",
                                timestamp: formatDateTime(customer.updated_at),
                            },
                        ]}
                    />
                </div>
            )}

            {showEdit && customer && (
                <CustomerFormModal
                    mode="edit"
                    customer={customer}
                    onClose={() => setShowEdit(false)}
                    onSuccess={() => {
                        setShowEdit(false);
                        void load();
                    }}
                />
            )}
        </ListPageShell>
    );
}
