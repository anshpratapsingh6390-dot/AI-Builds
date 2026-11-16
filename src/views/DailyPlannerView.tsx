import React, { useState, useMemo, useEffect } from 'react';
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
  RotateCcw,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { ScheduleBlock, Priority } from '../types';
import {
  addDays,
  calculateScheduleDuration,
  checkTimeOverlap,
  formatDateIso,
  formatDuration,
  formatTimeDisplay,
  formatTimeRange,
  getTodayDateString,
  minutesToTime,
  parseDate,
  partsTo24h,
  timeTo12hParts,
  timeToMinutes,
} from '../utils/dateUtils';
import { calculateCreditedWorkingTime, CreditedBlockTime } from '../utils/rules';
import { ConfirmModal } from '../components/ConfirmModal';

export const DailyPlannerView: React.FC = () => {
  const {
    scheduleBlocks,
    tasks,
    timeSessions,
    categories,
    selectedDate,
    addScheduleBlock,
    updateScheduleBlock,
    deleteScheduleBlock,
    resetScheduleBlock,
    clearScheduleBlocksForDate,
    resetScheduleBlocksForDate,
    startTimer,
    settings,
  } = useLifeOS();

  const [viewMode, setViewMode] = useState<'timeline' | 'agenda'>('timeline');
  const [is12h, setIs12h] = useState(settings.timeFormat === '12h');
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isClearDayModalOpen, setIsClearDayModalOpen] = useState(false);
  const [isResetDayModalOpen, setIsResetDayModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState(categories[0]?.name || 'Work');
  const [priority, setPriority] = useState<Priority>('medium');
  const [includeInWorkingTime, setIncludeInWorkingTime] = useState(false);
  const [endsNextDay, setEndsNextDay] = useState(false);
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

  // Full 24-hour timeline slots (00:00 - 23:00 / 12:00 AM - 11:00 PM)
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const checkOverlap = (sTime: string, eTime: string, isNextDay = false, excludeId?: string) => {
    if (!isNextDay && timeToMinutes(eTime) <= timeToMinutes(sTime)) {
      return 'End time is earlier than start time. Enable "Ends next day" for overnight activities.';
    }
    const conflicts = dayBlocks.filter(
      (b) =>
        b.id !== excludeId &&
        b.status !== 'cancelled' &&
        checkTimeOverlap(sTime, eTime, b.startTime, b.endTime, isNextDay, b.endsNextDay)
    );
    if (conflicts.length > 0) {
      return `Warning: Conflicts with "${conflicts[0].title}" (${formatTimeRange(conflicts[0].startTime, conflicts[0].endTime, is12h, conflicts[0].endsNextDay)})`;
    }
    return null;
  };

  const scrollToHour = (h: number) => {
    const el = document.getElementById(`timeline-hour-${h}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Auto-scroll to current hour when viewing today on initial mount / date change
  useEffect(() => {
    if (selectedDate === getTodayDateString() && viewMode === 'timeline') {
      const currentHour = new Date().getHours();
      const timer = setTimeout(() => {
        scrollToHour(currentHour);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, viewMode]);

  const handleOpenAdd = (defaultStart?: string) => {
    setEditingBlock(null);
    const start = defaultStart || '09:00';
    const end = minutesToTime((timeToMinutes(start) + (settings.defaultTaskDuration || 60)) % (24 * 60));
    const isAutoNext = timeToMinutes(end) < timeToMinutes(start);
    setTitle('');
    setStartTime(start);
    setEndTime(end);
    setCategory(categories[0]?.name || 'Work');
    setPriority('medium');
    setIncludeInWorkingTime(false); // Unchecked by default for newly created schedule blocks
    setEndsNextDay(isAutoNext);
    setLinkedTaskId('');
    setActualDurationManual(0);
    setDelayReason('');
    setOverlapWarning(checkOverlap(start, end, isAutoNext));
    setIsAddingBlock(true);
  };

  const handleOpenEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setTitle(block.title);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setCategory(block.category);
    setPriority(block.priority);
    setIncludeInWorkingTime(block.includeInWorkingTime !== false); // Preserves legacy records as true
    const isOvernight = Boolean(block.endsNextDay || timeToMinutes(block.endTime) < timeToMinutes(block.startTime));
    setEndsNextDay(isOvernight);
    setLinkedTaskId(block.linkedTaskId || '');
    setActualDurationManual(block.actualDuration || 0);
    setDelayReason(block.notes || '');
    setOverlapWarning(checkOverlap(block.startTime, block.endTime, isOvernight, block.id));
    setIsAddingBlock(true);
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const isOvernight = Boolean(endsNextDay || timeToMinutes(endTime) < timeToMinutes(startTime));
    const plannedDuration = calculateScheduleDuration(startTime, endTime, isOvernight);

    const blockData = {
      title: title.trim(),
      startTime,
      endTime,
      plannedDuration,
      actualDuration: Number(actualDurationManual) || 0,
      category,
      priority,
      includeInWorkingTime,
      endsNextDay: isOvernight,
      endDate: isOvernight ? formatDateIso(addDays(parseDate(selectedDate), 1)) : undefined,
      linkedTaskId: linkedTaskId || undefined,
      notes: delayReason.trim(),
    };

    if (editingBlock) {
      await updateScheduleBlock(editingBlock.id, blockData);
    } else {
      await addScheduleBlock({
        ...blockData,
        date: selectedDate,
        status: 'scheduled',
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

  // Planned vs actual hours summary for selected date using unified calculation
  const workingTimeMetrics = useMemo(() => {
    return calculateCreditedWorkingTime(selectedDate, scheduleBlocks, timeSessions, tasks);
  }, [selectedDate, scheduleBlocks, timeSessions, tasks]);

  const blockTimeMap = useMemo(
    () => new Map(workingTimeMetrics.blockBreakdown.map((b: CreditedBlockTime) => [b.blockId, b])),
    [workingTimeMetrics]
  );

  const totalPlannedMinutes = workingTimeMetrics.totalPlannedMinutes;
  const totalActualMinutes = workingTimeMetrics.totalTrackedMinutes;
  const varianceMinutes = workingTimeMetrics.varianceMinutes;

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

        <div className="flex flex-wrap items-center gap-2">
          {/* Day action buttons when blocks exist */}
          {dayBlocks.length > 0 && (
            <>
              <button
                onClick={() => setIsResetDayModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 text-xs font-medium transition-colors"
                title="Reset all planned activities for this date back to scheduled"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Reset Day Progress</span>
              </button>

              <button
                onClick={() => setIsClearDayModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors"
                title="Delete all planned activities for this date"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Day</span>
              </button>
            </>
          )}

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

          {/* 12h (AM/PM) vs 24h format toggle */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs" title="Toggle time format">
            <button
              onClick={() => setIs12h(true)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                is12h
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              12h (AM/PM)
            </button>
            <button
              onClick={() => setIs12h(false)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                !is12h
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              24h
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
                          <div className="flex items-center gap-2 flex-wrap">
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

                            {/* Quick Count Toward Working Time Toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIsWork = block.includeInWorkingTime !== false;
                                updateScheduleBlock(block.id, { includeInWorkingTime: !currentIsWork });
                              }}
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                block.includeInWorkingTime !== false
                                  ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                              }`}
                              title={
                                block.includeInWorkingTime !== false
                                  ? 'Counts toward Working Time (click to exclude)'
                                  : 'Excluded from Working Time (click to include)'
                              }
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  block.includeInWorkingTime !== false ? 'bg-indigo-400' : 'bg-neutral-600'
                                }`}
                              />
                              <span>
                                {block.includeInWorkingTime !== false ? 'Working Time' : 'Personal / Off'}
                              </span>
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1.5">
                            <span className="font-mono text-neutral-200">
                              {formatTimeRange(block.startTime, block.endTime, is12h, block.endsNextDay)}
                            </span>
                            {block.endsNextDay && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                🌙 +1d Overnight
                              </span>
                            )}
                            <span>•</span>
                            <span>Planned: {formatDuration(block.plannedDuration)}</span>
                            {(() => {
                              const credited = blockTimeMap.get(block.id)?.creditedMinutes || block.actualDuration || 0;
                              const blockVariance = credited - block.plannedDuration;
                              return (
                                <>
                                  <span>•</span>
                                  <span className={credited > 0 ? 'text-sky-400 font-medium' : 'text-neutral-500'}>
                                    Actual: {formatDuration(credited)}
                                  </span>
                                  {credited > 0 && (
                                    <>
                                      <span>•</span>
                                      <span
                                        className={
                                          blockVariance > 0
                                            ? 'text-amber-400 font-medium'
                                            : blockVariance < 0
                                            ? 'text-indigo-400 font-medium'
                                            : 'text-emerald-400 font-medium'
                                        }
                                      >
                                        Variance: {blockVariance >= 0 ? '+' : ''}
                                        {formatDuration(blockVariance)}
                                      </span>
                                    </>
                                  )}
                                </>
                              );
                            })()}
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
                          onClick={() => resetScheduleBlock(block.id)}
                          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-indigo-400 border border-neutral-700 transition-colors"
                          title="Reset progress to scheduled"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
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
              {/* Quick Navigation Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-neutral-800 text-xs">
                <div className="flex items-center gap-2 text-neutral-400">
                  <span className="font-semibold text-neutral-200">24-Hour Timeline</span>
                  <span>•</span>
                  <span>00:00 – 23:59 (Full Day)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollToHour(0)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                    title="Scroll to start of day (12:00 AM)"
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Start of Day (12 AM)</span>
                  </button>
                  <button
                    onClick={() => scrollToHour(new Date().getHours())}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors cursor-pointer"
                    title="Jump to current hour slot"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Jump to Current Time ({formatTimeDisplay(minutesToTime(new Date().getHours() * 60 + new Date().getMinutes()), is12h)})</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 min-w-[500px]">
                {hours.map((hour) => {
                  const hourStr = String(hour).padStart(2, '0') + ':00';
                  const hourFormatted = formatTimeDisplay(hourStr, is12h);

                  // Blocks that start in this hour
                  const blocksInHour = dayBlocks.filter((b) => {
                    const startH = parseInt(b.startTime.split(':')[0], 10);
                    return startH === hour;
                  });

                  // Time of day ambient divider
                  let timeOfDayBanner = null;
                  if (hour === 0) {
                    timeOfDayBanner = (
                      <div className="text-[10px] font-bold text-indigo-400/90 px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/40 inline-flex items-center gap-1 mb-1">
                        <Moon className="w-3 h-3 text-indigo-400" /> Night (12:00 AM – 06:00 AM)
                      </div>
                    );
                  } else if (hour === 6) {
                    timeOfDayBanner = (
                      <div className="text-[10px] font-bold text-amber-400/90 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-900/40 inline-flex items-center gap-1 mb-1">
                        <Sun className="w-3 h-3 text-amber-400" /> Morning (06:00 AM – 12:00 PM)
                      </div>
                    );
                  } else if (hour === 12) {
                    timeOfDayBanner = (
                      <div className="text-[10px] font-bold text-sky-400/90 px-2 py-0.5 rounded bg-sky-950/40 border border-sky-900/40 inline-flex items-center gap-1 mb-1">
                        <Sun className="w-3 h-3 text-sky-400" /> Afternoon (12:00 PM – 06:00 PM)
                      </div>
                    );
                  } else if (hour === 18) {
                    timeOfDayBanner = (
                      <div className="text-[10px] font-bold text-purple-400/90 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-900/40 inline-flex items-center gap-1 mb-1">
                        <Moon className="w-3 h-3 text-purple-400" /> Evening & Late Night (06:00 PM – 12:00 AM)
                      </div>
                    );
                  }

                  return (
                    <div key={hour} id={`timeline-hour-${hour}`} className="flex items-start gap-4 group scroll-mt-6">
                      {/* Hour label */}
                      <div className="w-16 shrink-0 text-xs font-mono font-semibold text-neutral-400 pt-1 text-right">
                        {timeOfDayBanner}
                        <div>{hourFormatted}</div>
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
                                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/item ${
                                    isDone
                                      ? 'bg-neutral-950/60 border-neutral-850 opacity-70'
                                      : 'bg-neutral-850/80 border-neutral-750 hover:border-indigo-500/50 hover:bg-neutral-800 shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateScheduleBlock(block.id, {
                                          status: isDone ? 'scheduled' : 'completed',
                                          actualDuration: isDone ? 0 : block.plannedDuration,
                                        });
                                      }}
                                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                        isDone
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'border-neutral-700 hover:border-neutral-500 text-transparent'
                                      }`}
                                      title={isDone ? 'Mark as scheduled' : 'Mark as completed'}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="flex items-center gap-2 flex-wrap">
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

                                      {/* Quick Working Time Toggle */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const currentIsWork = block.includeInWorkingTime !== false;
                                          updateScheduleBlock(block.id, { includeInWorkingTime: !currentIsWork });
                                        }}
                                        className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                                          block.includeInWorkingTime !== false
                                            ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60'
                                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                                        }`}
                                        title={
                                          block.includeInWorkingTime !== false
                                            ? 'Counts toward Working Time (click to exclude)'
                                            : 'Excluded from Working Time (click to include)'
                                        }
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            block.includeInWorkingTime !== false ? 'bg-indigo-400' : 'bg-neutral-600'
                                          }`}
                                        />
                                        <span>
                                          {block.includeInWorkingTime !== false ? 'Work' : 'Personal'}
                                        </span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
                                      <span>
                                        {formatTimeRange(block.startTime, block.endTime, is12h, block.endsNextDay)}
                                      </span>
                                      {block.endsNextDay && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                          🌙 +1d
                                        </span>
                                      )}
                                      <span className="text-neutral-200 font-sans font-medium flex items-center gap-1.5">
                                        <span>{formatDuration(block.plannedDuration)}</span>
                                        {(() => {
                                          const credited = blockTimeMap.get(block.id)?.creditedMinutes || block.actualDuration || 0;
                                          return credited > 0 ? (
                                            <span className="text-emerald-400 font-medium font-mono text-[11px]">
                                              • {formatDuration(credited)} actual
                                            </span>
                                          ) : null;
                                        })()}
                                      </span>
                                    </div>

                                    {/* Action buttons on timeline block */}
                                    <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover/item:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          resetScheduleBlock(block.id);
                                        }}
                                        className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-700 text-neutral-400 hover:text-indigo-400 transition-colors"
                                        title="Reset block progress to scheduled"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEdit(block);
                                        }}
                                        className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
                                        title="Edit activity"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteTargetId(block.id);
                                        }}
                                        className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors"
                                        title="Delete scheduled activity"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Time with AM/PM toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-300">
                      Start Time
                    </label>
                    <div className="flex items-center rounded-lg bg-neutral-900 border border-neutral-800 p-0.5 text-[10px] font-mono">
                      {(() => {
                        const { ampm } = timeTo12hParts(startTime);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const { h12, minute } = timeTo12hParts(startTime);
                                const newTime = partsTo24h(h12, minute, 'AM');
                                setStartTime(newTime);
                                setOverlapWarning(checkOverlap(newTime, endTime, endsNextDay, editingBlock?.id));
                              }}
                              className={`px-1.5 py-0.5 rounded transition-colors ${
                                ampm === 'AM' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const { h12, minute } = timeTo12hParts(startTime);
                                const newTime = partsTo24h(h12, minute, 'PM');
                                setStartTime(newTime);
                                setOverlapWarning(checkOverlap(newTime, endTime, endsNextDay, editingBlock?.id));
                              }}
                              className={`px-1.5 py-0.5 rounded transition-colors ${
                                ampm === 'PM' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              PM
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartTime(newStart);
                      const isAutoNext = Boolean(endsNextDay || (newStart && endTime && timeToMinutes(endTime) < timeToMinutes(newStart)));
                      if (endTime && timeToMinutes(endTime) < timeToMinutes(newStart)) {
                        setEndsNextDay(true);
                      }
                      setOverlapWarning(checkOverlap(newStart, endTime, isAutoNext, editingBlock?.id));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                    12h: {formatTimeDisplay(startTime, true)}
                  </div>
                </div>

                {/* End Time with AM/PM toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-300">
                      End Time
                    </label>
                    <div className="flex items-center rounded-lg bg-neutral-900 border border-neutral-800 p-0.5 text-[10px] font-mono">
                      {(() => {
                        const { ampm } = timeTo12hParts(endTime);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const { h12, minute } = timeTo12hParts(endTime);
                                const newTime = partsTo24h(h12, minute, 'AM');
                                setEndTime(newTime);
                                const isAutoNext = Boolean(endsNextDay || (startTime && newTime && timeToMinutes(newTime) < timeToMinutes(startTime)));
                                if (startTime && timeToMinutes(newTime) < timeToMinutes(startTime)) {
                                  setEndsNextDay(true);
                                }
                                setOverlapWarning(checkOverlap(startTime, newTime, isAutoNext, editingBlock?.id));
                              }}
                              className={`px-1.5 py-0.5 rounded transition-colors ${
                                ampm === 'AM' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const { h12, minute } = timeTo12hParts(endTime);
                                const newTime = partsTo24h(h12, minute, 'PM');
                                setEndTime(newTime);
                                const isAutoNext = Boolean(endsNextDay || (startTime && newTime && timeToMinutes(newTime) < timeToMinutes(startTime)));
                                setOverlapWarning(checkOverlap(startTime, newTime, isAutoNext, editingBlock?.id));
                              }}
                              className={`px-1.5 py-0.5 rounded transition-colors ${
                                ampm === 'PM' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              PM
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setEndTime(newEnd);
                      const isAutoNext = Boolean(endsNextDay || (startTime && newEnd && timeToMinutes(newEnd) < timeToMinutes(startTime)));
                      if (startTime && timeToMinutes(newEnd) < timeToMinutes(startTime)) {
                        setEndsNextDay(true);
                      }
                      setOverlapWarning(checkOverlap(startTime, newEnd, isAutoNext, editingBlock?.id));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                    12h: {formatTimeDisplay(endTime, true)}
                  </div>
                </div>
              </div>

              {/* Overnight check and duration summary */}
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={endsNextDay}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEndsNextDay(checked);
                      setOverlapWarning(checkOverlap(startTime, endTime, checked, editingBlock?.id));
                    }}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-neutral-900"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                      🌙 Crosses midnight (Ends on next day)
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Supports overnight work like 11:00 PM to 01:00 AM without artificial time constraints.
                    </p>
                  </div>
                </label>

                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400">Calculated Planned Duration:</span>
                  <span className="text-indigo-300 font-semibold">
                    {formatDuration(
                      calculateScheduleDuration(
                        startTime,
                        endTime,
                        endsNextDay || timeToMinutes(endTime) < timeToMinutes(startTime)
                      )
                    )}
                    {(endsNextDay || timeToMinutes(endTime) < timeToMinutes(startTime)) && (
                      <span className="text-amber-400 ml-1.5 font-sans text-[11px] font-normal">
                        (Overnight)
                      </span>
                    )}
                  </span>
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

              {/* Count toward Working Time Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={includeInWorkingTime}
                    onChange={(e) => setIncludeInWorkingTime(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-700 bg-neutral-900 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
                      <span>Count toward Working Time</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          includeInWorkingTime
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {includeInWorkingTime ? 'Productive Work' : 'Personal / Off'}
                      </span>
                    </span>
                    <span className="text-[11px] text-neutral-400 mt-0.5">
                      When enabled, this activity's duration contributes to Tracked Working Time on your Dashboard and productive analytics.
                    </span>
                  </div>
                </label>
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800">
                {editingBlock ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = editingBlock.id;
                        setIsAddingBlock(false);
                        setDeleteTargetId(targetId);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Delete this scheduled block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await resetScheduleBlock(editingBlock.id);
                        setIsAddingBlock(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 transition-colors"
                      title="Reset progress to scheduled (0m tracked)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>

                    {editingBlock.linkedTaskId && (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteScheduleBlock(editingBlock.id);
                          setIsAddingBlock(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors"
                        title="Remove from today's schedule and return task to unscheduled backlog"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Unschedule</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingBlock(false)}
                    className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                  >
                    {editingBlock ? 'Save Changes' : 'Schedule Activity'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Schedule Activity"
        message="Are you sure you want to remove this scheduled activity? If it is linked to a task, the task will return to your unscheduled list."
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDeleteBlock}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Clear Day Confirmation */}
      <ConfirmModal
        isOpen={isClearDayModalOpen}
        title="Clear All Scheduled Activities"
        message={`Are you sure you want to remove all ${dayBlocks.length} scheduled activities for ${selectedDate}? Any linked tasks will be safely preserved in your task list.`}
        confirmLabel="Clear All"
        isDestructive
        onConfirm={async () => {
          await clearScheduleBlocksForDate(selectedDate);
          setIsClearDayModalOpen(false);
        }}
        onCancel={() => setIsClearDayModalOpen(false)}
      />

      {/* Reset Day Confirmation */}
      <ConfirmModal
        isOpen={isResetDayModalOpen}
        title="Reset Today's Schedule Progress"
        message="This will reset all scheduled activities on this date back to 'scheduled' status, with 0 actual minutes tracked. Continue?"
        confirmLabel="Reset Progress"
        onConfirm={async () => {
          await resetScheduleBlocksForDate(selectedDate);
          setIsResetDayModalOpen(false);
        }}
        onCancel={() => setIsResetDayModalOpen(false)}
      />
    </div>
  );
};
