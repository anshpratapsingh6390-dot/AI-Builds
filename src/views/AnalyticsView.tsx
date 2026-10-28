import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  Repeat,
  Zap,
  TrendingUp,
  Layers,
  Sparkles,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  calculateHabitCompletionRate,
  calculateProductivityScore,
  calculateScheduleAdherence,
  calculateTaskCompletionRate,
  generateDeterministicInsights,
} from '../utils/rules';
import {
  addDays,
  formatDateIso,
  formatDuration,
  getDaysInMonth,
  getEndOfWeek,
  getMonthRange,
  getSixMonthRange,
  getStartOfWeek,
  getTodayDateString,
  getYearRange,
  parseDate,
} from '../utils/dateUtils';
import { StatCard } from '../components/StatCard';
import { ScoreModal } from '../components/ScoreModal';

export const AnalyticsView: React.FC = () => {
  const {
    tasks,
    habits,
    occurrences,
    scheduleBlocks,
    timeSessions,
    goals,
    selectedDate,
    settings,
  } = useLifeOS();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'six_month' | 'yearly'>('weekly');
  const [scoreModalOpen, setScoreModalOpen] = useState(false);

  const todayStr = getTodayDateString();
  const refDate = parseDate(selectedDate);

  // Compute date range based on active period
  let startDateStr = selectedDate;
  let endDateStr = selectedDate;
  let periodLabel = selectedDate;
  let daysInPeriod: string[] = [];

  if (period === 'daily') {
    startDateStr = selectedDate;
    endDateStr = selectedDate;
    periodLabel = selectedDate;
    daysInPeriod = [selectedDate];
  } else if (period === 'weekly') {
    const start = getStartOfWeek(refDate, settings.weekStartDay);
    const end = getEndOfWeek(refDate, settings.weekStartDay);
    startDateStr = formatDateIso(start);
    endDateStr = formatDateIso(end);
    periodLabel = `${startDateStr} to ${endDateStr}`;
    daysInPeriod = Array.from({ length: 7 }, (_, i) => formatDateIso(addDays(start, i)));
  } else if (period === 'monthly') {
    const y = refDate.getFullYear();
    const m = String(refDate.getMonth() + 1).padStart(2, '0');
    const range = getMonthRange(`${y}-${m}`);
    startDateStr = range.startDate;
    endDateStr = range.endDate;
    periodLabel = refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    daysInPeriod = getDaysInMonth(y, refDate.getMonth()).map(formatDateIso);
  } else if (period === 'six_month') {
    const y = refDate.getFullYear();
    const half: 1 | 2 = refDate.getMonth() < 6 ? 1 : 2;
    const range = getSixMonthRange(y, half);
    startDateStr = range.startDate;
    endDateStr = range.endDate;
    periodLabel = range.label;
  } else if (period === 'yearly') {
    const y = refDate.getFullYear();
    const range = getYearRange(String(y));
    startDateStr = range.startDate;
    endDateStr = range.endDate;
    periodLabel = `Year ${y}`;
  }

  // Filter records within period window
  const periodTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    return t.dueDate >= startDateStr && t.dueDate <= endDateStr;
  });

  const periodBlocks = scheduleBlocks.filter((b) => b.date >= startDateStr && b.date <= endDateStr);

  const periodSessions = timeSessions.filter((s) => {
    const sDate = s.startTime.slice(0, 10);
    return sDate >= startDateStr && sDate <= endDateStr;
  });

  const periodOccurrences = occurrences.filter((o) => o.date >= startDateStr && o.date <= endDateStr);

  // Period Metrics Calculations
  const taskMetrics = calculateTaskCompletionRate(periodTasks);
  const schedMetrics = calculateScheduleAdherence(periodBlocks);

  // Scheduled habits across the period
  let totalScheduledHabitSlots = 0;
  let totalCompletedHabitSlots = 0;
  if (daysInPeriod.length > 0) {
    daysInPeriod.forEach((dStr) => {
      const res = calculateHabitCompletionRate(habits, occurrences, dStr);
      totalScheduledHabitSlots += res.scheduledCount;
      totalCompletedHabitSlots += res.completedCount;
    });
  } else {
    // For 6-month or yearly, scan occurrences directly
    totalCompletedHabitSlots = periodOccurrences.filter((o) => o.status === 'completed').length;
    totalScheduledHabitSlots = Math.max(totalCompletedHabitSlots, 1);
  }

  const periodHabitRate =
    totalScheduledHabitSlots > 0
      ? Math.round((totalCompletedHabitSlots / totalScheduledHabitSlots) * 100)
      : null;

  const totalTrackedMinutes = periodSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Productivity score for the period
  const scoreResult = calculateProductivityScore(
    taskMetrics.rate,
    periodHabitRate,
    schedMetrics.adherenceRate,
    settings.productivityWeights
  );

  // Category distribution
  const categoryDistribution = new Map<string, number>();
  periodSessions.forEach((s) => {
    const prev = categoryDistribution.get(s.category) || 0;
    categoryDistribution.set(s.category, prev + s.durationMinutes);
  });

  // Daily trend data for weekly view
  const weeklyDayData = daysInPeriod.map((dStr) => {
    const d = parseDate(dStr);
    const daySessions = periodSessions.filter((s) => s.startTime.startsWith(dStr));
    const dayTrackedMin = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const dayBlocks = periodBlocks.filter((b) => b.date === dStr);
    const dayPlannedMin = dayBlocks.reduce((sum, b) => sum + (b.plannedDuration || 0), 0);
    return {
      date: dStr,
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
      dayNum: d.getDate(),
      trackedMinutes: dayTrackedMin,
      plannedMinutes: dayPlannedMin,
    };
  });

  const maxWeeklyMinutes = Math.max(
    ...weeklyDayData.map((d) => Math.max(d.trackedMinutes, d.plannedMinutes)),
    120
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Automated Performance Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Productivity Analytics</h1>
          <p className="text-xs text-neutral-400">
            Authoritative, rule-based calculations. No synthetic or hardcoded metrics.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
          {(['daily', 'weekly', 'monthly', 'six_month', 'yearly'] as const).map((p) => {
            const active = period === p;
            const labels = {
              daily: 'Daily',
              weekly: 'Weekly',
              monthly: 'Monthly',
              six_month: '6-Month',
              yearly: 'Yearly',
            };
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Period Range Banner */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs">
        <span className="font-semibold text-neutral-300">
          Selected Period: <span className="text-indigo-400 font-mono">{periodLabel}</span>
        </span>
        <span className="text-neutral-500">{periodSessions.length} time records analyzed</span>
      </div>

      {/* Core KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Task Completion Rate"
          value={taskMetrics.rate !== null ? `${taskMetrics.rate}%` : 'No Tasks'}
          subValue={taskMetrics.totalPlanned > 0 ? `${taskMetrics.completed}/${taskMetrics.totalPlanned} completed` : undefined}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          accentColor="#10b981"
          trend={
            taskMetrics.rate !== null && taskMetrics.rate >= 75
              ? { text: 'Strong execution rate', isPositive: true }
              : { text: `${taskMetrics.remaining} tasks pending`, isNeutral: true }
          }
        />

        <StatCard
          label="Tracked Productive Hours"
          value={formatDuration(totalTrackedMinutes)}
          subValue={schedMetrics.totalPlannedMinutes > 0 ? `of ${formatDuration(schedMetrics.totalPlannedMinutes)} planned` : undefined}
          icon={<Clock className="w-4 h-4 text-sky-400" />}
          accentColor="#0ea5e9"
          trend={{
            text: `${schedMetrics.varianceMinutes >= 0 ? '+' : ''}${formatDuration(schedMetrics.varianceMinutes)} variance`,
            isNeutral: true,
          }}
        />

        <StatCard
          label="Habit Consistency"
          value={periodHabitRate !== null ? `${periodHabitRate}%` : 'N/A'}
          subValue={totalScheduledHabitSlots > 0 ? `${totalCompletedHabitSlots}/${totalScheduledHabitSlots} scheduled days` : undefined}
          icon={<Repeat className="w-4 h-4 text-indigo-400" />}
          accentColor="#6366f1"
          trend={{ text: 'Multi-day routine adherence', isNeutral: true }}
        />

        {settings.showProductivityScore && (
          <StatCard
            label="Productivity Index"
            value={scoreResult.score !== null ? `${scoreResult.score}%` : 'N/A'}
            subValue="Click for breakdown"
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            accentColor="#f59e0b"
            onClick={() => setScoreModalOpen(true)}
          />
        )}
      </div>

      {/* Charts Section: Planned vs Actual Bars & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 spans: Planned vs Actual Time Comparison Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-100">
                Planned vs Actual Time Execution
              </h3>
              <p className="text-xs text-neutral-400">
                Visual comparison of scheduled commitment vs logged focus
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-3 h-3 rounded-md bg-neutral-700 inline-block" /> Planned
              </span>
              <span className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block" /> Actual Tracked
              </span>
            </div>
          </div>

          {period === 'weekly' && weeklyDayData.length > 0 ? (
            <div className="h-56 flex items-end justify-between gap-2 pt-6 px-2 border-b border-neutral-800">
              {weeklyDayData.map((d) => {
                const plannedH = (d.plannedMinutes / maxWeeklyMinutes) * 100;
                const actualH = (d.trackedMinutes / maxWeeklyMinutes) * 100;

                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                      {/* Planned Bar */}
                      <div
                        className="w-1/2 bg-neutral-700/80 rounded-t-md transition-all group-hover:bg-neutral-600"
                        style={{ height: `${Math.max(4, plannedH)}%` }}
                        title={`Planned: ${formatDuration(d.plannedMinutes)}`}
                      />
                      {/* Actual Tracked Bar */}
                      <div
                        className="w-1/2 bg-indigo-500 rounded-t-md transition-all group-hover:bg-indigo-400"
                        style={{ height: `${Math.max(4, actualH)}%` }}
                        title={`Actual: ${formatDuration(d.trackedMinutes)}`}
                      />
                    </div>
                    <div className="text-center text-[10px] text-neutral-400 font-mono">
                      <div className="font-bold text-neutral-300">{d.label}</div>
                      <div>{d.dayNum}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Summary Bar for Monthly / Yearly */
            <div className="p-8 rounded-xl bg-neutral-950/60 border border-neutral-850 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Planned Hours (Schedule Blocks)</span>
                  <span className="font-bold text-neutral-200">
                    {formatDuration(schedMetrics.totalPlannedMinutes)}
                  </span>
                </div>
                <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-neutral-600 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Actual Tracked Hours</span>
                  <span className="font-bold text-indigo-400">
                    {formatDuration(totalTrackedMinutes)}
                  </span>
                </div>
                <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        schedMetrics.totalPlannedMinutes > 0
                          ? (totalTrackedMinutes / schedMetrics.totalPlannedMinutes) * 100
                          : 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 span: Category Distribution */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-100">Category Allocation</h3>
            <span className="text-xs text-neutral-400 font-mono">
              {formatDuration(totalTrackedMinutes)}
            </span>
          </div>

          {categoryDistribution.size === 0 ? (
            <p className="text-xs text-neutral-500 italic py-12 text-center">
              No time tracked in this period.
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from(categoryDistribution.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([cat, minutes]) => {
                  const pct =
                    totalTrackedMinutes > 0
                      ? Math.round((minutes / totalTrackedMinutes) * 100)
                      : 0;

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-200">{cat}</span>
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
      </div>

      {/* Score Modal */}
      <ScoreModal
        isOpen={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        score={scoreResult.score}
        breakdown={scoreResult.breakdown}
        isInsufficientData={scoreResult.isInsufficientData}
      />
    </div>
  );
};
