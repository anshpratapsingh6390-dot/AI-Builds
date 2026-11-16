import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Calendar,
  Target,
  Clock,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Goal, ScheduleBlock, Task, TimeSession } from '../types';
import { calculateGoalProgress } from '../utils/rules';
import { addDays, formatDateIso, getTodayDateString, parseDate } from '../utils/dateUtils';
import { useLifeOS } from '../context/LifeOSContext';

interface GoalRetryModalProps {
  isOpen: boolean;
  goal: Goal | null;
  scheduleBlocks: ScheduleBlock[];
  tasks: Task[];
  timeSessions: TimeSession[];
  occurrences: any[];
  milestones: any[];
  onClose: () => void;
  onSuccess?: (newGoalId: string) => void;
}

export const GoalRetryModal: React.FC<GoalRetryModalProps> = ({
  isOpen,
  goal,
  scheduleBlocks,
  tasks,
  timeSessions,
  occurrences,
  milestones,
  onClose,
  onSuccess,
}) => {
  const { retryGoal } = useLifeOS();

  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState(getTodayDateString());
  const [newDeadline, setNewDeadline] = useState('');
  const [newTargetValue, setNewTargetValue] = useState<number | string>(10);
  const [carryForwardTasks, setCarryForwardTasks] = useState(true);
  const [carryForwardBlocks, setCarryForwardBlocks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goal && isOpen) {
      const today = getTodayDateString();
      setNewTitle(`${goal.title} (Retry)`);
      setNewStartDate(today);

      // Default deadline based on horizon
      const todayD = parseDate(today);
      let days = 7;
      if (goal.horizon === 'monthly') days = 30;
      else if (goal.horizon === 'six_month') days = 180;
      else if (goal.horizon === 'yearly') days = 365;

      const targetD = addDays(todayD, days);
      setNewDeadline(formatDateIso(targetD));
      setNewTargetValue(goal.targetValue);
      setCarryForwardTasks(true);
      setCarryForwardBlocks(true);
      setError(null);
    }
  }, [goal, isOpen]);

  if (!isOpen || !goal) return null;

  const prog = calculateGoalProgress(
    goal,
    timeSessions,
    tasks,
    occurrences,
    milestones,
    scheduleBlocks
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Please provide a title for the new attempt.');
      return;
    }

    const numVal = Number(newTargetValue);
    if (isNaN(numVal) || numVal <= 0) {
      setError('Target value must be a positive number.');
      return;
    }

    if (!newDeadline) {
      setError('Please set a new deadline.');
      return;
    }

    if (newStartDate && newDeadline && newStartDate > newDeadline) {
      setError('Start date cannot be after the deadline.');
      return;
    }

    setError(null);

    // Identify incomplete tasks to carry forward
    const uncompletedTasks = tasks
      .filter((t) => (goal.linkedTaskIds || []).includes(t.id) && t.status !== 'completed')
      .map((t) => t.id);

    // Identify incomplete schedule blocks
    const uncompletedBlocks = scheduleBlocks
      .filter((b) => (goal.linkedScheduleBlockIds || []).includes(b.id) && b.status !== 'completed')
      .map((b) => b.id);

    try {
      const newId = await retryGoal(goal.id, {
        newTitle: newTitle.trim(),
        newStartDate,
        newDeadline,
        newTargetValue: numVal,
        carryForwardTaskIds: carryForwardTasks ? uncompletedTasks : [],
        carryForwardBlockIds: carryForwardBlocks ? uncompletedBlocks : [],
      });

      if (onSuccess) onSuccess(newId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to retry goal.');
    }
  };

  const setPresetDeadline = (days: number) => {
    const base = parseDate(newStartDate || getTodayDateString());
    setNewDeadline(formatDateIso(addDays(base, days)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">Retry Goal Attempt</h2>
              <p className="text-xs text-neutral-400">
                Preserve historical failure record and start a new productive attempt cycle.
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Previous Attempt Summary Card */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
              Original Attempt History (Preserved)
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="font-semibold text-neutral-200">{goal.title}</span>
              <span className="font-mono text-rose-400 font-bold">Failed ({prog.percentage.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span>Achieved: {prog.currentValue} / {goal.targetValue} {goal.unit}</span>
              <span>Missed: {prog.remaining} {goal.unit}</span>
            </div>
          </div>

          {/* New Attempt Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              New Goal Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                New Start Date
              </label>
              <input
                type="date"
                required
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                New Target Deadline
              </label>
              <input
                type="date"
                required
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Quick Deadline Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-neutral-400 font-semibold mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => setPresetDeadline(7)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[11px] font-medium"
            >
              +7 Days
            </button>
            <button
              type="button"
              onClick={() => setPresetDeadline(14)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[11px] font-medium"
            >
              +14 Days
            </button>
            <button
              type="button"
              onClick={() => setPresetDeadline(30)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[11px] font-medium"
            >
              +30 Days
            </button>
          </div>

          {/* New Target Value with Quick Adjustment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Target Value ({goal.unit})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewTargetValue(goal.targetValue)}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Full Target ({goal.targetValue})
                </button>
                {prog.remaining > 0 && prog.remaining < goal.targetValue && (
                  <button
                    type="button"
                    onClick={() => setNewTargetValue(prog.remaining)}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Remaining Deficit ({prog.remaining})
                  </button>
                )}
              </div>
            </div>
            <input
              type="number"
              min="0.1"
              step="any"
              required
              value={newTargetValue}
              onChange={(e) => setNewTargetValue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Carry forward options */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="text-xs font-bold text-neutral-300">
              Carry Forward Uncompleted Work
            </div>

            <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={carryForwardTasks}
                onChange={(e) => setCarryForwardTasks(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>Carry forward uncompleted linked tasks to new attempt</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={carryForwardBlocks}
                onChange={(e) => setCarryForwardBlocks(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>Carry forward uncompleted Daily Planner activities to new attempt</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Launch New Attempt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
