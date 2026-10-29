import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Check,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  Trash2,
  Edit2,
  RotateCcw,
  ChevronDown,
  Layers,
  Sparkles,
  Target,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { Priority, Task, TaskStatus } from '../types';
import { formatDateIso, formatDuration, getTodayDateString } from '../utils/dateUtils';
import { ConfirmModal } from '../components/ConfirmModal';

export const TasksView: React.FC = () => {
  const {
    tasks,
    categories,
    goals,
    habits,
    addTask,
    updateTask,
    deleteTask,
    resetTask,
    toggleTaskStatus,
    setQuickAddOpen,
    setQuickAddType,
  } = useLifeOS();

  // Active filter tab
  const [activeTab, setActiveTab] = useState<
    'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'by_priority' | 'by_category'
  >('all');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created'>('dueDate');

  // Edit / Delete states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  // Filtering logic
  const filteredTasks = tasks.filter((t) => {
    // Search match
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

    // Priority filter
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;

    // Tab filter
    switch (activeTab) {
      case 'today':
        return t.dueDate === todayStr;
      case 'upcoming':
        return t.dueDate && t.dueDate > todayStr && t.status !== 'completed' && t.status !== 'cancelled';
      case 'overdue':
        return t.dueDate && t.dueDate < todayStr && t.status !== 'completed' && t.status !== 'cancelled';
      case 'completed':
        return t.status === 'completed';
      case 'all':
      default:
        return true;
    }
  });

  // Sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const pWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
    }
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  const overdueCount = tasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== 'completed' && t.status !== 'cancelled'
  ).length;

  const handleDelete = async () => {
    if (deleteTaskId) {
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Task Execution Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Tasks & Actions</h1>
          <p className="text-xs text-neutral-400">
            Full-featured personal to-do list with priorities, estimates, tags, and goal linkage.
          </p>
        </div>

        <button
          onClick={() => {
            setQuickAddType('task');
            setQuickAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-950 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 border-b border-neutral-800 overflow-x-auto pb-2 text-xs font-semibold">
        {[
          { id: 'all', label: 'All Tasks', count: tasks.length },
          { id: 'today', label: 'Today', count: tasks.filter((t) => t.dueDate === todayStr).length },
          {
            id: 'upcoming',
            label: 'Upcoming',
            count: tasks.filter((t) => t.dueDate && t.dueDate > todayStr && t.status !== 'completed').length,
          },
          {
            id: 'overdue',
            label: 'Overdue',
            count: overdueCount,
            badgeColor: overdueCount > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : undefined,
          },
          { id: 'completed', label: 'Completed', count: tasks.filter((t) => t.status === 'completed').length },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                active
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  tab.badgeColor || (active ? 'bg-indigo-500/20 text-indigo-300' : 'bg-neutral-900 text-neutral-400')
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800">
        <div className="flex items-center gap-2 flex-1 relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3" />
          <input
            type="text"
            placeholder="Search tasks by title, description or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="created">Sort by Newest</option>
          </select>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-neutral-850 space-y-2">
            <CheckSquare className="w-10 h-10 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">No tasks found</p>
            <p className="text-xs text-neutral-500">
              {search || selectedCategory !== 'all' || selectedPriority !== 'all'
                ? 'Try adjusting your search filters.'
                : 'Create your first task to get started.'}
            </p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue =
              task.dueDate && task.dueDate < todayStr && !isCompleted && task.status !== 'cancelled';

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-neutral-950/40 border-neutral-850 opacity-70'
                    : isOverdue
                    ? 'bg-rose-950/15 border-rose-500/30 shadow-xs'
                    : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Left check + details */}
                <div className="flex items-start gap-3.5 flex-1">
                  <button
                    onClick={() => toggleTaskStatus(task.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 border transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-neutral-700 hover:border-neutral-500 text-transparent'
                    }`}
                    aria-label={`Mark task ${task.title}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isCompleted ? 'line-through text-neutral-500' : 'text-neutral-100'
                        }`}
                      >
                        {task.title}
                      </span>

                      {/* Priority pill */}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          task.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : task.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-400'
                            : task.priority === 'medium'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Category */}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                        {task.category}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-neutral-400 leading-relaxed">{task.description}</p>
                    )}

                    {/* Metadata tags, dates, goal link */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 pt-1">
                      {task.dueDate && (
                        <div
                          className={`flex items-center gap-1 font-mono text-[11px] ${
                            isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Due: {task.dueDate}</span>
                          {isOverdue && <span className="text-[10px] uppercase font-bold">(Overdue)</span>}
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        <span>{task.estimatedDuration}m est</span>
                        {task.actualDuration > 0 && (
                          <span className="text-sky-400 font-medium">
                            • {formatDuration(task.actualDuration)} spent
                          </span>
                        )}
                      </div>

                      {task.linkedGoalId && (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-400 font-medium">
                          <Target className="w-3 h-3" />
                          <span>Linked Goal</span>
                        </div>
                      )}

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-950 text-neutral-400 border border-neutral-850"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => resetTask(task.id)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-indigo-400 border border-neutral-700 transition-colors"
                    title="Reset task status & progress"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700"
                    title="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTaskId(task.id)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-neutral-700"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-100">Edit Task</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as Priority })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={editingTask.category}
                    onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Estimated Duration (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={editingTask.estimatedDuration}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, estimatedDuration: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Actual Duration (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingTask.actualDuration}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, actualDuration: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = editingTask.id;
                    setEditingTask(null);
                    setDeleteTaskId(id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await resetTask(editingTask.id);
                    setEditingTask(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Status</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (editingTask) {
                      await updateTask(editingTask.id, editingTask);
                      setEditingTask(null);
                    }
                  }}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTaskId}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task? Linked schedule blocks and time logs will preserve their integrity."
        confirmLabel="Delete Task"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTaskId(null)}
      />
    </div>
  );
};
