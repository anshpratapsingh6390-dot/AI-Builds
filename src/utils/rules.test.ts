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
  calculateCreditedWorkingTime,
  calculatePeriodWorkingTime,
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

test('Schedule block and task reset state transitions', () => {
  // Initial completed block with tracked duration and variance notes
  const completedBlock: ScheduleBlock = {
    id: 'block-1',
    title: 'Deep Work: System Design',
    date: '2026-10-28',
    startTime: '10:00',
    endTime: '12:00',
    plannedDuration: 120,
    actualDuration: 135,
    category: 'Work',
    priority: 'high',
    status: 'completed',
    notes: 'Ran 15m over due to edge cases',
    linkedTaskId: 'task-1',
    createdAt: '2026-10-28T09:00:00Z',
    updatedAt: '2026-10-28T12:15:00Z',
  };

  // Reset operation returns block to unstarted scheduled state with 0 actual duration and empty notes
  const resetBlock: ScheduleBlock = {
    ...completedBlock,
    status: 'scheduled',
    actualDuration: 0,
    notes: '',
  };

  assert.equal(resetBlock.status, 'scheduled');
  assert.equal(resetBlock.actualDuration, 0);
  assert.equal(resetBlock.notes, '');
  assert.equal(resetBlock.linkedTaskId, 'task-1');

  // Completed task reset state
  const completedTask: Task = {
    id: 'task-1',
    title: 'Prepare RFC Documentation',
    category: 'Work',
    priority: 'high',
    estimatedDuration: 60,
    actualDuration: 75,
    status: 'completed',
    completedAt: '2026-10-28T12:00:00Z',
    tags: ['rfc', 'work'],
    scheduleBlockId: 'block-1',
    createdAt: '2026-10-28T08:00:00Z',
    updatedAt: '2026-10-28T12:00:00Z',
  };

  // Reset task operation resets status to not_started and clears completion & duration
  const resetTask: Task = {
    ...completedTask,
    status: 'not_started',
    actualDuration: 0,
    completedAt: undefined,
  };

  assert.equal(resetTask.status, 'not_started');
  assert.equal(resetTask.actualDuration, 0);
  assert.equal(resetTask.completedAt, undefined);

  // Unschedule operation: block is deleted and task.scheduleBlockId is cleared
  const unscheduledTask: Task = {
    ...resetTask,
    scheduleBlockId: undefined,
  };

  assert.equal(unscheduledTask.scheduleBlockId, undefined);
});

/* ==========================================================================
   TARGETED BUG FIX: TESTS 1 TO 9 (GOAL PROGRESS & TASK-GOAL LINKING)
   ========================================================================== */

test('TEST 1: 1.5h (90 min) completed task updates 15h goal to exactly 1.5h (10%), 13.5h remaining', () => {
  const goal: Goal = {
    id: 'goal-js-15h',
    title: "COMPLETE JAVASCRIPT SERIES'S",
    category: 'Coding',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 15,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Coding'],
    linkedHabitIds: [],
    linkedTaskIds: ['task-js-1'],
    status: 'in_progress',
    createdAt: '2026-10-25T08:00:00Z',
    updatedAt: '2026-10-25T08:00:00Z',
  };

  const task: Task = {
    id: 'task-js-1',
    title: "COMPLETE JAVASCRIPT SERIES'S",
    category: 'Coding',
    priority: 'high',
    status: 'completed',
    estimatedDuration: 90,
    actualDuration: 90, // 1 hour 30 mins
    dueDate: '2026-10-28',
    linkedGoalId: 'goal-js-15h',
    tags: ['javascript'],
    createdAt: '2026-10-28T09:00:00Z',
    updatedAt: '2026-10-28T10:30:00Z',
    completedAt: '2026-10-28T10:30:00Z',
  };

  const progress = calculateGoalProgress(goal, [], [task], [], [], []);
  // 90 minutes = 1.5 hours
  // Target: 15 hours
  // 1.5 / 15 = 10%
  // Remaining: 13.5 hours
  assert.equal(progress.currentValue, 1.5);
  assert.equal(progress.percentage, 10);
  assert.equal(progress.remaining, 13.5);
  assert.equal(progress.isCompleted, false);
});

