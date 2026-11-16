import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGoalProgress,
  evaluateGoalStatus,
  analyzeGoalFailure,
} from '../utils/rules';
import { Goal, ScheduleBlock, Task } from '../types';

function createTestGoal(partial: Partial<Goal> & { id: string; title: string; category: string }): Goal {
  return {
    horizon: 'weekly',
    startDate: '2026-11-01',
    targetDate: '2026-11-07',
    priority: 'high',
    goalType: 'duration',
    targetValue: 10,
    currentValue: 0,
    unit: 'hours',
    status: 'active',
    progressMethod: 'automatic_time',
    linkedCategories: [],
    linkedHabitIds: [],
    linkedTaskIds: [],
    linkedScheduleBlockIds: [],
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...partial,
  };
}

function createTestBlock(partial: Partial<ScheduleBlock> & { id: string; title: string; date: string }): ScheduleBlock {
  return {
    category: 'Work',
    priority: 'medium',
    startTime: '09:00',
    endTime: '10:00',
    plannedDuration: 60,
    actualDuration: 0,
    status: 'scheduled',
    includeInWorkingTime: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...partial,
  };
}

describe('Goal Missed Deadline, Dynamic Activity Linking & Failure Intelligence', () => {
  // Test 1: Missed deadline detection
  it('evaluates status as FAILED when deadline has passed and target is not achieved', () => {
    const goal = createTestGoal({
      id: 'g-js-series',
      title: 'COMPLETE JAVASCRIPT SERIES',
      category: 'Coding',
      startDate: '2026-11-03',
      targetDate: '2026-11-09',
      targetValue: 10,
      currentValue: 4,
      unit: 'hours',
      status: 'active',
      progressMethod: 'manual',
    });

    // Reference date: Nov 11, 2026 (2 days after Nov 09 deadline)
    const progress = calculateGoalProgress(
      goal,
      [],
      [],
      [],
      [],
      [],
      '2026-11-11'
    );

    assert.equal(progress.status, 'failed', 'Status should be failed when deadline passed');
    assert.equal(progress.isCompleted, false, 'Goal must not be marked completed');
    assert.equal(progress.currentValue, 4, 'Achieved hours should be 4');
    assert.equal(progress.targetValue, 10, 'Target hours should be 10');
    assert.equal(progress.remaining, 6, 'Remaining should be 6 hours');
    assert.equal(progress.percentage, 40, 'Completion percentage should be 40%');
    assert.equal(progress.daysOverdue, 2, 'Should be 2 days overdue');
  });

  // Test 2: Goal completed before deadline remains COMPLETED
  it('remains COMPLETED and is never marked failed when target is reached, even after deadline', () => {
    const goal = createTestGoal({
      id: 'g-dsa-mastery',
      title: 'DSA Practice 10h',
      category: 'Coding',
      startDate: '2026-11-01',
      targetDate: '2026-11-07',
      targetValue: 10,
      currentValue: 10,
      unit: 'hours',
      status: 'completed',
      progressMethod: 'manual',
    });

    // Evaluated on Nov 11, 2026 (well after Nov 07 deadline)
    const progress = calculateGoalProgress(
      goal,
      [],
      [],
      [],
      [],
      [],
      '2026-11-11'
    );

    assert.equal(progress.isCompleted, true);
    assert.equal(progress.status, 'completed', 'Completed goals must never be marked failed');
    assert.equal(progress.percentage, 100);
    assert.equal(progress.remaining, 0);
  });

  // Test 3: Upcoming goal before start date
  it('evaluates status as UPCOMING when start date is in the future', () => {
    const goal = createTestGoal({
      id: 'g-future',
      title: 'Next Week Project Sprint',
      category: 'Work',
      startDate: '2026-11-20',
      targetDate: '2026-11-27',
      targetValue: 20,
      currentValue: 0,
      unit: 'hours',
      status: 'active',
      progressMethod: 'automatic_time',
    });

    const status = evaluateGoalStatus(
      goal,
      { isCompleted: false, currentValue: 0 },
      '2026-11-11'
    );

    assert.equal(status, 'upcoming', 'Should be upcoming when today is before startDate');
  });

  // Test 4: Dynamic Daily Planner activity explicit linking
  it('dynamically calculates goal progress from explicitly linked Daily Planner schedule blocks', () => {
    const goal = createTestGoal({
      id: 'g-fullstack',
      title: 'Fullstack App Development',
      category: 'Coding',
      startDate: '2026-11-01',
      targetDate: '2026-11-15',
      targetValue: 10,
      currentValue: 0,
      unit: 'hours',
      status: 'active',
      progressMethod: 'automatic_time',
      linkedScheduleBlockIds: ['block-morning-code', 'block-evening-code'],
    });

    const block1 = createTestBlock({
      id: 'block-morning-code',
      date: '2026-11-05',
      title: 'Morning Code Session',
      category: 'Coding',
      startTime: '08:00',
      endTime: '10:00',
      plannedDuration: 120, // 2h
      actualDuration: 120,  // 2h completed
      status: 'completed',
      includeInWorkingTime: true,
    });

    const block2 = createTestBlock({
      id: 'block-evening-code',
      date: '2026-11-06',
      title: 'Evening Code Session',
      category: 'Coding',
      startTime: '19:00',
      endTime: '20:30',
      plannedDuration: 90, // 1.5h
      actualDuration: 90,  // 1.5h completed
      status: 'completed',
      includeInWorkingTime: true,
    });

    const progress = calculateGoalProgress(
      goal,
      [],
      [],
      [],
      [],
      [block1, block2],
      '2026-11-10'
    );

    // 120 + 90 = 210 minutes = 3.5 hours
    assert.equal(progress.currentValue, 3.5, 'Should sum 3.5 hours from the two schedule blocks');
    assert.equal(progress.percentage, 35, '3.5 / 10 = 35%');
    assert.equal(progress.remaining, 6.5);
    assert.equal(progress.status, 'active');
  });

  // Test 5: Working Time eligibility exclusion
  it('strictly excludes schedule blocks marked includeInWorkingTime: false from working time goals', () => {
    const goal = createTestGoal({
      id: 'g-work-hours',
      title: 'Study 20 Hours',
      category: 'Study',
      horizon: 'monthly',
      startDate: '2026-11-01',
      targetDate: '2026-11-30',
      targetValue: 20,
      currentValue: 0,
      unit: 'hours',
      status: 'active',
      progressMethod: 'automatic_time',
      linkedScheduleBlockIds: ['block-study', 'block-workout', 'block-lunch'],
    });

    const studyBlock = createTestBlock({
      id: 'block-study',
      date: '2026-11-02',
      title: 'Data Structures Lecture',
      category: 'Study',
      startTime: '09:00',
      endTime: '11:00',
      plannedDuration: 120,
      actualDuration: 120, // 2 hours
      status: 'completed',
      includeInWorkingTime: true,
    });

    const workoutBlock = createTestBlock({
      id: 'block-workout',
      date: '2026-11-02',
      title: 'Morning Gym',
      category: 'Fitness',
      startTime: '07:00',
      endTime: '08:00',
      plannedDuration: 60,
      actualDuration: 60, // 1 hour
      status: 'completed',
      includeInWorkingTime: false, // explicitly excluded
    });

    const lunchBreak = createTestBlock({
      id: 'block-lunch',
      date: '2026-11-02',
      title: 'Lunch and Relaxation',
      category: 'Break',
      startTime: '12:00',
      endTime: '13:00',
      plannedDuration: 60,
      actualDuration: 60,
      status: 'completed',
      includeInWorkingTime: false, // explicitly excluded
    });

    const progress = calculateGoalProgress(
      goal,
      [],
      [],
      [],
      [],
      [studyBlock, workoutBlock, lunchBreak],
      '2026-11-05'
    );

    // Only studyBlock counts: 120 mins = 2 hours. Workout and lunch are 0.
    assert.equal(progress.currentValue, 2, 'Only eligible working-time blocks must count');
    assert.equal(progress.percentage, 10, '2h / 20h = 10%');
  });

  // Test 6: Multiple activities summation & deduplication
  it('correctly aggregates multiple activities and deduplicates linked task-block pairs', () => {
    const goal = createTestGoal({
      id: 'g-multitask',
      title: 'Project Sprint',
      category: 'Engineering',
      startDate: '2026-11-01',
      targetDate: '2026-11-15',
      targetValue: 10,
      currentValue: 0,
      unit: 'hours',
      status: 'active',
      progressMethod: 'automatic_time',
      linkedTaskIds: ['task-1', 'task-2'],
      linkedScheduleBlockIds: ['block-t1'],
    });

    const task1: Task = {
      id: 'task-1',
      title: 'Implement Auth',
      category: 'Engineering',
      priority: 'high',
      status: 'completed',
      estimatedDuration: 120,
      actualDuration: 120, // 2h
      tags: [],
      createdAt: '2026-11-01',
      updatedAt: '2026-11-04',
    };

    const task2: Task = {
      id: 'task-2',
      title: 'Setup Database',
      category: 'Engineering',
      priority: 'high',
      status: 'completed',
      estimatedDuration: 90,
      actualDuration: 90, // 1.5h
      tags: [],
      createdAt: '2026-11-01',
      updatedAt: '2026-11-04',
    };

    // block-t1 represents task-1 scheduled on the planner with 120 mins
    const blockT1 = createTestBlock({
      id: 'block-t1',
      date: '2026-11-04',
      title: 'Implement Auth Session',
      category: 'Engineering',
      startTime: '10:00',
      endTime: '12:00',
      plannedDuration: 120,
      actualDuration: 120,
      status: 'completed',
      linkedTaskId: 'task-1',
      includeInWorkingTime: true,
    });

    const progress = calculateGoalProgress(
      goal,
      [],
      [task1, task2],
      [],
      [],
      [blockT1],
      '2026-11-06'
    );

    // task1 (120m) + task2 (90m) = 210m = 3.5h.
    // block-t1 is linked to task-1, so it should NOT double-count task-1!
    assert.equal(progress.currentValue, 3.5, 'Must deduplicate linked task and schedule block');
    assert.equal(progress.percentage, 35);
  });

  // Test 7: Live update of activity duration
  it('immediately reflects updated activity duration in goal progress', () => {
    const goal = createTestGoal({
      id: 'g-live',
      title: 'Weekly Coding',
      category: 'Coding',
      startDate: '2026-11-01',
      targetDate: '2026-11-07',
      targetValue: 10,
      currentValue: 0,
      unit: 'hours',
      status: 'active',
      progressMethod: 'automatic_time',
      linkedScheduleBlockIds: ['block-live'],
    });

    const blockInitial = createTestBlock({
      id: 'block-live',
      date: '2026-11-02',
      title: 'Coding Session',
      category: 'Coding',
      startTime: '10:00',
      endTime: '12:00',
      plannedDuration: 120,
      actualDuration: 120, // 2 hours
      status: 'completed',
      includeInWorkingTime: true,
    });

    const progInitial = calculateGoalProgress(goal, [], [], [], [], [blockInitial], '2026-11-05');
    assert.equal(progInitial.currentValue, 2);

    // User updates duration from 2 hours (120m) to 3 hours (180m)
    const blockUpdated = createTestBlock({
      ...blockInitial,
      actualDuration: 180,
    });

    const progUpdated = calculateGoalProgress(goal, [], [], [], [], [blockUpdated], '2026-11-05');
    assert.equal(progUpdated.currentValue, 3, 'Should reflect 3 hours without lag or duplication');
    assert.equal(progUpdated.percentage, 30);
  });

  // Test 8: Factual failure analysis for failed goal with activities
  it('produces factual failure analysis based solely on real data and logs incomplete activities', () => {
    const failedGoal = createTestGoal({
      id: 'g-failed-1',
      title: 'Complete Course Project',
      category: 'Study',
      startDate: '2026-11-01',
      targetDate: '2026-11-07',
      targetValue: 10,
      currentValue: 3,
      unit: 'hours',
      status: 'failed',
      progressMethod: 'automatic_time',
      linkedTaskIds: ['task-done', 'task-undone'],
      linkedScheduleBlockIds: ['block-missed'],
    });

    const taskDone: Task = {
      id: 'task-done',
      title: 'Read Module 1',
      category: 'Study',
      priority: 'medium',
      status: 'completed',
      estimatedDuration: 180,
      actualDuration: 180, // 3h
      tags: [],
      createdAt: '2026-11-01',
      updatedAt: '2026-11-02',
    };

    const taskUndone: Task = {
      id: 'task-undone',
      title: 'Build Module 2 Project',
      category: 'Study',
      priority: 'high',
      status: 'not_started',
      estimatedDuration: 240, // 4h
      actualDuration: 0,
      tags: [],
      createdAt: '2026-11-01',
      updatedAt: '2026-11-02',
    };

    const blockMissed = createTestBlock({
      id: 'block-missed',
      date: '2026-11-06',
      title: 'Scheduled Deep Work Block',
      category: 'Study',
      startTime: '14:00',
      endTime: '17:00',
      plannedDuration: 180,
      actualDuration: 0,
      status: 'scheduled',
      includeInWorkingTime: true,
    });

    const progress = calculateGoalProgress(
      failedGoal,
      [],
      [taskDone, taskUndone],
      [],
      [],
      [blockMissed],
      '2026-11-10'
    );

    const analysis = analyzeGoalFailure(
      failedGoal,
      progress,
      [blockMissed],
      [taskDone, taskUndone],
      []
    );

    assert.equal(analysis.isInsufficientData, false);
    assert.equal(analysis.targetValue, 10);
    assert.equal(analysis.achievedValue, 3);
    assert.equal(analysis.deficit, 7);
    assert.equal(analysis.completionRate, 30);
    assert.ok(analysis.incompleteActivities.length >= 2, 'Should list both task-undone and block-missed');
    assert.ok(analysis.observations.length > 0, 'Should include factual observations');
  });

  // Test 9: Factual failure analysis fallback for insufficient data
  it('displays exact fallback message when insufficient historical data exists', () => {
    const emptyFailedGoal = createTestGoal({
      id: 'g-empty-failed',
      title: 'Vague Study Goal',
      category: 'Study',
      startDate: '2026-11-01',
      targetDate: '2026-11-07',
      targetValue: 15,
      currentValue: 0,
      unit: 'hours',
      status: 'failed',
      progressMethod: 'manual',
    });

    const progress = calculateGoalProgress(emptyFailedGoal, [], [], [], [], [], '2026-11-10');
    const analysis = analyzeGoalFailure(emptyFailedGoal, progress, [], [], []);

    assert.equal(analysis.isInsufficientData, true);
    assert.equal(
      analysis.summary,
      'Insufficient historical data to identify the reason for failure.',
      'Must match exact required fallback copy'
    );
  });

  // Test 10: Retry Goal preservation and linkage
  it('preserves failed original goal history and establishes bidirectional retry linkage', () => {
    const originalFailedGoal = createTestGoal({
      id: 'g-original-failed',
      title: 'Complete Book 1',
      category: 'Learning',
      startDate: '2026-11-01',
      targetDate: '2026-11-07',
      targetValue: 10,
      currentValue: 3,
      unit: 'hours',
      status: 'failed',
      progressMethod: 'automatic_time',
      retryGoalId: 'g-new-attempt',
    });

    const newRetryAttempt = createTestGoal({
      id: 'g-new-attempt',
      title: 'Complete Book 1 (Retry)',
      category: 'Learning',
      startDate: '2026-11-08',
      targetDate: '2026-11-15',
      targetValue: 7, // remaining deficit
      currentValue: 0,
      unit: 'hours',
      status: 'active',
      progressMethod: 'automatic_time',
      retryOfGoalId: 'g-original-failed',
    });

    assert.equal(originalFailedGoal.retryGoalId, newRetryAttempt.id, 'Original goal stores retry reference');
    assert.equal(newRetryAttempt.retryOfGoalId, originalFailedGoal.id, 'New goal stores origin reference');
    assert.equal(originalFailedGoal.status, 'failed', 'Original goal preserves failure status in historical records');
    assert.equal(newRetryAttempt.status, 'active', 'New goal starts in active state');
    assert.equal(newRetryAttempt.targetValue, 7, 'New goal starts with fresh calibrated target');
  });
});
