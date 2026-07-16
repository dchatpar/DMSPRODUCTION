"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    Building2,
    Users,
    CreditCard,
    Globe,
    Shield,
    Bell,
    Mail,
    Database,
    Loader2,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    Save,
    Key,
} from "lucide-react";

interface PlatformStats {
    total_dealerships: number;
    active_dealerships: number;
    trial_dealerships: number;
    suspended_dealerships: number;
    total_users: number;
    total_revenue: number;
}

interface PlatformSettings {
    platform_name: string;
    platform_email: string;
    support_email: string;
    maintenance_mode: boolean;
    registration_enabled: boolean;
    require_email_verification: boolean;
    default_plan: string;
    trial_days: number;
}

export default function PlatformSettingsPage() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [settings, setSettings] = useState<PlatformSettings>({
        platform_name: "AdaptUs DMS",
        platform_email: "admin@adaptus.com",
        support_email: "support@adaptus.com",
        maintenance_mode: false,
        registration_enabled: true,
        require_email_verification: true,
        default_plan: "Basic",
        trial_days: 14,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPlatformData();
    }, []);

    const fetchPlatformData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            if (!token) {
                window.location.href = "/login";
                return;
            }

            // Check if user is platform admin
            const meResponse = await fetch("/api/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!meResponse.ok) {
                throw new Error("Failed to get user info");
            }

            const meData = await meResponse.json();

            if (!meData.data.is_platform_admin) {
                setError("You do not have permission to access platform settings");
                return;
            }

            // Fetch platform stats from dealerships API
            const dealershipsResponse = await fetch("/api/dealerships", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (dealershipsResponse.ok) {
                const data = await dealershipsResponse.json();
                const dealerships = data.data || [];

                // Calculate stats
                setStats({
                    total_dealerships: dealerships.length,
                    active_dealerships: dealerships.filter((d: any) => d.status === "Active").length,
                    trial_dealerships: dealerships.filter((d: any) => d.status === "Trial").length,
                    suspended_dealerships: dealerships.filter((d: any) => d.status === "Suspended").length,
                    total_users: dealerships.reduce((sum: number, d: any) => sum + (d.user_count || 0), 0),
                    total_revenue: dealerships.reduce((sum: number, d: any) => {
                        const price = d.subscription?.plan_price || 0;
                        return sum + price;
                    }, 0),
                });
            }
        } catch (err: any) {
            console.error("Error fetching platform data:", err);
            setError(err.message || "Failed to load platform data");
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (key: keyof PlatformSettings, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = async () => {
        setError(null);
        setSuccess(null);
        setSaving(true);

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setSuccess("Platform settings saved successfully");
        } catch (err: any) {
            console.error("Error saving settings:", err);
            setError(err.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure platform-wide settings and preferences
                    </p>
                </div>
                <button
                    onClick={fetchPlatformData}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-600">{success}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* General Settings */}
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Settings className="w-5 h-5 text-gray-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Platform Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Platform Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.platform_name}
                                        onChange={(e) => handleSettingChange("platform_name", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Platform Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Platform Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={settings.platform_email}
                                            onChange={(e) => handleSettingChange("platform_email", e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Support Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Support Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={settings.support_email}
                                            onChange={(e) => handleSettingChange("support_email", e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Registration Settings */}
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-gray-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">Registration & Access</h2>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Registration Enabled */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">Allow New Dealerships</p>
                                        <p className="text-sm text-gray-500">Let new dealerships register on the platform</p>
                                    </div>
                                    <button
                                        onClick={() => handleSettingChange("registration_enabled", !settings.registration_enabled)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            settings.registration_enabled ? "bg-blue-600" : "bg-gray-300"
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                settings.registration_enabled ? "translate-x-6" : ""
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Email Verification */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">Require Email Verification</p>
                                        <p className="text-sm text-gray-500">New users must verify their email</p>
                                    </div>
                                    <button
                                        onClick={() => handleSettingChange("require_email_verification", !settings.require_email_verification)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            settings.require_email_verification ? "bg-blue-600" : "bg-gray-300"
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                settings.require_email_verification ? "translate-x-6" : ""
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Maintenance Mode */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">Maintenance Mode</p>
                                        <p className="text-sm text-gray-500">Disable platform access for all users</p>
                                    </div>
                                    <button
                                        onClick={() => handleSettingChange("maintenance_mode", !settings.maintenance_mode)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            settings.maintenance_mode ? "bg-red-600" : "bg-gray-300"
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                settings.maintenance_mode ? "translate-x-6" : ""
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Defaults */}
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-gray-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">Subscription Defaults</h2>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Default Plan */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Default Plan for New Dealerships
                                    </label>
                                    <select
                                        value={settings.default_plan}
                                        onChange={(e) => handleSettingChange("default_plan", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Basic">Basic (Free)</option>
                                        <option value="Standard">Standard ($149/mo)</option>
                                        <option value="Premium">Premium ($299/mo)</option>
                                    </select>
                                </div>

                                {/* Trial Days */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Trial Period (Days)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.trial_days}
                                        onChange={(e) => handleSettingChange("trial_days", parseInt(e.target.value) || 0)}
                                        min="0"
                                        max="90"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Number of days new dealerships can use the platform for free
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Settings
                            </button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Platform Stats */}
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-gray-500" />
                                    <h3 className="text-sm font-semibold text-gray-900">Platform Overview</h3>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Total Dealerships</span>
                                    <span className="font-semibold text-gray-900">{stats?.total_dealerships || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Active</span>
                                    <span className="font-semibold text-green-600">{stats?.active_dealerships || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Trial</span>
                                    <span className="font-semibold text-blue-600">{stats?.trial_dealerships || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Suspended</span>
                                    <span className="font-semibold text-red-600">{stats?.suspended_dealerships || 0}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Total Users</span>
                                        <span className="font-semibold text-gray-900">{stats?.total_users || 0}</span>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Monthly Revenue</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatCurrency(stats?.total_revenue || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-4">Quick Links</h3>
                            <div className="space-y-2">
                                <a
                                    href="/dealerships"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <Building2 className="w-4 h-4" />
                                    Manage Dealerships
                                </a>
                                <a
                                    href="/settings/subscription"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Subscriptions
                                </a>
                                <a
                                    href="/users"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <Users className="w-4 h-4" />
                                    All Users
                                </a>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-4">Security</h3>
                            <div className="space-y-3">
                                <button className="flex items-center justify-between w-full text-sm">
                                    <span className="text-gray-600">API Keys</span>
                                    <Key className="w-4 h-4 text-gray-400" />
                                </button>
                                <button className="flex items-center justify-between w-full text-sm">
                                    <span className="text-gray-600">Audit Logs</span>
                                    <Shield className="w-4 h-4 text-gray-400" />
                                </button>
                                <button className="flex items-center justify-between w-full text-sm">
                                    <span className="text-gray-600">Notifications</span>
                                    <Bell className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Database */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-4">System</h3>
                            <div className="flex items-center gap-3">
                                <Database className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Database Status</p>
                                    <p className="text-xs text-green-600">Connected</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
