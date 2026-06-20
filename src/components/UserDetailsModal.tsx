"use client";

import {
    X,
    User,
    Mail,
    Phone,
    Calendar,
    Shield,
    Edit,
    Users,
    Clock,
    CheckCircle,
} from "lucide-react";

interface User {
    id: string;
    avatar: string | null;
    full_name: string;
    role: string;
    email: string;
    phone: string | null;
    start_date: string;
    created_at: string;
    updated_at: string;
}

interface UserDetailsModalProps {
    user: User;
    onClose: () => void;
    onEdit: () => void;
}

export default function UserDetailsModal({
    user,
    onClose,
    onEdit,
}: UserDetailsModalProps) {
    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            Admin: "bg-purple-100 text-purple-800",
            Manager: "bg-blue-100 text-blue-800",
            Staff: "bg-green-100 text-green-800",
            Salesperson: "bg-orange-100 text-orange-800",
        };
        return colors[role] || "bg-gray-100 text-gray-800";
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "Admin":
                return <Shield className="w-5 h-5 text-purple-600" />;
            case "Manager":
                return <User className="w-5 h-5 text-blue-600" />;
            default:
                return <Users className="w-5 h-5 text-green-600" />;
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    User Details
                                </h2>
                                <p className="text-xs text-gray-500">View user information</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 mb-6">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.full_name}
                                    className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-medium ring-4 ring-blue-50">
                                    {getInitials(user.full_name)}
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{user.full_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                                        {user.role}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Email</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{user.email}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Phone</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{user.phone || "N/A"}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Role</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {getRoleIcon(user.role)}
                                    <span className="text-sm text-gray-900">{user.role}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 font-medium">Start Date</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{formatDate(user.start_date)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Information</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-sm text-gray-500">Created</span>
                                    <span className="text-sm text-gray-900">{formatDateTime(user.created_at)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-sm text-gray-500">Last Updated</span>
                                    <span className="text-sm text-gray-900">{formatDateTime(user.updated_at)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-sm text-gray-500">Status</span>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                        <CheckCircle className="w-3 h-3" />
                                        Active
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={onEdit}
                                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit User
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}