"use client";

import { Edit, Mail, Phone } from "lucide-react";
import { RecordDrawer } from "@/src/components/ui/RecordDrawer";
import { RecordHeader } from "@/src/components/ui/RecordHeader";
import {
    PropertyList,
    PropertyRow,
    PropertyEmpty,
    RecordNotes,
} from "@/src/components/ui/PropertyList";
import { ActivityTimeline } from "@/src/components/ui/ActivityTimeline";
import { Button } from "@/src/components/ui/Button";

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

interface CustomerDetailsModalProps {
    customer: Customer;
    onClose: () => void;
    onEdit: () => void;
    userRole?: string;
    userPermissions?: string[];
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

export default function CustomerDetailsModal({
    customer,
    onClose,
    onEdit,
    userRole,
    userPermissions = [],
}: CustomerDetailsModalProps) {
    const canEdit = userRole === "Admin" || userPermissions.includes("customers:write");
    const name = customer.name?.trim() || null;
    const email = customer.email?.trim() || null;
    const phone = customer.phone?.trim() || null;
    const addressLine = [customer.city, customer.province, customer.postal_code]
        .filter(Boolean)
        .join(", ");

    return (
        <RecordDrawer
            open
            onClose={onClose}
            header={
                <RecordHeader
                    title={name ?? "Customer"}
                    avatarSrc={customer.avatar}
                    avatarName={name}
                />
            }
            actions={
                <>
                    {canEdit && (
                        <Button variant="primary" size="sm" leftIcon={<Edit className="h-3.5 w-3.5" />} onClick={onEdit}>
                            Edit
                        </Button>
                    )}
                    {phone && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Phone className="h-3.5 w-3.5" />}
                            onClick={() => {
                                window.location.href = `tel:${phone}`;
                            }}
                        >
                            Call
                        </Button>
                    )}
                    {email && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Mail className="h-3.5 w-3.5" />}
                            onClick={() => {
                                window.location.href = `mailto:${email}`;
                            }}
                        >
                            Email
                        </Button>
                    )}
                </>
            }
            footer={
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Close
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <PropertyList title="Contact">
                    <PropertyRow label="Email">
                        {email ? (
                            <a href={`mailto:${email}`} className="text-primary hover:underline">
                                {email}
                            </a>
                        ) : (
                            <PropertyEmpty />
                        )}
                    </PropertyRow>
                    <PropertyRow label="Phone">
                        {phone ? (
                            <a href={`tel:${phone}`} className="text-primary hover:underline">
                                {phone}
                            </a>
                        ) : (
                            <PropertyEmpty />
                        )}
                    </PropertyRow>
                    <PropertyRow label="Street">
                        {customer.address?.trim() ? customer.address : <PropertyEmpty />}
                    </PropertyRow>
                    <PropertyRow label="City / region">
                        {addressLine || <PropertyEmpty />}
                    </PropertyRow>
                </PropertyList>

                {customer.notes?.trim() && <RecordNotes>{customer.notes}</RecordNotes>}

                <ActivityTimeline
                    items={[
                        { id: "created", title: "Created", timestamp: formatDateTime(customer.created_at) },
                        { id: "updated", title: "Last updated", timestamp: formatDateTime(customer.updated_at) },
                    ]}
                />
            </div>
        </RecordDrawer>
    );
}
