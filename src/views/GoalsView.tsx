import React, { useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  Check,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Archive,
  BarChart2,
  Search,
  Filter,
  AlertCircle,
  XCircle,
  Percent,
  ListTodo,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { Goal, GoalHorizon, GoalStatus } from '../types';
import { calculateGoalProgress } from '../utils/rules';
import { formatDuration, getTodayDateString } from '../utils/dateUtils';
import { ConfirmModal } from '../components/ConfirmModal';
import { GoalModal } from '../components/GoalModal';
import { GoalFailureModal } from '../components/GoalFailureModal';
import { GoalRetryModal } from '../components/GoalRetryModal';

type GoalStatusFilter = 'all' | 'active' | 'upcoming' | 'completed' | 'failed' | 'archived';

export const GoalsView: React.FC = () => {
  const {
    goals,
    tasks,
    habits,
    scheduleBlocks,
    timeSessions,
    occurrences,
    milestones,
    deleteGoal,
    archiveGoal,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
  } = useLifeOS();

  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>('all');
  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Failure Analysis & Retry Modals
  const [goalToAnalyze, setGoalToAnalyze] = useState<Goal | null>(null);
  const [goalToRetry, setGoalToRetry] = useState<Goal | null>(null);

  // New milestone form
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // Calculate live progress & intelligent deadline status for every goal
  const todayStr = getTodayDateString();
  const goalProgressMap = new Map<
    string,
    ReturnType<typeof calculateGoalProgress>
  >();

  goals.forEach((g) => {
    const prog = calculateGoalProgress(
      g,
      timeSessions,
      tasks,
      occurrences,
      milestones,
      scheduleBlocks,
      todayStr
    );
    goalProgressMap.set(g.id, prog);
  });

  // Summary counts
  const totalCount = goals.length;
  const activeCount = goals.filter((g) => goalProgressMap.get(g.id)?.status === 'active').length;
  const completedCount = goals.filter((g) => goalProgressMap.get(g.id)?.status === 'completed').length;
  const failedCount = goals.filter((g) => goalProgressMap.get(g.id)?.status === 'failed').length;
  const upcomingCount = goals.filter((g) => goalProgressMap.get(g.id)?.status === 'upcoming').length;
  const archivedCount = goals.filter((g) => goalProgressMap.get(g.id)?.status === 'archived').length;

  // Average completion rate across non-archived goals
  const nonArchivedGoals = goals.filter((g) => goalProgressMap.get(g.id)?.status !== 'archived');
  const avgCompletionRate = nonArchivedGoals.length > 0
    ? Math.round(
        nonArchivedGoals.reduce((sum, g) => sum + (goalProgressMap.get(g.id)?.percentage || 0), 0) /
          nonArchivedGoals.length
      )
    : 0;

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    const prog = goalProgressMap.get(g.id);
    const evalStatus = prog?.status || 'active';

    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'archived') {
        if (evalStatus !== 'archived' && !g.isArchived) return false;
      } else {
        if (g.isArchived) return false;
        if (evalStatus !== statusFilter) return false;
      }
    } else {
      // By default, hide archived goals unless 'archived' filter is chosen
      if (g.isArchived || evalStatus === 'archived') return false;
    }

    // Horizon Filter
    if (activeHorizon !== 'all' && g.horizon !== activeHorizon) {
      return false;
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = g.title.toLowerCase().includes(q);
      const matchCategory = g.category.toLowerCase().includes(q);
      if (!matchTitle && !matchCategory) return false;
    }

    return true;
  });

  const handleAddMilestone = async (goalId: string) => {
    if (!newMilestoneTitle.trim()) return;
    await addMilestone({
      goalId,
      title: newMilestoneTitle.trim(),
      isCompleted: false,
      weight: 1,
    });
    setNewMilestoneTitle('');
  };

  const handleDeleteGoal = async () => {
    if (deleteGoalId) {
      await deleteGoal(deleteGoalId);
      if (selectedGoal?.id === deleteGoalId) {
        setSelectedGoal(null);
      }
      setDeleteGoalId(null);
    }
  };

  const handleArchiveGoal = async (id: string) => {
    await archiveGoal(id);
    if (selectedGoal?.id === id) {
      setSelectedGoal(null);
    }
    if (goalToAnalyze?.id === id) {
      setGoalToAnalyze(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Target className="w-3.5 h-3.5" />
            <span>Goal Intelligence & Performance Analysis</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Goal Management</h1>
          <p className="text-xs text-neutral-400">
            Multi-horizon goals linked to real Daily Planner activities and Tasks with automated deadline detection.
          </p>
        </div>

        <button
          onClick={() => {
            setGoalToEdit(null);
            setIsGoalModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-950 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* PROBLEM 6: High-Level Goal Dashboard Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Total Goals</span>
            <Target className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-neutral-100 font-mono">{totalCount}</div>
          <div className="text-[10px] text-neutral-400">All horizons</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Active</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">{activeCount}</div>
          <div className="text-[10px] text-neutral-400">In progress on track</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{completedCount}</div>
          <div className="text-[10px] text-neutral-400">Achieved targets</div>
        </div>

        <div
          onClick={() => setStatusFilter('failed')}
          className={`p-4 rounded-2xl border space-y-1 cursor-pointer transition-all ${
            failedCount > 0
              ? 'bg-rose-950/20 border-rose-500/40 hover:bg-rose-950/30'
              : 'bg-neutral-900/80 border-neutral-800'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
            <span>Failed</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{failedCount}</div>
          <div className="text-[10px] text-rose-300">Missed deadlines</div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Avg Completion</span>
            <Percent className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 font-mono">{avgCompletionRate}%</div>
          <div className="text-[10px] text-neutral-400">Across active goals</div>
        </div>
      </div>

      {/* Status Filters (PROBLEM 2: Dedicated Failed Goals Section) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'All Goals', count: totalCount },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { id: 'completed', label: 'Completed', count: completedCount },
            { id: 'failed', label: 'Failed', count: failedCount, isFailed: true },
            { id: 'archived', label: 'Archived', count: archivedCount },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            const isFailedTab = tab.isFailed;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as GoalStatusFilter)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  active
                    ? isFailedTab
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'bg-neutral-800 text-white shadow-xs'
                    : isFailedTab && tab.count > 0
                    ? 'text-rose-400 hover:bg-rose-950/20'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    active
                      ? 'bg-black/20 text-white'
                      : isFailedTab && tab.count > 0
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-neutral-900 text-neutral-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search goals by title..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 text-xs outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Secondary Horizon Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium text-neutral-400 pb-1">
        <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mr-1">Horizon:</span>
        {[
          { id: 'all', label: 'All Horizons' },
          { id: 'weekly', label: 'Weekly' },
          { id: 'monthly', label: 'Monthly' },
          { id: 'six_month', label: '6-Month' },
          { id: 'yearly', label: 'Yearly' },
          { id: 'custom', label: 'Custom' },
        ].map((h) => {
          const active = activeHorizon === h.id;
          return (
            <button
              key={h.id}
              onClick={() => setActiveHorizon(h.id as typeof activeHorizon)}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                active
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {h.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Goals Cards & Selected Goal Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 spans: Goals Cards */}
        <div className="lg:col-span-2 space-y-4">
          {filteredGoals.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-neutral-850 space-y-2">
              <Target className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-neutral-300">
                {statusFilter === 'failed'
                  ? 'No failed goals! Keep up the great consistency.'
                  : `No ${statusFilter === 'all' ? '' : statusFilter} goals found.`}
              </p>
              <p className="text-xs text-neutral-500">
                {statusFilter === 'failed'
                  ? 'Goals that pass their deadline without reaching their target will be recorded here.'
                  : 'Create a new goal to drive your daily planner actions.'}
              </p>
            </div>
          ) : (
            filteredGoals.map((goal) => {
              const prog = goalProgressMap.get(goal.id) || {
                targetValue: goal.targetValue,
                currentValue: 0,
                percentage: 0,
                remaining: goal.targetValue,
                isCompleted: false,
                paceStatus: 'not_started' as const,
                status: 'active' as GoalStatus,
                daysOverdue: undefined as number | undefined,
                deadlineDate: goal.targetDate,
              };

              const isFailed = prog.status === 'failed';
              const isCompleted = prog.status === 'completed';
              const isUpcoming = prog.status === 'upcoming';
              const isSelected = selectedGoal?.id === goal.id;
              const goalMilestones = milestones.filter((m) => m.goalId === goal.id);

              return (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3.5 ${
                    isSelected
                      ? isFailed
                        ? 'bg-neutral-900 border-rose-500/60 shadow-md shadow-rose-950/20'
                        : 'bg-neutral-900 border-indigo-500/60 shadow-md shadow-indigo-950/20'
                      : isFailed
                      ? 'bg-rose-950/10 border-rose-500/30 hover:border-rose-500/50'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      {/* Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Dynamic evaluated status badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isFailed
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isCompleted
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : isUpcoming
                              ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {prog.status}
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                          {goal.horizon}
                        </span>

                        <span className="text-[10px] font-semibold text-neutral-400">
                          {goal.category}
                        </span>

                        {/* Pace indicator (for active goals) */}
                        {!isFailed && !isCompleted && !isUpcoming && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              prog.paceStatus === 'ahead'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : prog.paceStatus === 'behind'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {prog.paceStatus.replace('_', ' ')}
                          </span>
                        )}

                        {goal.retryOfGoalId && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 font-medium">
                            Attempt 2+
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-neutral-100">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2">{goal.description}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xl font-extrabold font-mono ${
                          isFailed ? 'text-rose-400' : isCompleted ? 'text-emerald-400' : 'text-indigo-400'
                        }`}
                      >
                        {prog.percentage.toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {prog.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                  </div>

                  {/* Prominent Missed Deadline Notice for Failed Goals (PROBLEM 1) */}
                  {isFailed && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-semibold">You missed the deadline for this goal.</span>
                      </div>
                      <div className="text-[11px] font-mono text-rose-400 font-semibold">
                        {prog.remaining} {goal.unit} remaining
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFailed ? 'bg-rose-500' : isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>

                  {/* Footer details & Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-400 gap-2 pt-1">
                    <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span>Deadline: {goal.targetDate}</span>
                      {prog.daysOverdue && (
                        <span className="text-rose-400 font-bold font-sans">
                          ({prog.daysOverdue}d overdue)
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {(goal.linkedScheduleBlockIds || []).length} blocks, {(goal.linkedTaskIds || []).length} tasks
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Failed Goal Actions (PROBLEM 2 & 5) */}
                      {isFailed && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGoalToAnalyze(goal);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                            title="Analyse Why This Goal Failed"
                          >
                            <BarChart2 className="w-3 h-3" />
                            <span>Analyse Failure</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGoalToRetry(goal);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                            title="Retry Goal with New Deadline"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry Goal</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setGoalToEdit(goal);
                          setIsGoalModalOpen(true);
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-indigo-400 hover:bg-neutral-800 transition-colors"
                        title="Edit goal configuration"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveGoal(goal.id);
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                        title="Archive goal"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteGoalId(goal.id);
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 1 span: Selected Goal Inspector */}
        <div className="space-y-4">
          {selectedGoal ? (
            <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Goal Inspector
                    </span>
                    {goalProgressMap.get(selectedGoal.id)?.status === 'failed' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        FAILED
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-neutral-100 mt-0.5">{selectedGoal.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setGoalToEdit(selectedGoal);
                      setIsGoalModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-indigo-400 text-xs font-semibold border border-neutral-700 transition-colors"
                    title="Edit goal configuration"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Progress Detail */}
              {(() => {
                const prog = goalProgressMap.get(selectedGoal.id);
                const isFailed = prog?.status === 'failed';

                return (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                      isFailed
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-neutral-950 border-neutral-850'
                    }`}
                  >
                    <div className="flex justify-between text-neutral-300">
                      <span>Status</span>
                      <span
                        className={`font-bold uppercase tracking-wider text-[11px] ${
                          isFailed ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {prog?.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-300">
                      <span>Progress Achieved</span>
                      <span className={`font-bold font-mono ${isFailed ? 'text-rose-400' : 'text-indigo-400'}`}>
                        {prog?.percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Achieved:</span>
                      <span className="font-mono text-neutral-200">
                        {prog?.currentValue} {selectedGoal.unit}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Remaining:</span>
                      <span className={`font-mono ${isFailed ? 'text-rose-400' : 'text-amber-400'}`}>
                        {prog?.remaining} {selectedGoal.unit}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Deadline:</span>
                      <span className="font-mono text-neutral-200">{selectedGoal.targetDate}</span>
                    </div>

                    {isFailed && (
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-rose-500/20">
                        <button
                          onClick={() => setGoalToAnalyze(selectedGoal)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>Analyse Failure</span>
                        </button>
                        <button
                          onClick={() => setGoalToRetry(selectedGoal)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry Goal</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Linked Daily Planner Activities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Linked Planner Activities ({(selectedGoal.linkedScheduleBlockIds || []).length})</span>
                  </h4>
                </div>

                {(selectedGoal.linkedScheduleBlockIds || []).length === 0 ? (
                  <p className="text-[11px] text-neutral-500 italic p-3 rounded-xl bg-neutral-950 border border-neutral-850">
                    No Daily Planner blocks explicitly linked yet. Edit goal to link scheduled activities.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {scheduleBlocks
                      .filter((b) => (selectedGoal.linkedScheduleBlockIds || []).includes(b.id))
                      .map((b) => (
                        <div
                          key={b.id}
                          className="p-2 rounded-xl bg-neutral-950 border border-neutral-850 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-neutral-200 block">{b.title}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {b.date} • {b.startTime}–{b.endTime}
                            </span>
                          </div>
                          <div className="text-right text-[11px] font-mono">
                            <span className={b.actualDuration > 0 ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                              {b.actualDuration || 0}m actual
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Linked Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Linked Tasks ({(selectedGoal.linkedTaskIds || []).length})</span>
                  </h4>
                </div>

                {(selectedGoal.linkedTaskIds || []).length === 0 ? (
                  <p className="text-[11px] text-neutral-500 italic p-3 rounded-xl bg-neutral-950 border border-neutral-850">
                    No tasks explicitly linked yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {tasks
                      .filter((t) => (selectedGoal.linkedTaskIds || []).includes(t.id))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-xl bg-neutral-950 border border-neutral-850 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-neutral-200 block">{t.title}</span>
                            <span className="text-[10px] text-neutral-500">
                              {t.category} • {t.priority}
                            </span>
                          </div>
                          <div className="text-right text-[11px] font-mono">
                            <span className={t.status === 'completed' ? 'text-emerald-400 font-semibold' : 'text-neutral-400'}>
                              {t.actualDuration || 0}m actual
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Milestones Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Key Milestones
                  </h4>
                  <span className="text-[10px] text-neutral-500">Break down project steps</span>
                </div>

                <div className="space-y-2">
                  {milestones
                    .filter((m) => m.goalId === selectedGoal.id)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-850 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleMilestone(m.id)}
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              m.isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-neutral-700 hover:border-neutral-500 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <span
                            className={m.isCompleted ? 'line-through text-neutral-500' : 'text-neutral-200'}
                          >
                            {m.title}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteMilestone(m.id)}
                          className="text-neutral-600 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestone(selectedGoal.id);
                      }
                    }}
                    placeholder="Add milestone step..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 text-xs outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleAddMilestone(selectedGoal.id)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-850 text-center space-y-2">
              <Target className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs font-semibold text-neutral-400">Select a goal to view inspector</p>
              <p className="text-[11px] text-neutral-500">
                Inspect linked planner activities, tasks, failure analysis, and milestones.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Goal Configuration Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        goalToEdit={goalToEdit}
        onClose={() => {
          setIsGoalModalOpen(false);
          setGoalToEdit(null);
        }}
      />

      {/* Goal Failure Analysis Modal (PROBLEM 5) */}
      <GoalFailureModal
        isOpen={Boolean(goalToAnalyze)}
        goal={goalToAnalyze}
        scheduleBlocks={scheduleBlocks}
        tasks={tasks}
        timeSessions={timeSessions}
        occurrences={occurrences}
        milestones={milestones}
        onClose={() => setGoalToAnalyze(null)}
        onRetry={(goal) => {
          setGoalToAnalyze(null);
          setGoalToRetry(goal);
        }}
        onArchive={(goalId) => {
          handleArchiveGoal(goalId);
        }}
      />

      {/* Goal Retry Modal (PROBLEM 2) */}
      <GoalRetryModal
        isOpen={Boolean(goalToRetry)}
        goal={goalToRetry}
        scheduleBlocks={scheduleBlocks}
        tasks={tasks}
        timeSessions={timeSessions}
        occurrences={occurrences}
        milestones={milestones}
        onClose={() => setGoalToRetry(null)}
        onSuccess={(newId) => {
          // Select the newly created attempt
          const newlyCreated = goals.find((g) => g.id === newId);
          if (newlyCreated) setSelectedGoal(newlyCreated);
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteGoalId)}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? Linked tasks and activities will be preserved but unlinked."
        confirmLabel="Delete Goal"
        isDestructive
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteGoalId(null)}
      />
    </div>
  );
};
