"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

interface Role {
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
    permissions: string[];
}

interface RoleModalProps {
    mode: "add" | "edit";
    role: Role | null;
    onClose: () => void;
    onSuccess: () => void;
}

const PERMISSION_OPTIONS = [
    { id: "deals:read", label: "View Deals" },
    { id: "deals:write", label: "Create/Edit Deals" },
    { id: "deals:delete", label: "Delete Deals" },
    { id: "vehicles:read", label: "View Vehicles" },
    { id: "vehicles:write", label: "Create/Edit Vehicles" },
    { id: "vehicles:delete", label: "Delete Vehicles" },
    { id: "customers:read", label: "View Customers" },
    { id: "customers:write", label: "Create/Edit Customers" },
    { id: "customers:delete", label: "Delete Customers" },
    { id: "leads:read", label: "View Leads" },
    { id: "leads:write", label: "Create/Edit Leads" },
    { id: "leads:delete", label: "Delete Leads" },
    { id: "invoices:read", label: "View Invoices" },
    { id: "invoices:write", label: "Create/Edit Invoices" },
    { id: "invoices:delete", label: "Delete Invoices" },
    { id: "expenses:read", label: "View Expenses" },
    { id: "expenses:write", label: "Create/Edit Expenses" },
    { id: "expenses:delete", label: "Delete Expenses" },
    { id: "users:read", label: "View Users" },
    { id: "users:write", label: "Create/Edit Users" },
    { id: "users:delete", label: "Delete Users" },
    { id: "reports:read", label: "View Reports" },
    { id: "settings:read", label: "View Settings" },
    { id: "settings:write", label: "Edit Settings" },
];

const ROLE_NAMES = ["Admin", "Manager", "Salesperson", "Staff", "Custom"];

export default function RoleModal({ mode, role, onClose, onSuccess }: RoleModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        permissions: [] as string[],
    });

    useEffect(() => {
        if (role && mode === "edit") {
            setFormData({
                name: role.name || "",
                description: role.description || "",
                permissions: role.permissions || [],
            });
        }
    }, [role, mode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePermissionToggle = (permissionId: string) => {
        setFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permissionId)
                ? prev.permissions.filter((p) => p !== permissionId)
                : [...prev.permissions, permissionId],
        }));
    };

    const handleSelectAll = () => {
        setFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes("*")
                ? []
                : ["*"],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                window.location.href = "/login";
                return;
            }

            const url = mode === "edit" && role
                ? `/api/roles/${role.id}`
                : "/api/roles";

            const method = mode === "edit" ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description || null,
                    permissions: formData.permissions,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to save role");
            }

            onSuccess();
        } catch (err: any) {
            console.error("Error saving role:", err);
            setError(err.message || "Failed to save role");
        } finally {
            setLoading(false);
        }
    };

    const isSystemRole = role?.is_system && mode === "edit";

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {mode === "add" ? "Add New Role" : "Edit Role"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role Name {isSystemRole && "(cannot be changed)"}
                            </label>
                            {isSystemRole ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                                />
                            ) : (
                                <select
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select a role</option>
                                    {ROLE_NAMES.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Describe what this role is for..."
                            />
                        </div>

                        {/* Permissions */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Permissions
                                </label>
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    {formData.permissions.includes("*") ? "Deselect All" : "Select All"}
                                </button>
                            </div>

                            {formData.permissions.includes("*") ? (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Full Access</span>
                                        <span>— This role has access to all features</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                                    {PERMISSION_OPTIONS.map((perm) => (
                                        <label
                                            key={perm.id}
                                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.includes(perm.id)}
                                                onChange={() => handlePermissionToggle(perm.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || isSystemRole}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {mode === "add" ? "Create Role" : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
