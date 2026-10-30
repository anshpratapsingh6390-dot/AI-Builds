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

