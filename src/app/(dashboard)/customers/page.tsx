"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Loader2,
    Mail,
    Phone,
    UserPlus,
    GitMerge,
} from "lucide-react";
import * as XLSX from "xlsx";
import CustomerDetailsModal from "@/src/components/CustomerDetailsModal";
import CustomerFormModal from "@/src/components/CustomerFormModal";
import CustomerMergeModal from "@/src/components/CustomerMergeModal";
import ConfirmDialog from "@/src/components/ConfirmDialog";
import { ListPageShell } from "@/src/components/ListPageShell";
import { ListToolbar } from "@/src/components/ListToolbar";
import { toast } from "@/src/lib/toast";
import { Button } from "@/src/components/ui/Button";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { SkeletonTable } from "@/src/components/ui/Skeleton";
import { MetricStrip } from "@/src/components/ui/MetricStrip";
import { Avatar } from "@/src/components/ui/Avatar";
import { EntityLink } from "@/src/components/ui/EntityLink";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    province: string | null;  // Changed from 'state'
    postal_code: string | null;  // Changed from 'zip'
    status: string;
    notes: string | null;
    avatar: string | null;
    created_at: string;
    updated_at: string;
}

interface ApiResponse {
    data: Customer[];
    count: number;
    limit: number;
    offset: number;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebouncedValue(searchTerm, 300);
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [statusOptions, setStatusOptions] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [activeCount, setActiveCount] = useState(0);
    const [itemsPerPage] = useState(20);
    const [exportLoading, setExportLoading] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>("");

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        customer: Customer | null;
        loading: boolean;
    }>({ customer: null, loading: false });

    const [showMergeModal, setShowMergeModal] = useState(false);

    useEffect(() => {
        fetchStatusOptions();
        fetchUserPermissions();
        fetchActiveCount();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter]);

    useEffect(() => {
        fetchCustomers();
    }, [currentPage, statusFilter, debouncedSearch]);

    const fetchActiveCount = async () => {
        try {
            const response = await fetch("/api/customers?status=Active&limit=1");
            if (response.ok) {
                const data = await response.json();
                setActiveCount(data.count || 0);
            }
        } catch {
            /* non-fatal */
        }
    };

    const fetchUserPermissions = async () => {
        try {
            const response = await fetch("/api/me", {});
            if (response.ok) {
                const data = await response.json();
                setUserPermissions(data.data.user_permissions || []);
                setUserRole(data.data.role || "");
            }
        } catch (error) {
            console.error("Error fetching user permissions:", error);
        }
    };

    const fetchStatusOptions = async () => {
        try {
            const response = await fetch("/api/customers?distinct_status=true", {});
            if (response.ok) {
                const data = await response.json();
                setStatusOptions(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching status options:", error);
        }
    };

    const exportToExcel = async () => {
        setExportLoading(true);
        try {
            // Fetch all customers for export (without pagination)
            const response = await fetch("/api/customers?limit=10000", {});
            if (!response.ok) throw new Error("Failed to fetch customers for export");

            const data = await response.json();
            const exportData = data.data || [];

            // Prepare data for Excel
            const worksheetData = exportData.map((customer: Customer) => ({
                "Customer Name": customer.name || "",
                "Email": customer.email || "",
                "Phone": customer.phone || "",
                "Address": customer.address || "",
                "City": customer.city || "",
                "Province": customer.province || "",
                "Postal Code": customer.postal_code || "",
                "Status": customer.status || "",
                "Notes": customer.notes || "",
                "Created At": customer.created_at ? new Date(customer.created_at).toLocaleDateString() : ""
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

            // Auto-size columns
            const colWidths = [
                { wch: 25 }, // Customer Name
                { wch: 30 }, // Email
                { wch: 15 }, // Phone
                { wch: 30 }, // Address
                { wch: 15 }, // City
                { wch: 15 }, // Province
                { wch: 12 }, // Postal Code
                { wch: 12 }, // Status
                { wch: 30 }, // Notes
                { wch: 15 }, // Created At
            ];
            worksheet["!cols"] = colWidths;

            XLSX.writeFile(workbook, `customers-export-${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export customers")
        } finally {
            setExportLoading(false);
        }
    };

    // Check if user has write permission for a resource
    const canWrite = (resource: string): boolean => {
        if (userRole === "Admin") return true;
        return userPermissions.includes(`${resource}:write`);
    };

    // Check if user has delete permission for a resource
    const canDelete = (resource: string): boolean => {
        if (userRole === "Admin") return true;
        return userPermissions.includes(`${resource}:delete`);
    };

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            setError(null);
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/customers?limit=${itemsPerPage}&offset=${offset}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (debouncedSearch) url += `&q=${encodeURIComponent(debouncedSearch)}`;

            const response = await fetch(url, {
                headers: {
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch customers");
            }

            const data: ApiResponse = await response.json();
            setCustomers(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowDetailsModal(true);
    };

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedCustomer(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedCustomer(null);
        fetchCustomers();
    };

    const handleDelete = async (customer: Customer) => {
        setConfirmDialogData({ customer, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.customer) return;

        const customerId = confirmDialogData.customer.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`/api/customers/${customerId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete customer");
            }

            // Clear dialog state
            setConfirmDialogData({ customer: null, loading: false });
            setShowConfirmDialog(false);

            // Remove from local state immediately for faster UX
            setCustomers((prev) => prev.filter((c) => c.id !== customerId));
            setTotalItems((prev) => prev - 1);

            // Re-fetch to ensure consistency
            fetchCustomers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasFilters = Boolean(debouncedSearch || statusFilter);

    return (
        <ListPageShell
            title="Customers"
            description="Customer directory and contact details"
            icon={Users}
            meta={
                !loading && !error ? (
                    <span className="text-sm text-muted-foreground">
                        {totalItems.toLocaleString()} customer{totalItems === 1 ? "" : "s"}
                        {statusFilter ? ` · ${statusFilter}` : ""}
                    </span>
                ) : undefined
            }
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    {(userRole === "Admin" || canWrite("customers")) && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowMergeModal(true)}
                            >
                                <GitMerge className="h-4 w-4" />
                                Merge duplicates
                            </Button>
                            <Button size="sm" onClick={handleAdd}>
                                <UserPlus className="h-4 w-4" />
                                Add Customer
                            </Button>
                        </>
                    )}
                </div>
            }
            kpis={
                <MetricStrip
                    loading={loading}
                    items={[
                        { label: "Total", value: totalItems },
                        { label: "Active", value: activeCount, tone: "success" },
                        { label: "Statuses", value: statusOptions.length },
                        { label: "On page", value: customers.length },
                    ]}
                />
            }
            toolbar={
                <ListToolbar
                    searchPlaceholder="Search name, email, phone…"
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    filters={[
                        {
                            id: "status",
                            value: statusFilter,
                            onChange: setStatusFilter,
                            options: statusOptions.map((s) => ({ value: s, label: s })),
                            allLabel: "All status",
                        },
                    ]}
                    onExport={exportToExcel}
                    exportLoading={exportLoading}
                    showPrimary={false}
                />
            }
        >
            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="hidden max-h-[calc(100vh-14rem)] overflow-auto lg:block">
                    <table className="w-full text-[13px]">
                        <thead className="sticky top-0 z-[1] border-b border-border bg-card/95 backdrop-blur-sm">
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <th className="px-3 py-2.5">Customer</th>
                                <th className="px-3 py-2.5">Contact</th>
                                <th className="px-3 py-2.5">Location</th>
                                <th className="px-3 py-2.5 w-[100px]">Joined</th>
                                <th className="px-3 py-2.5 text-right w-[104px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-6">
                                        <SkeletonTable rows={8} cols={5} />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} className="p-6">
                                        <EmptyState
                                            kind="error"
                                            title="Couldn’t load customers"
                                            description={error}
                                            action={{ label: "Try again", onClick: () => fetchCustomers() }}
                                            className="border-0 bg-transparent py-10"
                                        />
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6">
                                        <EmptyState
                                            kind={hasFilters ? "no-results" : "first-use"}
                                            icon={Users}
                                            title={hasFilters ? "No customers match" : "No customers yet"}
                                            description={
                                                hasFilters
                                                    ? "Try another search or clear the status filter."
                                                    : "Add your first customer to start the directory."
                                            }
                                            action={
                                                (userRole === "Admin" || canWrite("customers")) && !hasFilters
                                                    ? { label: "Add customer", onClick: handleAdd, icon: UserPlus }
                                                    : undefined
                                            }
                                            className="border-0 bg-transparent py-10"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        role="button"
                                        tabIndex={0}
                                        className="group cursor-pointer border-l-2 border-l-transparent transition-colors hover:border-l-primary hover:bg-muted/50 focus-visible:border-l-primary focus-visible:bg-muted/50 focus-visible:outline-none"
                                        onClick={() => handleViewDetails(customer)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleViewDetails(customer);
                                        }}
                                    >
                                        <td className="px-3.5 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={customer.name} src={customer.avatar} size="sm" />
                                                <div className="min-w-0">
                                                    <EntityLink onClick={() => handleViewDetails(customer)}>
                                                        {customer.name}
                                                    </EntityLink>
                                                    {customer.status && (
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                            {customer.status}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <div className="space-y-0.5">
                                                {customer.email ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                        <span className="max-w-[200px] truncate text-foreground/85">
                                                            {customer.email}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {customer.phone ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                        <span className="tabular-nums text-foreground/85">
                                                            {customer.phone}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {!customer.email && !customer.phone && (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-foreground/90">
                                            {customer.city
                                                ? `${customer.city}${customer.province ? `, ${customer.province}` : ""}`
                                                : "—"}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-muted-foreground">
                                            {formatDate(customer.created_at)}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <div
                                                className="flex items-center justify-end gap-2"
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewDetails(customer)}
                                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {(userRole === "Admin" || canWrite("customers")) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(customer)}
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {(userRole === "Admin" || canDelete("customers")) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(customer)}
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive-50 hover:text-destructive"
                                                        title="Delete"
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

                {/* Mobile Cards */}
                <div className="divide-y divide-border lg:hidden">
                    {loading ? (
                        <div className="px-4 py-16 text-center">
                            <Loader2 className="mx-auto h-7 w-7 animate-spin text-foreground/40" />
                            <p className="mt-2 text-sm text-muted-foreground">Loading customers…</p>
                        </div>
                    ) : error ? (
                        <EmptyState
                            kind="error"
                            title="Couldn’t load customers"
                            description={error}
                            action={{ label: "Try again", onClick: () => fetchCustomers() }}
                            className="m-4"
                        />
                    ) : customers.length === 0 ? (
                        <EmptyState
                            kind={hasFilters ? "no-results" : "first-use"}
                            icon={Users}
                            title={hasFilters ? "No customers match" : "No customers yet"}
                            description={
                                hasFilters
                                    ? "Try another search or clear the status filter."
                                    : "Add your first customer to start the directory."
                            }
                            action={
                                (userRole === "Admin" || canWrite("customers"))
                                    ? { label: "Add customer", onClick: handleAdd, icon: UserPlus }
                                    : undefined
                            }
                            className="m-4"
                        />
                    ) : (
                        customers.map((customer) => (
                            <div key={customer.id} className="flex gap-3 p-3 active:bg-muted/40">
                                <Avatar name={customer.name} src={customer.avatar} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => handleViewDetails(customer)}
                                        className="w-full text-left"
                                    >
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {customer.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                            {[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact"}
                                        </p>
                                    </button>
                                    {customer.city && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {customer.city}
                                            {customer.province ? `, ${customer.province}` : ""}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleViewDetails(customer)}
                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    {(userRole === "Admin" || canWrite("customers")) && (
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(customer)}
                                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                    )}
                                    {(userRole === "Admin" || canDelete("customers")) && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(customer)}
                                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive-50 hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {!loading && !error && customers.length > 0 && (
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">
                            {(currentPage - 1) * itemsPerPage + 1}–
                            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded-md border border-border p-2 min-h-10 hover:bg-muted disabled:opacity-40"
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="rounded-md border border-border p-2 min-h-10 hover:bg-muted disabled:opacity-40"
                                aria-label="Next page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>


            {/* Modals */}
            {showDetailsModal && selectedCustomer && (
                <CustomerDetailsModal
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedCustomer(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedCustomer);
                    }}
                    userRole={userRole}
                    userPermissions={userPermissions}
                />
            )}

            {showFormModal && (
                <CustomerFormModal
                    mode={formMode}
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedCustomer(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.customer && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Customer"
                    message={`Are you sure you want to delete ${confirmDialogData.customer.name}? This action cannot be undone.`}
                    confirmText={confirmDialogData.loading ? "Deleting..." : "Delete"}
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogData({ customer: null, loading: false });
                    }}
                />
            )}

            <CustomerMergeModal
                open={showMergeModal}
                onClose={() => setShowMergeModal(false)}
                onMerged={() => fetchCustomers()}
            />
        </ListPageShell>
    );
}