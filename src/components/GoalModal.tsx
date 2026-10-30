import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Calendar,
  Clock,
  ListTodo,
  Repeat,
  Tag,
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { Goal, GoalHorizon, GoalProgressMethod, GoalType, Priority } from '../types';
import { formatDuration, getTodayDateString } from '../utils/dateUtils';

interface GoalModalProps {
  isOpen: boolean;
  goalToEdit?: Goal | null;
  onClose: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, goalToEdit, onClose }) => {
  const { categories, tasks, habits, addGoal, updateGoal, addTask } = useLifeOS();

  const isEdit = Boolean(goalToEdit);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Work');
  const [horizon, setHorizon] = useState<GoalHorizon>('weekly');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [targetDate, setTargetDate] = useState(getTodayDateString());
  const [targetValue, setTargetValue] = useState<number | string>(10);
  const [unit, setUnit] = useState('hours');
  const [goalType, setGoalType] = useState<GoalType>('duration');
  const [progressMethod, setProgressMethod] = useState<GoalProgressMethod>('automatic_time');
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('high');
  const [notes, setNotes] = useState('');

  // Task Search, Category Filtering, and Inline Creation
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState(categories[0]?.name || 'Work');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('high');
  const [newTaskEstimate, setNewTaskEstimate] = useState(30);
  const [newTaskError, setNewTaskError] = useState<string | null>(null);

  // Validation errors
  const [error, setError] = useState<string | null>(null);

  // Populate state when opening or changing goalToEdit
  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setDescription(goalToEdit.description || '');
      setCategory(goalToEdit.category || categories[0]?.name || 'Work');
      setHorizon(goalToEdit.horizon || 'weekly');
      setStartDate(goalToEdit.startDate || getTodayDateString());
      setTargetDate(goalToEdit.targetDate || getTodayDateString());
      setTargetValue(goalToEdit.targetValue || 10);
      setUnit(goalToEdit.unit || 'hours');
      setGoalType(goalToEdit.goalType || 'duration');
      setProgressMethod(goalToEdit.progressMethod || 'automatic_time');
      setLinkedTaskIds(Array.isArray(goalToEdit.linkedTaskIds) ? [...goalToEdit.linkedTaskIds] : []);
      setLinkedHabitIds(Array.isArray(goalToEdit.linkedHabitIds) ? [...goalToEdit.linkedHabitIds] : []);
      setPriority(goalToEdit.priority || 'high');
      setNotes(goalToEdit.notes || '');
      setError(null);
    } else {
      // Defaults for new goal
      setTitle('');
      setDescription('');
      setCategory(categories[0]?.name || 'Work');
      setHorizon('weekly');
      setStartDate(getTodayDateString());
      // Default deadline: end of current week (7 days)
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setTargetDate(d.toISOString().slice(0, 10));
      setTargetValue(10);
      setUnit('hours');
      setGoalType('duration');
      setProgressMethod('automatic_time');
      setLinkedTaskIds([]);
      setLinkedHabitIds([]);
      setPriority('high');
      setNotes('');
      setError(null);
    }
    setTaskSearchQuery('');
    setTaskCategoryFilter('all');
    setIsCreatingTask(false);
    setNewTaskError(null);
  }, [goalToEdit, isOpen, categories]);

  // Adjust default unit and goalType when progressMethod changes
  const handleProgressMethodChange = (newMethod: GoalProgressMethod) => {
    setProgressMethod(newMethod);
    if (newMethod === 'automatic_time') {
      setGoalType('duration');
      if (unit === 'tasks' || unit === 'occurrences' || unit === '%') {
        setUnit('hours');
      }
    } else if (newMethod === 'automatic_tasks') {
      setGoalType('completion');
      setUnit('tasks');
    } else if (newMethod === 'automatic_habits') {
      setGoalType('consistency');
      setUnit('sessions');
    } else if (newMethod === 'milestones') {
      setGoalType('milestone');
      setUnit('%');
      setTargetValue(100);
    }
  };

  const toggleLinkedTask = (taskId: string) => {
    setLinkedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleLinkedHabit = (habitId: string) => {
    setLinkedHabitIds((prev) =>
      prev.includes(habitId) ? prev.filter((id) => id !== habitId) : [...prev, habitId]
    );
  };

  const handleCreateAndLinkTask = async () => {
    const clean = newTaskTitle.trim();
    if (!clean) {
      setNewTaskError('Task title is required.');
      return;
    }
    setNewTaskError(null);
    try {
      const newId = await addTask({
        title: clean,
        category: newTaskCategory || category,
        priority: newTaskPriority,
        estimatedDuration: Number(newTaskEstimate) || 30,
        actualDuration: 0,
        status: 'not_started',
        tags: [],
      });
      // Automatically link the newly created task to this goal
      setLinkedTaskIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
      setNewTaskTitle('');
      setNewTaskEstimate(30);
      setIsCreatingTask(false);
    } catch (err) {
      setNewTaskError('Failed to create task in database.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Please enter a goal title.');
      return;
    }

    const numTarget = Number(targetValue);
    if (isNaN(numTarget) || numTarget <= 0) {
      setError('Target value must be a positive number greater than 0.');
      return;
    }

    if (startDate && targetDate && startDate > targetDate) {
      setError('Start date cannot be after target deadline.');
      return;
    }

    if (!unit.trim()) {
      setError('Please provide a unit of measurement (e.g. hours, tasks, %).');
      return;
    }

    setError(null);

    const goalData = {
      title: cleanTitle,
      description: description.trim() || undefined,
      category,
      horizon,
      startDate,
      targetDate,
      priority,
      goalType,
      targetValue: numTarget,
      currentValue: goalToEdit ? goalToEdit.currentValue : 0,
      unit: unit.trim(),
      progressMethod,
      parentGoalId: goalToEdit?.parentGoalId,
      linkedCategories: [category],
      linkedHabitIds,
      linkedTaskIds,
      status: goalToEdit ? goalToEdit.status : 'in_progress',
      notes: notes.trim() || undefined,
    };

    if (isEdit && goalToEdit) {
      await updateGoal(goalToEdit.id, goalData);
    } else {
      await addGoal(goalData);
    }

    onClose();
  };

  // Live progress summary calculations for linked tasks
  const selectedTasks = tasks.filter((t) => linkedTaskIds.includes(t.id));
  const totalLinkedActualMinutes = selectedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
  const numTargetVal = Number(targetValue) || 1;
  const isHoursUnit =
    (unit || '').toLowerCase().includes('hour') ||
    (unit || '').toLowerCase() === 'h' ||
    (unit || '').toLowerCase() === 'hrs';

  let liveProgressDisplay = '';
  if (progressMethod === 'automatic_time') {
    const currentVal = isHoursUnit
      ? Math.round((totalLinkedActualMinutes / 60) * 100) / 100
      : totalLinkedActualMinutes;
    const pct = Math.min(100, Math.max(0, Math.round((currentVal / numTargetVal) * 10000) / 100));
    liveProgressDisplay = `${currentVal} / ${numTargetVal} ${unit} (${pct}%)`;
  } else if (progressMethod === 'automatic_tasks') {
    const completedCount = selectedTasks.filter((t) => t.status === 'completed').length;
    const pct = Math.min(100, Math.max(0, Math.round((completedCount / numTargetVal) * 10000) / 100));
    liveProgressDisplay = `${completedCount} / ${numTargetVal} tasks (${pct}%)`;
  } else {
    liveProgressDisplay = `${selectedTasks.length} linked`;
  }

  // Filter tasks dynamically (exclude cancelled, filter by title search and category)
  const eligibleTasks = tasks.filter((t) => {
    if (t.status === 'cancelled') return false;
    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase().trim();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCategory = t.category.toLowerCase().includes(q);
      if (!matchTitle && !matchCategory) return false;
    }
    if (taskCategoryFilter !== 'all' && t.category !== taskCategoryFilter) {
      return false;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">
                {isEdit ? 'Edit Goal Configuration' : 'Create New Goal'}
              </h2>
              <p className="text-xs text-neutral-400">
                Configure horizon, measurement method, and explicit task/habit linkages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Goal Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. COMPLETE JAVASCRIPT SERIES'S or Master Next.js Architecture"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-neutral-100 text-xs placeholder:text-neutral-500 outline-none"
            />
          </div>

          {/* 2. Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clarify outcome, success criteria, and scope..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-neutral-100 text-xs placeholder:text-neutral-500 outline-none"
            />
          </div>

          {/* 3, 4, 13: Category, Horizon, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Horizon</label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="six_month">Six-Month</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom Horizon</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* 5, 6: Start Date & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Deadline / Target Date</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              />
            </div>
          </div>

          {/* 9, 10: Progress Method & Goal Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Progress Tracking Method
              </label>
              <select
                value={progressMethod}
                onChange={(e) => handleProgressMethodChange(e.target.value as GoalProgressMethod)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              >
                <option value="automatic_time">Automatic Time Tracking (hours / mins)</option>
                <option value="automatic_tasks">Automatic Tasks Completed (task count)</option>
                <option value="automatic_habits">Automatic Habit Consistency (sessions)</option>
                <option value="milestones">Milestone Checklist (% progress)</option>
                <option value="manual">Manual Metric Input</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Goal Type</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              >
                <option value="duration">Duration (e.g. 15 hours)</option>
                <option value="completion">Completion / Count (e.g. 10 problems)</option>
                <option value="consistency">Consistency (e.g. daily practice)</option>
                <option value="percentage">Percentage (e.g. 100%)</option>
                <option value="milestone">Milestone Based</option>
                <option value="numeric">Numeric Quantity</option>
              </select>
            </div>
          </div>

          {/* 7, 8: Target Value & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Target Value <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="15"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Unit of Measurement
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="hours, tasks, problems, %"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
              />
            </div>
          </div>

          {/* 11. Explicit Linked Tasks (Upgraded Section with Search, Category Filter, Inline Creation & Live Progress) */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            {/* Header with Title & Inline Add Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Explicitly Linked Tasks ({linkedTaskIds.length} linked)</span>
                </label>
                <span className="text-[11px] text-neutral-400">
                  Tracked actual time and completion from linked tasks automatically fuel this goal
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCreatingTask(!isCreatingTask);
                  setNewTaskError(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingTask ? 'Close Task Form' : 'Add New Task'}</span>
              </button>
            </div>

            {/* Inline "Add New Task" Drawer / Form (Option B) */}
            {isCreatingTask && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-indigo-500/30 shadow-lg space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Create & Auto-Link Task</span>
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Saves to Tasks module & links instantly
                  </span>
                </div>

                {newTaskError && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{newTaskError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title (e.g. JavaScript practice exercises)..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs placeholder:text-neutral-500 outline-none focus:border-indigo-500"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Category</label>
                      <select
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Est. Duration (min)</label>
                      <input
                        type="number"
                        min="5"
                        value={newTaskEstimate}
                        onChange={(e) => setNewTaskEstimate(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingTask(false);
                      setNewTaskError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAndLinkTask}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Create & Link Task</span>
                  </button>
                </div>
              </div>
            )}

            {/* Top Summary Status Bar */}
            <div className="p-3 rounded-2xl bg-neutral-950/90 border border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/15 text-indigo-400 flex items-center justify-center shrink-0">
                  <ListTodo className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Linked Tasks
                  </div>
                  <div className="font-semibold text-neutral-200">
                    {linkedTaskIds.length} {linkedTaskIds.length === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-600/15 text-sky-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Combined Actual Work
                  </div>
                  <div className="font-semibold text-sky-400 font-mono">
                    {formatDuration(totalLinkedActualMinutes)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Live Progress
                  </div>
                  <div className="font-semibold text-emerald-400">
                    {liveProgressDisplay}
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Category Filter Controls (Option A) */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder="Search existing tasks by title..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 text-xs outline-none focus:border-indigo-500"
                />
                {taskSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="w-full sm:w-44 shrink-0">
                <select
                  value={taskCategoryFilter}
                  onChange={(e) => setTaskCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs outline-none focus:border-indigo-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Tasks List with All Eligible Tasks */}
            {eligibleTasks.length === 0 ? (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 text-center space-y-1">
                <p className="text-xs text-neutral-400">
                  {tasks.length === 0
                    ? 'No tasks created yet in WOLI OS.'
                    : 'No tasks match the search or category filter.'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  Click "+ Add New Task" above to create and link a new task immediately.
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                {eligibleTasks.map((task) => {
                  const isChecked = linkedTaskIds.includes(task.id);
                  return (
                    <label
                      key={task.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-200'
                          : 'hover:bg-neutral-900 border border-transparent text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleLinkedTask(task.id)}
                          className="rounded border-neutral-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-medium truncate">{task.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0">
                          {task.category}
                        </span>
                        {task.priority === 'urgent' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold uppercase">
                            Urgent
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-[11px] text-neutral-400">
                        <span className="font-mono text-neutral-300">
                          {task.actualDuration || 0}m actual
                        </span>
                        {task.status === 'completed' && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 12. Explicit Linked Habits */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                <span>Explicitly Linked Habits ({linkedHabitIds.length} selected)</span>
              </label>
            </div>

            {habits.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 rounded-xl bg-neutral-950 border border-neutral-850">
                No habits configured yet.
              </p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                {habits.map((h) => {
                  const isChecked = linkedHabitIds.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-200'
                          : 'hover:bg-neutral-900 border border-transparent text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleLinkedHabit(h.id)}
                          className="rounded border-neutral-700 text-indigo-600 focus:ring-0"
                        />
                        <span className="font-medium">{h.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {h.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {h.frequency} • {h.targetQuantity} {h.unitOfMeasurement}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 14. Optional Notes */}
          <div className="pt-2 border-t border-neutral-800">
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Notes & Strategy (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Milestone checkpoints, study materials, or implementation notes..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEdit ? 'Save Goal' : 'Create Goal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
