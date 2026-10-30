import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  addDays,
  formatDateIso,
  formatDuration,
  getEndOfWeek,
  getMonthRange,
  getStartOfWeek,
  getTodayDateString,
  getYearRange,
  parseDate,
} from '../utils/dateUtils';
import {
  calculateHabitCompletionRate,
  calculateTaskCompletionRate,
  calculateCreditedWorkingTime,
} from '../utils/rules';

export const HistoryView: React.FC = () => {
  const {
    dailyReviews,
    weeklyReviews,
    monthlyReviews,
    yearlyReviews,
    saveDailyReview,
    saveWeeklyReview,
    saveMonthlyReview,
    saveYearlyReview,
    tasks,
    habits,
    occurrences,
    scheduleBlocks,
    timeSessions,
    selectedDate,
    settings,
  } = useLifeOS();

  const [reviewType, setReviewType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Daily review fields
  const [dailyDate, setDailyDate] = useState(selectedDate);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatDidNotGoWell, setWhatDidNotGoWell] = useState('');
  const [delaysReason, setDelaysReason] = useState('');
  const [whatLearned, setWhatLearned] = useState('');
  const [tomorrowImprovement, setTomorrowImprovement] = useState('');
  const [topPriorityTomorrow, setTopPriorityTomorrow] = useState('');

  // Weekly review fields
  const startWeek = formatDateIso(getStartOfWeek(parseDate(dailyDate), settings.weekStartDay));
  const endWeek = formatDateIso(getEndOfWeek(parseDate(dailyDate), settings.weekStartDay));
  const [weeklyAchievements, setWeeklyAchievements] = useState('');
  const [weeklyObstacles, setWeeklyObstacles] = useState('');
  const [weeklyLessons, setWeeklyLessons] = useState('');
  const [nextWeekPriorities, setNextWeekPriorities] = useState('');

  // Monthly review fields
  const currentMonthStr = dailyDate.slice(0, 7);
  const [monthlyAchievements, setMonthlyAchievements] = useState('');
  const [monthlyMissed, setMonthlyMissed] = useState('');
  const [monthlyPriorities, setNextMonthPriorities] = useState('');

  // Populate form if existing review exists
  useEffect(() => {
    if (reviewType === 'daily') {
      const existing = dailyReviews.find((r) => r.date === dailyDate);
      if (existing) {
        setWhatWentWell(existing.whatWentWell);
        setWhatDidNotGoWell(existing.whatDidNotGoWell);
        setDelaysReason(existing.delaysReason);
        setWhatLearned(existing.whatLearned);
        setTomorrowImprovement(existing.tomorrowImprovement);
        setTopPriorityTomorrow(existing.topPriorityTomorrow);
      } else {
        setWhatWentWell('');
        setWhatDidNotGoWell('');
        setDelaysReason('');
        setWhatLearned('');
        setTomorrowImprovement('');
        setTopPriorityTomorrow('');
      }
    } else if (reviewType === 'weekly') {
      const existing = weeklyReviews.find((r) => r.weekStart === startWeek);
      if (existing) {
        setWeeklyAchievements(existing.achievements);
        setWeeklyObstacles(existing.obstacles);
        setWeeklyLessons(existing.lessons);
        setNextWeekPriorities(existing.nextWeekPriorities);
      } else {
        setWeeklyAchievements('');
        setWeeklyObstacles('');
        setWeeklyLessons('');
        setNextWeekPriorities('');
      }
    } else if (reviewType === 'monthly') {
      const existing = monthlyReviews.find((r) => r.month === currentMonthStr);
      if (existing) {
        setMonthlyAchievements(existing.achievements);
        setMonthlyMissed(existing.missedTargets);
        setNextMonthPriorities(existing.nextMonthPriorities);
      } else {
        setMonthlyAchievements('');
        setMonthlyMissed('');
        setNextMonthPriorities('');
      }
    }
  }, [reviewType, dailyDate, startWeek, currentMonthStr, dailyReviews, weeklyReviews, monthlyReviews]);

  // Live auto-calculated summary for current review period
  const dayTasks = tasks.filter((t) => t.dueDate === dailyDate);
  const dayTaskMetrics = calculateTaskCompletionRate(dayTasks);
  const dayWorkingTime = useMemo(() => {
    return calculateCreditedWorkingTime(dailyDate, scheduleBlocks, timeSessions, tasks);
  }, [dailyDate, scheduleBlocks, timeSessions, tasks]);
  const dayTrackedMin = dayWorkingTime.totalTrackedMinutes;
  const dayHabitsRate = calculateHabitCompletionRate(habits, occurrences, dailyDate);

  const handleSaveDaily = async () => {
    await saveDailyReview({
      date: dailyDate,
      whatWentWell,
      whatDidNotGoWell,
      delaysReason,
      whatLearned,
      tomorrowImprovement,
      topPriorityTomorrow,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveWeekly = async () => {
    await saveWeeklyReview({
      weekStart: startWeek,
      weekEnd: endWeek,
      achievements: weeklyAchievements,
      incompleteGoals: '',
      habitReflections: '',
      timeAnalysis: '',
      obstacles: weeklyObstacles,
      lessons: weeklyLessons,
      nextWeekPriorities,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveMonthly = async () => {
    await saveMonthlyReview({
      month: currentMonthStr,
      achievements: monthlyAchievements,
      goalPercentages: '',
      habitTrends: '',
      timeAllocation: '',
      missedTargets: monthlyMissed,
      comparisons: '',
      nextMonthPriorities: monthlyPriorities,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Structured Retrospectives</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Reviews & Reflections</h1>
          <p className="text-xs text-neutral-400">
            Permanent journaling paired with automatic data summaries. Never lost, never overwritten.
          </p>
        </div>

        {/* Review Horizon Tabs */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
          {(['daily', 'weekly', 'monthly'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReviewType(type)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                reviewType === type
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {type} Review
            </button>
          ))}
        </div>
      </div>

      {/* Date Selector Row */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-neutral-200">
            {reviewType === 'daily'
              ? `Daily Retrospective for: ${dailyDate}`
              : reviewType === 'weekly'
              ? `Weekly Review: ${startWeek} to ${endWeek}`
              : `Monthly Review: ${currentMonthStr}`}
          </span>
        </div>

        <input
          type="date"
          value={dailyDate}
          onChange={(e) => setDailyDate(e.target.value)}
          className="px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200"
        />
      </div>

      {/* Auto-populated Period Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-950/60 border border-neutral-850">
        <div>
          <span className="text-[10px] uppercase font-semibold text-neutral-500">
            Tasks Completed Today
          </span>
          <div className="text-base font-bold text-neutral-200 mt-0.5">
            {dayTaskMetrics.totalPlanned > 0
              ? `${dayTaskMetrics.completed} of ${dayTaskMetrics.totalPlanned} (${dayTaskMetrics.rate}%)`
              : '0 tasks planned'}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-neutral-500">
            Recorded Focus Hours
          </span>
          <div className="text-base font-bold text-sky-400 mt-0.5 font-mono">
            {formatDuration(dayTrackedMin)}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-neutral-500">
            Habit Consistency
          </span>
          <div className="text-base font-bold text-indigo-400 mt-0.5 font-mono">
            {dayHabitsRate.scheduledCount > 0
              ? `${dayHabitsRate.completedCount}/${dayHabitsRate.scheduledCount} (${dayHabitsRate.rate}%)`
              : 'No scheduled habits'}
          </div>
        </div>
      </div>

      {/* Review Forms */}
      {reviewType === 'daily' && (
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                1. What went well today?
              </label>
              <textarea
                rows={3}
                placeholder="Wins, breakthroughs, completed milestones, flow states..."
                value={whatWentWell}
                onChange={(e) => setWhatWentWell(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                2. What did not go as planned?
              </label>
              <textarea
                rows={3}
                placeholder="Distractions, unfinished items, fatigue..."
                value={whatDidNotGoWell}
                onChange={(e) => setWhatDidNotGoWell(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                3. What caused friction or delays?
              </label>
              <textarea
                rows={3}
                placeholder="Underestimated task size, context switching, meetings..."
                value={delaysReason}
                onChange={(e) => setDelaysReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                4. What did I learn today?
              </label>
              <textarea
                rows={3}
                placeholder="Technical discoveries, algorithmic patterns, personal insights..."
                value={whatLearned}
                onChange={(e) => setWhatLearned(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                5. What should I improve tomorrow?
              </label>
              <textarea
                rows={2}
                placeholder="Adjust time blocks, start 30 min earlier, eliminate phone tab..."
                value={tomorrowImprovement}
                onChange={(e) => setTomorrowImprovement(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                6. Top #1 Priority for Tomorrow
              </label>
              <input
                type="text"
                placeholder="The single task that must get finished tomorrow..."
                value={topPriorityTomorrow}
                onChange={(e) => setTopPriorityTomorrow(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSaveDaily}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-950"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Daily Review
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {reviewType === 'weekly' && (
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Key Achievements & Goal Progress
            </label>
            <textarea
              rows={3}
              placeholder="Weekly goal milestones reached, hours logged..."
              value={weeklyAchievements}
              onChange={(e) => setWeeklyAchievements(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Obstacles & Friction Points
            </label>
            <textarea
              rows={3}
              placeholder="What impeded consistency or schedule adherence?"
              value={weeklyObstacles}
              onChange={(e) => setWeeklyObstacles(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Top Next Week Priorities
            </label>
            <textarea
              rows={3}
              placeholder="Key targets for next week..."
              value={nextWeekPriorities}
              onChange={(e) => setNextWeekPriorities(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSaveWeekly}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-950"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Weekly Review
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {reviewType === 'monthly' && (
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Monthly Achievements & Milestone Completion
            </label>
            <textarea
              rows={3}
              placeholder="Major goals achieved this month..."
              value={monthlyAchievements}
              onChange={(e) => setMonthlyAchievements(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Missed Targets & Root Causes
            </label>
            <textarea
              rows={3}
              placeholder="Why did specific targets fall short?"
              value={monthlyMissed}
              onChange={(e) => setMonthlyMissed(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Next Month's Strategic Priorities
            </label>
            <textarea
              rows={3}
              placeholder="Areas of focus for the upcoming month..."
              value={monthlyPriorities}
              onChange={(e) => setNextMonthPriorities(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSaveMonthly}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-950"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Monthly Review
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