test('TEST 2: Changing task title does NOT break goal-task relationship or affect progress calculation', () => {
  const goal: Goal = {
    id: 'goal-react',
    title: 'Master React & Vite',
    category: 'Coding',
    horizon: 'monthly',
    startDate: '2026-10-01',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 20,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Coding'],
    linkedHabitIds: [],
    linkedTaskIds: ['task-react-1'],
    status: 'in_progress',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const originalTask: Task = {
    id: 'task-react-1',
    title: 'Initial Title: Study Hooks',
    category: 'Coding',
    priority: 'high',
    status: 'completed',
    estimatedDuration: 120,
    actualDuration: 120, // 2 hours
    dueDate: '2026-10-15',
    linkedGoalId: 'goal-react',
    tags: [],
    createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T02:00:00Z',
  };

  const progBefore = calculateGoalProgress(goal, [], [originalTask], [], [], []);
  assert.equal(progBefore.currentValue, 2);

  // Rename task title completely
  const renamedTask: Task = {
    ...originalTask,
    title: 'Completely Changed Title: Deep Dive into useEffect & useRef',
  };

  const progAfter = calculateGoalProgress(goal, [], [renamedTask], [], [], []);
  // Progress MUST remain exactly the same because linking is ID-based, not name-based
  assert.equal(progAfter.currentValue, 2);
  assert.equal(progAfter.percentage, 10);
  assert.equal(progAfter.remaining, 18);
});

test('TEST 3: Two tasks with identical names linked to different goals are strictly isolated', () => {
  const goalA: Goal = {
    id: 'goal-a',
    title: 'Frontend Track',
    category: 'Coding',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: ['task-1'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const goalB: Goal = {
    id: 'goal-b',
    title: 'Backend Track',
    category: 'Coding',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: ['task-2'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  // Two tasks with IDENTICAL titles
  const task1: Task = {
    id: 'task-1',
    title: 'Build API Integration',
    category: 'Coding',
    priority: 'medium',
    status: 'completed',
    estimatedDuration: 60,
    actualDuration: 60, // 1 hour
    dueDate: '2026-10-26',
    linkedGoalId: 'goal-a',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  const task2: Task = {
    id: 'task-2',
    title: 'Build API Integration',
    category: 'Coding',
    priority: 'medium',
    status: 'completed',
    estimatedDuration: 180,
    actualDuration: 180, // 3 hours
    dueDate: '2026-10-27',
    linkedGoalId: 'goal-b',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  const allTasks = [task1, task2];

  const progA = calculateGoalProgress(goalA, [], allTasks, [], [], []);
  const progB = calculateGoalProgress(goalB, [], allTasks, [], [], []);

  assert.equal(progA.currentValue, 1.0); // Only task-1
  assert.equal(progB.currentValue, 3.0); // Only task-2
});

test('TEST 4: Preventing double counting when time session is linked to both task and goal', () => {
  const goal: Goal = {
    id: 'goal-dsa',
    title: 'DSA Practice',
    category: 'Study',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Study'],
    linkedHabitIds: [],
    linkedTaskIds: ['task-dsa-1'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const task: Task = {
    id: 'task-dsa-1',
    title: 'Solve Leetcode DP',
    category: 'Study',
    priority: 'high',
    status: 'completed',
    estimatedDuration: 90,
    actualDuration: 90, // 90 min recorded on task
    dueDate: '2026-10-28',
    linkedGoalId: 'goal-dsa',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  // A time session also recorded for the same work (90 min)
  const session: TimeSession = {
    id: 'session-dsa-1',
    title: 'DP Session',
    startTime: '2026-10-28T14:00:00Z',
    durationMinutes: 90,
    category: 'Study',
    linkedTaskId: 'task-dsa-1',
    linkedGoalId: 'goal-dsa',
    isManual: false,
    createdAt: '',
  };

  const progress = calculateGoalProgress(goal, [session], [task], [], [], []);
  // MUST NOT double-count to 180 min (3.0h). Must be exactly 90 min = 1.5 hours!
  assert.equal(progress.currentValue, 1.5);
  assert.equal(progress.percentage, 15);
  assert.equal(progress.remaining, 8.5);
});

test('TEST 5: Schedule block actualDuration contributes to linked task and goal without double counting', () => {
  const goal: Goal = {
    id: 'goal-arch',
    title: 'System Architecture',
    category: 'Work',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 5,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: ['task-arch-1'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const task: Task = {
    id: 'task-arch-1',
    title: 'Design Cache Strategy',
    category: 'Work',
    priority: 'high',
    status: 'completed',
    estimatedDuration: 60,
    actualDuration: 60, // 1 hour synced
    dueDate: '2026-10-27',
    linkedGoalId: 'goal-arch',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  const block: ScheduleBlock = {
    id: 'block-arch-1',
    title: 'Design Cache Strategy Block',
    date: '2026-10-27',
    startTime: '10:00',
    endTime: '11:00',
    plannedDuration: 60,
    actualDuration: 60,
    category: 'Work',
    priority: 'high',
    status: 'completed',
    linkedTaskId: 'task-arch-1',
    linkedGoalId: 'goal-arch',
    createdAt: '',
    updatedAt: '',
  };

  // Both task and block exist with 60 min
  const prog = calculateGoalProgress(goal, [], [task], [], [], [block]);
  // Exactly 1.0 hour, no double counting!
  assert.equal(prog.currentValue, 1.0);
  assert.equal(prog.percentage, 20);
  assert.equal(prog.remaining, 4.0);
});

test('TEST 6: Unit conversions and progress percentage capped at 100%', () => {
  const hourGoal: Goal = {
    id: 'goal-hr',
    title: 'Hour Goal',
    category: 'Study',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'medium',
    goalType: 'duration',
    targetValue: 2,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Study'],
    linkedHabitIds: [],
    linkedTaskIds: [],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  // 150 minutes logged = 2.5 hours (exceeds 2 hours target)
  const session: TimeSession = {
    id: 'sess-over',
    title: 'Long Session',
    startTime: '2026-10-26T10:00:00Z',
    durationMinutes: 150,
    category: 'Study',
    linkedGoalId: 'goal-hr',
    isManual: false,
    createdAt: '',
  };

  const prog = calculateGoalProgress(hourGoal, [session], [], [], [], []);
  assert.equal(prog.currentValue, 2.5);
  // Capped at 100%
  assert.equal(prog.percentage, 100);
  assert.equal(prog.remaining, 0);
  assert.equal(prog.isCompleted, true);
});

test('TEST 7: Date window filtering excludes work outside startDate and deadline', () => {
  const goal: Goal = {
    id: 'goal-window',
    title: 'Sprint 42 Work',
    category: 'Work',
    horizon: 'custom',
    startDate: '2026-10-10',
    targetDate: '2026-10-20',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Work'],
    linkedHabitIds: [],
    linkedTaskIds: [],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const sessions: TimeSession[] = [
    {
      id: 's-early',
      title: 'Before sprint',
      startTime: '2026-10-05T10:00:00Z',
      durationMinutes: 120, // 2h -> outside
      category: 'Work',
      linkedGoalId: 'goal-window',
      isManual: false,
      createdAt: '',
    },
    {
      id: 's-in',
      title: 'During sprint',
      startTime: '2026-10-15T10:00:00Z',
      durationMinutes: 180, // 3h -> inside
      category: 'Work',
      linkedGoalId: 'goal-window',
      isManual: false,
      createdAt: '',
    },
    {
      id: 's-late',
      title: 'After deadline',
      startTime: '2026-10-25T10:00:00Z',
      durationMinutes: 240, // 4h -> outside
      category: 'Work',
      linkedGoalId: 'goal-window',
      isManual: false,
      createdAt: '',
    },
  ];

  const prog = calculateGoalProgress(goal, sessions, [], [], [], []);
  assert.equal(prog.currentValue, 3.0); // Only s-in counted
  assert.equal(prog.percentage, 30);
  assert.equal(prog.remaining, 7.0);
});

test('TEST 8: Non-time goal methods (automatic_tasks, automatic_habits, milestones)', () => {
  // 1. Task count goal
  const taskGoal: Goal = {
    id: 'goal-tasks-count',
    title: 'Complete 5 Core Bugs',
    category: 'Work',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'completion',
    targetValue: 5,
    currentValue: 0,
    unit: 'tasks',
    progressMethod: 'automatic_tasks',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: ['t1', 't2', 't3'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const tasks: Task[] = [
    { id: 't1', title: 'T1', category: 'Work', priority: 'medium', status: 'completed', estimatedDuration: 30, actualDuration: 30, tags: [], createdAt: '', updatedAt: '' },
    { id: 't2', title: 'T2', category: 'Work', priority: 'medium', status: 'completed', estimatedDuration: 30, actualDuration: 30, tags: [], createdAt: '', updatedAt: '' },
    { id: 't3', title: 'T3', category: 'Work', priority: 'medium', status: 'in_progress', estimatedDuration: 30, actualDuration: 0, tags: [], createdAt: '', updatedAt: '' },
  ];

  const taskProg = calculateGoalProgress(taskGoal, [], tasks, [], [], []);
  assert.equal(taskProg.currentValue, 2); // 2 of 5 completed
  assert.equal(taskProg.percentage, 40);

  // 2. Milestone goal
  const milestoneGoal: Goal = {
    id: 'goal-ms',
    title: 'Product Launch',
    category: 'Work',
    horizon: 'six_month',
    startDate: '2026-10-01',
    targetDate: '2026-12-31',
    priority: 'urgent',
    goalType: 'milestone',
    targetValue: 100,
    currentValue: 0,
    unit: '%',
    progressMethod: 'milestones',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: [],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const milestones: GoalMilestone[] = [
    { id: 'm1', goalId: 'goal-ms', title: 'Alpha Release', weight: 1, isCompleted: true, createdAt: '' },
    { id: 'm2', goalId: 'goal-ms', title: 'Beta Release', weight: 1, isCompleted: true, createdAt: '' },
    { id: 'm3', goalId: 'goal-ms', title: 'Security Audit', weight: 1, isCompleted: false, createdAt: '' },
    { id: 'm4', goalId: 'goal-ms', title: 'General Availability', weight: 1, isCompleted: false, createdAt: '' },
  ];

  const msProg = calculateGoalProgress(milestoneGoal, [], [], [], milestones, []);
  assert.equal(msProg.currentValue, 50); // 2 of 4 milestones = 50%
  assert.equal(msProg.percentage, 50);
});

test('TEST 9: Bidirectional linking consistency: linking task updates goal progress, unlinking drops contribution', () => {
  const goal: Goal = {
    id: 'goal-bidirectional',
    title: 'Build Feature Set',
    category: 'Work',
    horizon: 'monthly',
    startDate: '2026-10-01',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: [], // initially empty
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const task: Task = {
    id: 'task-feature-x',
    title: 'Implement Auth Flow',
    category: 'Work',
    priority: 'high',
    status: 'completed',
    estimatedDuration: 180,
    actualDuration: 180, // 3 hours
    dueDate: '2026-10-15',
    linkedGoalId: undefined, // initially unlinked
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  // Initially unlinked: progress is 0
  const progInitial = calculateGoalProgress(goal, [], [task], [], [], []);
  assert.equal(progInitial.currentValue, 0);

  // Link task: either task.linkedGoalId or goal.linkedTaskIds
  const linkedTask: Task = { ...task, linkedGoalId: 'goal-bidirectional' };
  const progLinkedViaTask = calculateGoalProgress(goal, [], [linkedTask], [], [], []);
  assert.equal(progLinkedViaTask.currentValue, 3.0);
  assert.equal(progLinkedViaTask.percentage, 30);

  // Link via goal.linkedTaskIds
  const goalWithTask: Goal = { ...goal, linkedTaskIds: ['task-feature-x'] };
  const progLinkedViaGoal = calculateGoalProgress(goalWithTask, [], [task], [], [], []);
  assert.equal(progLinkedViaGoal.currentValue, 3.0);

  // Both linked together
  const progBothLinked = calculateGoalProgress(goalWithTask, [], [linkedTask], [], [], []);
  assert.equal(progBothLinked.currentValue, 3.0); // No double counting

  // Unlink again
  const progUnlinked = calculateGoalProgress(goal, [], [task], [], [], []);
  assert.equal(progUnlinked.currentValue, 0);
});

/* ==========================================================================
   TARGETED BUG FIX: TESTS 10 TO 14 (EXACT PROMPT REQUIREMENTS)
   ========================================================================== */

test('TEST 10: 60m actual work updates 15h goal to exactly 1h (6.67%), 14h remaining', () => {
  const goal: Goal = {
    id: 'goal-js-series',
    title: 'Complete JavaScript Series',
    category: 'Coding',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 15,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Coding'],
    linkedHabitIds: [],
    linkedTaskIds: ['task-js-lectures', 'task-dsa', 'task-js-practice'],
    status: 'in_progress',
    createdAt: '2026-10-25T08:00:00Z',
    updatedAt: '2026-10-25T08:00:00Z',
  };

  const taskLectures: Task = {
    id: 'task-js-lectures',
    title: 'JavaScript lectures',
    category: 'Coding',
    priority: 'high',
    status: 'in_progress',
    estimatedDuration: 90,
    actualDuration: 60, // 60 minutes recorded
    linkedGoalId: 'goal-js-series',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  const taskDSA: Task = {
    id: 'task-dsa',
    title: 'DSA',
    category: 'Coding',
    priority: 'medium',
    status: 'not_started',
    estimatedDuration: 60,
    actualDuration: 0, // 0 minutes
    linkedGoalId: 'goal-js-series',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  const taskPractice: Task = {
    id: 'task-js-practice',
    title: 'JavaScript practice',
    category: 'Coding',
    priority: 'high',
    status: 'not_started',
    estimatedDuration: 60,
    actualDuration: 0, // 0 minutes
    linkedGoalId: 'goal-js-series',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  // With 60m on JavaScript lectures:
  // Completed: 1 hour
  // Target: 15 hours
  // Remaining: 14 hours
  // Progress: 6.67%
  const prog1 = calculateGoalProgress(goal, [], [taskLectures, taskDSA, taskPractice], [], [], []);
  assert.equal(prog1.currentValue, 1.0);
  assert.equal(prog1.percentage, 6.67);
  assert.equal(prog1.remaining, 14.0);
  assert.equal(prog1.isCompleted, false);

  // Subsequently record another 30m on DSA:
  const updatedTaskDSA: Task = {
    ...taskDSA,
    actualDuration: 30,
  };

  // Completed: 1.5 hours
  // Target: 15 hours
  // Remaining: 13.5 hours
  // Progress: 10%
  const prog2 = calculateGoalProgress(goal, [], [taskLectures, updatedTaskDSA, taskPractice], [], [], []);
  assert.equal(prog2.currentValue, 1.5);
  assert.equal(prog2.percentage, 10);
  assert.equal(prog2.remaining, 13.5);
  assert.equal(prog2.isCompleted, false);
});

test('TEST 11: Linking a task with 0m actual work shows 0m and does NOT artificially increase progress', () => {
  const goal: Goal = {
    id: 'goal-empty-work',
    title: 'Build Microservice',
    category: 'Work',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Work'],
    linkedHabitIds: [],
    linkedTaskIds: ['task-zero-work'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const taskZero: Task = {
    id: 'task-zero-work',
    title: 'Setup Kubernetes Cluster',
    category: 'Work',
    priority: 'urgent',
    status: 'not_started',
    estimatedDuration: 180, // estimated 3 hours
    actualDuration: 0, // 0 minutes actual
    linkedGoalId: 'goal-empty-work',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  const prog = calculateGoalProgress(goal, [], [taskZero], [], [], []);
  assert.equal(prog.currentValue, 0);
  assert.equal(prog.percentage, 0);
  assert.equal(prog.remaining, 10);
  assert.equal(prog.isCompleted, false);
});

test('TEST 12: Moving task from Goal A to Goal B updates progress on both goals correctly', () => {
  const goalA: Goal = {
    id: 'goal-a',
    title: 'Goal A',
    category: 'Study',
    horizon: 'weekly',
    startDate: '2026-10-01',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: ['shared-task'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const goalB: Goal = {
    id: 'goal-b',
    title: 'Goal B',
    category: 'Study',
    horizon: 'weekly',
    startDate: '2026-10-01',
    targetDate: '2026-10-31',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: [],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const task: Task = {
    id: 'shared-task',
    title: 'Algorithmic Complexity',
    category: 'Study',
    priority: 'high',
    status: 'completed',
    estimatedDuration: 120,
    actualDuration: 120, // 2 hours
    linkedGoalId: 'goal-a',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  // Initially: Goal A has 2 hours (20%), Goal B has 0 hours (0%)
  const progA1 = calculateGoalProgress(goalA, [], [task], [], [], []);
  const progB1 = calculateGoalProgress(goalB, [], [task], [], [], []);
  assert.equal(progA1.currentValue, 2);
  assert.equal(progA1.percentage, 20);
  assert.equal(progB1.currentValue, 0);
  assert.equal(progB1.percentage, 0);

  // Move task to Goal B:
  const movedTask: Task = { ...task, linkedGoalId: 'goal-b' };
  const updatedGoalA: Goal = { ...goalA, linkedTaskIds: [] };
  const updatedGoalB: Goal = { ...goalB, linkedTaskIds: ['shared-task'] };

  const progA2 = calculateGoalProgress(updatedGoalA, [], [movedTask], [], [], []);
  const progB2 = calculateGoalProgress(updatedGoalB, [], [movedTask], [], [], []);
  assert.equal(progA2.currentValue, 0);
  assert.equal(progA2.percentage, 0);
  assert.equal(progB2.currentValue, 2);
  assert.equal(progB2.percentage, 20);
});

test('TEST 13: Time session edit and delete recalculation preserves zero double counting', () => {
  const goal: Goal = {
    id: 'goal-time-recalc',
    title: 'Deep Focus Sprint',
    category: 'Work',
    horizon: 'weekly',
    startDate: '2026-10-25',
    targetDate: '2026-10-31',
    priority: 'urgent',
    goalType: 'duration',
    targetValue: 5,
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    linkedCategories: ['Work'],
    linkedHabitIds: [],
    linkedTaskIds: ['task-sprint'],
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  // Session has both linkedTaskId AND linkedGoalId
  const session1: TimeSession = {
    id: 'sess-1',
    title: 'Sprint Block 1',
    startTime: '2026-10-28T10:00:00Z',
    endTime: '2026-10-28T11:00:00Z',
    durationMinutes: 60,
    category: 'Work',
    linkedTaskId: 'task-sprint',
    linkedGoalId: 'goal-time-recalc',
    isManual: false,
    createdAt: '',
  };

  const taskSprint: Task = {
    id: 'task-sprint',
    title: 'Build Core Engine',
    category: 'Work',
    priority: 'urgent',
    status: 'in_progress',
    estimatedDuration: 60,
    actualDuration: 60,
    linkedGoalId: 'goal-time-recalc',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };

  // 1 session of 60m: 1 hour / 5 hours = 20%
  // Must NOT double count session + task actual duration
  const progInitial = calculateGoalProgress(goal, [session1], [taskSprint], [], [], []);
  assert.equal(progInitial.currentValue, 1.0);
  assert.equal(progInitial.percentage, 20);

  // Edit session duration from 60m to 120m (2 hours)
  const editedSession: TimeSession = { ...session1, durationMinutes: 120 };
  const editedTask: Task = { ...taskSprint, actualDuration: 120 };
  const progEdited = calculateGoalProgress(goal, [editedSession], [editedTask], [], [], []);
  assert.equal(progEdited.currentValue, 2.0);
  assert.equal(progEdited.percentage, 40);

  // Delete session: 0 hours
  const deletedTask: Task = { ...taskSprint, actualDuration: 0 };
  const progDeleted = calculateGoalProgress(goal, [], [deletedTask], [], [], []);
  assert.equal(progDeleted.currentValue, 0);
  assert.equal(progDeleted.percentage, 0);
});

test('TEST 14: Task search and category filtering filters eligible tasks dynamically without 3-record limit', () => {
  const allTasks: Task[] = [
    { id: 't1', title: 'Javascript lectures by rohit negi', category: 'Study', priority: 'high', status: 'completed', estimatedDuration: 60, actualDuration: 60, tags: [], createdAt: '', updatedAt: '' },
    { id: 't2', title: 'DSA', category: 'Study', priority: 'high', status: 'in_progress', estimatedDuration: 45, actualDuration: 30, tags: [], createdAt: '', updatedAt: '' },
    { id: 't3', title: 'TCH WEBSITE', category: 'Work', priority: 'medium', status: 'in_progress', estimatedDuration: 120, actualDuration: 90, tags: [], createdAt: '', updatedAt: '' },
    { id: 't4', title: 'System Architecture Design', category: 'Work', priority: 'urgent', status: 'not_started', estimatedDuration: 90, actualDuration: 0, tags: [], createdAt: '', updatedAt: '' },
    { id: 't5', title: 'Database Optimization', category: 'Tech', priority: 'medium', status: 'completed', estimatedDuration: 60, actualDuration: 60, tags: [], createdAt: '', updatedAt: '' },
    { id: 't6', title: 'Cancelled Project Task', category: 'Work', priority: 'low', status: 'cancelled', estimatedDuration: 30, actualDuration: 0, tags: [], createdAt: '', updatedAt: '' },
  ];

  // Exclude cancelled tasks
  const eligible = allTasks.filter((t) => t.status !== 'cancelled');
  assert.equal(eligible.length, 5); // All 5 eligible tasks displayed, not limited to 3!

  // Search by title "javascript"
  const searchResults = eligible.filter((t) => t.title.toLowerCase().includes('javascript'));
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, 't1');

  // Filter by category "Work"
  const workResults = eligible.filter((t) => t.category === 'Work');
  assert.equal(workResults.length, 2);
  assert.deepEqual(workResults.map((t) => t.id), ['t3', 't4']);
});

test('TEST 15: Rule A - Completed task without timer contributes planned duration (2 hours)', () => {
  const block: ScheduleBlock = {
    id: 'b-rule-a',
    title: 'Deep Architecture Work',
    date: '2026-10-30',
    startTime: '10:00',
    endTime: '12:00',
    plannedDuration: 120, // 2 hours
    actualDuration: 0,
    status: 'completed',
    category: 'Engineering',
    priority: 'high',
    createdAt: '',
    updatedAt: '',
  };

  const metrics = calculateCreditedWorkingTime('2026-10-30', [block], []);
  assert.equal(metrics.totalTrackedMinutes, 120); // exactly 2 hours credited
  assert.equal(metrics.totalPlannedMinutes, 120);
  assert.equal(metrics.completedPlannedMinutes, 120);
  assert.equal(metrics.remainingScheduledMinutes, 0);
  assert.equal(metrics.varianceMinutes, 0);
  assert.equal(metrics.blockBreakdown[0].source, 'planned_completion');
});

test('TEST 16: Rule B - Completed task with timer uses recorded actual duration (1h 30m) instead of planned (2h)', () => {
  const block: ScheduleBlock = {
    id: 'b-rule-b',
    title: 'Database Indexing',
    date: '2026-10-30',
    startTime: '10:00',
    endTime: '12:00',
    plannedDuration: 120, // 2 hours planned
    actualDuration: 90,
    status: 'completed',
    category: 'Engineering',
    priority: 'high',
    createdAt: '',
    updatedAt: '',
  };

  const session: TimeSession = {
    id: 'sess-b',
    title: 'Database Indexing',
    category: 'Engineering',
    startTime: '2026-10-30T10:00:00.000Z',
    durationMinutes: 90, // 1 hour 30 minutes recorded
    isManual: false,
    linkedScheduleBlockId: 'b-rule-b',
    createdAt: '',
  };

  const metrics = calculateCreditedWorkingTime('2026-10-30', [block], [session]);
  assert.equal(metrics.totalTrackedMinutes, 90); // 1.5 hours credited, NOT 120m and NOT 120+90m (no double counting!)
  assert.equal(metrics.totalPlannedMinutes, 120);
  assert.equal(metrics.varianceMinutes, -30); // 90 - 120 = -30m variance
  assert.equal(metrics.blockBreakdown[0].source, 'timer');
});

test('TEST 17: Rule C - Incomplete task without timer contributes 0 working time', () => {
  const block: ScheduleBlock = {
    id: 'b-rule-c',
    title: 'Future Feature Implementation',
    date: '2026-10-30',
    startTime: '14:00',
    endTime: '16:00',
    plannedDuration: 120, // 2 hours planned
    actualDuration: 0,
    status: 'scheduled', // Incomplete
    category: 'Engineering',
    priority: 'medium',
    createdAt: '',
    updatedAt: '',
  };

  const metrics = calculateCreditedWorkingTime('2026-10-30', [block], []);
  assert.equal(metrics.totalTrackedMinutes, 0); // 0 credited
  assert.equal(metrics.totalPlannedMinutes, 120);
  assert.equal(metrics.remainingScheduledMinutes, 120);
  assert.equal(metrics.varianceMinutes, -120);
  assert.equal(metrics.blockBreakdown[0].source, 'none');
});

test('TEST 18: Rule D - Incomplete task with timer contributes actual timer duration (45 minutes)', () => {
  const block: ScheduleBlock = {
    id: 'b-rule-d',
    title: 'Refactoring API Client',
    date: '2026-10-30',
    startTime: '14:00',
    endTime: '16:00',
    plannedDuration: 120, // 2 hours planned
    actualDuration: 45,
    status: 'in_progress', // Incomplete
    category: 'Engineering',
    priority: 'medium',
    createdAt: '',
    updatedAt: '',
  };

  const session: TimeSession = {
    id: 'sess-d',
    title: 'Refactoring API Client',
    category: 'Engineering',
    startTime: '2026-10-30T14:00:00.000Z',
    durationMinutes: 45, // 45 minutes worked
    isManual: false,
    linkedScheduleBlockId: 'b-rule-d',
    createdAt: '',
  };

  const metrics = calculateCreditedWorkingTime('2026-10-30', [block], [session]);
  assert.equal(metrics.totalTrackedMinutes, 45); // 45m credited
  assert.equal(metrics.totalPlannedMinutes, 120);
  assert.equal(metrics.remainingScheduledMinutes, 120);
  assert.equal(metrics.varianceMinutes, -75); // 45 - 120 = -75
  assert.equal(metrics.blockBreakdown[0].source, 'timer');
});

test('TEST 19: Rule E & Unified Schedule Example from User Prompt', () => {
  // Morning Study: 1 hour, Completed -> 60m
  // JavaScript Practice: 2 hours, Completed -> 120m
  // DSA: 1 hour, Completed -> 60m
  // Project Development: 2 hours, Incomplete -> 0m
  // Expected:
  // Tracked Working Time: 4 hours (240 min)
  // Planned Working Time: 6 hours (360 min)
  // Remaining/Incompleted Scheduled Time: 2 hours (120 min)
  const blocks: ScheduleBlock[] = [
    {
      id: 'b1',
      title: 'Morning Study',
      date: '2026-10-30',
      startTime: '08:00',
      endTime: '09:00',
      plannedDuration: 60,
      actualDuration: 0,
      status: 'completed',
      category: 'Study',
      priority: 'medium',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'b2',
      title: 'JavaScript Practice',
      date: '2026-10-30',
      startTime: '09:30',
      endTime: '11:30',
      plannedDuration: 120,
      actualDuration: 0,
      status: 'completed',
      category: 'Study',
      priority: 'high',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'b3',
      title: 'DSA',
      date: '2026-10-30',
      startTime: '13:00',
      endTime: '14:00',
      plannedDuration: 60,
      actualDuration: 0,
      status: 'completed',
      category: 'Study',
      priority: 'high',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'b4',
      title: 'Project Development',
      date: '2026-10-30',
      startTime: '15:00',
      endTime: '17:00',
      plannedDuration: 120,
      actualDuration: 0,
      status: 'scheduled', // Incomplete
      category: 'Work',
      priority: 'urgent',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const metrics = calculateCreditedWorkingTime('2026-10-30', blocks, []);
  assert.equal(metrics.totalTrackedMinutes, 240); // 4 hours
  assert.equal(metrics.totalPlannedMinutes, 360); // 6 hours
  assert.equal(metrics.completedPlannedMinutes, 240); // 4 hours
  assert.equal(metrics.remainingScheduledMinutes, 120); // 2 hours
  assert.equal(metrics.varianceMinutes, -120); // -2 hours

  // Now add an independent standalone time session (e.g. 30m reading)
  const standaloneSession: TimeSession = {
    id: 'sess-standalone',
    title: 'Ad-hoc Documentation Reading',
    category: 'Reading',
    startTime: '2026-10-30T19:00:00.000Z',
    durationMinutes: 30,
    isManual: true,
    createdAt: '',
  };

  const metricsWithStandalone = calculateCreditedWorkingTime('2026-10-30', blocks, [standaloneSession]);
  assert.equal(metricsWithStandalone.totalTrackedMinutes, 270); // 4.5 hours (240 + 30)
  assert.equal(metricsWithStandalone.standaloneSessionMinutes, 30);
  assert.equal(metricsWithStandalone.totalPlannedMinutes, 360);
});

test('TEST 20: Undo / Reset behavior: unchecking a completed task immediately removes credited time', () => {
  const block: ScheduleBlock = {
    id: 'b-undo',
    title: 'UI Testing',
    date: '2026-10-30',
    startTime: '11:00',
    endTime: '13:00',
    plannedDuration: 120,
    actualDuration: 0,
    status: 'completed',
    category: 'QA',
    priority: 'medium',
    createdAt: '',
    updatedAt: '',
  };

  // Initially completed
  const initial = calculateCreditedWorkingTime('2026-10-30', [block], []);
  assert.equal(initial.totalTrackedMinutes, 120);

  // User resets / unchecks the task back to scheduled
  const uncompletedBlock: ScheduleBlock = {
    ...block,
    status: 'scheduled',
    actualDuration: 0,
  };

  const afterReset = calculateCreditedWorkingTime('2026-10-30', [uncompletedBlock], []);
  assert.equal(afterReset.totalTrackedMinutes, 0); // Immediately removes 120m
  assert.equal(afterReset.remainingScheduledMinutes, 120);
});

test('TEST 21: Goal progress derives credited time from completed schedule block without timer', () => {
  // Goal: "COMPLETE JAVASCRIPT SERIES'S", 15h target, automatic_time
  const goal: Goal = {
    id: 'goal-js-series',
    title: "COMPLETE JAVASCRIPT SERIES'S",
    category: 'Study',
    goalType: 'duration',
    targetValue: 15, // 15 hours
    currentValue: 0,
    unit: 'hours',
    progressMethod: 'automatic_time',
    status: 'in_progress',
    horizon: 'weekly',
    priority: 'high',
    linkedTaskIds: ['task-js-series'],
    linkedCategories: [],
    linkedHabitIds: [],
    startDate: '2026-10-01',
    targetDate: '2026-12-31',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  const task: Task = {
    id: 'task-js-series',
    title: "COMPLETE JAVASCRIPT SERIES'S",
    category: 'Study',
    priority: 'high',
    status: 'completed',
    estimatedDuration: 90,
    actualDuration: 0,
    linkedGoalId: 'goal-js-series',
    tags: [],
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  // Completed block for 1h 30m (90 min) without timer
  const block: ScheduleBlock = {
    id: 'block-js-series',
    title: "COMPLETE JAVASCRIPT SERIES'S",
    date: '2026-10-30',
    startTime: '09:00',
    endTime: '10:30',
    plannedDuration: 90, // 1.5 hours
    actualDuration: 0,
    status: 'completed',
    linkedTaskId: 'task-js-series',
    category: 'Study',
    priority: 'high',
    createdAt: '',
    updatedAt: '',
  };

  const progress = calculateGoalProgress(goal, [], [task], [], [], [block]);
  // 90 minutes = 1.5 hours. 1.5h / 15h = 10%, 13.5h remaining
  assert.equal(progress.currentValue, 1.5);
  assert.equal(progress.percentage, 10);
  assert.equal(progress.remaining, 13.5);

  // If block is reset to scheduled:
  const blockReset: ScheduleBlock = { ...block, status: 'scheduled', actualDuration: 0 };
  const taskReset: Task = { ...task, status: 'not_started', actualDuration: 0, estimatedDuration: 0 };
  const progressReset = calculateGoalProgress(goal, [], [taskReset], [], [], [blockReset]);
  assert.equal(progressReset.currentValue, 0);
  assert.equal(progressReset.percentage, 0);
  assert.equal(progressReset.remaining, 15);
});



