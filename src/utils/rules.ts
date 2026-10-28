import {
  Goal,
  GoalMilestone,
  Habit,
  HabitOccurrence,
  ScheduleBlock,
  Task,
  TimeSession,
} from '../types';
import { formatDateIso, parseDate, timeToMinutes } from './dateUtils';

/**
 * Checks if a habit is scheduled on a given date.
 */
export function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.isArchived) return false;
  if (habit.startDate && dateStr < habit.startDate) return false;
  if (habit.endDate && dateStr > habit.endDate) return false;

  const date = parseDate(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'custom_days':
      return habit.selectedWeekdays?.includes(dayOfWeek) ?? false;
    default:
      return true;
  }
}

/**
 * Calculates current streak and best streak for a habit.
 * Streak rules:
 * - Unscheduled days do NOT break a streak.
 * - If today is scheduled and not yet completed, it does not break the streak accumulated up to yesterday.
 * - If a past scheduled day has no completed occurrence, the streak is broken.
 */
export function calculateHabitStreak(
  habit: Habit,
  occurrences: HabitOccurrence[],
  referenceDateStr: string
): { currentStreak: number; bestStreak: number; totalCompletions: number } {
  const occMap = new Map<string, HabitOccurrence>();
  for (const occ of occurrences) {
    if (occ.habitId === habit.id) {
      occMap.set(occ.date, occ);
    }
  }

  // Count total completions across all time
  let totalCompletions = 0;
  for (const occ of occMap.values()) {
    if (occ.status === 'completed' || occ.status === 'partial') {
      totalCompletions++;
    }
  }

  const startDate = habit.startDate ? parseDate(habit.startDate) : parseDate('2020-01-01');
  const refDate = parseDate(referenceDateStr);

  // If start date is after reference date, streak is 0
  if (startDate > refDate) {
    return { currentStreak: 0, bestStreak: 0, totalCompletions };
  }

  // Calculate current streak going backward from referenceDate
  let currentStreak = 0;
  let curr = new Date(refDate.getTime());
  let checkedToday = false;

  while (curr >= startDate) {
    const dStr = formatDateIso(curr);
    const scheduled = isHabitScheduledOnDate(habit, dStr);

    if (scheduled) {
      const occ = occMap.get(dStr);
      const isCompleted = occ && occ.status === 'completed';

      if (dStr === referenceDateStr && !checkedToday) {
        checkedToday = true;
        if (isCompleted) {
          currentStreak++;
        }
        // If not completed today, we don't break the streak yet, today is still in progress
      } else {
        if (isCompleted) {
          currentStreak++;
        } else {
          // Missed scheduled day -> breaks current streak
          break;
        }
      }
    }
    // If not scheduled, skip day without breaking streak
    curr.setDate(curr.getDate() - 1);
  }

  // Calculate best streak across entire history up to referenceDate
  let bestStreak = 0;
  let runningStreak = 0;
  const loopDate = new Date(startDate.getTime());

  while (loopDate <= refDate) {
    const dStr = formatDateIso(loopDate);
    if (isHabitScheduledOnDate(habit, dStr)) {
      const occ = occMap.get(dStr);
      if (occ && occ.status === 'completed') {
        runningStreak++;
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }
    loopDate.setDate(loopDate.getDate() + 1);
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  return { currentStreak, bestStreak, totalCompletions };
}

export interface DayConsistencyStatus {
  date: string;
  dayLabel: string;
  dayNum: number;
  isScheduled: boolean;
  isCompleted: boolean;
  isPartial: boolean;
  quantity?: number;
}

/**
 * Calculates 7-day habit consistency rate and chronological day breakdown.
 * Considers only scheduled days in the denominator according to the habit's frequency.
 */
export function calculate7DayHabitConsistency(
  habit: Habit,
  occurrences: HabitOccurrence[],
  referenceDateStr: string
): {
  scheduledDays: number;
  completedDays: number;
  rate: number;
  days: DayConsistencyStatus[];
} {
  const refDate = parseDate(referenceDateStr);
  const days: DayConsistencyStatus[] = [];
  let scheduledDays = 0;
  let completedWeight = 0;

  const occMap = new Map<string, HabitOccurrence>();
  for (const occ of occurrences) {
    if (occ.habitId === habit.id) {
      occMap.set(occ.date, occ);
    }
  }

  // 7 days ending on referenceDateStr (chronological from refDate - 6 to refDate)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate.getTime());
    d.setDate(d.getDate() - i);
    const dStr = formatDateIso(d);
    const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    const isScheduled = isHabitScheduledOnDate(habit, dStr);
    const occ = occMap.get(dStr);
    const isCompleted = occ?.status === 'completed';
    const isPartial = occ?.status === 'partial';

    if (isScheduled) {
      scheduledDays++;
      if (isCompleted) {
        completedWeight += 1;
      } else if (isPartial) {
        completedWeight += 0.5;
      }
    }

    days.push({
      date: dStr,
      dayLabel,
      dayNum: d.getDate(),
      isScheduled,
      isCompleted: !!isCompleted,
      isPartial: !!isPartial,
      quantity: occ?.completedQuantity,
    });
  }

  const rate = scheduledDays > 0 ? Math.min(100, Math.round((completedWeight / scheduledDays) * 100)) : 0;

  return {
    scheduledDays,
    completedDays: Math.floor(completedWeight),
    rate,
    days,
  };
}

/**
 * Task completion rate = Completed / Eligible Planned * 100.
 * Cancelled tasks are excluded from denominator.
 * Skipped tasks are included in denominator.
 */
export function calculateTaskCompletionRate(tasks: Task[]): {
  rate: number | null;
  totalPlanned: number;
  completed: number;
  inProgress: number;
  remaining: number;
  overdue: number;
} {
  const eligible = tasks.filter((t) => t.status !== 'cancelled');
  const totalPlanned = eligible.length;
  const completed = eligible.filter((t) => t.status === 'completed').length;
  const inProgress = eligible.filter((t) => t.status === 'in_progress').length;
  const remaining = eligible.filter((t) => t.status === 'not_started' || t.status === 'in_progress').length;
  
  // Overdue count: not completed/cancelled, and has dueDate < today
  const overdue = eligible.filter((t) => {
    if (t.status === 'completed' || t.status === 'skipped') return false;
    if (!t.dueDate) return false;
    return t.dueDate < formatDateIso(new Date());
  }).length;

  if (totalPlanned === 0) {
    return { rate: null, totalPlanned: 0, completed: 0, inProgress: 0, remaining: 0, overdue };
  }

  const rate = Math.round((completed / totalPlanned) * 100);
  return { rate, totalPlanned, completed, inProgress, remaining, overdue };
}

/**
 * Schedule Adherence:
 * Evaluates whether planned schedule blocks were executed with actual duration recorded,
 * or completed on time without severe variance.
 */
export function calculateScheduleAdherence(blocks: ScheduleBlock[]): {
  adherenceRate: number | null;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  varianceMinutes: number;
  completedBlocks: number;
  totalBlocks: number;
} {
  const eligible = blocks.filter((b) => b.status !== 'cancelled');
  if (eligible.length === 0) {
    return {
      adherenceRate: null,
      totalPlannedMinutes: 0,
      totalActualMinutes: 0,
      varianceMinutes: 0,
      completedBlocks: 0,
      totalBlocks: 0,
    };
  }

  let totalPlannedMinutes = 0;
  let totalActualMinutes = 0;
  let successfulBlocks = 0;

  for (const block of eligible) {
    const planned = block.plannedDuration || Math.max(0, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
    const actual = block.actualDuration || 0;
    totalPlannedMinutes += planned;
    totalActualMinutes += actual;

    if (block.status === 'completed') {
      successfulBlocks++;
    } else if (actual > 0 && planned > 0) {
      // Partial credit if worked at least 70% of planned
      const ratio = Math.min(actual / planned, 1);
      if (ratio >= 0.7) {
        successfulBlocks += 0.8;
      }
    }
  }

  const adherenceRate = Math.min(100, Math.round((successfulBlocks / eligible.length) * 100));
  const varianceMinutes = totalActualMinutes - totalPlannedMinutes;

  return {
    adherenceRate,
    totalPlannedMinutes,
    totalActualMinutes,
    varianceMinutes,
    completedBlocks: eligible.filter((b) => b.status === 'completed').length,
    totalBlocks: eligible.length,
  };
}

/**
 * Habit completion rate for a set of habits on a specific date (or date range).
 */
export function calculateHabitCompletionRate(
  habits: Habit[],
  occurrences: HabitOccurrence[],
  dateStr: string
): { rate: number | null; scheduledCount: number; completedCount: number } {
  const scheduled = habits.filter((h) => isHabitScheduledOnDate(h, dateStr));
  if (scheduled.length === 0) {
    return { rate: null, scheduledCount: 0, completedCount: 0 };
  }

  const occMap = new Map<string, HabitOccurrence>();
  for (const occ of occurrences) {
    if (occ.date === dateStr) {
      occMap.set(occ.habitId, occ);
    }
  }

  let completedCount = 0;
  for (const h of scheduled) {
    const occ = occMap.get(h.id);
    if (occ && (occ.status === 'completed' || occ.status === 'partial')) {
      completedCount += occ.status === 'completed' ? 1 : 0.5;
    }
  }

  const rate = Math.round((completedCount / scheduled.length) * 100);
  return { rate, scheduledCount: scheduled.length, completedCount: Math.floor(completedCount) };
}

/**
 * Unified Productivity Score Engine:
 * Formula: w1*taskRate + w2*habitRate + w3*adherence
 * Configurable weights that sum to 100.
 * Transparent handling of missing components.
 */
export function calculateProductivityScore(
  taskRate: number | null,
  habitRate: number | null,
  adherenceRate: number | null,
  weights = { taskRate: 40, habitRate: 30, scheduleAdherence: 30 }
): {
  score: number | null;
  breakdown: { label: string; rawValue: number | null; weight: number; effectiveWeight: number }[];
  isInsufficientData: boolean;
  message?: string;
} {
  const components = [
    { label: 'Tasks', value: taskRate, weight: weights.taskRate },
    { label: 'Habits', value: habitRate, weight: weights.habitRate },
    { label: 'Schedule', value: adherenceRate, weight: weights.scheduleAdherence },
  ];

  const available = components.filter((c) => c.value !== null);

  if (available.length === 0) {
    return {
      score: null,
      breakdown: components.map((c) => ({
        label: c.label,
        rawValue: null,
        weight: c.weight,
        effectiveWeight: 0,
      })),
      isInsufficientData: true,
      message: 'Insufficient data to compute score (no planned tasks, habits, or schedule).',
    };
  }

  const totalAvailableWeight = available.reduce((sum, c) => sum + c.weight, 0);

  if (totalAvailableWeight === 0) {
    return {
      score: null,
      breakdown: components.map((c) => ({
        label: c.label,
        rawValue: c.value,
        weight: c.weight,
        effectiveWeight: 0,
      })),
      isInsufficientData: true,
      message: 'Active weights sum to zero.',
    };
  }

  // Normalize available weights proportionally to 100%
  let weightedSum = 0;
  const breakdown = components.map((c) => {
    if (c.value === null) {
      return {
        label: c.label,
        rawValue: null,
        weight: c.weight,
        effectiveWeight: 0,
      };
    }
    const effectiveWeight = Math.round((c.weight / totalAvailableWeight) * 100);
    weightedSum += c.value * (c.weight / totalAvailableWeight);
    return {
      label: c.label,
      rawValue: c.value,
      weight: c.weight,
      effectiveWeight,
    };
  });

  const finalScore = Math.min(100, Math.max(0, Math.round(weightedSum)));

  return {
    score: finalScore,
    breakdown,
    isInsufficientData: false,
  };
}

/**
 * Derives goal progress from linked records without duplicate counting.
 */
export function calculateGoalProgress(
  goal: Goal,
  timeSessions: TimeSession[],
  tasks: Task[],
  occurrences: HabitOccurrence[],
  milestones: GoalMilestone[]
): {
  currentValue: number;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
  paceStatus: 'ahead' | 'on_track' | 'behind' | 'completed' | 'not_started';
} {
  let currentValue = goal.currentValue;

  switch (goal.progressMethod) {
    case 'automatic_time': {
      // Sum durations from time sessions in the date window linked directly to this goal,
      // or to linked tasks/habits, or matching categories.
      // Filter strictly to avoid double-counting.
      const seenSessions = new Set<string>();
      let totalMinutes = 0;

      for (const s of timeSessions) {
        if (seenSessions.has(s.id)) continue;

        // Check date window
        const sessionDate = s.startTime.slice(0, 10);
        if (goal.startDate && sessionDate < goal.startDate) continue;
        if (goal.targetDate && sessionDate > goal.targetDate) continue;

        const isLinkedGoal = s.linkedGoalId === goal.id;
        const isLinkedTask = s.linkedTaskId && goal.linkedTaskIds?.includes(s.linkedTaskId);
        const isLinkedHabit = s.linkedHabitId && goal.linkedHabitIds?.includes(s.linkedHabitId);
        const isLinkedCategory = goal.linkedCategories?.includes(s.category);

        if (isLinkedGoal || isLinkedTask || isLinkedHabit || isLinkedCategory) {
          seenSessions.add(s.id);
          totalMinutes += s.durationMinutes;
        }
      }

      // Convert to hours if goal unit is hours
      if (goal.unit.toLowerCase().includes('hour') || goal.unit.toLowerCase() === 'h' || goal.unit.toLowerCase() === 'hrs') {
        currentValue = Math.round((totalMinutes / 60) * 10) / 10;
      } else {
        currentValue = totalMinutes;
      }
      break;
    }

    case 'automatic_tasks': {
      // Count completed tasks linked to this goal
      const linked = tasks.filter((t) => {
        if (t.linkedGoalId !== goal.id && !goal.linkedTaskIds?.includes(t.id)) return false;
        if (goal.startDate && t.dueDate && t.dueDate < goal.startDate) return false;
        if (goal.targetDate && t.dueDate && t.dueDate > goal.targetDate) return false;
        return t.status === 'completed';
      });
      currentValue = linked.length;
      break;
    }

    case 'automatic_habits': {
      // Count completed occurrences of linked habits
      const linked = occurrences.filter((occ) => {
        if (!goal.linkedHabitIds?.includes(occ.habitId)) return false;
        if (goal.startDate && occ.date < goal.startDate) return false;
        if (goal.targetDate && occ.date > goal.targetDate) return false;
        return occ.status === 'completed';
      });
      currentValue = linked.length;
      break;
    }

    case 'milestones': {
      const goalMilestones = milestones.filter((m) => m.goalId === goal.id);
      if (goalMilestones.length === 0) {
        currentValue = 0;
      } else {
        const totalWeight = goalMilestones.reduce((sum, m) => sum + (m.weight || 1), 0);
        const completedWeight = goalMilestones
          .filter((m) => m.isCompleted)
          .reduce((sum, m) => sum + (m.weight || 1), 0);
        currentValue = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
      }
      break;
    }

    case 'manual':
    default:
      currentValue = goal.currentValue;
      break;
  }

  const target = goal.targetValue || 1;
  const percentage = Math.min(100, Math.max(0, Math.round((currentValue / target) * 100)));
  const remaining = Math.max(0, target - currentValue);
  const isCompleted = currentValue >= target;

  // Pace status calculation
  let paceStatus: 'ahead' | 'on_track' | 'behind' | 'completed' | 'not_started' = 'not_started';
  if (isCompleted) {
    paceStatus = 'completed';
  } else if (currentValue === 0) {
    paceStatus = 'not_started';
  } else if (goal.startDate && goal.targetDate) {
    const start = parseDate(goal.startDate).getTime();
    const end = parseDate(goal.targetDate).getTime();
    const now = new Date().getTime();
    const totalDuration = end - start;
    const elapsed = now - start;

    if (totalDuration > 0 && elapsed > 0) {
      const expectedProgress = Math.min(1, elapsed / totalDuration);
      const actualProgress = currentValue / target;
      if (actualProgress >= expectedProgress + 0.1) {
        paceStatus = 'ahead';
      } else if (actualProgress >= expectedProgress - 0.1) {
        paceStatus = 'on_track';
      } else {
        paceStatus = 'behind';
      }
    }
  }

  return {
    currentValue,
    percentage,
    remaining,
    isCompleted,
    paceStatus,
  };
}

/**
 * Deterministic, rule-based productivity insights engine.
 * Never invents explanations or relies on external APIs.
 */
export function generateDeterministicInsights(params: {
  todayTasksCompleted: number;
  todayTasksPlanned: number;
  todayHabitsCompleted: number;
  todayHabitsScheduled: number;
  todayTrackedMinutes: number;
  todayPlannedMinutes: number;
  weeklyTaskRate?: number | null;
  prevWeeklyTaskRate?: number | null;
  weeklyTrackedHours?: number;
  prevWeeklyTrackedHours?: number;
  topHabitStreak?: { name: string; streak: number };
  activeGoals?: { title: string; remaining: number; unit: string }[];
}): string[] {
  const insights: string[] = [];

  // Tasks insight
  if (params.todayTasksPlanned > 0) {
    insights.push(
      `You completed ${params.todayTasksCompleted} of your ${params.todayTasksPlanned} planned tasks today (${Math.round((params.todayTasksCompleted / params.todayTasksPlanned) * 100)}%).`
    );
  }

  // Time insight
  if (params.todayPlannedMinutes > 0 || params.todayTrackedMinutes > 0) {
    const plannedH = (params.todayPlannedMinutes / 60).toFixed(1);
    const actualH = (params.todayTrackedMinutes / 60).toFixed(1);
    const diff = params.todayTrackedMinutes - params.todayPlannedMinutes;
    if (params.todayPlannedMinutes > 0) {
      insights.push(
        `You planned ${plannedH}h of activity and recorded ${actualH}h (${diff >= 0 ? '+' : ''}${(diff / 60).toFixed(1)}h variance).`
      );
    } else {
      insights.push(`You tracked ${actualH}h of productive time today.`);
    }
  }

  // Habits insight
  if (params.todayHabitsScheduled > 0) {
    const habitRate = Math.round((params.todayHabitsCompleted / params.todayHabitsScheduled) * 100);
    insights.push(`Habit completion for today is ${habitRate}% (${params.todayHabitsCompleted}/${params.todayHabitsScheduled} completed).`);
  }

  // Streak insight
  if (params.topHabitStreak && params.topHabitStreak.streak >= 3) {
    insights.push(`"${params.topHabitStreak.name}" is on an active streak of ${params.topHabitStreak.streak} consecutive scheduled days.`);
  }

  // Trend comparison
  if (
    params.weeklyTrackedHours !== undefined &&
    params.prevWeeklyTrackedHours !== undefined &&
    params.prevWeeklyTrackedHours > 0
  ) {
    const change = Math.round(
      ((params.weeklyTrackedHours - params.prevWeeklyTrackedHours) / params.prevWeeklyTrackedHours) * 100
    );
    if (change > 0) {
      insights.push(`Tracked productive time is up by ${change}% compared with the previous week.`);
    } else if (change < 0) {
      insights.push(`Tracked productive time declined by ${Math.abs(change)}% compared with the previous week.`);
    }
  }

  // Goal pacing
  if (params.activeGoals && params.activeGoals.length > 0) {
    const g = params.activeGoals[0];
    insights.push(`You have ${g.remaining} ${g.unit} remaining to achieve "${g.title}".`);
  }

  return insights;
}
