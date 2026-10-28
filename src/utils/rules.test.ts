import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHabitStreak,
  calculate7DayHabitConsistency,
  calculateTaskCompletionRate,
  calculateScheduleAdherence,
  calculateProductivityScore,
  calculateGoalProgress,
  isHabitScheduledOnDate,
} from './rules';
import { checkTimeOverlap, formatDuration, timeToMinutes, minutesToTime } from './dateUtils';
import { Habit, Task, ScheduleBlock, Goal, TimeSession, GoalMilestone, HabitOccurrence } from '../types';

test('dateUtils: time conversions and overlap check', () => {
  assert.equal(timeToMinutes('09:30'), 570);
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(formatDuration(135), '2h 15m');
  assert.equal(formatDuration(45), '45m');

  // Overlap: 09:00 - 11:00 and 10:00 - 12:00 -> OVERLAP
  assert.equal(checkTimeOverlap('09:00', '11:00', '10:00', '12:00'), true);
  // Non-overlap: 09:00 - 10:00 and 10:00 - 11:00 -> NO OVERLAP
  assert.equal(checkTimeOverlap('09:00', '10:00', '10:00', '11:00'), false);
  // Inside: 09:00 - 12:00 and 10:00 - 11:00 -> OVERLAP
  assert.equal(checkTimeOverlap('09:00', '12:00', '10:00', '11:00'), true);
});

