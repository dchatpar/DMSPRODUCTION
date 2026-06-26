"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckSquare,
    Plus,
    Search,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Loader2,
    AlertCircle,
    Calendar,
    Clock,
    Circle,
    CheckCircle,
    AlertTriangle,
    Filter,
    FilterX,
    List,
    LayoutGrid,
} from "lucide-react";
import TaskFormModal from "@/src/components/TaskFormModal";
import TaskDetailsModal from "@/src/components/TaskDetailsModal";
import TasksKanban from "@/src/components/TasksKanban";
import ConfirmDialog from "@/src/components/ConfirmDialog";

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
}

interface TaskNote {
    id: string;
    content: string;
    is_internal: boolean;
    created_at: string;
    user: UserData | null;
}

interface ApiResponse {
    data: Task[];
    count: number;
    limit: number;
    offset: number;
}

interface FilterState {
    status: string;
    priority: string;
    assigned_to: string;
    due_date_from: string;
    due_date_to: string;
    my_tasks: boolean;
    overdue: boolean;
    search: string;
}

const TASK_STAGES = ["Pending", "In Progress", "Completed", "Cancelled", "On Hold"];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    "Pending": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock },
    "In Progress": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Circle },
    "Completed": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle },
    "Cancelled": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: AlertTriangle },
    "On Hold": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: AlertTriangle },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    Low: { bg: "bg-gray-100", text: "text-gray-700" },
    Medium: { bg: "bg-blue-100", text: "text-blue-700" },
    High: { bg: "bg-orange-100", text: "text-orange-700" },
    Urgent: { bg: "bg-red-100", text: "text-red-700" },
};

