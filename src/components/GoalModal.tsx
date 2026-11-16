import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Target,
  Calendar,
  Clock,
  ListTodo,
  Repeat,
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  Sparkles,
  CalendarDays,
  Layers,
  Trash2,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { Goal, GoalHorizon, GoalProgressMethod, GoalType, Priority, ScheduleBlock, Task } from '../types';
import { calculateScheduleDuration, formatDuration, getTodayDateString, parseDate, addDays, formatDateIso } from '../utils/dateUtils';

interface GoalModalProps {
  isOpen: boolean;
  goalToEdit?: Goal | null;
  onClose: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, goalToEdit, onClose }) => {
  const {
    categories,
    tasks,
    habits,
    scheduleBlocks,
    timeSessions,
    addGoal,
    updateGoal,
    addTask,
    addScheduleBlock,
  } = useLifeOS();

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
  const [linkedScheduleBlockIds, setLinkedScheduleBlockIds] = useState<string[]>([]);
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('high');
  const [notes, setNotes] = useState('');

  // Unified Activities Linking Filters
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('all');
  const [activitySourceFilter, setActivitySourceFilter] = useState<'all' | 'planner' | 'tasks'>('all');
  const [activityDateFilter, setActivityDateFilter] = useState<'all' | 'today' | 'this_week' | 'past_30' | 'future'>('all');
  const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Inline Creation State
  const [inlineCreateType, setInlineCreateType] = useState<'task' | 'planner' | null>(null);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityCategory, setNewActivityCategory] = useState(categories[0]?.name || 'Work');
  const [newActivityPriority, setNewActivityPriority] = useState<Priority>('high');
  const [newActivityDuration, setNewActivityDuration] = useState(60);
  const [newActivityDate, setNewActivityDate] = useState(getTodayDateString());
  const [newActivityStartTime, setNewActivityStartTime] = useState('09:00');
  const [newActivityEndTime, setNewActivityEndTime] = useState('10:00');
  const [newActivityCountAsWork, setNewActivityCountAsWork] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Form Validation
  const [error, setError] = useState<string | null>(null);

  // Populate state
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
      setLinkedScheduleBlockIds(Array.isArray(goalToEdit.linkedScheduleBlockIds) ? [...goalToEdit.linkedScheduleBlockIds] : []);
      setLinkedHabitIds(Array.isArray(goalToEdit.linkedHabitIds) ? [...goalToEdit.linkedHabitIds] : []);
      setPriority(goalToEdit.priority || 'high');
      setNotes(goalToEdit.notes || '');
      setError(null);
    } else {
      setTitle('');
      setDescription('');
      setCategory(categories[0]?.name || 'Work');
      setHorizon('weekly');
      setStartDate(getTodayDateString());
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setTargetDate(d.toISOString().slice(0, 10));
      setTargetValue(10);
      setUnit('hours');
      setGoalType('duration');
      setProgressMethod('automatic_time');
      setLinkedTaskIds([]);
      setLinkedScheduleBlockIds([]);
      setLinkedHabitIds([]);
      setPriority('high');
      setNotes('');
      setError(null);
    }
    setActivitySearchQuery('');
    setActivityCategoryFilter('all');
    setActivitySourceFilter('all');
    setActivityDateFilter('all');
    setActivityStatusFilter('all');
    setShowSelectedOnly(false);
    setInlineCreateType(null);
    setInlineError(null);
  }, [goalToEdit, isOpen, categories]);

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

  const toggleLinkedScheduleBlock = (blockId: string) => {
    setLinkedScheduleBlockIds((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId]
    );
  };

  const toggleLinkedHabit = (habitId: string) => {
    setLinkedHabitIds((prev) =>
      prev.includes(habitId) ? prev.filter((id) => id !== habitId) : [...prev, habitId]
    );
  };

  // Inline Creation of Task or Daily Planner Activity
  const handleInlineCreate = async () => {
    const cleanTitle = newActivityTitle.trim();
    if (!cleanTitle) {
      setInlineError('Title is required.');
      return;
    }
    setInlineError(null);

    try {
      if (inlineCreateType === 'task') {
        const newId = await addTask({
          title: cleanTitle,
          category: newActivityCategory || category,
          priority: newActivityPriority,
          estimatedDuration: Number(newActivityDuration) || 30,
          actualDuration: 0,
          status: 'not_started',
          dueDate: newActivityDate || targetDate,
          tags: [],
        });
        setLinkedTaskIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
      } else if (inlineCreateType === 'planner') {
        const plannedDuration = calculateScheduleDuration(newActivityStartTime, newActivityEndTime);
        const newId = await addScheduleBlock({
          title: cleanTitle,
          category: newActivityCategory || category,
          priority: newActivityPriority,
          date: newActivityDate || startDate || getTodayDateString(),
          startTime: newActivityStartTime,
          endTime: newActivityEndTime,
          plannedDuration: plannedDuration || Number(newActivityDuration) || 60,
          actualDuration: 0,
          status: 'scheduled',
          includeInWorkingTime: newActivityCountAsWork,
        });
        setLinkedScheduleBlockIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
      }

      setNewActivityTitle('');
      setInlineCreateType(null);
    } catch {
      setInlineError('Failed to create and link activity.');
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
      linkedScheduleBlockIds,
      status: goalToEdit ? goalToEdit.status : 'active',
      notes: notes.trim() || undefined,
    };

    if (isEdit && goalToEdit) {
      await updateGoal(goalToEdit.id, goalData);
    } else {
      await addGoal(goalData);
    }

    onClose();
  };

  // Build unified eligible activities list from both Daily Planner (scheduleBlocks) and Tasks
  const unifiedActivities = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      sourceType: 'planner' | 'task';
      category: string;
      date?: string;
      timeRange?: string;
      isCompleted: boolean;
      actualDurationMinutes: number;
      plannedDurationMinutes: number;
      includeInWorkingTime: boolean;
      isLinked: boolean;
    }> = [];

    // Daily Planner schedule blocks
    scheduleBlocks.forEach((b) => {
      if (b.status === 'cancelled') return;

      const matchingSessions = timeSessions.filter(
        (s) => s.linkedScheduleBlockId === b.id || (b.linkedTaskId && s.linkedTaskId === b.linkedTaskId)
      );
      const timerMins = matchingSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const planned = b.plannedDuration || calculateScheduleDuration(b.startTime, b.endTime, b.endsNextDay);
      const actualWorked = timerMins > 0 ? timerMins : (b.actualDuration || 0);
      const eligibleActual = b.status === 'completed'
        ? (actualWorked > 0 ? actualWorked : planned)
        : actualWorked;

      list.push({
        id: b.id,
        title: b.title,
        sourceType: 'planner',
        category: b.category,
        date: b.date,
        timeRange: `${b.startTime} – ${b.endTime}`,
        isCompleted: b.status === 'completed',
        actualDurationMinutes: eligibleActual,
        plannedDurationMinutes: planned,
        includeInWorkingTime: b.includeInWorkingTime !== false,
        isLinked: linkedScheduleBlockIds.includes(b.id),
      });
    });

    // Existing tasks
    tasks.forEach((t) => {
      if (t.status === 'cancelled') return;

      const sessionMins = timeSessions
        .filter((s) => s.linkedTaskId === t.id)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const actualWorked = sessionMins > 0 ? sessionMins : (t.actualDuration || 0);
      const eligibleActual = t.status === 'completed'
        ? (actualWorked > 0 ? actualWorked : (t.estimatedDuration || 0))
        : actualWorked;

      list.push({
        id: t.id,
        title: t.title,
        sourceType: 'task',
        category: t.category,
        date: t.dueDate,
        timeRange: undefined,
        isCompleted: t.status === 'completed',
        actualDurationMinutes: eligibleActual,
        plannedDurationMinutes: t.estimatedDuration || 0,
        includeInWorkingTime: true,
        isLinked: linkedTaskIds.includes(t.id),
      });
    });

    return list;
  }, [scheduleBlocks, tasks, timeSessions, linkedScheduleBlockIds, linkedTaskIds]);

  // Filter unified activities
  const filteredActivities = useMemo(() => {
    const todayStr = getTodayDateString();
    const todayD = parseDate(todayStr);

    return unifiedActivities.filter((item) => {
      if (showSelectedOnly && !item.isLinked) return false;

      // Source Filter
      if (activitySourceFilter !== 'all' && item.sourceType !== activitySourceFilter) {
        return false;
      }

      // Category Filter
      if (activityCategoryFilter !== 'all' && item.category !== activityCategoryFilter) {
        return false;
      }

      // Status Filter
      if (activityStatusFilter === 'completed' && !item.isCompleted) return false;
      if (activityStatusFilter === 'incomplete' && item.isCompleted) return false;

      // Date Filter
      if (activityDateFilter !== 'all' && item.date) {
        const itemD = parseDate(item.date);
        if (activityDateFilter === 'today' && item.date !== todayStr) return false;
        if (activityDateFilter === 'this_week') {
          const past7 = formatDateIso(addDays(todayD, -7));
          const next7 = formatDateIso(addDays(todayD, 7));
          if (item.date < past7 || item.date > next7) return false;
        }
        if (activityDateFilter === 'past_30') {
          const past30 = formatDateIso(addDays(todayD, -30));
          if (item.date < past30 || item.date > todayStr) return false;
        }
        if (activityDateFilter === 'future' && item.date <= todayStr) return false;
      }

      // Title & Category Search Query
      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        if (!matchTitle && !matchCategory) return false;
      }

      return true;
    });
  }, [
    unifiedActivities,
    showSelectedOnly,
    activitySourceFilter,
    activityCategoryFilter,
    activityStatusFilter,
    activityDateFilter,
    activitySearchQuery,
  ]);

  // Combined actual time calculation for linked items
  const { totalEligibleActualMinutes, liveProgressDisplay } = useMemo(() => {
    let minutes = 0;
    const seenTaskIds = new Set<string>();

    // 1. Process linked schedule blocks
    scheduleBlocks.forEach((b) => {
      if (!linkedScheduleBlockIds.includes(b.id)) return;
      if (b.includeInWorkingTime === false) return; // Excluded from working time!

      const matchingSessions = timeSessions.filter(
        (s) => s.linkedScheduleBlockId === b.id || (b.linkedTaskId && s.linkedTaskId === b.linkedTaskId)
      );
      const timerMins = matchingSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const planned = b.plannedDuration || calculateScheduleDuration(b.startTime, b.endTime, b.endsNextDay);
      const actualWorked = timerMins > 0 ? timerMins : (b.actualDuration || 0);

      const credited = b.status === 'completed'
        ? (actualWorked > 0 ? actualWorked : planned)
        : actualWorked;

      minutes += credited;
      if (b.linkedTaskId) seenTaskIds.add(b.linkedTaskId);
    });

    // 2. Process linked tasks (avoiding double counting if block already covered it)
    tasks.forEach((t) => {
      if (!linkedTaskIds.includes(t.id)) return;
      if (seenTaskIds.has(t.id)) return;

      const sessionMins = timeSessions
        .filter((s) => s.linkedTaskId === t.id)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const actualWorked = sessionMins > 0 ? sessionMins : (t.actualDuration || 0);
      const credited = t.status === 'completed'
        ? (actualWorked > 0 ? actualWorked : (t.estimatedDuration || 0))
        : actualWorked;

      minutes += credited;
    });

    const numTargetVal = Number(targetValue) || 1;
    const isHoursUnit =
      (unit || '').toLowerCase().includes('hour') ||
      (unit || '').toLowerCase() === 'h' ||
      (unit || '').toLowerCase() === 'hrs';

    let display = '';
    if (progressMethod === 'automatic_time') {
      const currentVal = isHoursUnit
        ? Math.round((minutes / 60) * 100) / 100
        : minutes;
      const pct = Math.min(100, Math.max(0, Math.round((currentVal / numTargetVal) * 10000) / 100));
      display = `${currentVal} / ${numTargetVal} ${unit} (${pct}%)`;
    } else if (progressMethod === 'automatic_tasks') {
      const selectedTasks = tasks.filter((t) => linkedTaskIds.includes(t.id));
      const completedCount = selectedTasks.filter((t) => t.status === 'completed').length;
      const pct = Math.min(100, Math.max(0, Math.round((completedCount / numTargetVal) * 10000) / 100));
      display = `${completedCount} / ${numTargetVal} tasks (${pct}%)`;
    } else {
      display = `${linkedTaskIds.length + linkedScheduleBlockIds.length} linked`;
    }

    return { totalEligibleActualMinutes: minutes, liveProgressDisplay: display };
  }, [scheduleBlocks, tasks, timeSessions, linkedScheduleBlockIds, linkedTaskIds, targetValue, unit, progressMethod]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
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
                Configure horizon, measurement method, and explicit Daily Planner & Task linkages.
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
              Goal Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Core DSA & Problem Solving, Complete JavaScript Series"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
            />
          </div>

          {/* 2. Category & Horizon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Horizon
              </label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              >
                <option value="weekly">Weekly (Short-term)</option>
                <option value="monthly">Monthly (Sprint)</option>
                <option value="six_month">6-Month (Mid-term)</option>
                <option value="yearly">Yearly (Long-term)</option>
                <option value="custom">Custom Horizon</option>
              </select>
            </div>
          </div>

          {/* 3. Dates & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span>Target Deadline</span>
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* 4. Measurement & Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Progress Method
              </label>
              <select
                value={progressMethod}
                onChange={(e) => handleProgressMethodChange(e.target.value as GoalProgressMethod)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              >
                <option value="automatic_time">Automatic (from Linked Time & Activities)</option>
                <option value="automatic_tasks">Automatic (from Linked Tasks)</option>
                <option value="automatic_habits">Automatic (from Habit Occurrences)</option>
                <option value="milestones">Milestones (Checklist percentage)</option>
                <option value="manual">Manual Metric Input</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Target Value
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500 font-mono"
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
                placeholder="hours, tasks, %"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 5. UNIFIED LINKING INTERFACE: Daily Planner Activities & Tasks */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            {/* Header with Title & Inline Add Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>
                    Linked Daily Planner Activities & Tasks ({linkedScheduleBlockIds.length + linkedTaskIds.length} linked)
                  </span>
                </label>
                <span className="text-[11px] text-neutral-400">
                  Select real activities from your Daily Planner and Tasks. Eligible actual productive time fuels this goal.
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setInlineCreateType(inlineCreateType === 'planner' ? null : 'planner');
                    setInlineError(null);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    inlineCreateType === 'planner'
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-sky-600/15 text-sky-300 border-sky-500/30 hover:bg-sky-600/25'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Planner Block</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInlineCreateType(inlineCreateType === 'task' ? null : 'task');
                    setInlineError(null);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    inlineCreateType === 'task'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/25'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Inline Quick-Create Drawer (Option B) */}
            {inlineCreateType && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-indigo-500/30 shadow-lg space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {inlineCreateType === 'planner' ? 'Create & Link Daily Planner Block' : 'Create & Link Task'}
                    </span>
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Saves to database & links to this goal immediately
                  </span>
                </div>

                {inlineError && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{inlineError}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                    placeholder={
                      inlineCreateType === 'planner'
                        ? 'Activity title (e.g. JAVASCRIPT PROJECT 1)...'
                        : 'Task title (e.g. Review Dijkstra Algorithm)...'
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs placeholder:text-neutral-500 outline-none focus:border-indigo-500"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Category</label>
                      <select
                        value={newActivityCategory}
                        onChange={(e) => setNewActivityCategory(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={newActivityDate}
                        onChange={(e) => setNewActivityDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
                      />
                    </div>

                    {inlineCreateType === 'planner' ? (
                      <>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={newActivityStartTime}
                            onChange={(e) => setNewActivityStartTime(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">End Time</label>
                          <input
                            type="time"
                            value={newActivityEndTime}
                            onChange={(e) => setNewActivityEndTime(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Priority</label>
                          <select
                            value={newActivityPriority}
                            onChange={(e) => setNewActivityPriority(e.target.value as Priority)}
                            className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none"
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
                            value={newActivityDuration}
                            onChange={(e) => setNewActivityDuration(Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs outline-none font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {inlineCreateType === 'planner' && (
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={newActivityCountAsWork}
                        onChange={(e) => setNewActivityCountAsWork(e.target.checked)}
                        className="rounded border-neutral-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Count toward Working Time (eligible to fuel duration goals)</span>
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-900">
                  <button
                    type="button"
                    onClick={() => {
                      setInlineCreateType(null);
                      setInlineError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleInlineCreate}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Create & Link Activity</span>
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Summary Status Bar */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Linked Items
                  </div>
                  <div className="font-semibold text-neutral-200">
                    {linkedScheduleBlockIds.length + linkedTaskIds.length} items (
                    {linkedScheduleBlockIds.length} Planner, {linkedTaskIds.length} Tasks)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-600/15 text-sky-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Eligible Actual Work
                  </div>
                  <div className="font-semibold text-sky-400 font-mono">
                    {formatDuration(totalEligibleActualMinutes)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Live Progress
                  </div>
                  <div className="font-semibold text-emerald-400 font-mono">
                    {liveProgressDisplay}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Toolbar: Source Tabs, Search, Category, Date, Status */}
            <div className="space-y-2">
              {/* Source Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActivitySourceFilter('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      activitySourceFilter === 'all'
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    All Activities ({unifiedActivities.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySourceFilter('planner')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      activitySourceFilter === 'planner'
                        ? 'bg-sky-600/30 text-sky-300 border border-sky-500/30'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Daily Planner ({scheduleBlocks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySourceFilter('tasks')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      activitySourceFilter === 'tasks'
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Tasks ({tasks.length})
                  </button>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSelectedOnly}
                    onChange={(e) => setShowSelectedOnly(e.target.checked)}
                    className="rounded border-neutral-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Selected Only ({linkedScheduleBlockIds.length + linkedTaskIds.length})</span>
                </label>
              </div>

              {/* Search and Dropdown Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder="Search activities by title..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 text-xs outline-none focus:border-indigo-500"
                  />
                  {activitySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setActivitySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={activityCategoryFilter}
                    onChange={(e) => setActivityCategoryFilter(e.target.value)}
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

                <div>
                  <select
                    value={activityStatusFilter}
                    onChange={(e) => setActivityStatusFilter(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="incomplete">Incomplete / Scheduled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scrollable Unified Activity List */}
            {filteredActivities.length === 0 ? (
              <div className="p-6 rounded-xl bg-neutral-950 border border-neutral-850 text-center space-y-1">
                <p className="text-xs text-neutral-400">
                  {unifiedActivities.length === 0
                    ? 'No Daily Planner activities or Tasks exist in WOLI OS.'
                    : 'No activities match the active filters or search.'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  Use the "+ Add Planner Block" or "+ Add Task" buttons above to create and link an activity immediately.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                {filteredActivities.map((item) => {
                  const isChecked = item.isLinked;
                  const isPlanner = item.sourceType === 'planner';

                  return (
                    <label
                      key={`${item.sourceType}-${item.id}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-indigo-600/15 border border-indigo-500/35 text-indigo-100 shadow-xs'
                          : 'hover:bg-neutral-900 border border-transparent text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isPlanner) {
                              toggleLinkedScheduleBlock(item.id);
                            } else {
                              toggleLinkedTask(item.id);
                            }
                          }}
                          className="rounded border-neutral-700 text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                        />

                        {/* Source type badge */}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                            isPlanner
                              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {isPlanner ? 'Planner' : 'Task'}
                        </span>

                        <span className="font-medium truncate">{item.title}</span>

                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0">
                          {item.category}
                        </span>

                        {/* Working Time Badge */}
                        {isPlanner && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                              item.includeInWorkingTime
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                            }`}
                            title={
                              item.includeInWorkingTime
                                ? 'Counts toward Working Time (fuels goal)'
                                : 'Excluded from Working Time (does NOT count towards duration goals)'
                            }
                          >
                            {item.includeInWorkingTime ? '☑ Work Time' : '☐ Excluded'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-[11px] text-neutral-400 font-mono">
                        {item.date && <span>{item.date}</span>}
                        {item.timeRange && <span className="hidden sm:inline text-neutral-500">({item.timeRange})</span>}
                        
                        <span className={item.actualDurationMinutes > 0 ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                          {item.actualDurationMinutes}m actual
                        </span>

                        {item.isCompleted ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 font-sans">Pending</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Explicit Linked Habits */}
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
              <div className="max-h-28 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
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

          {/* 7. Optional Notes */}
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
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-800">
            <span className="text-[11px] text-neutral-500 font-mono">
              {linkedScheduleBlockIds.length + linkedTaskIds.length} activities explicitly linked
            </span>

            <div className="flex items-center gap-2">
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
                <span>{isEdit ? 'Save Goal Configuration' : 'Create Goal'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
