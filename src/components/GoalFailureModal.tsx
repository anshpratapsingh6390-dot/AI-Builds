import React from 'react';
import {
  X,
  AlertTriangle,
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Archive,
  BarChart2,
  ListTodo,
  TrendingDown,
  Info,
} from 'lucide-react';
import { Goal, ScheduleBlock, Task, TimeSession } from '../types';
import { analyzeGoalFailure, calculateGoalProgress } from '../utils/rules';
import { formatDuration } from '../utils/dateUtils';

interface GoalFailureModalProps {
  isOpen: boolean;
  goal: Goal | null;
  scheduleBlocks: ScheduleBlock[];
  tasks: Task[];
  timeSessions: TimeSession[];
  occurrences: any[];
  milestones: any[];
  onClose: () => void;
  onRetry: (goal: Goal) => void;
  onArchive: (goalId: string) => void;
}

export const GoalFailureModal: React.FC<GoalFailureModalProps> = ({
  isOpen,
  goal,
  scheduleBlocks,
  tasks,
  timeSessions,
  occurrences,
  milestones,
  onClose,
  onRetry,
  onArchive,
}) => {
  if (!isOpen || !goal) return null;

  const prog = calculateGoalProgress(
    goal,
    timeSessions,
    tasks,
    occurrences,
    milestones,
    scheduleBlocks
  );

  const analysis = analyzeGoalFailure(
    goal,
    prog,
    scheduleBlocks,
    tasks,
    timeSessions
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Goal Failure Analysis
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  Deadline: {goal.targetDate}
                </span>
              </div>
              <h2 className="text-lg font-bold text-neutral-100 mt-0.5">
                {goal.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Missed Deadline Alert Banner */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>You missed the deadline for this goal</span>
              </div>
              <p className="text-xs text-neutral-300">
                Target was <span className="font-semibold text-neutral-100">{goal.targetValue} {goal.unit}</span> by{' '}
                <span className="font-semibold text-neutral-100">{goal.targetDate}</span>. Only{' '}
                <span className="font-semibold text-rose-300">{prog.currentValue} {goal.unit}</span> ({prog.percentage.toFixed(1)}%) was completed before the deadline passed.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-black text-rose-400">{prog.percentage.toFixed(1)}%</div>
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                {prog.remaining} {goal.unit} missed
              </div>
            </div>
          </div>

          {/* Factual Metrics Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-indigo-400" />
                <span>Target</span>
              </div>
              <div className="text-base font-bold text-neutral-100 font-mono">
                {goal.targetValue} {goal.unit}
              </div>
              <div className="text-[10px] text-neutral-400">Planned Goal</div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Achieved</span>
              </div>
              <div className="text-base font-bold text-emerald-400 font-mono">
                {prog.currentValue} {goal.unit}
              </div>
              <div className="text-[10px] text-neutral-400">Actual Progress</div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3 text-rose-400" />
                <span>Missed</span>
              </div>
              <div className="text-base font-bold text-rose-400 font-mono">
                {prog.remaining} {goal.unit}
              </div>
              <div className="text-[10px] text-neutral-400">Remaining to Goal</div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <ListTodo className="w-3 h-3 text-sky-400" />
                <span>Activities</span>
              </div>
              <div className="text-base font-bold text-sky-400 font-mono">
                {analysis.completedActivitiesCount} / {analysis.totalActivitiesLinked}
              </div>
              <div className="text-[10px] text-neutral-400">Completed Links</div>
            </div>
          </div>

          {/* Factual Observations based on application data */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Factual System Observations</span>
            </h3>

            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2.5">
              {analysis.observations.map((obs, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{obs}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Activities Status Breakdown */}
          {analysis.incompleteActivities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Uncompleted or Deficit Linked Activities ({analysis.incompleteActivities.length})</span>
                </h3>
                <span className="text-[10px] text-neutral-400">Available to carry forward on retry</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {analysis.incompleteActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400">
                        {act.type === 'schedule' ? 'Planner Block' : 'Task'}
                      </span>
                      <span className="font-semibold text-neutral-200">{act.title}</span>
                      {act.date && (
                        <span className="text-[10px] text-neutral-400 font-mono">({act.date})</span>
                      )}
                    </div>
                    <div className="text-right text-[11px] font-mono text-neutral-400">
                      <span>Planned: {formatDuration(act.plannedMinutes)}</span>
                      <span className="mx-1">•</span>
                      <span className={act.actualMinutes > 0 ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                        Actual: {formatDuration(act.actualMinutes)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educational / Historical Strategy Tips */}
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
            <div className="space-y-1">
              <span className="font-bold">Next Steps for Improvement:</span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Retrying this goal preserves your full failure history for self-reflection while creating a fresh active cycle. You can either attempt the original target again or focus on the remaining {prog.remaining} {goal.unit}.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/95 sticky bottom-0 flex items-center justify-between gap-3">
          <button
            onClick={() => onArchive(goal.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive Goal</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium"
            >
              Close
            </button>
            <button
              onClick={() => onRetry(goal)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Goal with New Deadline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
