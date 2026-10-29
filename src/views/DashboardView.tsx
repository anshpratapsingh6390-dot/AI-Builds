import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Repeat,
  Target,
  Sparkles,
  ArrowUpRight,
  Play,
  Check,
  Calendar,
  AlertCircle,
  Plus,
  Flame,
  Zap,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { StatCard } from '../components/StatCard';
import { ScoreModal } from '../components/ScoreModal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  calculateHabitCompletionRate,
  calculateHabitStreak,
  calculateProductivityScore,
  calculateScheduleAdherence,
  calculateTaskCompletionRate,
  generateDeterministicInsights,
  isHabitScheduledOnDate,
} from '../utils/rules';
import { formatDuration, parseDate } from '../utils/dateUtils';
import { ViewType } from '../components/AppSidebar';

interface DashboardViewProps {
  onNavigate: (view: ViewType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    tasks,
    habits,
    occurrences,
    scheduleBlocks,
    timeSessions,
    goals,
    milestones,
    selectedDate,
    toggleTaskStatus,
    deleteTask,
    resetTask,
    recordHabitOccurrence,
    updateScheduleBlock,
    deleteScheduleBlock,
    resetScheduleBlock,
    startTimer,
    setQuickAddOpen,
    setQuickAddType,
    settings,
  } = useLifeOS();

  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Filter entities for selectedDate
  const todayTasks = tasks.filter((t) => t.dueDate === selectedDate || t.startDate === selectedDate);
  const todayBlocks = scheduleBlocks
    .filter((b) => b.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  // Scheduled habits for selectedDate
  const todayHabits = habits.filter((h) => isHabitScheduledOnDate(h, selectedDate));

  // Today's habit occurrences map
  const occMap = new Map();
  occurrences.forEach((occ) => {
    if (occ.date === selectedDate) {
      occMap.set(occ.habitId, occ);
    }
  });

  // Today's tracked time sessions
  const todaySessions = timeSessions.filter((s) => s.startTime.startsWith(selectedDate));
  const todayTrackedMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Metrics calculations
  const taskMetrics = calculateTaskCompletionRate(todayTasks);
  const habitMetrics = calculateHabitCompletionRate(habits, occurrences, selectedDate);
  const schedMetrics = calculateScheduleAdherence(todayBlocks);

  // Overall Productivity Score
  const scoreResult = calculateProductivityScore(
    taskMetrics.rate,
    habitMetrics.rate,
    schedMetrics.adherenceRate,
    settings.productivityWeights
  );

  // Habit streaks map
  const habitStreakMap = new Map<string, { current: number; best: number }>();
  let topStreakHabit: { name: string; streak: number } | undefined;
  todayHabits.forEach((h) => {
    const s = calculateHabitStreak(h, occurrences, selectedDate);
    habitStreakMap.set(h.id, { current: s.currentStreak, best: s.bestStreak });
    if (!topStreakHabit || s.currentStreak > topStreakHabit.streak) {
      topStreakHabit = { name: h.name, streak: s.currentStreak };
    }
  });

  // Active goals (max 3 for dashboard)
  const activeGoals = goals
    .filter((g) => g.status === 'in_progress')
    .slice(0, 3);

  // Rule-based insights
  const insights = generateDeterministicInsights({
    todayTasksCompleted: taskMetrics.completed,
    todayTasksPlanned: taskMetrics.totalPlanned,
    todayHabitsCompleted: habitMetrics.completedCount,
    todayHabitsScheduled: habitMetrics.scheduledCount,
    todayTrackedMinutes,
    todayPlannedMinutes: schedMetrics.totalPlannedMinutes,
    topHabitStreak: topStreakHabit,
    activeGoals: activeGoals.map((g) => ({
      title: g.title,
      remaining: Math.max(0, g.targetValue - g.currentValue),
      unit: g.unit,
    })),
  });

  const parsedDate = parseDate(selectedDate);
  const dayName = parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <span>{dayName}</span>
            <span>•</span>
            <span className="text-neutral-400">{monthDay}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 mt-0.5 tracking-tight">
            Productivity Cockpit
          </h1>
        </div>

        {/* Action quick links */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setQuickAddType('time');
              setQuickAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-850 text-xs font-medium transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Log Time</span>
          </button>
          <button
            onClick={() => onNavigate('planner')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-850 text-xs font-medium transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open Planner</span>
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-600/20 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Daily Review</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Tasks Completed"
          value={taskMetrics.totalPlanned > 0 ? `${taskMetrics.completed}/${taskMetrics.totalPlanned}` : '0 Planned'}
          subValue={taskMetrics.rate !== null ? `(${taskMetrics.rate}%)` : undefined}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          accentColor="#10b981"
          trend={
            taskMetrics.overdue > 0
              ? { text: `${taskMetrics.overdue} overdue`, isPositive: false }
              : taskMetrics.remaining > 0
              ? { text: `${taskMetrics.remaining} remaining`, isNeutral: true }
              : { text: 'All tasks clear', isPositive: true }
          }
          onClick={() => onNavigate('tasks')}
        />

        <StatCard
          label="Habits Finished"
          value={habitMetrics.scheduledCount > 0 ? `${habitMetrics.completedCount}/${habitMetrics.scheduledCount}` : 'None today'}
          subValue={habitMetrics.rate !== null ? `(${habitMetrics.rate}%)` : undefined}
          icon={<Repeat className="w-4 h-4 text-indigo-400" />}
          accentColor="#6366f1"
          trend={
            topStreakHabit && topStreakHabit.streak > 0
              ? { text: `Top streak: ${topStreakHabit.streak}d`, isPositive: true }
              : { text: 'Consistent routines', isNeutral: true }
          }
          onClick={() => onNavigate('habits')}
        />

        <StatCard
          label="Tracked Working Time"
          value={formatDuration(todayTrackedMinutes)}
          subValue={schedMetrics.totalPlannedMinutes > 0 ? `of ${formatDuration(schedMetrics.totalPlannedMinutes)} planned` : undefined}
          icon={<Clock className="w-4 h-4 text-sky-400" />}
          accentColor="#0ea5e9"
          trend={
            schedMetrics.varianceMinutes !== 0
              ? {
                  text: `${schedMetrics.varianceMinutes >= 0 ? '+' : ''}${formatDuration(schedMetrics.varianceMinutes)} variance`,
                  isNeutral: true,
                }
              : { text: 'On schedule', isPositive: true }
          }
          onClick={() => onNavigate('timer')}
        />

        {/* Productivity Score Card */}
        {settings.showProductivityScore && (
          <StatCard
            label="Productivity Score"
            value={scoreResult.score !== null ? `${scoreResult.score}%` : 'No Data'}
            subValue="View breakdown"
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            accentColor="#f59e0b"
            trend={{ text: 'Configurable formula', isNeutral: true }}
            onClick={() => setScoreModalOpen(true)}
          />
        )}
      </div>

      {/* Transparent Insights Banner */}
      {insights.length > 0 && (
        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>Deterministic Productivity Insights</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-300">
            {insights.map((text, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-850">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Section: Schedule & Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Today's Schedule Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-neutral-100">Today's Schedule</h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                {todayBlocks.length} blocks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setQuickAddType('schedule');
                  setQuickAddOpen(true);
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Block
              </button>
              <button
                onClick={() => onNavigate('planner')}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Full Day Timeline →
              </button>
            </div>
          </div>

          {todayBlocks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
              <Calendar className="w-8 h-8 text-neutral-600 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-neutral-300">No activities scheduled for today</p>
                <p className="text-xs text-neutral-500 mt-0.5">Plan your deep work, meetings, or workouts into time blocks.</p>
              </div>
              <button
                onClick={() => {
                  setQuickAddType('schedule');
                  setQuickAddOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium border border-neutral-700"
              >
                Schedule an Activity
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayBlocks.map((block) => {
                const isCompleted = block.status === 'completed';
                const isInProgress = block.status === 'in_progress';

                return (
                  <div
                    key={block.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? 'bg-neutral-950/40 border-neutral-850 opacity-80'
                        : isInProgress
                        ? 'bg-indigo-950/20 border-indigo-500/40'
                        : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() =>
                          updateScheduleBlock(block.id, {
                            status: isCompleted ? 'scheduled' : 'completed',
                            actualDuration: isCompleted ? 0 : block.plannedDuration,
                          })
                        }
                        className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 border transition-colors ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-neutral-700 hover:border-neutral-500 text-transparent'
                        }`}
                        aria-label={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              isCompleted ? 'line-through text-neutral-500' : 'text-neutral-100'
                            }`}
                          >
                            {block.title}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                            {block.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                          <span className="font-mono text-neutral-300">
                            {block.startTime} – {block.endTime}
                          </span>
                          <span>•</span>
                          <span>{formatDuration(block.plannedDuration)} planned</span>
                          {block.actualDuration > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-medium">
                                {formatDuration(block.actualDuration)} actual
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {!isCompleted && (
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
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
                          title="Start timer for this block"
                        >
                          <Play className="w-3 h-3 text-indigo-400" />
                          <span className="hidden sm:inline">Track Time</span>
                        </button>
                      )}

                      <button
                        onClick={() => resetScheduleBlock(block.id)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-indigo-400 border border-neutral-700 transition-colors"
                        title="Reset scheduled activity progress"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeleteBlockId(block.id)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-neutral-700 transition-colors"
                        title="Delete scheduled activity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Planned Tasks section on Dashboard */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-neutral-100">Tasks Due Today</h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                  {todayTasks.length}
                </span>
              </div>
              <button
                onClick={() => {
                  setQuickAddType('task');
                  setQuickAddOpen(true);
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 rounded-xl bg-neutral-900/40 border border-neutral-850">
                No tasks assigned specifically for today. Use the Tasks tab to view all or schedule new ones.
              </p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((t) => {
                  const done = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 flex items-center justify-between gap-3 text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleTaskStatus(t.id)}
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                            done
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-neutral-700 hover:border-neutral-500 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <span className={`font-medium ${done ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                            t.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : t.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {t.priority}
                        </span>

                        <button
                          onClick={() => resetTask(t.id)}
                          className="p-1 rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-indigo-400 transition-colors"
                          title="Reset task status"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => setDeleteTaskId(t.id)}
                          className="p-1 rounded-md bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Habits & Active Goals */}
        <div className="space-y-6">
          {/* Today's Habits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-neutral-100">Today's Habits</h3>
              </div>
              <button
                onClick={() => onNavigate('habits')}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                All Habits →
              </button>
            </div>

            {todayHabits.length === 0 ? (
              <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-2">
                <p className="text-xs text-neutral-400">No habits scheduled for today.</p>
                <button
                  onClick={() => {
                    setQuickAddType('habit');
                    setQuickAddOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 text-xs text-neutral-200 hover:bg-neutral-750"
                >
                  Create Habit
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayHabits.map((habit) => {
                  const occ = occMap.get(habit.id);
                  const isDone = occ && occ.status === 'completed';
                  const streak = habitStreakMap.get(habit.id)?.current || 0;

                  return (
                    <div
                      key={habit.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-950/10 border-emerald-500/30'
                          : 'bg-neutral-900/80 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const nextStatus = isDone ? 'missed' : 'completed';
                            recordHabitOccurrence(
                              habit.id,
                              selectedDate,
                              nextStatus,
                              isDone ? 0 : habit.targetQuantity,
                              isDone ? 0 : habit.targetType === 'duration' ? habit.targetQuantity : 0
                            );
                          }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                              : 'border-neutral-700 hover:border-neutral-500 text-transparent'
                          }`}
                          aria-label={`Toggle habit ${habit.name}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <div>
                          <span
                            className={`text-xs font-semibold block ${
                              isDone ? 'line-through text-neutral-400' : 'text-neutral-200'
                            }`}
                          >
                            {habit.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {habit.targetQuantity} {habit.unitOfMeasurement}
                          </span>
                        </div>
                      </div>

                      {/* Streak badge */}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{streak}d</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Goals Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-neutral-100">Key Goals</h3>
              </div>
              <button
                onClick={() => onNavigate('goals')}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Manage Goals →
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
                <p className="text-xs text-neutral-400">No active goals set yet.</p>
                <button
                  onClick={() => {
                    setQuickAddType('goal');
                    setQuickAddOpen(true);
                  }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-neutral-800 text-xs text-neutral-200 hover:bg-neutral-750"
                >
                  Set a Goal
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const target = goal.targetValue || 1;
                  const pct = Math.min(100, Math.round((goal.currentValue / target) * 100));

                  return (
                    <div
                      key={goal.id}
                      className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-neutral-200 block">
                            {goal.title}
                          </span>
                          <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                            {goal.horizon} • {goal.category}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-indigo-400">{pct}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </span>
                        <span>Deadline: {goal.targetDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Transparency Modal */}
      <ScoreModal
        isOpen={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        score={scoreResult.score}
        breakdown={scoreResult.breakdown}
        isInsufficientData={scoreResult.isInsufficientData}
      />

      {/* Delete Schedule Block Confirmation */}
      <ConfirmModal
        isOpen={!!deleteBlockId}
        title="Delete Schedule Activity"
        message="Are you sure you want to remove this scheduled activity from today's plan? If linked to a task, the task will be returned to your backlog."
        confirmLabel="Delete"
        isDestructive
        onConfirm={async () => {
          if (deleteBlockId) {
            await deleteScheduleBlock(deleteBlockId);
            setDeleteBlockId(null);
          }
        }}
        onCancel={() => setDeleteBlockId(null)}
      />

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTaskId}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action is permanent."
        confirmLabel="Delete"
        isDestructive
        onConfirm={async () => {
          if (deleteTaskId) {
            await deleteTask(deleteTaskId);
            setDeleteTaskId(null);
          }
        }}
        onCancel={() => setDeleteTaskId(null)}
      />
    </div>
  );
};
