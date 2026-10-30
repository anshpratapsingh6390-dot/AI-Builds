import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Repeat,
  Calendar as CalendarIcon,
  Target,
  Clock,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  GoalHorizon,
  GoalProgressMethod,
  GoalType,
  HabitFrequency,
  HabitTargetType,
  Priority,
} from '../types';
import { checkTimeOverlap, getTodayDateString, timeToMinutes } from '../utils/dateUtils';

export const QuickAddModal: React.FC = () => {
  const {
    quickAddOpen,
    setQuickAddOpen,
    quickAddType,
    setQuickAddType,
    categories,
    habits,
    goals,
    tasks,
    scheduleBlocks,
    addTask,
    addHabit,
    addScheduleBlock,
    addGoal,
    recordManualTime,
  } = useLifeOS();

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(getTodayDateString());
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskCategory, setTaskCategory] = useState(categories[0]?.name || 'Work');
  const [taskDuration, setTaskDuration] = useState(30);
  const [taskLinkedHabit, setTaskLinkedHabit] = useState('');
  const [taskLinkedGoal, setTaskLinkedGoal] = useState('');
  const [taskTags, setTaskTags] = useState('');

  // Habit form state
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitCategory, setHabitCategory] = useState(categories[0]?.name || 'Coding');
  const [habitFrequency, setHabitFrequency] = useState<HabitFrequency>('daily');
  const [habitTargetType, setHabitTargetType] = useState<HabitTargetType>('binary');
  const [habitTargetQty, setHabitTargetQty] = useState(1);
  const [habitUnit, setHabitUnit] = useState('times');
  const [habitPrefTime, setHabitPrefTime] = useState('08:00');
  const [habitLinkedGoal, setHabitLinkedGoal] = useState('');

  // Schedule form state
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDate, setSchedDate] = useState(getTodayDateString());
  const [schedStart, setSchedStart] = useState('09:00');
  const [schedEnd, setSchedEnd] = useState('10:00');
  const [schedCategory, setSchedCategory] = useState(categories[0]?.name || 'Work');
  const [schedPriority, setSchedPriority] = useState<Priority>('medium');
  const [schedLinkedTask, setSchedLinkedTask] = useState('');
  const [schedLinkedHabit, setSchedLinkedHabit] = useState('');
  const [schedLinkedGoal, setSchedLinkedGoal] = useState('');
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  // Goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState(categories[0]?.name || 'Study');
  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('monthly');
  const [goalStartDate, setGoalStartDate] = useState(getTodayDateString());
  const [goalTargetDate, setGoalTargetDate] = useState(getTodayDateString());
  const [goalPriority, setGoalPriority] = useState<Priority>('high');
  const [goalType, setGoalType] = useState<GoalType>('duration');
  const [goalTargetValue, setGoalTargetValue] = useState(60);
  const [goalUnit, setGoalUnit] = useState('hours');
  const [goalProgressMethod, setGoalProgressMethod] = useState<GoalProgressMethod>('automatic_time');

  // Time form state
  const [timeTitle, setTimeTitle] = useState('');
  const [timeCategory, setTimeCategory] = useState(categories[0]?.name || 'Study');
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [timeDate, setTimeDate] = useState(getTodayDateString());
  const [timeNotes, setTimeNotes] = useState('');
  const [timeLinkedTask, setTimeLinkedTask] = useState('');
  const [timeLinkedHabit, setTimeLinkedHabit] = useState('');
  const [timeLinkedGoal, setTimeLinkedGoal] = useState('');

  // Handle schedule time change with overlap check
  const handleScheduleTimeChange = (start: string, end: string, date: string) => {
    setSchedStart(start);
    setSchedEnd(end);
    setSchedDate(date);

    if (timeToMinutes(end) <= timeToMinutes(start)) {
      setOverlapWarning('End time must be after start time.');
      return;
    }

    // Check overlap with existing schedule blocks on that date
    const sameDayBlocks = scheduleBlocks.filter((b) => b.date === date && b.status !== 'cancelled');
    const conflict = sameDayBlocks.find((b) => checkTimeOverlap(start, end, b.startTime, b.endTime));
    if (conflict) {
      setOverlapWarning(`Conflicts with existing block: "${conflict.title}" (${conflict.startTime} - ${conflict.endTime})`);
    } else {
      setOverlapWarning(null);
    }
  };

  if (!quickAddOpen) return null;

  const handleClose = () => {
    setQuickAddOpen(false);
    setOverlapWarning(null);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const tagsArr = taskTags.split(',').map((t) => t.trim()).filter(Boolean);
    await addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      dueDate: taskDueDate || undefined,
      startDate: taskDueDate || undefined,
      priority: taskPriority,
      status: 'not_started',
      category: taskCategory,
      estimatedDuration: Number(taskDuration) || 30,
      actualDuration: 0,
      linkedHabitId: taskLinkedHabit || undefined,
      linkedGoalId: taskLinkedGoal || undefined,
      tags: tagsArr,
    });
    setTaskTitle('');
    setTaskDesc('');
    setTaskTags('');
    handleClose();
  };

  const handleSubmitHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;
    await addHabit({
      name: habitName.trim(),
      description: habitDesc.trim(),
      category: habitCategory,
      icon: 'sparkles',
      color: '#6366f1',
      startDate: getTodayDateString(),
      frequency: habitFrequency,
      selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      targetType: habitTargetType,
      targetQuantity: Number(habitTargetQty) || 1,
      unitOfMeasurement: habitUnit,
      preferredTime: habitPrefTime || undefined,
      linkedGoalId: habitLinkedGoal || undefined,
      isArchived: false,
    });
    setHabitName('');
    setHabitDesc('');
    handleClose();
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTitle.trim()) return;
    const plannedDuration = Math.max(15, timeToMinutes(schedEnd) - timeToMinutes(schedStart));
    await addScheduleBlock({
      title: schedTitle.trim(),
      date: schedDate,
      startTime: schedStart,
      endTime: schedEnd,
      plannedDuration,
      actualDuration: 0,
      category: schedCategory,
      priority: schedPriority,
      status: 'scheduled',
      linkedTaskId: schedLinkedTask || undefined,
      linkedHabitId: schedLinkedHabit || undefined,
      linkedGoalId: schedLinkedGoal || undefined,
    });
    setSchedTitle('');
    handleClose();
  };

  const handleSubmitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    await addGoal({
      title: goalTitle.trim(),
      description: goalDesc.trim(),
      category: goalCategory,
      horizon: goalHorizon,
      startDate: goalStartDate,
      targetDate: goalTargetDate,
      priority: goalPriority,
      goalType,
      targetValue: Number(goalTargetValue) || 10,
      currentValue: 0,
      unit: goalUnit,
      progressMethod: goalProgressMethod,
      linkedCategories: [goalCategory],
      linkedHabitIds: [],
      linkedTaskIds: [],
      status: 'in_progress',
    });
    setGoalTitle('');
    setGoalDesc('');
    handleClose();
  };

  const handleSubmitTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeTitle.trim()) return;
    const startTimeIso = `${timeDate}T12:00:00Z`;
    await recordManualTime({
      title: timeTitle.trim(),
      startTime: startTimeIso,
      durationMinutes: Number(timeMinutes) || 30,
      category: timeCategory,
      linkedTaskId: timeLinkedTask || undefined,
      linkedHabitId: timeLinkedHabit || undefined,
      linkedGoalId: timeLinkedGoal || undefined,
      isManual: true,
      notes: timeNotes.trim(),
    });
    setTimeTitle('');
    setTimeNotes('');
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <h3 id="quick-add-title" className="text-lg font-bold text-neutral-100">
              Quick Add
            </h3>
            <span className="text-xs text-neutral-400">One Source of Truth</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/30 px-3 pt-2 gap-1 overflow-x-auto">
          {[
            { id: 'task', label: 'Task', icon: CheckSquare },
            { id: 'habit', label: 'Habit', icon: Repeat },
            { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
            { id: 'goal', label: 'Goal', icon: Target },
            { id: 'time', label: 'Time Log', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = quickAddType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setQuickAddType(tab.id as typeof quickAddType)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                  active
                    ? 'border-indigo-500 text-indigo-400 bg-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TASK FORM */}
          {quickAddType === 'task' && (
            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Dijkstra's algorithm"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Add details, links, or acceptance criteria..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
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
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Estimated Duration (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="algo, study, life-os"
                      value={taskTags}
                      onChange={(e) => setTaskTags(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <Tag className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Interconnection links */}
              <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 space-y-3">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Interconnect with Habit & Goal
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">Link to Goal</label>
                    <select
                      value={taskLinkedGoal}
                      onChange={(e) => setTaskLinkedGoal(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs"
                    >
                      <option value="">None (Stand-alone)</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.horizon})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">Link to Habit</label>
                    <select
                      value={taskLinkedHabit}
                      onChange={(e) => setTaskLinkedHabit(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs"
                    >
                      <option value="">None</option>
                      {habits.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900/30"
                >
                  Create Task
                </button>
              </div>
            </form>
          )}

          {/* HABIT FORM */}
          {quickAddType === 'habit' && (
            <form onSubmit={handleSubmitHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Habit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily DSA Practice"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={habitCategory}
                    onChange={(e) => setHabitCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Frequency</label>
                  <select
                    value={habitFrequency}
                    onChange={(e) => setHabitFrequency(e.target.value as HabitFrequency)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="daily">Daily (7 days)</option>
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="weekends">Weekends (Sat-Sun)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Tracking Type</label>
                  <select
                    value={habitTargetType}
                    onChange={(e) => setHabitTargetType(e.target.value as HabitTargetType)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="binary">Yes/No (Binary)</option>
                    <option value="duration">Duration (Minutes)</option>
                    <option value="quantity">Quantity (Pages, Reps)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Target Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={habitTargetQty}
                    onChange={(e) => setHabitTargetQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Unit</label>
                  <input
                    type="text"
                    value={habitUnit}
                    onChange={(e) => setHabitUnit(e.target.value)}
                    placeholder="minutes, pages, etc."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Preferred Time of Day</label>
                <input
                  type="time"
                  value={habitPrefTime}
                  onChange={(e) => setHabitPrefTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Link to Goal</label>
                <select
                  value={habitLinkedGoal}
                  onChange={(e) => setHabitLinkedGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                >
                  <option value="">None (Independent)</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.horizon})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Create Habit
                </button>
              </div>
            </form>
          )}

          {/* SCHEDULE FORM */}
          {quickAddType === 'schedule' && (
            <form onSubmit={handleSubmitSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Work: System Design"
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={schedDate}
                    onChange={(e) => handleScheduleTimeChange(schedStart, schedEnd, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={schedStart}
                    onChange={(e) => handleScheduleTimeChange(e.target.value, schedEnd, schedDate)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={schedEnd}
                    onChange={(e) => handleScheduleTimeChange(schedStart, e.target.value, schedDate)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              </div>

              {/* Overlap Warning Alert */}
              {overlapWarning && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{overlapWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={schedCategory}
                    onChange={(e) => setSchedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Priority</label>
                  <select
                    value={schedPriority}
                    onChange={(e) => setSchedPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
                <span className="text-xs font-semibold text-indigo-400">Link Existing Task (Optional)</span>
                <select
                  value={schedLinkedTask}
                  onChange={(e) => {
                    setSchedLinkedTask(e.target.value);
                    const t = tasks.find((item) => item.id === e.target.value);
                    if (t && !schedTitle) {
                      setSchedTitle(t.title);
                      setSchedCategory(t.category);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs"
                >
                  <option value="">None (Custom Activity)</option>
                  {tasks.filter((t) => t.status !== 'completed').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Schedule Activity
                </button>
              </div>
            </form>
          )}

          {/* GOAL FORM */}
          {quickAddType === 'goal' && (
            <form onSubmit={handleSubmitGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete 60 Hours of DSA Study"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Outcome criteria or milestone notes..."
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Priority</label>
                  <select
                    value={goalPriority}
                    onChange={(e) => setGoalPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Time Horizon</label>
                  <select
                    value={goalHorizon}
                    onChange={(e) => setGoalHorizon(e.target.value as GoalHorizon)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="six_month">6 Months</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={goalStartDate}
                    onChange={(e) => setGoalStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Target Value</label>
                  <input
                    type="number"
                    min="1"
                    value={goalTargetValue}
                    onChange={(e) => setGoalTargetValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Unit</label>
                  <input
                    type="text"
                    value={goalUnit}
                    onChange={(e) => setGoalUnit(e.target.value)}
                    placeholder="hours, problems, books"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Progress Method</label>
                  <select
                    value={goalProgressMethod}
                    onChange={(e) => setGoalProgressMethod(e.target.value as GoalProgressMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="automatic_time">Auto from Time Logs</option>
                    <option value="automatic_tasks">Auto from Linked Tasks</option>
                    <option value="automatic_habits">Auto from Habits</option>
                    <option value="milestones">Milestones</option>
                    <option value="manual">Manual Progress</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Create Goal
                </button>
              </div>
            </form>
          )}

          {/* TIME LOG FORM */}
          {quickAddType === 'time' && (
            <form onSubmit={handleSubmitTime} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph Algorithms Practice"
                  value={timeTitle}
                  onChange={(e) => setTimeTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={timeCategory}
                    onChange={(e) => setTimeCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={timeDate}
                    onChange={(e) => setTimeDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Link to Task</label>
                  <select
                    value={timeLinkedTask}
                    onChange={(e) => setTimeLinkedTask(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="">None</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Link to Goal</label>
                  <select
                    value={timeLinkedGoal}
                    onChange={(e) => setTimeLinkedGoal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="">None</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Session Notes</label>
                <input
                  type="text"
                  placeholder="What did you accomplish in this session?"
                  value={timeNotes}
                  onChange={(e) => setTimeNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Record Session
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
