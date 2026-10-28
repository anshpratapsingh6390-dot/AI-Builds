import React, { useState } from 'react';
import {
  Repeat,
  Plus,
  Flame,
  Award,
  Calendar,
  Check,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Tag,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { Habit, HabitOccurrence, HabitOccurrenceStatus } from '../types';
import {
  calculateHabitCompletionRate,
  calculateHabitStreak,
  calculate7DayHabitConsistency,
  isHabitScheduledOnDate,
} from '../utils/rules';
import {
  addDays,
  formatDateIso,
  getTodayDateString,
  parseDate,
} from '../utils/dateUtils';
import { ConfirmModal } from '../components/ConfirmModal';
import { Habit7DayProgressBar } from '../components/Habit7DayProgressBar';

export const HabitsView: React.FC = () => {
  const {
    habits,
    occurrences,
    categories,
    selectedDate,
    recordHabitOccurrence,
    updateHabit,
    deleteHabit,
    setQuickAddOpen,
    setQuickAddType,
  } = useLifeOS();

  const [activeTab, setActiveTab] = useState<'matrix' | 'calendar' | 'list'>('matrix');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteHabitId, setDeleteHabitId] = useState<string | null>(null);

  // Selected date for detailed inspection
  const [inspectDate, setInspectDate] = useState<string>(selectedDate);

  // Occurrence quantity modal state
  const [quantityModalHabit, setQuantityModalHabit] = useState<Habit | null>(null);
  const [inputQuantity, setInputQuantity] = useState<number>(0);
  const [inputDuration, setInputDuration] = useState<number>(0);
  const [inputNotes, setInputNotes] = useState<string>('');

  const todayStr = getTodayDateString();

  // Past 14 days dates for the consistency matrix
  const pastDays = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(parseDate(todayStr), -13 + i);
    return formatDateIso(d);
  });

  // Calculate habit stats map
  const statsMap = new Map<
    string,
    { currentStreak: number; bestStreak: number; totalCompletions: number }
  >();
  habits.forEach((h) => {
    const s = calculateHabitStreak(h, occurrences, todayStr);
    statsMap.set(h.id, s);
  });

  const activeHabits = habits.filter((h) => !h.isArchived);

  // 7-day consistency stats for each active habit
  const consistenciesMap = new Map<
    string,
    ReturnType<typeof calculate7DayHabitConsistency>
  >();
  activeHabits.forEach((h) => {
    consistenciesMap.set(h.id, calculate7DayHabitConsistency(h, occurrences, todayStr));
  });

  const avg7dConsistency = activeHabits.length > 0
    ? Math.round(
        Array.from(consistenciesMap.values()).reduce((sum, c) => sum + c.rate, 0) / activeHabits.length
      )
    : 0;
  const activeStreaksCount = Array.from(statsMap.values()).filter((s) => s.currentStreak > 0).length;
  const longestCurrentStreak = Math.max(0, ...Array.from(statsMap.values()).map((s) => s.currentStreak));
  const todayHabitRate = calculateHabitCompletionRate(activeHabits, occurrences, todayStr);

  const handleOpenQuantityModal = (habit: Habit, date: string) => {
    const existing = occurrences.find((o) => o.habitId === habit.id && o.date === date);
    setQuantityModalHabit(habit);
    setInputQuantity(existing?.completedQuantity || habit.targetQuantity);
    setInputDuration(existing?.completedDuration || (habit.targetType === 'duration' ? habit.targetQuantity : 0));
    setInputNotes(existing?.notes || '');
  };

  const handleSaveQuantityOccurrence = async () => {
    if (!quantityModalHabit) return;
    const isFull = inputQuantity >= quantityModalHabit.targetQuantity;
    const status: HabitOccurrenceStatus = isFull ? 'completed' : inputQuantity > 0 ? 'partial' : 'missed';

    await recordHabitOccurrence(
      quantityModalHabit.id,
      inspectDate,
      status,
      inputQuantity,
      inputDuration,
      inputNotes
    );
    setQuantityModalHabit(null);
  };

  const handleDeleteHabit = async () => {
    if (deleteHabitId) {
      await deleteHabit(deleteHabitId);
      setDeleteHabitId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Repeat className="w-3.5 h-3.5" />
            <span>Habit Consistency Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Habit Tracker</h1>
          <p className="text-xs text-neutral-400">
            Build consistency, protect active streaks, and inspect multi-week progress.
          </p>
        </div>

        <button
          onClick={() => {
            setQuickAddType('habit');
            setQuickAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-950 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habit Overview Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">7-Day Consistency</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-neutral-100 flex items-baseline gap-1.5">
            <span>{avg7dConsistency}%</span>
            <span className="text-[10px] text-neutral-500 font-normal">avg past week</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                avg7dConsistency >= 80
                  ? 'bg-emerald-500'
                  : avg7dConsistency >= 50
                  ? 'bg-sky-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${avg7dConsistency}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Active Streaks</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-neutral-100 flex items-baseline gap-1.5">
            <span>{activeStreaksCount}</span>
            <span className="text-[10px] text-neutral-500 font-normal">/ {activeHabits.length} habits</span>
          </div>
          <p className="text-[10px] text-neutral-500">Consecutive scheduled completions</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Longest Streak</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 flex items-baseline gap-1">
            <span>{longestCurrentStreak}</span>
            <span className="text-xs text-neutral-400 font-normal">days active</span>
          </div>
          <p className="text-[10px] text-neutral-500">Peak active habit momentum</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Today's Habits</span>
            <Check className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-extrabold text-neutral-100 flex items-baseline gap-1.5">
            <span>{todayHabitRate.completedCount}/{todayHabitRate.scheduledCount}</span>
            <span className="text-[10px] text-neutral-500 font-normal">
              {todayHabitRate.rate !== null ? `(${todayHabitRate.rate}%)` : '(none due)'}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500">Scheduled for today</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'matrix'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Consistency Matrix (14 Days)
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'list'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            Habit Cards & Streaks
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'calendar'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            History Inspection
          </button>
        </div>
      </div>

      {/* VIEW: Consistency Matrix */}
      {activeTab === 'matrix' && (
        <div className="rounded-2xl bg-neutral-900/90 border border-neutral-800 p-5 space-y-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px]">
            <div>
              <h3 className="text-sm font-bold text-neutral-100">14-Day Consistency Matrix</h3>
              <p className="text-xs text-neutral-400">Click any day node to toggle completion</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500/30 border border-amber-500/50 inline-block" /> Partial
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-neutral-800 border border-neutral-700 inline-block" /> Scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-neutral-950/40 inline-block opacity-40" /> Off Day
              </span>
            </div>
          </div>

          <div className="min-w-[700px] divide-y divide-neutral-800">
            {/* Days header row */}
            <div className="grid grid-cols-16 gap-1.5 pb-2 text-[11px] font-mono font-semibold text-neutral-400">
              <div className="col-span-4 text-left">Habit</div>
              {pastDays.map((dStr) => {
                const isT = dStr === todayStr;
                const d = parseDate(dStr);
                const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
                return (
                  <div
                    key={dStr}
                    className={`text-center py-1 rounded-md ${
                      isT ? 'bg-indigo-600/20 text-indigo-400 font-bold' : ''
                    }`}
                  >
                    <div>{dayLetter}</div>
                    <div className="text-[10px] text-neutral-500">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Habit Rows */}
            {activeHabits.map((habit) => {
              const stats = statsMap.get(habit.id) || { currentStreak: 0, bestStreak: 0, totalCompletions: 0 };

              return (
                <div key={habit.id} className="grid grid-cols-16 gap-1.5 py-3 items-center group">
                  <div className="col-span-4 pr-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-200 truncate">
                        {habit.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-0.5">
                          <Flame className="w-3 h-3" /> {stats.currentStreak}d
                        </span>
                        {consistenciesMap.get(habit.id) && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                              consistenciesMap.get(habit.id)!.rate >= 80
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : consistenciesMap.get(habit.id)!.rate >= 50
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            }`}
                            title={`7-Day consistency: ${consistenciesMap.get(habit.id)!.rate}%`}
                          >
                            7d: {consistenciesMap.get(habit.id)!.rate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      {habit.targetQuantity} {habit.unitOfMeasurement} ({habit.frequency})
                    </span>
                  </div>

                  {pastDays.map((dStr) => {
                    const scheduled = isHabitScheduledOnDate(habit, dStr);
                    const occ = occurrences.find((o) => o.habitId === habit.id && o.date === dStr);
                    const isDone = occ && occ.status === 'completed';
                    const isPartial = occ && occ.status === 'partial';

                    if (!scheduled) {
                      return (
                        <div
                          key={dStr}
                          className="h-8 rounded-lg bg-neutral-950/40 border border-neutral-900 flex items-center justify-center opacity-30"
                          title="Not scheduled on this day"
                        >
                          <span className="text-[10px] text-neutral-600">-</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={dStr}
                        onClick={() => {
                          if (habit.targetType !== 'binary') {
                            setInspectDate(dStr);
                            handleOpenQuantityModal(habit, dStr);
                          } else {
                            const nextStatus: HabitOccurrenceStatus = isDone ? 'missed' : 'completed';
                            recordHabitOccurrence(habit.id, dStr, nextStatus, isDone ? 0 : 1);
                          }
                        }}
                        className={`h-8 rounded-lg flex items-center justify-center border transition-all ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                            : isPartial
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-neutral-850 border-neutral-750 hover:border-neutral-500 text-transparent'
                        }`}
                        title={`${dStr}: ${isDone ? 'Completed' : isPartial ? 'Partial' : 'Click to complete'}`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        {isPartial && <span className="text-[10px] font-bold">½</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: Habit Cards & Detailed Streaks */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeHabits.map((habit) => {
            const stats = statsMap.get(habit.id) || { currentStreak: 0, bestStreak: 0, totalCompletions: 0 };
            const consistency = consistenciesMap.get(habit.id) || calculate7DayHabitConsistency(habit, occurrences, todayStr);
            const todayOcc = occurrences.find((o) => o.habitId === habit.id && o.date === todayStr);
            const isDoneToday = todayOcc?.status === 'completed';

            return (
              <div
                key={habit.id}
                className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        {habit.category}
                      </span>
                      <h3 className="text-base font-bold text-neutral-100 mt-0.5">{habit.name}</h3>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Target: {habit.targetQuantity} {habit.unitOfMeasurement} • <span className="capitalize">{habit.frequency.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingHabit(habit)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                        title="Edit habit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteHabitId(habit.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800"
                        title="Delete habit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {habit.description && (
                    <p className="text-xs text-neutral-400 leading-relaxed">{habit.description}</p>
                  )}

                  {/* Visual Streak Counter & 7-Day Consistency Progress Bar */}
                  <Habit7DayProgressBar
                    currentStreak={stats.currentStreak}
                    bestStreak={stats.bestStreak}
                    totalCompletions={stats.totalCompletions}
                    consistency={consistency}
                    todayStr={todayStr}
                  />
                </div>

                {/* Bottom completion button */}
                <button
                  onClick={() => {
                    if (habit.targetType !== 'binary') {
                      setInspectDate(todayStr);
                      handleOpenQuantityModal(habit, todayStr);
                    } else {
                      const next = isDoneToday ? 'missed' : 'completed';
                      recordHabitOccurrence(habit.id, todayStr, next, isDoneToday ? 0 : 1);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                    isDoneToday
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isDoneToday ? 'Completed Today' : 'Mark Completed Today'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: History Inspection */}
      {activeTab === 'calendar' && (
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-100">Historical Occurrence Inspector</h3>
              <p className="text-xs text-neutral-400">
                Inspect and modify past daily habit records without altering future routine rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-400 font-medium">Select Date:</label>
              <input
                type="date"
                value={inspectDate}
                onChange={(e) => setInspectDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {activeHabits.map((h) => {
              const occ = occurrences.find((o) => o.habitId === h.id && o.date === inspectDate);
              const scheduled = isHabitScheduledOnDate(h, inspectDate);
              const isDone = occ?.status === 'completed';

              return (
                <div
                  key={h.id}
                  className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-200">{h.name}</span>
                      {!scheduled && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-900 text-neutral-500">
                          Unscheduled Day
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Target: {h.targetQuantity} {h.unitOfMeasurement}
                      {occ && (
                        <span className="text-indigo-400 ml-2">
                          • Recorded: {occ.completedQuantity} {h.unitOfMeasurement}
                          {occ.completedDuration > 0 && ` (${occ.completedDuration}m)`}
                        </span>
                      )}
                    </div>
                    {occ?.notes && (
                      <p className="text-[11px] text-neutral-400 italic mt-1">Note: {occ.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenQuantityModal(h, inspectDate)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium"
                    >
                      Update Record
                    </button>
                    <button
                      onClick={() => {
                        const next = isDone ? 'missed' : 'completed';
                        recordHabitOccurrence(h.id, inspectDate, next, isDone ? 0 : h.targetQuantity);
                      }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-neutral-700 text-transparent hover:border-neutral-500'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity / Duration Occurrence Modal */}
      {quantityModalHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-100">
              Record Habit: {quantityModalHabit.name}
            </h3>
            <p className="text-xs text-neutral-400">Date: {inspectDate}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Completed Amount ({quantityModalHabit.unitOfMeasurement})
                </label>
                <input
                  type="number"
                  min="0"
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              {quantityModalHabit.targetType === 'duration' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Duration in Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inputDuration}
                    onChange={(e) => setInputDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Daily Habit Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Completed chapters 4 and 5"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQuantityModalHabit(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuantityOccurrence}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteHabitId}
        title="Delete Habit"
        message="Are you sure you want to remove this habit? Historical completion records will remain preserved in your analytics history."
        confirmLabel="Delete Habit"
        isDestructive
        onConfirm={handleDeleteHabit}
        onCancel={() => setDeleteHabitId(null)}
      />
    </div>
  );
};
