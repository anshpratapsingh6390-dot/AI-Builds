import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  Play,
  Check,
  AlertTriangle,
  ChevronRight,
  ListFilter,
  Layers,
  Edit2,
  Trash2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { ScheduleBlock, Priority } from '../types';
import {
  checkTimeOverlap,
  formatDuration,
  formatTimeDisplay,
  getTodayDateString,
  minutesToTime,
  parseDate,
  timeToMinutes,
} from '../utils/dateUtils';
import { ConfirmModal } from '../components/ConfirmModal';

export const DailyPlannerView: React.FC = () => {
  const {
    scheduleBlocks,
    tasks,
    categories,
    selectedDate,
    addScheduleBlock,
    updateScheduleBlock,
    deleteScheduleBlock,
    startTimer,
    settings,
  } = useLifeOS();

  const [viewMode, setViewMode] = useState<'timeline' | 'agenda'>('timeline');
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState(categories[0]?.name || 'Work');
  const [priority, setPriority] = useState<Priority>('medium');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [actualDurationManual, setActualDurationManual] = useState(0);
  const [delayReason, setDelayReason] = useState('');
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  // Filter blocks for selected date
  const dayBlocks = scheduleBlocks
    .filter((b) => b.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Unscheduled tasks for selected date or open tasks
  const unscheduledTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      (!t.scheduleBlockId || !scheduleBlocks.some((b) => b.id === t.scheduleBlockId))
  );

  const dayStartHour = settings.dayStartHour ?? 6;
  const dayEndHour = settings.dayEndHour ?? 23;
  const is12h = settings.timeFormat === '12h';

  // Hours array for timeline slots
  const hours = Array.from(
    { length: dayEndHour - dayStartHour + 1 },
    (_, i) => dayStartHour + i
  );

  const checkOverlap = (sTime: string, eTime: string, excludeId?: string) => {
    if (timeToMinutes(eTime) <= timeToMinutes(sTime)) {
      return 'End time must be after start time.';
    }
    const conflicts = dayBlocks.filter(
      (b) => b.id !== excludeId && b.status !== 'cancelled' && checkTimeOverlap(sTime, eTime, b.startTime, b.endTime)
    );
    if (conflicts.length > 0) {
      return `Warning: Conflicts with "${conflicts[0].title}" (${conflicts[0].startTime} - ${conflicts[0].endTime})`;
    }
    return null;
  };

  const handleOpenAdd = (defaultStart?: string) => {
    setEditingBlock(null);
    const start = defaultStart || '09:00';
    const end = minutesToTime(timeToMinutes(start) + (settings.defaultTaskDuration || 60));
    setTitle('');
    setStartTime(start);
    setEndTime(end);
    setCategory(categories[0]?.name || 'Work');
    setPriority('medium');
    setLinkedTaskId('');
    setActualDurationManual(0);
    setDelayReason('');
    setOverlapWarning(checkOverlap(start, end));
    setIsAddingBlock(true);
  };

  const handleOpenEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setTitle(block.title);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setCategory(block.category);
    setPriority(block.priority);
    setLinkedTaskId(block.linkedTaskId || '');
    setActualDurationManual(block.actualDuration || 0);
    setDelayReason(block.notes || '');
    setOverlapWarning(null);
    setIsAddingBlock(true);
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const plannedDuration = Math.max(15, timeToMinutes(endTime) - timeToMinutes(startTime));

    if (editingBlock) {
      await updateScheduleBlock(editingBlock.id, {
        title: title.trim(),
        startTime,
        endTime,
        plannedDuration,
        actualDuration: Number(actualDurationManual) || 0,
        category,
        priority,
        linkedTaskId: linkedTaskId || undefined,
        notes: delayReason.trim(),
      });
    } else {
      await addScheduleBlock({
        title: title.trim(),
        date: selectedDate,
        startTime,
        endTime,
        plannedDuration,
        actualDuration: Number(actualDurationManual) || 0,
        category,
        priority,
        status: 'scheduled',
        linkedTaskId: linkedTaskId || undefined,
        notes: delayReason.trim(),
      });
    }

    setIsAddingBlock(false);
  };

  const handleDeleteBlock = async () => {
    if (deleteTargetId) {
      await deleteScheduleBlock(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  // Planned vs actual hours summary for today
  const totalPlannedMinutes = dayBlocks.reduce((s, b) => s + (b.plannedDuration || 0), 0);
  const totalActualMinutes = dayBlocks.reduce((s, b) => s + (b.actualDuration || 0), 0);
  const varianceMinutes = totalActualMinutes - totalPlannedMinutes;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Time-Blocking Schedule</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Daily Planner</h1>
          <p className="text-xs text-neutral-400">
            Plan deep work, avoid schedule overlaps, and measure planned vs actual execution time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'agenda'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Agenda
            </button>
          </div>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-950 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Block</span>
          </button>
        </div>
      </div>

      {/* Planned vs Actual Time Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800">
        <div>
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Planned Duration
          </span>
          <div className="text-xl font-bold text-neutral-100 mt-0.5">
            {formatDuration(totalPlannedMinutes)}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Actual Tracked Duration
          </span>
          <div className="text-xl font-bold text-sky-400 mt-0.5">
            {formatDuration(totalActualMinutes)}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Time Variance
          </span>
          <div
            className={`text-xl font-bold mt-0.5 ${
              varianceMinutes > 0
                ? 'text-amber-400'
                : varianceMinutes < 0
                ? 'text-indigo-400'
                : 'text-neutral-200'
            }`}
          >
            {varianceMinutes >= 0 ? '+' : ''}
            {formatDuration(varianceMinutes)}
          </div>
          <span className="text-[10px] text-neutral-500">
            {varianceMinutes > 0
              ? 'Spent more time than planned'
              : varianceMinutes < 0
              ? 'Spent less time than planned'
              : 'Exact match'}
          </span>
        </div>
      </div>

      {/* Main Grid: Schedule View & Unscheduled Tasks Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 spans: Schedule View */}
        <div className="lg:col-span-3">
          {viewMode === 'agenda' ? (
            /* Agenda View */
            <div className="space-y-3">
              {dayBlocks.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-neutral-850">
                  <CalendarDays className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-neutral-300">No scheduled blocks for this date</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Click "Add Block" or drag an unscheduled task into the timeline.
                  </p>
                </div>
              ) : (
                dayBlocks.map((block) => {
                  const isDone = block.status === 'completed';
                  const variance = (block.actualDuration || 0) - block.plannedDuration;

                  return (
                    <div
                      key={block.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isDone
                          ? 'bg-neutral-950/40 border-neutral-850'
                          : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <button
                          onClick={() =>
                            updateScheduleBlock(block.id, {
                              status: isDone ? 'scheduled' : 'completed',
                              actualDuration: isDone ? 0 : block.plannedDuration,
                            })
                          }
                          className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 border transition-all ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-neutral-700 hover:border-neutral-500 text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                isDone ? 'line-through text-neutral-500' : 'text-neutral-100'
                              }`}
                            >
                              {block.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                              {block.category}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1.5">
                            <span className="font-mono text-neutral-200">
                              {formatTimeDisplay(block.startTime, is12h)} –{' '}
                              {formatTimeDisplay(block.endTime, is12h)}
                            </span>
                            <span>•</span>
                            <span>Planned: {formatDuration(block.plannedDuration)}</span>
                            <span>•</span>
                            <span className={block.actualDuration > 0 ? 'text-sky-400' : 'text-neutral-500'}>
                              Actual: {formatDuration(block.actualDuration || 0)}
                            </span>
                            {block.actualDuration > 0 && (
                              <>
                                <span>•</span>
                                <span
                                  className={
                                    variance > 0
                                      ? 'text-amber-400 font-medium'
                                      : variance < 0
                                      ? 'text-emerald-400 font-medium'
                                      : 'text-neutral-400'
                                  }
                                >
                                  Variance: {variance >= 0 ? '+' : ''}
                                  {formatDuration(variance)}
                                </span>
                              </>
                            )}
                          </div>

                          {block.notes && (
                            <div className="mt-2 text-xs text-neutral-400 italic bg-neutral-950/60 p-2 rounded-lg border border-neutral-850">
                              Note: {block.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!isDone && (
                          <button
                            onClick={() =>
                              startTimer({
                                title: block.title,
                                category: block.category,
                                linkedTaskId: block.linkedTaskId,
                                linkedHabitId: block.linkedHabitId,
                                linkedGoalId: block.linkedGoalId,
                              })
                            }
                            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-indigo-400 border border-neutral-700"
                            title="Start Timer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(block)}
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700"
                          title="Edit activity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(block.id)}
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-neutral-700"
                          title="Delete activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Timeline View */
            <div className="relative rounded-2xl bg-neutral-900/80 border border-neutral-800 p-4 overflow-x-auto">
              <div className="space-y-4 min-w-[500px]">
                {hours.map((hour) => {
                  const hourStr = String(hour).padStart(2, '0') + ':00';
                  const hourFormatted = formatTimeDisplay(hourStr, is12h);

                  // Blocks that start in this hour
                  const blocksInHour = dayBlocks.filter((b) => {
                    const startH = parseInt(b.startTime.split(':')[0], 10);
                    return startH === hour;
                  });

                  return (
                    <div key={hour} className="flex items-start gap-4 group">
                      {/* Hour label */}
                      <div className="w-16 shrink-0 text-xs font-mono font-semibold text-neutral-400 pt-1 text-right">
                        {hourFormatted}
                      </div>

                      {/* Hour Slot content */}
                      <div className="flex-1 min-h-[48px] border-t border-neutral-800/80 pt-1 relative">
                        {blocksInHour.length === 0 ? (
                          <div
                            onClick={() => handleOpenAdd(hourStr)}
                            className="h-10 rounded-xl hover:bg-neutral-850/40 border border-transparent hover:border-neutral-800 cursor-pointer flex items-center px-3 text-xs text-neutral-600 hover:text-neutral-400 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add block at {hourFormatted}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {blocksInHour.map((block) => {
                              const isDone = block.status === 'completed';
                              return (
                                <div
                                  key={block.id}
                                  onClick={() => handleOpenEdit(block)}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                    isDone
                                      ? 'bg-neutral-950/60 border-neutral-850 opacity-70'
                                      : 'bg-neutral-850/80 border-neutral-750 hover:border-indigo-500/50 hover:bg-neutral-800 shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className={`text-xs font-bold ${
                                        isDone ? 'line-through text-neutral-500' : 'text-neutral-100'
                                      }`}
                                    >
                                      {block.title}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-900 text-neutral-400">
                                      {block.category}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
                                    <span>
                                      {formatTimeDisplay(block.startTime, is12h)} -{' '}
                                      {formatTimeDisplay(block.endTime, is12h)}
                                    </span>
                                    <span className="text-neutral-200 font-sans font-medium">
                                      {formatDuration(block.plannedDuration)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 span: Unscheduled Tasks drawer to schedule quickly */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Unscheduled Tasks
                </h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                {unscheduledTasks.length}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400">
              Click any task to schedule it into an available time slot today.
            </p>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {unscheduledTasks.length === 0 ? (
                <p className="text-xs text-neutral-500 italic p-4 text-center">
                  All active tasks are scheduled or completed!
                </p>
              ) : (
                unscheduledTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTitle(t.title);
                      setCategory(t.category);
                      setPriority(t.priority);
                      setLinkedTaskId(t.id);
                      setIsAddingBlock(true);
                    }}
                    className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-indigo-500/50 hover:bg-neutral-850 cursor-pointer transition-all space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200 line-clamp-1">{t.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{t.estimatedDuration}m est.</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Block Modal */}
      {isAddingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-bold text-neutral-100">
              {editingBlock ? 'Edit Schedule Activity' : 'Schedule Activity'}
            </h3>

            <form onSubmit={handleSaveBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Deep Work: Graph Algorithms"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setOverlapWarning(checkOverlap(e.target.value, endTime, editingBlock?.id));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setOverlapWarning(checkOverlap(startTime, e.target.value, editingBlock?.id));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              </div>

              {/* Overlap alert warning */}
              {overlapWarning && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{overlapWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {editingBlock && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Actual Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={actualDurationManual}
                      onChange={(e) => setActualDurationManual(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Reason / Notes (if delayed or skipped)
                    </label>
                    <input
                      type="text"
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      placeholder="e.g. debugging took longer"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingBlock(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {editingBlock ? 'Save Changes' : 'Schedule Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Schedule Activity"
        message="Are you sure you want to remove this scheduled activity? Historical records already completed will remain in time logs."
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDeleteBlock}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
