"use client";

import React, { useState } from 'react';
import {
    Eye,
    Edit,
    Trash2,
    Mail,
    Phone,
    Calendar,
    User,
    Clock,
    PhoneCall,
    UserCheck,
    UserX,
    GripVertical,
    Car,
    Loader2,
    AlertCircle,
} from 'lucide-react';

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

interface LeadsKanbanProps {
    leads: Lead[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    onLeadClick: (lead: Lead) => void;
    onLeadEdit: (lead: Lead) => void;
    onLeadDelete: (lead: Lead) => void;
}

interface Column {
    id: string;
    title: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    status: string;
}

const LeadsKanban: React.FC<LeadsKanbanProps> = ({
    leads,
    loading,
    error,
    onRefresh,
    onLeadClick,
    onLeadEdit,
    onLeadDelete,
}) => {
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
    const [updating, setUpdating] = useState(false);
    const [optimisticLeads, setOptimisticLeads] = useState<Lead[]>(leads);

    // Update optimistic leads when props change
    React.useEffect(() => {
        setOptimisticLeads(leads);
    }, [leads]);

    const columns: Column[] = [
        {
            id: 'not_started',
            title: 'Not Started',
            icon: Clock,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            iconColor: 'text-gray-500',
            status: 'Not Started',
        },
        {
            id: 'in_progress',
            title: 'In Progress',
            icon: PhoneCall,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            iconColor: 'text-blue-500',
            status: 'In Progress',
        },
        {
            id: 'qualified',
            title: 'Qualified',
            icon: UserCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-500',
            status: 'Qualified',
        },
        {
            id: 'closed',
            title: 'Closed',
            icon: UserCheck,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            iconColor: 'text-purple-500',
            status: 'Closed',
        },
        {
            id: 'lost',
            title: 'Lost',
            icon: UserX,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-500',
            status: 'Lost',
        },
    ];

    const getLeadsByStatus = (status: string) => {
        return optimisticLeads.filter((lead) => lead.status === status);
    };

    const handleDragStart = (e: React.DragEvent, lead: Lead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();

        if (!draggedLead || draggedLead.status === targetStatus) {
            setDraggedLead(null);
            return;
        }

        // Optimistic update - update local state immediately
        const updatedLead = { ...draggedLead, status: targetStatus };
        setOptimisticLeads((prev) =>
            prev.map((lead) =>
                lead.id === draggedLead.id ? updatedLead : lead
            )
        );
        setDraggedLead(null);
        setUpdating(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/leads/${draggedLead.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: targetStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update lead status');
            }

            // Refresh from server to get latest data (but keep UI smooth)
            onRefresh();
        } catch (error) {
            console.error('Failed to update lead status:', error);
            // Revert optimistic update on error
            setOptimisticLeads(leads);
            alert('Failed to update lead status. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return 'C';
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getSourceColor = (source: string) => {
        const colors: Record<string, string> = {
            Website: 'bg-purple-100 text-purple-800',
            Referral: 'bg-green-100 text-green-800',
            Event: 'bg-yellow-100 text-yellow-800',
            'Walk-in': 'bg-blue-100 text-blue-800',
            Facebook: 'bg-indigo-100 text-indigo-800',
            Craigslist: 'bg-orange-100 text-orange-800',
            Kijiji: 'bg-red-100 text-red-800',
            Phone: 'bg-teal-100 text-teal-800',
        };
        return colors[source] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-white rounded-xl border border-gray-200">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm text-gray-500">Loading leads...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-white rounded-xl border border-gray-200">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-sm text-red-600">{error}</p>
                    <button
                        onClick={onRefresh}
                        className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Kanban - Hidden on mobile */}
            <div className="hidden lg:block w-full overflow-x-auto pb-4">
                <div className="min-w-[900px] grid grid-cols-5 gap-4">
                    {columns.map((column) => {
                        const columnLeads = getLeadsByStatus(column.status);
                        const ColumnIcon = column.icon;

                        return (
                            <div
                                key={column.id}
                                className={`rounded-lg ${column.bgColor} ${column.borderColor} border p-3 flex flex-col min-h-[400px] transition-colors ${updating ? 'opacity-70' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.status)}
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between p-2 rounded-t-lg">
                                    <div className="flex items-center gap-2">
                                        <ColumnIcon size={18} className={column.iconColor} />
                                        <h3 className="font-semibold text-gray-700 text-sm">{column.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${column.color} bg-white`}>
                                            {columnLeads.length}
                                        </span>
                                    </div>
                                    {updating && (
                                        <Loader2 size={14} className="text-blue-500 animate-spin" />
                                    )}
                                </div>

                                {/* Column Content */}
                                <div
                                    className="mt-3 space-y-3 flex-1 overflow-y-auto"
                                    style={{ maxHeight: 'calc(100vh - 300px)' }}
                                >
                                    {columnLeads.map((lead) => (
                                        <div
                                            key={lead.id}
                                            draggable={!updating}
                                            onDragStart={(e) => handleDragStart(e, lead)}
                                            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-blue-300"
                                        >
                                            <div className="p-3">
                                                {/* Drag Handle & Actions */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <GripVertical size={14} />
                                                        <span className="text-xs font-mono truncate max-w-[80px] text-gray-500">
                                                            #{lead.id.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => onLeadClick(lead)}
                                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onLeadEdit(lead)}
                                                            className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onLeadDelete(lead)}
                                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Customer Info */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    {lead.customer?.avatar ? (
                                                        <img
                                                            src={lead.customer.avatar}
                                                            alt={lead.customer.name || 'Customer'}
                                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                                            <User className="text-white" size={14} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                                                            {lead.customer?.name || 'Unknown Customer'}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className={`px-1.5 py-0.5 rounded ${getSourceColor(lead.source)}`}>
                                                                {lead.source}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Contact Info */}
                                                <div className="mb-2 text-xs">
                                                    {lead.customer?.email && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Mail size={10} className="text-gray-400 flex-shrink-0" />
                                                            <span className="text-gray-600 truncate">{lead.customer.email}</span>
                                                        </div>
                                                    )}
                                                    {lead.customer?.phone && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Phone size={10} className="text-gray-400 flex-shrink-0" />
                                                            <span className="text-gray-600 truncate">{lead.customer.phone}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Vehicle Interest */}
                                                {lead.vehicle && (
                                                    <div className="flex items-center gap-1 mt-2 px-2 py-1 bg-gray-50 rounded-lg">
                                                        <Car size={12} className="text-blue-500 flex-shrink-0" />
                                                        <span className="text-xs text-gray-700 truncate">
                                                            {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Assigned To & Last Engagement */}
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                                    <span className="text-xs text-gray-500">
                                                        {lead.assigned_user?.full_name || 'Unassigned'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(lead.last_engagement).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Empty State */}
                                    {columnLeads.length === 0 && (
                                        <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
                                            <ColumnIcon size={24} className={`mx-auto mb-2 ${column.iconColor} opacity-50`} />
                                            <p className="text-xs text-gray-400">No leads</p>
                                            <p className="text-xs text-gray-400">Drop here to move</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Kanban - Card List View */}
            <div className="lg:hidden space-y-4">
                {columns.map((column) => {
                    const columnLeads = getLeadsByStatus(column.status);
                    const ColumnIcon = column.icon;

                    if (columnLeads.length === 0) return null;

                    return (
                        <div key={column.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className={`flex items-center gap-2 px-4 py-3 ${column.bgColor} border-b ${column.borderColor}`}>
                                <ColumnIcon size={18} className={column.iconColor} />
                                <h3 className="font-semibold text-gray-700 text-sm">{column.title}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${column.color} bg-white`}>
                                    {columnLeads.length}
                                </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {columnLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                {lead.customer?.avatar ? (
                                                    <img
                                                        src={lead.customer.avatar}
                                                        alt={lead.customer.name || 'Customer'}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                                                        {getInitials(lead.customer?.name || 'C')}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 text-sm">
                                                        {lead.customer?.name || 'Unknown Customer'}
                                                    </h4>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSourceColor(lead.source)}`}>
                                                        {lead.source}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => onLeadClick(lead)}
                                                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Eye size={16} className="text-blue-500" />
                                                </button>
                                                <button
                                                    onClick={() => onLeadEdit(lead)}
                                                    className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                                                >
                                                    <Edit size={16} className="text-amber-500" />
                                                </button>
                                            </div>
                                        </div>
                                        {lead.vehicle && (
                                            <div className="text-xs text-gray-600 mb-1">
                                                <Car size={12} className="inline mr-1 text-blue-500" />
                                                {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{lead.assigned_user?.full_name || 'Unassigned'}</span>
                                            <span>{new Date(lead.last_engagement).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default LeadsKanban;