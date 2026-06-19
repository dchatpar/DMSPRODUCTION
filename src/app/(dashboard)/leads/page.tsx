"use client";

import { useState, useEffect } from "react";
import {
    Users,
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
    Mail,
    Phone,
    User,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    UserPlus,
    LayoutGrid,
    List,
    GripVertical,
} from "lucide-react";
import LeadDetailsModal from "@/src/components/LeadDetailsModal";
import LeadFormModal from "@/src/components/LeadFormModal";
import LeadsKanban from "@/src/components/LeadsKanban";


interface Lead {
    id: string;
    customer_id: string;
    source: string;
    status: string;
    interest_vehicle_id: string | null;
    assigned_to: string | null;
    notes: string | null;
    lead_creation_date: string;
    last_engagement: string;
    created_at: string;
    updated_at: string;
    customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        avatar: string | null;
    } | null;
    vehicle: {
        id: string;
        make: string;
        model: string;
        year: number;
    } | null;
    assigned_user: {
        id: string;
        full_name: string;
        email: string;
        avatar: string | null;
    } | null;
}

interface ApiResponse {
    data: Lead[];
    count: number;
    limit: number;
    offset: number;
}

type ViewMode = "table" | "kanban";

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [sourceFilter, setSourceFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(10);
    const [viewMode, setViewMode] = useState<ViewMode>("table");

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    useEffect(() => {
        fetchLeads();
    }, [currentPage, statusFilter, sourceFilter, searchTerm]);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/leads?limit=${itemsPerPage}&offset=${offset}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (sourceFilter) url += `&source=${sourceFilter}`;
            if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch leads");
            }

            const data: ApiResponse = await response.json();
            setLeads(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (lead: Lead) => {
        setSelectedLead(lead);
        setShowDetailsModal(true);
    };

    const handleEdit = (lead: Lead) => {
        setSelectedLead(lead);
        setFormMode("edit");
        setShowFormModal(true);
    };

    const handleAdd = () => {
        setSelectedLead(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedLead(null);
        fetchLeads();
    };

    const handleDelete = async (lead: Lead) => {
        if (!confirm(`Are you sure you want to delete this lead?`)) return;

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/leads/${lead.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete lead");
            }

            fetchLeads();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            "Not Started": "bg-gray-100 text-gray-800",
            "In Progress": "bg-blue-100 text-blue-800",
            Qualified: "bg-green-100 text-green-800",
            Closed: "bg-purple-100 text-purple-800",
            Lost: "bg-red-100 text-red-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Not Started":
                return <Clock className="w-4 h-4 text-gray-600" />;
            case "In Progress":
                return <Loader2 className="w-4 h-4 text-blue-600" />;
            case "Qualified":
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "Closed":
                return <CheckCircle className="w-4 h-4 text-purple-600" />;
            case "Lost":
                return <XCircle className="w-4 h-4 text-red-600" />;
            default:
                return null;
        }
    };

    const getSourceColor = (source: string) => {
        const colors: Record<string, string> = {
            Website: "bg-purple-100 text-purple-800",
            Referral: "bg-green-100 text-green-800",
            Event: "bg-yellow-100 text-yellow-800",
            "Walk-in": "bg-blue-100 text-blue-800",
            Facebook: "bg-indigo-100 text-indigo-800",
            Craigslist: "bg-orange-100 text-orange-800",
            Kijiji: "bg-red-100 text-red-800",
            Phone: "bg-teal-100 text-teal-800",
        };
        return colors[source] || "bg-gray-100 text-gray-800";
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your sales leads and track progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "table"
                                ? "bg-white shadow-sm text-blue-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                            title="Table View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban"
                                ? "bg-white shadow-sm text-blue-600"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                            title="Kanban View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={fetchLeads}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Lead
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads by customer name, email, phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">All Status</option>
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Closed">Closed</option>
                            <option value="Lost">Lost</option>
                        </select>
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">All Sources</option>
                            <option value="Website">Website</option>
                            <option value="Referral">Referral</option>
                            <option value="Event">Event</option>
                            <option value="Walk-in">Walk-in</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Craigslist">Craigslist</option>
                            <option value="Kijiji">Kijiji</option>
                            <option value="Phone">Phone</option>
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

            {/* View Content */}
            {viewMode === "table" ? (
                // Table View
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Source
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehicle Interest
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Assigned To
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Engagement
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                            <p className="mt-2 text-sm text-gray-500">Loading leads...</p>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                            <p className="mt-2 text-sm text-red-600">{error}</p>
                                            <button
                                                onClick={fetchLeads}
                                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Try Again
                                            </button>
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <Users className="w-12 h-12 text-gray-300 mx-auto" />
                                            <p className="mt-2 text-sm text-gray-500">No leads found</p>
                                            <button
                                                onClick={handleAdd}
                                                className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Add Your First Lead
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {lead.customer?.avatar ? (
                                                        <img
                                                            src={lead.customer.avatar}
                                                            alt={lead.customer.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                                            {lead.customer?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "C"}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {lead.customer?.name || "Unknown"}
                                                        </p>
                                                        {lead.customer?.email && (
                                                            <div className="flex items-center gap-1">
                                                                <Mail className="w-3 h-3 text-gray-400" />
                                                                <span className="text-xs text-gray-500 truncate max-w-[120px]">
                                                                    {lead.customer.email}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSourceColor(lead.source)}`}>
                                                    {lead.source}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {getStatusIcon(lead.status)}
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                                                        {lead.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {lead.vehicle ? (
                                                    <span className="text-sm text-gray-600">
                                                        {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {lead.assigned_user?.full_name || "Unassigned"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(lead.last_engagement)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleViewDetails(lead)}
                                                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(lead)}
                                                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4 text-amber-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(lead)}
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
                    {!loading && !error && leads.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} leads
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Kanban View
                <LeadsKanban
                    leads={leads}
                    loading={loading}
                    error={error}
                    onRefresh={fetchLeads}
                    onLeadClick={handleViewDetails}
                    onLeadEdit={handleEdit}
                    onLeadDelete={handleDelete}
                />
            )}



            {/* Modals */}
            {showDetailsModal && selectedLead && (
                <LeadDetailsModal
                    lead={selectedLead}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedLead(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedLead);
                    }}
                />
            )}

            {showFormModal && (
                <LeadFormModal
                    mode={formMode}
                    lead={selectedLead}
                    onClose={() => {
                        setShowFormModal(false);
                        setSelectedLead(null);
                    }}
                    onSuccess={handleFormSuccess}
                />
            )}
        </div>
    );
}