test('Habit frequency and scheduling rules', () => {
  const weekdayHabit: Habit = {
    id: 'h1',
    name: 'DSA Study',
    category: 'Study',
    icon: 'code',
    color: '#6366f1',
    startDate: '2026-10-01',
    frequency: 'weekdays',
    selectedWeekdays: [1, 2, 3, 4, 5],
    targetType: 'duration',
    targetQuantity: 60,
    unitOfMeasurement: 'minutes',
    isArchived: false,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  // 2026-10-23 is Friday (weekday) -> true
  assert.equal(isHabitScheduledOnDate(weekdayHabit, '2026-10-23'), true);
  // 2026-10-24 is Saturday (weekend) -> false
  assert.equal(isHabitScheduledOnDate(weekdayHabit, '2026-10-24'), false);
  // 2026-10-25 is Sunday (weekend) -> false
  assert.equal(isHabitScheduledOnDate(weekdayHabit, '2026-10-25'), false);
  // 2026-10-26 is Monday (weekday) -> true
  assert.equal(isHabitScheduledOnDate(weekdayHabit, '2026-10-26'), true);
});

test('Habit streak calculation handles unscheduled days without breaking', () => {
  const weekdayHabit: Habit = {
    id: 'h1',
    name: 'Work Coding',
    category: 'Work',
    icon: 'terminal',
    color: '#3b82f6',
    startDate: '2026-10-20',
    frequency: 'weekdays',
    selectedWeekdays: [1, 2, 3, 4, 5],
    targetType: 'binary',
    targetQuantity: 1,
    unitOfMeasurement: 'times',
    isArchived: false,
    createdAt: '2026-10-20',
    updatedAt: '2026-10-20',
  };

  // 2026-10-20 (Tue): completed
  // 2026-10-21 (Wed): completed
  // 2026-10-22 (Thu): completed
  // 2026-10-23 (Fri): completed
  // 2026-10-24 (Sat): weekend (not scheduled)
  // 2026-10-25 (Sun): weekend (not scheduled)
  // 2026-10-26 (Mon): completed
  const occurrences: HabitOccurrence[] = [
    { id: '1', habitId: 'h1', date: '2026-10-20', status: 'completed', completedQuantity: 1, completedDuration: 0, updatedAt: '' },
    { id: '2', habitId: 'h1', date: '2026-10-21', status: 'completed', completedQuantity: 1, completedDuration: 0, updatedAt: '' },
    { id: '3', habitId: 'h1', date: '2026-10-22', status: 'completed', completedQuantity: 1, completedDuration: 0, updatedAt: '' },
    { id: '4', habitId: 'h1', date: '2026-10-23', status: 'completed', completedQuantity: 1, completedDuration: 0, updatedAt: '' },
    { id: '5', habitId: 'h1', date: '2026-10-26', status: 'completed', completedQuantity: 1, completedDuration: 0, updatedAt: '' },
  ];

  const result = calculateHabitStreak(weekdayHabit, occurrences, '2026-10-26');
  // 5 scheduled days completed (Tue, Wed, Thu, Fri, Mon). Weekend didn't break streak!
  assert.equal(result.currentStreak, 5);
  assert.equal(result.bestStreak, 5);
  assert.equal(result.totalCompletions, 5);
});

test('Task completion rate excludes cancelled tasks and counts skipped in denominator', () => {
  const tasks: Task[] = [
    { id: 't1', title: 'Task 1', priority: 'high', status: 'completed', category: 'Work', estimatedDuration: 30, actualDuration: 30, tags: [], createdAt: '', updatedAt: '' },
    { id: 't2', title: 'Task 2', priority: 'medium', status: 'completed', category: 'Work', estimatedDuration: 30, actualDuration: 30, tags: [], createdAt: '', updatedAt: '' },
    { id: 't3', title: 'Task 3', priority: 'low', status: 'not_started', category: 'Work', estimatedDuration: 30, actualDuration: 0, tags: [], createdAt: '', updatedAt: '' },
    { id: 't4', title: 'Task 4', priority: 'low', status: 'skipped', category: 'Work', estimatedDuration: 30, actualDuration: 0, tags: [], createdAt: '', updatedAt: '' },
    { id: 't5', title: 'Task 5', priority: 'low', status: 'cancelled', category: 'Work', estimatedDuration: 30, actualDuration: 0, tags: [], createdAt: '', updatedAt: '' },
  ];

  const result = calculateTaskCompletionRate(tasks);
  // Eligible: t1, t2, t3, t4 = 4 total (t5 cancelled is excluded)
  // Completed: t1, t2 = 2
  // Rate = 2 / 4 = 50%
  assert.equal(result.totalPlanned, 4);
  assert.equal(result.completed, 2);
  assert.equal(result.rate, 50);
});

test('Schedule Adherence and Time Variance calculations', () => {
  const blocks: ScheduleBlock[] = [
    {
      id: 'b1',
      title: 'Deep Work',
      date: '2026-10-28',
      startTime: '09:00',
      endTime: '11:00',
      plannedDuration: 120,
      actualDuration: 135,
      category: 'Work',
      priority: 'high',
      status: 'completed',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'b2',
      title: 'Workout',
      date: '2026-10-28',
      startTime: '17:00',
      endTime: '18:00',
      plannedDuration: 60,
      actualDuration: 60,
      category: 'Health',
      priority: 'medium',
      status: 'completed',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const result = calculateScheduleAdherence(blocks);
  assert.equal(result.totalPlannedMinutes, 180);
  assert.equal(result.totalActualMinutes, 195);
  // Variance: 195 - 180 = +15 minutes
  assert.equal(result.varianceMinutes, 15);
  assert.equal(result.adherenceRate, 100);
});

test('Productivity score calculation with normalized weights and missing data', () => {
  // Scenario 1: All 3 components present
  // Task: 80%, Habit: 100%, Schedule: 90%
  // Weights: 40, 30, 30
  // Score = 0.4*80 + 0.3*100 + 0.3*90 = 32 + 30 + 27 = 89
  const res1 = calculateProductivityScore(80, 100, 90, { taskRate: 40, habitRate: 30, scheduleAdherence: 30 });
  assert.equal(res1.score, 89);
  assert.equal(res1.isInsufficientData, false);

  // Scenario 2: No schedule data (null), tasks and habits present
  // Weights re-normalize to 40/(40+30) and 30/(40+30)
  const res2 = calculateProductivityScore(100, 50, null, { taskRate: 40, habitRate: 30, scheduleAdherence: 30 });
  // weighted sum: 100 * (40/70) + 50 * (30/70) = 57.14 + 21.43 = 78.57 -> 79
  assert.equal(res2.score, 79);
  assert.equal(res2.isInsufficientData, false);

  // Scenario 3: All null -> Insufficient data
  const res3 = calculateProductivityScore(null, null, null);
  assert.equal(res3.score, null);
  assert.equal(res3.isInsufficientData, true);
});

test('Goal progress derivation without double counting', () => {
  const goal: Goal = {
    id: 'g-study',
    title: 'Study DSA 60 Hours',
    category: 'Study',
    horizon: 'monthly',
    startDate: '2026-10-01',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 60,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Study'],
    linkedHabitIds: [],
    linkedTaskIds: ['task-trees'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const sessions: TimeSession[] = [
    {
      id: 's1',
      title: 'Tree Problems',
      startTime: '2026-10-05T10:00:00Z',
      durationMinutes: 120, // 2 hours
      category: 'Study',
      linkedGoalId: 'g-study',
      linkedTaskId: 'task-trees',
      isManual: false,
      createdAt: '',
    },
    {
      id: 's2',
      title: 'Graph Problems',
      startTime: '2026-10-10T14:00:00Z',
      durationMinutes: 60, // 1 hour
      category: 'Study',
      isManual: false,
      createdAt: '',
    },
    {
      // Outside date window -> should NOT count
      id: 's3',
      title: 'Old session',
      startTime: '2026-09-20T10:00:00Z',
      durationMinutes: 180,
      category: 'Study',
      linkedGoalId: 'g-study',
      isManual: false,
      createdAt: '',
    },
  ];

  const progress = calculateGoalProgress(goal, sessions, [], [], []);
  // 120m (s1) + 60m (s2) = 180m = 3.0 hours.
  // Note s1 had both linkedGoalId and linkedTaskId and category, but counted strictly ONCE!
  assert.equal(progress.currentValue, 3);
  assert.equal(progress.remaining, 57);
  assert.equal(progress.percentage, 5); // 3 / 60 = 5%
  assert.equal(progress.isCompleted, false);
});

test('calculate7DayHabitConsistency: evaluates last 7 days against scheduled frequency', () => {
  const dailyHabit: Habit = {
    id: 'h-daily',
    name: 'Reading',
    category: 'Learning',
    icon: 'book',
    color: '#8b5cf6',
    startDate: '2026-10-01',
    frequency: 'daily',
    selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    targetType: 'quantity',
    targetQuantity: 20,
    unitOfMeasurement: 'pages',
    isArchived: false,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  // 7 days from 2026-10-22 to 2026-10-28
  // Complete 5 out of 7 days
  const occurrences: HabitOccurrence[] = [
    { id: '1', habitId: 'h-daily', date: '2026-10-28', status: 'completed', completedQuantity: 20, completedDuration: 0, updatedAt: '' },
    { id: '2', habitId: 'h-daily', date: '2026-10-27', status: 'completed', completedQuantity: 20, completedDuration: 0, updatedAt: '' },
    { id: '3', habitId: 'h-daily', date: '2026-10-26', status: 'completed', completedQuantity: 20, completedDuration: 0, updatedAt: '' },
    { id: '4', habitId: 'h-daily', date: '2026-10-25', status: 'completed', completedQuantity: 20, completedDuration: 0, updatedAt: '' },
    { id: '5', habitId: 'h-daily', date: '2026-10-24', status: 'completed', completedQuantity: 20, completedDuration: 0, updatedAt: '' },
    // 2026-10-23 missed, 2026-10-22 missed
  ];

  const res = calculate7DayHabitConsistency(dailyHabit, occurrences, '2026-10-28');
  assert.equal(res.scheduledDays, 7);
  assert.equal(res.completedDays, 5);
  // 5 / 7 = 71.4% -> 71%
  assert.equal(res.rate, 71);
  assert.equal(res.days.length, 7);
  assert.equal(res.days[6].date, '2026-10-28');
  assert.equal(res.days[6].isCompleted, true);
});
