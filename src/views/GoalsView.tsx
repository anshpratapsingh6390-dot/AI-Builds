import React, { useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Edit2,
  Trash2,
  Check,
  TrendingUp,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { Goal, GoalHorizon, GoalMilestone, GoalProgressMethod, GoalType, Priority } from '../types';
import { calculateGoalProgress } from '../utils/rules';
import { getTodayDateString, parseDate } from '../utils/dateUtils';
import { ConfirmModal } from '../components/ConfirmModal';
import { GoalModal } from '../components/GoalModal';

export const GoalsView: React.FC = () => {
  const {
    goals,
    tasks,
    habits,
    scheduleBlocks,
    timeSessions,
    occurrences,
    milestones,
    categories,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
  } = useLifeOS();

  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon | 'all'>('all');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // New milestone form
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // Calculate live progress for every goal using rule engine
  const goalProgressMap = new Map<
    string,
    ReturnType<typeof calculateGoalProgress>
  >();

  goals.forEach((g) => {
    const prog = calculateGoalProgress(g, timeSessions, tasks, occurrences, milestones, scheduleBlocks);
    goalProgressMap.set(g.id, prog);
  });

  const filteredGoals = goals.filter((g) => {
    if (activeHorizon === 'all') return true;
    return g.horizon === activeHorizon;
  });

  const activeCount = goals.filter((g) => g.status === 'in_progress').length;
  const completedCount = goals.filter((g) => g.status === 'completed' || goalProgressMap.get(g.id)?.isCompleted).length;

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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Target className="w-3.5 h-3.5" />
            <span>Goal Intelligence & Hierarchies</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Goal Management</h1>
          <p className="text-xs text-neutral-400">
            Multi-horizon goals (Weekly to Multi-Year) automatically derived from logged time, completed tasks, and habits.
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

      {/* Horizon Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-800 pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: 'all', label: 'All Horizons', count: goals.length },
          { id: 'weekly', label: 'Weekly', count: goals.filter((g) => g.horizon === 'weekly').length },
          { id: 'monthly', label: 'Monthly', count: goals.filter((g) => g.horizon === 'monthly').length },
          { id: 'six_month', label: '6-Month', count: goals.filter((g) => g.horizon === 'six_month').length },
          { id: 'yearly', label: 'Yearly', count: goals.filter((g) => g.horizon === 'yearly').length },
          { id: 'custom', label: 'Custom', count: goals.filter((g) => g.horizon === 'custom').length },
        ].map((tab) => {
          const active = activeHorizon === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveHorizon(tab.id as typeof activeHorizon)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                active
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${active ? 'bg-indigo-500/20 text-indigo-300' : 'bg-neutral-900 text-neutral-400'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Goals List & Selected Goal Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 spans: Goals Cards */}
        <div className="lg:col-span-2 space-y-4">
          {filteredGoals.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-neutral-850 space-y-2">
              <Target className="w-10 h-10 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-neutral-300">No goals found for this horizon</p>
              <p className="text-xs text-neutral-500">Create a new weekly, monthly, or yearly goal to drive your daily actions.</p>
            </div>
          ) : (
            filteredGoals.map((goal) => {
              const prog = goalProgressMap.get(goal.id) || {
                currentValue: 0,
                percentage: 0,
                remaining: goal.targetValue,
                isCompleted: false,
                paceStatus: 'not_started' as const,
              };

              const isSelected = selectedGoal?.id === goal.id;
              const goalMilestones = milestones.filter((m) => m.goalId === goal.id);

              return (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3.5 ${
                    isSelected
                      ? 'bg-neutral-900 border-indigo-500/60 shadow-md shadow-indigo-950/20'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                          {goal.horizon}
                        </span>
                        <span className="text-[10px] font-semibold text-neutral-400">
                          {goal.category}
                        </span>
                        {/* Pace indicator */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            prog.paceStatus === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : prog.paceStatus === 'ahead'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : prog.paceStatus === 'behind'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {prog.paceStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-neutral-100 mt-1">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{goal.description}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-indigo-400">{prog.percentage}%</div>
                      <span className="text-[10px] text-neutral-500">
                        {prog.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        prog.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>

                  {/* Footer details */}
                  <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Deadline: {goal.targetDate}</span>
                      <span>•</span>
                      <span>Method: {goal.progressMethod.replace('automatic_', 'auto ')}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {goalMilestones.length > 0 && (
                        <span className="text-[11px] text-neutral-400">
                          {goalMilestones.filter((m) => m.isCompleted).length}/{goalMilestones.length} milestones
                        </span>
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

        {/* Right 1 span: Selected Goal Inspector & Milestones */}
        <div className="space-y-4">
          {selectedGoal ? (
            <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Goal Inspector
                  </span>
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
                return (
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-300">
                      <span>Progress Achieved</span>
                      <span className="font-bold text-indigo-400">{prog?.percentage}%</span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Current Progress:</span>
                      <span className="font-mono text-neutral-200">
                        {prog?.currentValue} {selectedGoal.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Remaining to Target:</span>
                      <span className="font-mono text-amber-400">
                        {prog?.remaining} {selectedGoal.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Measurement Source:</span>
                      <span className="font-mono text-neutral-200">
                        {selectedGoal.progressMethod.replace('automatic_', 'Auto from ')}
                      </span>
                    </div>
                  </div>
                );
              })()}

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
                        className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => toggleMilestone(m.id)}
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
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
                          className="text-neutral-600 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                </div>

                {/* Add milestone inline input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="New milestone..."
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestone(selectedGoal.id);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleAddMilestone(selectedGoal.id)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Linked Records Summary */}
              <div className="pt-2 border-t border-neutral-800/80 text-xs text-neutral-400 space-y-1.5">
                <div className="font-semibold text-neutral-300">Single Source of Truth Links</div>
                <p className="text-[11px] leading-relaxed">
                  Working hours, tasks, or habits tagged with {selectedGoal.category} automatically update
                  this goal without duplicate manual input.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-2">
              <Target className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs font-semibold text-neutral-300">Select a Goal to Inspect</p>
              <p className="text-[11px] text-neutral-500">
                View milestones, derived time logs, pace indicators, and linked tasks.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Goal Creation & Edit Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        goalToEdit={goalToEdit}
        onClose={() => {
          setIsGoalModalOpen(false);
          setGoalToEdit(null);
        }}
      />

      {/* Delete Goal Modal */}
      <ConfirmModal
        isOpen={!!deleteGoalId}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? Linked tasks, habits, and time records will remain safely intact in their respective histories."
        confirmLabel="Delete Goal"
        isDestructive
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteGoalId(null)}
      />
    </div>
  );
};