type ViewMode = "table" | "kanban";

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(20);
    const [viewMode, setViewMode] = useState<ViewMode>("kanban");
    const [users, setUsers] = useState<UserData[]>([]);

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        status: "",
        priority: "",
        assigned_to: "",
        due_date_from: "",
        due_date_to: "",
        my_tasks: false,
        overdue: false,
        search: "",
    });

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formMode, setFormMode] = useState<"add" | "edit">("add");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogData, setConfirmDialogData] = useState<{ task: Task | null; loading: boolean }>({ task: null, loading: false });

    useEffect(() => {
        fetchTasks();
        fetchUsers();
    }, [currentPage, filters]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch("/api/users?limit=100", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    };

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");
            const offset = (currentPage - 1) * itemsPerPage;

            let url = `/api/tasks?limit=${itemsPerPage}&offset=${offset}`;
            if (filters.status) url += `&status=${encodeURIComponent(filters.status)}`;
            if (filters.priority) url += `&priority=${encodeURIComponent(filters.priority)}`;
            if (filters.assigned_to) url += `&assigned_to=${encodeURIComponent(filters.assigned_to)}`;
            if (filters.my_tasks) url += `&my_tasks=true`;
            if (filters.overdue) url += `&overdue=true`;
            if (filters.due_date_from) url += `&due_date_from=${encodeURIComponent(filters.due_date_from)}`;
            if (filters.due_date_to) url += `&due_date_to=${encodeURIComponent(filters.due_date_to)}`;
            if (filters.search) url += `&q=${encodeURIComponent(filters.search)}`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to fetch tasks");

            const data: ApiResponse = await response.json();
            setTasks(data.data);
            setTotalItems(data.count);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [currentPage, filters]);

    const handleViewDetails = async (task: Task) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tasks/${task.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSelectedTask(data.data);
                setShowDetailsModal(true);
            }
        } catch (err) {
            console.error("Failed to fetch task details:", err);
        }
    };

    const handleEdit = async (task: Task) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tasks/${task.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSelectedTask(data.data);
                setFormMode("edit");
                setShowFormModal(true);
            }
        } catch (err) {
            console.error("Failed to fetch task details:", err);
        }
    };

    const handleAdd = () => {
        setSelectedTask(null);
        setFormMode("add");
        setShowFormModal(true);
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setSelectedTask(null);
        fetchTasks();
    };

    const handleDelete = (task: Task) => {
        setConfirmDialogData({ task, loading: false });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (!confirmDialogData.task) return;

        const taskId = confirmDialogData.task.id;
        setConfirmDialogData((prev) => ({ ...prev, loading: true }));

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to delete task");

            setShowConfirmDialog(false);
            setConfirmDialogData({ task: null, loading: false });
            fetchTasks();
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
            setConfirmDialogData((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleStatusChange = async (task: Task, newStatus: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) throw new Error("Failed to update task status");
            fetchTasks();

            if (showDetailsModal && selectedTask?.id === task.id) {
                const detailsRes = await fetch(`/api/tasks/${task.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (detailsRes.ok) {
                    const data = await detailsRes.json();
                    setSelectedTask(data.data);
                }
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "An error occurred");
        }
    };

    const clearFilters = () => {
        setFilters({
            status: "",
            priority: "",
            assigned_to: "",
            due_date_from: "",
            due_date_to: "",
            my_tasks: false,
            overdue: false,
            search: "",
        });
        setCurrentPage(1);
    };

    const isOverdue = (task: Task) => {
        if (!task.due_date || task.status === "Completed" || task.status === "Cancelled") return false;
        return new Date(task.due_date) < new Date();
    };

    const formatDate = (date: string | null) => {
        if (!date) return "No due date";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const todoCount = tasks.filter((t) => t.status === "Pending").length;
    const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
    const completedCount = tasks.filter((t) => t.status === "Completed").length;
    const overdueCount = tasks.filter((t) => isOverdue(t)).length;

    const hasActiveFilters = filters.status || filters.priority || filters.assigned_to || filters.due_date_from || filters.due_date_to || filters.my_tasks || filters.overdue || filters.search;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track your team's tasks</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={fetchTasks} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Task
                    </button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
                        <div><p className="text-xs text-gray-500">Pending</p><p className="text-xl font-bold text-yellow-600">{todoCount}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg"><Circle className="w-5 h-5 text-blue-600" /></div>
                        <div><p className="text-xs text-gray-500">In Progress</p><p className="text-xl font-bold text-blue-600">{inProgressCount}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                        <div><p className="text-xs text-gray-500">Completed</p><p className="text-xl font-bold text-green-600">{completedCount}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                        <div><p className="text-xs text-gray-500">Overdue</p><p className="text-xl font-bold text-red-600">{overdueCount}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg"><CheckSquare className="w-5 h-5 text-purple-600" /></div>
                        <div><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold text-purple-600">{totalItems}</p></div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={filters.search}
                            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2 text-sm font-medium border rounded-lg flex items-center gap-2 ${showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "text-gray-700 bg-white border-gray-200 hover:bg-gray-50"}`}
                        >
                            <Filter className="w-4 h-4" /> Filters
                            {hasActiveFilters && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                        </button>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1">
                                <FilterX className="w-4 h-4" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">All</option>
                                {TASK_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                            <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">All</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                            <select value={filters.assigned_to} onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">All</option>
                                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Due From</label>
                            <input type="date" value={filters.due_date_from} onChange={(e) => setFilters({ ...filters, due_date_from: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Due To</label>
                            <input type="date" value={filters.due_date_to} onChange={(e) => setFilters({ ...filters, due_date_to: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input type="checkbox" checked={filters.my_tasks} onChange={(e) => setFilters({ ...filters, my_tasks: e.target.checked })} className="rounded border-gray-300 text-blue-600" />
                                <span className="text-sm">My Tasks</span>
                            </label>
                            <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input type="checkbox" checked={filters.overdue} onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })} className="rounded border-gray-300 text-blue-600" />
                                <span className="text-sm text-red-600">Overdue</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Kanban View */}
            {viewMode === "kanban" ? (
                <TasksKanban
                    tasks={tasks}
                    loading={loading}
                    error={error}
                    onRefresh={fetchTasks}
                    onTaskClick={handleViewDetails}
                    onTaskEdit={handleEdit}
                    onTaskDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                />
            ) : (
                /* Table View */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                            <p className="mt-2 text-sm text-gray-500">Loading tasks...</p>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                                            <p className="mt-2 text-sm text-red-600">{error}</p>
                                            <button onClick={fetchTasks} className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Try Again</button>
                                        </td>
                                    </tr>
                                ) : tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto" />
                                            <p className="mt-2 text-sm text-gray-500">No tasks found</p>
                                            <button onClick={handleAdd} className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Your First Task</button>
                                        </td>
                                    </tr>
                                ) : (
                                    tasks.map((task) => {
                                        const overdue = isOverdue(task);
                                        return (
                                            <tr key={task.id} className={`hover:bg-gray-50 cursor-pointer ${overdue ? "bg-red-50/30" : ""}`} onClick={() => handleViewDetails(task)}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task, task.status === "Completed" ? "Pending" : "Completed"); }}
                                                            className={`p-1 rounded ${task.status === "Completed" ? "text-green-600" : "text-gray-400 hover:text-green-600"}`}
                                                        >
                                                            {task.status === "Completed" ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                        </button>
                                                        <div>
                                                            <p className={`text-sm font-medium ${task.status === "Completed" ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</p>
                                                            {task.description && <p className="text-xs text-gray-500 truncate max-w-[300px]">{task.description}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_COLORS[task.priority]?.bg} ${PRIORITY_COLORS[task.priority]?.text}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[task.status]?.bg} ${STATUS_COLORS[task.status]?.text}`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-gray-600"}`}>{formatDate(task.due_date)}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {task.assigned_user?.avatar ? (
                                                            <img src={task.assigned_user.avatar} alt="" className="w-6 h-6 rounded-full" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs">
                                                                {task.assigned_user?.full_name?.[0] || "?"}
                                                            </div>
                                                        )}
                                                        <span className="text-sm text-gray-600">{task.assigned_user?.full_name || "Unassigned"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                                                            className="p-1.5 hover:bg-amber-50 rounded-lg"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
                                                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && !error && tasks.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} tasks
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {showDetailsModal && selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    users={users}
                    onClose={() => { setShowDetailsModal(false); setSelectedTask(null); }}
                    onEdit={() => { setShowDetailsModal(false); handleEdit(selectedTask); }}
                    onDelete={() => { setShowDetailsModal(false); handleDelete(selectedTask); }}
                    onStatusChange={handleStatusChange}
                    onRefresh={() => { if (selectedTask) handleViewDetails(selectedTask); }}
                />
            )}

            {showFormModal && (
                <TaskFormModal
                    mode={formMode}
                    task={selectedTask}
                    users={users}
                    onClose={() => { setShowFormModal(false); setSelectedTask(null); }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {showConfirmDialog && confirmDialogData.task && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Delete Task"
                    message={`Are you sure you want to delete "${confirmDialogData.task.title}"? This action cannot be undone.`}
                    confirmText={confirmDialogData.loading ? "Deleting..." : "Delete"}
                    variant="danger"
                    loading={confirmDialogData.loading}
                    onConfirm={confirmDelete}
                    onCancel={() => { setShowConfirmDialog(false); setConfirmDialogData({ task: null, loading: false }); }}
                />
            )}
        </div>
    );
}
