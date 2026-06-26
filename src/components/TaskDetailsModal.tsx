"use client";

import { useState, useEffect } from "react";
import {
    X,
    Calendar,
    Clock,
    User,
    Edit,
    Trash2,
    CheckCircle,
    AlertTriangle,
    FileText,
    MessageSquare,
    Bell,
    Activity,
    Send,
    Loader2,
    Link as LinkIcon,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface UserData {
    id: string;
    full_name: string;
    email: string;
    avatar: string | null;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    assigned_to: string | null;
    created_by: string | null;
    due_date: string | null;
    reminder_at: string | null;
    priority: string;
    status: string;
    notes: string | null;
    tags: string[] | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    source_type: string | null;
    source_id: string | null;
    assigned_user: UserData | null;
    created_by_user: UserData | null;
    task_notes?: any[];
    task_attachments?: any[];
    task_reminders?: any[];
    task_links?: any[];
    task_activity?: any[];
}

interface TaskDetailsModalProps {
    task: Task;
    users?: UserData[];
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onStatusChange: (task: Task, newStatus: string) => void;
    onRefresh: () => void;
}

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Cancelled", "On Hold"];

const STATUS_COLORS: Record<string, string> = {
    "Pending": "bg-yellow-100 text-yellow-700",
    "In Progress": "bg-blue-100 text-blue-700",
    "Completed": "bg-green-100 text-green-700",
    "Cancelled": "bg-gray-100 text-gray-700",
    "On Hold": "bg-purple-100 text-purple-700",
};

const PRIORITY_COLORS: Record<string, string> = {
    Low: "bg-gray-100 text-gray-700",
    Medium: "bg-blue-100 text-blue-700",
    High: "bg-orange-100 text-orange-700",
    Urgent: "bg-red-100 text-red-700",
};

export default function TaskDetailsModal({ task, users = [], onClose, onEdit, onDelete, onStatusChange, onRefresh }: TaskDetailsModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [addingNote, setAddingNote] = useState(false);
    const [activeTab, setActiveTab] = useState<"details" | "notes" | "activity">("details");

    const isOverdue = task.due_date && task.status !== "Completed" && task.status !== "Cancelled" && new Date(task.due_date) < new Date();

    const formatDate = (date: string | null) => {
        if (!date) return "Not set";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatDateTime = (date: string | null) => {
        if (!date) return "";
        return new Date(date).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tasks/${task.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to delete task");

            setShowDeleteConfirm(false);
            onDelete();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setDeleting(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        setAddingNote(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tasks/${task.id}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content: newNote.trim() }),
            });

            if (!response.ok) throw new Error("Failed to add note");

            setNewNote("");
            onRefresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setAddingNote(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div className="flex-1 pr-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                                {task.priority}
                            </span>
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[task.status]}`}>
                                {task.status}
                            </span>
                            {isOverdue && (
                                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Overdue
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === "details" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab("notes")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === "notes" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Notes {task.task_notes?.length ? `(${task.task_notes.length})` : ""}
                    </button>
                    <button
                        onClick={() => setActiveTab("activity")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === "activity" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        <Activity className="w-4 h-4" />
                        Activity
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "details" && (
                        <div className="p-6 space-y-6">
                            {/* Status Change */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Change Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {STATUS_OPTIONS.map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => onStatusChange(task, status)}
                                            disabled={task.status === status}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${task.status === status ? `${STATUS_COLORS[status]} cursor-default` : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            {task.description && (
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase mb-2">
                                        <FileText className="w-4 h-4" /> Description
                                    </label>
                                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{task.description}</p>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg"><Calendar className="w-4 h-4 text-blue-600" /></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Due Date</p>
                                        <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-900"}`}>{formatDate(task.due_date)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg"><User className="w-4 h-4 text-purple-600" /></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Assigned To</p>
                                        <div className="flex items-center gap-2">
                                            {task.assigned_user?.avatar ? (
                                                <img src={task.assigned_user.avatar} alt="" className="w-5 h-5 rounded-full" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-medium">
                                                    {task.assigned_user?.full_name?.[0] || "?"}
                                                </div>
                                            )}
                                            <p className="text-sm font-medium text-gray-900">{task.assigned_user?.full_name || "Unassigned"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-50 rounded-lg"><User className="w-4 h-4 text-green-600" /></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Created By</p>
                                        <p className="text-sm font-medium text-gray-900">{task.created_by_user?.full_name || "Unknown"}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 rounded-lg"><Clock className="w-4 h-4 text-gray-600" /></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Created At</p>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(task.created_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            {task.tags && task.tags.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2">
                                        {task.tags.map((tag) => (
                                            <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {task.notes && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Internal Notes</label>
                                    <p className="text-gray-700 bg-amber-50 rounded-lg p-3 text-sm">{task.notes}</p>
                                </div>
                            )}

                            {/* Links */}
                            {task.task_links && task.task_links.length > 0 && (
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase mb-2">
                                        <LinkIcon className="w-4 h-4" /> Related To
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {task.task_links.map((link, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-sm rounded-lg">
                                                {link.link_type}: {link.linked_id.slice(0, 8)}...
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "notes" && (
                        <div className="p-6">
                            {/* Add Note */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Add Note</label>
                                <div className="flex gap-2">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Write a note..."
                                        rows={2}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                    <button
                                        onClick={handleAddNote}
                                        disabled={addingNote || !newNote.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Post
                                    </button>
                                </div>
                            </div>

                            {/* Notes List */}
                            <div className="space-y-4">
                                {(!task.task_notes || task.task_notes.length === 0) ? (
                                    <p className="text-center text-gray-500 py-8">No notes yet</p>
                                ) : (
                                    task.task_notes.map((note) => (
                                        <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {note.user?.avatar ? (
                                                        <img src={note.user.avatar} alt="" className="w-6 h-6 rounded-full" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                                                            {note.user?.full_name?.[0] || "?"}
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-900">{note.user?.full_name || "Unknown"}</span>
                                                </div>
                                                <span className="text-xs text-gray-500">{formatDateTime(note.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "activity" && (
                        <div className="p-6">
                            <div className="space-y-4">
                                {(!task.task_activity || task.task_activity.length === 0) ? (
                                    <p className="text-center text-gray-500 py-8">No activity yet</p>
                                ) : (
                                    task.task_activity.map((activity) => (
                                        <div key={activity.id} className="flex gap-3">
                                            <div className="mt-1">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Activity className="w-4 h-4 text-gray-500" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">{activity.user?.full_name || "System"}</span>
                                                    <span className="text-sm text-gray-500">{activity.action}</span>
                                                </div>
                                                {activity.new_value && (
                                                    <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded p-2">
                                                        {typeof activity.new_value === 'string' ? activity.new_value : JSON.stringify(activity.new_value)}
                                                    </p>
                                                )}
                                                <span className="text-xs text-gray-400">{formatDateTime(activity.created_at)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <button
                        onClick={onEdit}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg flex items-center gap-2"
                    >
                        <Edit className="w-4 h-4" /> Edit Task
                    </button>
                </div>
            </div>

            {showDeleteConfirm && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    title="Delete Task"
                    message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
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
