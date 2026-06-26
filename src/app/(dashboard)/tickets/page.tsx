"use client";

import { useState, useEffect } from "react";
import {
    Ticket,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    Download,
    RefreshCw,
    Loader2,
    AlertCircle,
    CheckCircle,
    Clock,
    AlertTriangle,
    List,
    LayoutGrid,
    XCircle,
    Inbox,
    Mail,
    Phone,
    User,
} from "lucide-react";
import TicketFormModal from "@/src/components/TicketFormModal";
import TicketDetailsModal from "@/src/components/TicketDetailsModal";
import TicketsKanban from "@/src/components/TicketsKanban";
import ConfirmDialog from "@/src/components/ConfirmDialog";

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

interface ApiResponse {
    data: Ticket[];
    count: number;
    limit: number;
    offset: number;
}

const TICKET_STAGES = ["Open", "In Progress", "Resolved", "Closed"];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    "Open": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: AlertCircle },
    "In Progress": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Clock },
    "Resolved": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle },
    "Closed": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: XCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
    Low: "bg-gray-100 text-gray-700",
    Medium: "bg-blue-100 text-blue-700",
    High: "bg-orange-100 text-orange-700",
    Urgent: "bg-red-100 text-red-700",
};

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(20);
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    // Confirm dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{
        ticket: Ticket | null;
        loading: boolean;
    }>({ ticket: null, loading: false });

    useEffect(() => {
        fetchTickets();
    }, [currentPage, searchTerm]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/tickets?limit=${itemsPerPage}&offset=${offset}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch tickets");
            }

            const data: ApiResponse = await response.json();
            setTickets(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setShowDetailsModal(true);
    };

    const handleEdit = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedTicket(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedTicket(null);
        fetchTickets();
    };

    const handleDelete = async (ticket: Ticket) => {
        setConfirmDialogData({ ticket, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.ticket) return;

        const ticketId = confirmDialogData.ticket.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete ticket");
            }

            setConfirmDialogData({ ticket: null, loading: false });
            setShowConfirmDialog(false);
            setTickets((prev) => prev.filter((t) => t.id !== ticketId));
            setTotalItems((prev) => prev - 1);
            fetchTickets();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleStatusChange = async (ticket: Ticket, newStatus: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tickets/${ticket.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error("Failed to update ticket status");
            }

            fetchTickets();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return "No date";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Group tickets by status for kanban view
    const ticketsByStatus = TICKET_STAGES.reduce((acc, stage) => {
        acc[stage] = tickets.filter((t) => t.status === stage);
        return acc;
    }, {} as Record<string, Ticket[]>);

    // Stats
    const openCount = tickets.filter((t) => t.status === "Open").length;
    const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
    const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;
    const closedCount = tickets.filter((t) => t.status === "Closed").length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage and track internal support requests
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-1.5 rounded-md transition-colors ${
                                viewMode === "kanban"
                                    ? "bg-white shadow-sm text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                            title="Kanban View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-md transition-colors ${
                                viewMode === "list"
                                    ? "bg-white shadow-sm text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={fetchTickets}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Ticket
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Open</p>
                            <p className="text-xl font-bold text-red-600">{openCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">In Progress</p>
                            <p className="text-xl font-bold text-blue-600">{inProgressCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Resolved</p>
                            <p className="text-xl font-bold text-green-600">{resolvedCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <XCircle className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Closed</p>
                            <p className="text-xl font-bold text-gray-600">{closedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tickets by subject, description..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">All Priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">All Status</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            More Filters
                        </button>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-sm text-gray-500">Loading tickets...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <p className="text-red-600 text-sm font-medium mb-2">Error loading tickets</p>
                        <p className="text-gray-600 text-sm">{error}</p>
                        <button
                            onClick={fetchTickets}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Kanban View */}
            {!loading && !error && viewMode === "kanban" && (
                <TicketsKanban
                    tickets={tickets}
                    loading={loading}
                    error={error}
                    onRefresh={fetchTickets}
                    onTicketClick={handleViewDetails}
                    onTicketEdit={handleEdit}
                    onTicketDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                />
            )}

            {/* List View */}
            {!loading && !error && viewMode === "list" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subject
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Priority
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Assigned To
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <Ticket className="w-12 h-12 text-gray-300 mx-auto" />
                                            <p className="mt-2 text-sm text-gray-500">No tickets found</p>
                                            <button
                                                onClick={handleAdd}
                                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Add Your First Ticket
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    tickets.map((ticket) => (
                                        <tr
                                            key={ticket.id}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => handleViewDetails(ticket)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg ${STATUS_COLORS[ticket.status].bg}`}>
                                                        <Ticket className={`w-4 h-4 ${STATUS_COLORS[ticket.status].text}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {ticket.subject}
                                                        </p>
                                                        {ticket.description && (
                                                            <p className="text-xs text-gray-500 truncate max-w-[250px]">
                                                                {ticket.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {(() => {
                                                        const StatusIcon = STATUS_COLORS[ticket.status]?.icon;
                                                        return StatusIcon ? (
                                                            <StatusIcon className={`w-4 h-4 ${STATUS_COLORS[ticket.status].text}`} />
                                                        ) : null;
                                                    })()}
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[ticket.status].bg} ${STATUS_COLORS[ticket.status].text}`}>
                                                        {ticket.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(ticket.created_at)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {ticket.assigned_user?.avatar ? (
                                                        <img
                                                            src={ticket.assigned_user.avatar}
                                                            alt={ticket.assigned_user.full_name}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                                                            {ticket.assigned_user?.full_name?.[0] || "?"}
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-gray-600">
                                                        {ticket.assigned_user?.full_name || "Unassigned"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewDetails(ticket);
                                                        }}
                                                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(ticket);
                                                        }}
                                                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4 text-amber-500" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(ticket);
                                                        }}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && !error && tickets.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} tickets
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {showDetailsModal && selectedTicket && (
                <TicketDetailsModal
                    ticket={selectedTicket}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedTicket(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedTicket);
                    }}
                    onDelete={() => {
                        setShowDetailsModal(false);
                        handleDelete(selectedTicket);
                    }}
                    onStatusChange={handleStatusChange}
                />
            )}

            {showFormModal && (
                <TicketFormModal
                    mode={formMode}
                    ticket={selectedTicket}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedTicket(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.ticket && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Ticket"
                    message={`Are you sure you want to delete "${confirmDialogData.ticket.subject}"? This action cannot be undone.`}
                    confirmText={confirmDialogData.loading ? "Deleting..." : "Delete"}
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogData({ ticket: null, loading: false });
                    }}
                />
            )}
        </div>
    );
}
