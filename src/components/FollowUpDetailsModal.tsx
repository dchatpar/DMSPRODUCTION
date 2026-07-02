"use client";

import {
    X,
    Edit,
    Trash2,
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    FileText,
    CheckCircle,
    AlertCircle,
    Bell,
    History,
    ArrowRight,
} from "lucide-react";

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
}

interface Lead {
    id: string;
    source: string;
    status: string;
}

interface UserData {
    id: string;
    full_name: string;
    email: string;
    avatar: string | null;
}

interface FollowUpHistory {
    id: string;
    follow_up_id: string;
    edited_by: string;
    action: string;
    previous_description: string | null;
    new_description: string | null;
    previous_status: string | null;
    new_status: string | null;
    created_at: string;
    edited_by_user: UserData | null;
}

interface FollowUp {
    id: string;
    title: string;
    description: string | null;
    customer_id: string | null;
    lead_id: string | null;
    assigned_to: string | null;
    follow_up_date: string;
    follow_up_time: string | null;
    priority: string;
    status: string;
    notes: string | null;
    completed_at: string | null;
    created_at: string;
    customer: Customer | null;
    lead: Lead | null;
    assigned_user: UserData | null;
    history?: FollowUpHistory[];
}

interface FollowUpDetailsModalProps {
    followUp: FollowUp;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function FollowUpDetailsModal({
    followUp,
    onClose,
    onEdit,
    onDelete,
}: FollowUpDetailsModalProps) {
    const isOverdue =
        followUp.status === "Pending" &&
        new Date(followUp.follow_up_date) < new Date();

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            Low: "bg-gray-100 text-gray-700",
            Medium: "bg-blue-100 text-blue-700",
            High: "bg-orange-100 text-orange-700",
            Urgent: "bg-red-100 text-red-700",
        };
        return colors[priority] || "bg-gray-100 text-gray-700";
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Pending: "bg-yellow-100 text-yellow-700",
            Completed: "bg-green-100 text-green-700",
            Cancelled: "bg-gray-100 text-gray-700",
        };
        return colors[status] || "bg-gray-100 text-gray-700";
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatTime = (time: string | null) => {
        if (!time) return null;
        const [hours, minutes] = time.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${
                                isOverdue ? "bg-red-100" : "bg-blue-100"
                            }`}>
                                <Bell className={`w-5 h-5 ${isOverdue ? "text-red-600" : "text-blue-600"}`} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Follow-up Details</h2>
                                <p className="text-xs text-gray-500">
                                    {isOverdue ? "⚠️ Overdue" : "Scheduled follow-up"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onEdit}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit className="w-5 h-5 text-blue-600" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Title & Status */}
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{followUp.title}</h3>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(followUp.priority)}`}>
                                    {followUp.priority} Priority
                                </span>
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(followUp.status)}`}>
                                    {followUp.status}
                                </span>
                                {isOverdue && (
                                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Overdue
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {followUp.description && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                                    {followUp.description}
                                </p>
                            </div>
                        )}

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-700">Date</span>
                                </div>
                                <p className="text-sm font-semibold text-blue-900">
                                    {formatDate(followUp.follow_up_date)}
                                </p>
                            </div>
                            {followUp.follow_up_time && (
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                        <span className="text-xs font-medium text-purple-700">Time</span>
                                    </div>
                                    <p className="text-sm font-semibold text-purple-900">
                                        {formatTime(followUp.follow_up_time)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Related Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Customer */}
                            {followUp.customer && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-gray-600" />
                                        <span className="text-xs font-medium text-gray-500">Customer</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{followUp.customer.name}</p>
                                    {followUp.customer.phone && (
                                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                            <Phone className="w-3 h-3" />
                                            {followUp.customer.phone}
                                        </p>
                                    )}
                                    {followUp.customer.email && (
                                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                            <Mail className="w-3 h-3" />
                                            {followUp.customer.email}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Lead */}
                            {followUp.lead && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-gray-600" />
                                        <span className="text-xs font-medium text-gray-500">Related Lead</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {followUp.lead.source} - {followUp.lead.status}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Assigned To */}
                        {followUp.assigned_user && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Assigned To</h4>
                                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                    {followUp.assigned_user.avatar ? (
                                        <img
                                            src={followUp.assigned_user.avatar}
                                            alt={followUp.assigned_user.full_name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                            {followUp.assigned_user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {followUp.assigned_user.full_name}
                                        </p>
                                        <p className="text-xs text-gray-500">{followUp.assigned_user.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {followUp.notes && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                                    {followUp.notes}
                                </p>
                            </div>
                        )}

                        {/* History */}
                        {followUp.history && followUp.history.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    Change History
                                </h4>
                                <div className="space-y-3">
                                    {followUp.history.map((entry) => (
                                        <div key={entry.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        entry.action === 'created' ? 'bg-green-100 text-green-700' :
                                                        entry.action === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                        entry.action === 'cancelled' ? 'bg-gray-200 text-gray-700' :
                                                        entry.action === 'status_changed' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        by {entry.edited_by_user?.full_name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(entry.created_at).toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Description changes */}
                                            {(entry.previous_description !== entry.new_description) && (
                                                <div className="mb-2">
                                                    <span className="text-xs text-gray-500">Description: </span>
                                                    {entry.action === 'created' ? (
                                                        <span className="text-sm text-gray-700">{entry.new_description || '(no description)'}</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="text-red-600 line-through">{entry.previous_description || '(no description)'}</span>
                                                            <ArrowRight className="w-3 h-3 text-gray-400" />
                                                            <span className="text-green-600">{entry.new_description || '(no description)'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Status changes */}
                                            {(entry.previous_status !== entry.new_status) && (
                                                <div>
                                                    <span className="text-xs text-gray-500">Status: </span>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className={`px-2 py-0.5 rounded-full ${
                                                            entry.previous_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            entry.previous_status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {entry.previous_status || 'None'}
                                                        </span>
                                                        <ArrowRight className="w-3 h-3 text-gray-400" />
                                                        <span className={`px-2 py-0.5 rounded-full ${
                                                            entry.new_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            entry.new_status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {entry.new_status || 'None'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed At */}
                        {followUp.completed_at && (
                            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-sm">
                                    Completed on {formatDate(followUp.completed_at)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
