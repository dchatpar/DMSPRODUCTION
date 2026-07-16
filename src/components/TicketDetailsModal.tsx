"use client";

import { useState } from "react";
import {
    X,
    Clock,
    User,
    Edit,
    Trash2,
    CheckCircle,
    AlertTriangle,
    FileText,
    Tag,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface UserData {
    id: string;
    full_name: string;
    email: string;
    avatar: string | null;
}

interface Ticket {
    id: string;
    subject: string;
    description: string | null;
    assigned_to: string | null;
    created_by: string | null;
    priority: string;
    status: string;
    resolved_at: string | null;
    created_at: string;
    assigned_user: UserData | null;
    created_by_user: UserData | null;
}

interface TicketDetailsModalProps {
    ticket: Ticket;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onStatusChange: (ticket: Ticket, newStatus: string) => void;
    userRole?: string;
    userPermissions?: string[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    "Open": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    "In Progress": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    "Resolved": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    "Closed": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

const PRIORITY_COLORS: Record<string, string> = {
    Low: "bg-gray-100 text-gray-700",
    Medium: "bg-blue-100 text-blue-700",
    High: "bg-orange-100 text-orange-700",
    Urgent: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "Closed"];

export default function TicketDetailsModal({
    ticket,
    onClose,
    onEdit,
    onDelete,
    onStatusChange,
    userRole,
    userPermissions = [],
}: TicketDetailsModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const canEdit = userRole === "Admin" || userPermissions.includes("tickets:write");
    const canDelete = userRole === "Admin" || userPermissions.includes("tickets:delete");

    const formatDate = (date: string | null) => {
        if (!date) return "Not set";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tickets/${ticket.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to delete ticket");
            }

            setShowDeleteConfirm(false);
            onDelete();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                                {ticket.priority}
                            </span>
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[ticket.status].bg} ${STATUS_COLORS[ticket.status].text}`}>
                                {ticket.status}
                            </span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{ticket.subject}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Status Change */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                            Change Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => onStatusChange(ticket, status)}
                                    disabled={ticket.status === status}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                                        ticket.status === status
                                            ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} ${STATUS_COLORS[status].border} cursor-default`
                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    {ticket.description && (
                        <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase mb-2">
                                <FileText className="w-4 h-4" />
                                Description
                            </label>
                            <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                {ticket.description}
                            </p>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Assigned To</p>
                                <div className="flex items-center gap-2">
                                    {ticket.assigned_user?.avatar ? (
                                        <img
                                            src={ticket.assigned_user.avatar}
                                            alt={ticket.assigned_user.full_name}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-medium">
                                            {ticket.assigned_user?.full_name?.[0] || "?"}
                                        </div>
                                    )}
                                    <p className="text-sm font-medium text-gray-900">
                                        {ticket.assigned_user?.full_name || "Unassigned"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Created By</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {ticket.created_by_user?.full_name || "Unknown"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Clock className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Created At</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatDate(ticket.created_at)}
                                </p>
                            </div>
                        </div>

                        {ticket.resolved_at && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Resolved At</p>
                                    <p className="text-sm font-medium text-green-700">
                                        {formatDate(ticket.resolved_at)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                    {canDelete && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={onEdit}
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Ticket
                        </button>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    title="Delete Ticket"
                    message={`Are you sure you want to delete "${ticket.subject}"? This action cannot be undone.`}
                    confirmText={deleting ? "Deleting..." : "Delete"}
                    variant="danger"
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
}
