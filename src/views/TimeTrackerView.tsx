import React, { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  Tag,
  Target,
  Repeat,
  CheckSquare,
  Layers,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { TimeSession } from '../types';
import { formatDuration, getTodayDateString, parseDate } from '../utils/dateUtils';
import { StatCard } from '../components/StatCard';

export const TimeTrackerView: React.FC = () => {
  const {
    timeSessions,
    scheduleBlocks,
    tasks,
    habits,
    goals,
    categories,
    selectedDate,
    activeTimer,
    timerElapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    discardTimer,
    recordManualTime,
  } = useLifeOS();

  // Active timer configuration state (when starting a new session)
  const [timerTitle, setTimerTitle] = useState('');
  const [timerCategory, setTimerCategory] = useState(categories[0]?.name || 'Work');
  const [timerTaskId, setTimerTaskId] = useState('');
  const [timerHabitId, setTimerHabitId] = useState('');
  const [timerGoalId, setTimerGoalId] = useState('');
  const [stopNotes, setStopNotes] = useState('');
  const [showStopModal, setShowStopModal] = useState(false);

  // Manual log state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualMinutes, setManualMinutes] = useState(45);
  const [manualCategory, setManualCategory] = useState(categories[0]?.name || 'Study');
  const [manualDate, setManualDate] = useState(selectedDate);
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualHabitId, setManualHabitId] = useState('');
  const [manualGoalId, setManualGoalId] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Format timer seconds into HH:MM:SS
  const formatTimerDigits = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0'),
    };
  };

  const digits = formatTimerDigits(timerElapsedSeconds);

  // Filter sessions for selected date
  const daySessions = timeSessions
    .filter((s) => s.startTime.startsWith(selectedDate))
    .sort((a, b) => b.startTime.localeCompare(a.startTime));

  const totalTrackedMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Planned minutes from schedule blocks
  const dayBlocks = scheduleBlocks.filter((b) => b.date === selectedDate && b.status !== 'cancelled');
  const totalPlannedMinutes = dayBlocks.reduce((sum, b) => sum + (b.plannedDuration || 0), 0);
  const varianceMinutes = totalTrackedMinutes - totalPlannedMinutes;

  // Breakdown by category
  const categoryMinutesMap = new Map<string, number>();
  daySessions.forEach((s) => {
    const curr = categoryMinutesMap.get(s.category) || 0;
    categoryMinutesMap.set(s.category, curr + s.durationMinutes);
  });

  const handleStartNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    startTimer({
      title: timerTitle.trim() || 'Deep Work Session',
      category: timerCategory,
      linkedTaskId: timerTaskId || undefined,
      linkedHabitId: timerHabitId || undefined,
      linkedGoalId: timerGoalId || undefined,
    });
  };

  const handleConfirmStop = async () => {
    await stopAndSaveTimer(stopNotes.trim());
    setShowStopModal(false);
    setStopNotes('');
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    await recordManualTime({
      title: manualTitle.trim(),
      startTime: `${manualDate}T12:00:00Z`,
      durationMinutes: Number(manualMinutes) || 15,
      category: manualCategory,
      linkedTaskId: manualTaskId || undefined,
      linkedHabitId: manualHabitId || undefined,
      linkedGoalId: manualGoalId || undefined,
      isManual: true,
      notes: manualNotes.trim(),
    });
    setIsManualModalOpen(false);
    setManualTitle('');
    setManualNotes('');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Clock className="w-3.5 h-3.5" />
            <span>High-Precision Execution Clock</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Time Tracker</h1>
          <p className="text-xs text-neutral-400">
            Compare planned vs actual hours. Single source of truth links time to tasks and goals without duplicate counting.
          </p>
        </div>

        <button
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>Manual Entry</span>
        </button>
      </div>

      {/* Hero Stopwatch Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 relative overflow-hidden shadow-2xl">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
          {/* Active status indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-xs">
            <span className="relative flex h-2 w-2">
              {activeTimer && !activeTimer.isPaused && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  activeTimer && !activeTimer.isPaused
                    ? 'bg-emerald-500'
                    : activeTimer?.isPaused
                    ? 'bg-amber-500'
                    : 'bg-neutral-600'
                }`}
              ></span>
            </span>
            <span className="font-semibold text-neutral-300">
              {activeTimer && !activeTimer.isPaused
                ? `Recording: ${activeTimer.title}`
                : activeTimer?.isPaused
                ? 'Session Paused'
                : 'Ready to Record'}
            </span>
          </div>

          {/* Large Digital Clock Face */}
          <div className="flex items-center justify-center font-mono text-5xl sm:text-7xl font-extrabold tracking-tighter text-neutral-100 select-none">
            <span className="w-20 sm:w-28 text-center">{digits.h}</span>
            <span className="text-neutral-600">:</span>
            <span className="w-20 sm:w-28 text-center">{digits.m}</span>
            <span className="text-neutral-600">:</span>
            <span className="w-20 sm:w-28 text-center text-indigo-400">{digits.s}</span>
          </div>

          {/* Stopwatch Controls */}
          {activeTimer ? (
            <div className="flex items-center gap-3">
              {activeTimer.isPaused ? (
                <button
                  onClick={resumeTimer}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-950 transition-all hover:scale-[1.02]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Timer</span>
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md shadow-amber-950 transition-all hover:scale-[1.02]"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Timer</span>
                </button>
              )}

              <button
                onClick={() => setShowStopModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-950 transition-all hover:scale-[1.02]"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Save Session</span>
              </button>

              <button
                onClick={discardTimer}
                className="p-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition-colors"
                title="Discard session"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          ) : (
            /* Start Form */
            <form onSubmit={handleStartNewSession} className="w-full space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="What are you working on right now?"
                  value={timerTitle}
                  onChange={(e) => setTimerTitle(e.target.value)}
                  className="w-full sm:flex-1 px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500"
                />

                <select
                  value={timerCategory}
                  onChange={(e) => setTimerCategory(e.target.value)}
                  className="w-full sm:w-44 px-3 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-950 transition-all hover:scale-[1.02] shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Clock</span>
                </button>
              </div>

              {/* Interconnect dropdowns */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-400">
                <div className="flex items-center gap-1.5 bg-neutral-950/60 px-2.5 py-1.5 rounded-xl border border-neutral-850">
                  <CheckSquare className="w-3.5 h-3.5 text-neutral-500" />
                  <select
                    value={timerTaskId}
                    onChange={(e) => setTimerTaskId(e.target.value)}
                    className="bg-transparent text-neutral-300 focus:outline-none text-xs"
                  >
                    <option value="">Link Task (Optional)</option>
                    {tasks.filter((t) => t.status !== 'completed').map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-neutral-950/60 px-2.5 py-1.5 rounded-xl border border-neutral-850">
                  <Repeat className="w-3.5 h-3.5 text-neutral-500" />
                  <select
                    value={timerHabitId}
                    onChange={(e) => setTimerHabitId(e.target.value)}
                    className="bg-transparent text-neutral-300 focus:outline-none text-xs"
                  >
                    <option value="">Link Habit (Optional)</option>
                    {habits.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-neutral-950/60 px-2.5 py-1.5 rounded-xl border border-neutral-850">
                  <Target className="w-3.5 h-3.5 text-neutral-500" />
                  <select
                    value={timerGoalId}
                    onChange={(e) => setTimerGoalId(e.target.value)}
                    className="bg-transparent text-neutral-300 focus:outline-none text-xs"
                  >
                    <option value="">Link Goal (Optional)</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Tracked Actual Time"
          value={formatDuration(totalTrackedMinutes)}
          subValue={`${daySessions.length} recorded sessions`}
          icon={<Clock className="w-4 h-4 text-sky-400" />}
          accentColor="#0ea5e9"
        />

        <StatCard
          label="Planned Time (Schedule)"
          value={formatDuration(totalPlannedMinutes)}
          subValue={`${dayBlocks.length} planned blocks`}
          icon={<Calendar className="w-4 h-4 text-indigo-400" />}
          accentColor="#6366f1"
        />

        <StatCard
          label="Time Variance"
          value={`${varianceMinutes >= 0 ? '+' : ''}${formatDuration(varianceMinutes)}`}
          subValue={varianceMinutes >= 0 ? 'Over planned schedule' : 'Under planned schedule'}
          icon={<Layers className="w-4 h-4 text-amber-400" />}
          accentColor="#f59e0b"
          trend={{
            text: varianceMinutes >= 0 ? 'Exceeded target time' : 'Below planned budget',
            isNeutral: true,
          }}
        />
      </div>

      {/* Category Breakdown & Session Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 span: Category Distribution */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-100">Time by Category</h3>
            <span className="text-xs text-neutral-400">{formatDuration(totalTrackedMinutes)} total</span>
          </div>

          {categoryMinutesMap.size === 0 ? (
            <p className="text-xs text-neutral-500 italic py-6 text-center">
              No time tracked on this date yet.
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from(categoryMinutesMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([catName, minutes]) => {
                  const pct = totalTrackedMinutes > 0 ? Math.round((minutes / totalTrackedMinutes) * 100) : 0;
                  return (
                    <div key={catName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-200">{catName}</span>
                        <span className="text-neutral-400 font-mono">
                          {formatDuration(minutes)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right 2 spans: Today's Recorded Sessions Log */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-100">Sessions Log ({selectedDate})</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
              {daySessions.length} sessions
            </span>
          </div>

          <div className="space-y-2.5">
            {daySessions.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-8 text-center">
                No time logs recorded for this day. Start the clock or log a manual session.
              </p>
            ) : (
              daySessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-100">{session.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                        {session.category}
                      </span>
                      {session.isManual && (
                        <span className="text-[10px] text-neutral-500 italic">(Manual)</span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-neutral-400 mt-1 italic">"{session.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 self-end sm:self-center">
                    <span className="font-bold text-sky-400 font-sans text-sm">
                      {formatDuration(session.durationMinutes)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Save Session Notes Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-100">Save Completed Session</h3>
            <p className="text-xs text-neutral-400">
              You recorded {formatDuration(Math.round(timerElapsedSeconds / 60))}. Add optional reflection notes:
            </p>

            <textarea
              rows={3}
              placeholder="What did you achieve or run into during this focus block?"
              value={stopNotes}
              onChange={(e) => setStopNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStop}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Time Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-100">Log Manual Time Session</h3>

            <form onSubmit={handleSaveManual} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Offline Reading or Problem Solving"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    min="1"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
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
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Session Notes</label>
                <input
                  type="text"
                  placeholder="What was completed?"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
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
          </div>
        </div>
      )}
    </div>
  );
};
