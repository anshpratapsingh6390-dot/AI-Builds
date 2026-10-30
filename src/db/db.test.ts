import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  db,
  initializeDatabase,
  exportFullBackup,
  restoreFromBackup,
  validateBackupData,
  DEFAULT_SETTINGS,
} from './index';
import { ExportData, Task, Habit } from '../types';

test('PHASE 1 - Database Initialization: Fresh first launch seeds once, second launch never re-seeds', async () => {
  // Clear any existing state
  await db.tasks.clear();
  await db.habits.clear();
  await db.goals.clear();
  await db.settings.clear();
  await db.categories.clear();

  // 1. Fresh first launch
  await initializeDatabase();

  const settingsAfterFirst = await db.settings.get('current_user_settings');
  assert.equal(settingsAfterFirst?.isInitialSeedCompleted, true, 'isInitialSeedCompleted must be true');

  const taskCount1 = await db.tasks.count();
  const habitCount1 = await db.habits.count();
  assert.ok(taskCount1 > 0, 'Starter tasks should be seeded on fresh launch');
  assert.ok(habitCount1 > 0, 'Starter habits should be seeded on fresh launch');

  // 2. Second launch (simulating app reload)
  await initializeDatabase();
  const taskCount2 = await db.tasks.count();
  const habitCount2 = await db.habits.count();
  assert.equal(taskCount2, taskCount1, 'Second launch must never insert duplicate or extra starter records');
  assert.equal(habitCount2, habitCount1, 'Second launch must preserve exact habit count');
});

test('PHASE 1 - Delete all tasks and habits, refresh/reopen: no starter data returns', async () => {
  // User deletes all tasks and habits
  await db.tasks.clear();
  await db.habits.clear();

  const taskCountEmpty = await db.tasks.count();
  const habitCountEmpty = await db.habits.count();
  assert.equal(taskCountEmpty, 0);
  assert.equal(habitCountEmpty, 0);

  // Simulating page refresh / app reopen
  await initializeDatabase();

  const taskCountAfterReload = await db.tasks.count();
  const habitCountAfterReload = await db.habits.count();
  assert.equal(taskCountAfterReload, 0, 'Starter data must NOT return when tasks/habits were cleared by user');
  assert.equal(habitCountAfterReload, 0, 'Habits must remain empty when cleared by user');
});

test('PHASE 1 - Export empty database, restore it, refresh: database remains empty', async () => {
  // Ensure tables are cleared
  await db.tasks.clear();
  await db.habits.clear();
  await db.goals.clear();
  await db.scheduleBlocks.clear();
  await db.timeSessions.clear();

  // Export full backup of empty database
  const backup = await exportFullBackup();
  assert.equal(backup.version, 1);
  assert.equal(backup.tasks.length, 0);
  assert.equal(backup.habits.length, 0);

  // Restore the empty backup with replace mode
  const res = await restoreFromBackup(backup, 'replace');
  assert.equal(res.success, true);
  assert.equal(res.counts.tasks, 0);
  assert.equal(res.counts.habits, 0);

  // Refresh / reopen simulation
  await initializeDatabase();

  const taskCount = await db.tasks.count();
  const habitCount = await db.habits.count();
  assert.equal(taskCount, 0, 'Database must remain empty after restoring empty backup and reloading');
  assert.equal(habitCount, 0, 'Habits must remain empty after restoring empty backup and reloading');
});

test('PHASE 1 - Validation: Malformed JSON, non-objects, and unsupported versions are rejected safely', () => {
  // 1. Primitive / null / array
  const nullCheck = validateBackupData(null);
  assert.equal(nullCheck.valid, false);
  assert.ok(nullCheck.error?.includes('expected a JSON object'));

  const arrayCheck = validateBackupData([]);
  assert.equal(arrayCheck.valid, false);

  const stringCheck = validateBackupData('hello');
  assert.equal(stringCheck.valid, false);

  // 2. Missing or invalid version
  const missingVersion = validateBackupData({ tasks: [], habits: [] });
  assert.equal(missingVersion.valid, false);
  assert.ok(missingVersion.error?.includes('Unsupported backup version'));

  const futureVersion = validateBackupData({ version: 99, tasks: [], habits: [] });
  assert.equal(futureVersion.valid, false);
  assert.ok(futureVersion.error?.includes('Unsupported backup version: 99'));

  // 3. Missing required tables
  const missingTasks = validateBackupData({
    version: 1,
    habits: [],
    habitOccurrences: [],
    scheduleBlocks: [],
    timeSessions: [],
    goals: [],
    goalMilestones: [],
    categories: [],
  });
  assert.equal(missingTasks.valid, false);
  assert.ok(missingTasks.error?.includes("missing or non-array table 'tasks'"));

  // 4. Malformed record inside a table (missing required field)
  const badTaskRecord = validateBackupData({
    version: 1,
    tasks: [{ id: 't1' }], // missing title
    habits: [],
    habitOccurrences: [],
    scheduleBlocks: [],
    timeSessions: [],
    goals: [],
    goalMilestones: [],
    categories: [],
  });
  assert.equal(badTaskRecord.valid, false);
  assert.ok(badTaskRecord.error?.includes("missing or empty required field 'title'"));
});

test('PHASE 1 - Failed restore does not partially destroy existing data (safe transaction rollback)', async () => {
  // Put a sentinel task
  const sentinelTask: Task = {
    id: 'sentinel-task',
    title: 'Critical User Task That Must Not Be Lost',
    priority: 'urgent',
    status: 'in_progress',
    category: 'Work',
    estimatedDuration: 60,
    actualDuration: 0,
    tags: [],
    createdAt: '2026-10-30T00:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z',
  };
  await db.tasks.put(sentinelTask);

  // Attempt to restore malformed backup
  const corruptBackup = {
    version: 1,
    tasks: [{ id: 'valid-t', title: 'Valid' }, { id: 'corrupt-t' /* missing title */ }],
    habits: [],
    habitOccurrences: [],
    scheduleBlocks: [],
    timeSessions: [],
    goals: [],
    goalMilestones: [],
    categories: [],
  };

  await assert.rejects(async () => {
    await restoreFromBackup(corruptBackup, 'replace');
  }, /missing or empty required field 'title'/);

  // Verify that sentinel task is completely preserved and was NOT wiped!
  const survivingTask = await db.tasks.get('sentinel-task');
  assert.ok(survivingTask, 'Existing data must NOT be destroyed by a failed restore');
  assert.equal(survivingTask?.title, 'Critical User Task That Must Not Be Lost');
});

test('PHASE 1 - Valid backup restores expected records and relationships (Replace & Merge)', async () => {
  const testBackup: ExportData = {
    version: 1,
    exportedAt: '2026-10-30T10:00:00Z',
    tasks: [
      {
        id: 'backup-task-1',
        title: 'Master TypeScript 7.0',
        priority: 'high',
        status: 'completed',
        category: 'Coding',
        estimatedDuration: 60,
        actualDuration: 60,
        linkedGoalId: 'backup-goal-1',
        tags: ['ts'],
        createdAt: '2026-10-30T00:00:00Z',
        updatedAt: '2026-10-30T01:00:00Z',
      },
    ],
    habits: [
      {
        id: 'backup-habit-1',
        name: 'Daily LeetCode Challenge',
        category: 'Coding',
        icon: 'terminal',
        color: '#0ea5e9',
        startDate: '2026-10-01',
        frequency: 'daily',
        selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        targetType: 'duration',
        targetQuantity: 60,
        unitOfMeasurement: 'minutes',
        linkedGoalId: 'backup-goal-1',
        isArchived: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ],
    habitOccurrences: [],
    scheduleBlocks: [],
    timeSessions: [],
    goals: [
      {
        id: 'backup-goal-1',
        title: 'Become Staff Level Engineer',
        category: 'Work',
        horizon: 'yearly',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
        priority: 'urgent',
        goalType: 'duration',
        targetValue: 500,
        currentValue: 100,
        unit: 'hours',
        progressMethod: 'automatic_time',
        linkedCategories: ['Coding', 'Work'],
        linkedHabitIds: ['backup-habit-1'],
        linkedTaskIds: ['backup-task-1'],
        status: 'in_progress',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    goalMilestones: [],
    dailyReviews: [],
    weeklyReviews: [],
    monthlyReviews: [],
    yearlyReviews: [],
    categories: [
      { id: 'cat-coding', name: 'Coding', color: '#0ea5e9', isDefault: true },
    ],
    settings: {
      ...DEFAULT_SETTINGS,
      theme: 'light',
      isInitialSeedCompleted: true,
    },
  };

  // 1. Replace Restore
  const replaceResult = await restoreFromBackup(testBackup, 'replace');
  assert.equal(replaceResult.success, true);
  assert.equal(replaceResult.counts.tasks, 1);
  assert.equal(replaceResult.counts.goals, 1);

  const restoredTask = await db.tasks.get('backup-task-1');
  assert.equal(restoredTask?.title, 'Master TypeScript 7.0');
  assert.equal(restoredTask?.linkedGoalId, 'backup-goal-1');

  const restoredGoal = await db.goals.get('backup-goal-1');
  assert.equal(restoredGoal?.title, 'Become Staff Level Engineer');
  assert.deepEqual(restoredGoal?.linkedTaskIds, ['backup-task-1']);

  // 2. Merge Restore: add a second task without duplicating IDs
  const mergeBackup: ExportData = {
    ...testBackup,
    tasks: [
      // Same ID with newer update: should update
      {
        ...testBackup.tasks[0],
        title: 'Master TypeScript 7.0 & Compiler APIs',
        updatedAt: '2026-10-30T05:00:00Z',
      },
      // New task ID: should be appended
      {
        id: 'backup-task-2',
        title: 'Build Distributed Consensus Demo',
        priority: 'high',
        status: 'not_started',
        category: 'Coding',
        estimatedDuration: 120,
        actualDuration: 0,
        tags: ['raft'],
        createdAt: '2026-10-30T04:00:00Z',
        updatedAt: '2026-10-30T04:00:00Z',
      },
    ],
  };

  const mergeResult = await restoreFromBackup(mergeBackup, 'merge');
  assert.equal(mergeResult.success, true);

  // Total tasks should now be 2, without duplicate IDs
  const allTasks = await db.tasks.toArray();
  assert.equal(allTasks.length, 2);

  const updatedTask1 = await db.tasks.get('backup-task-1');
  assert.equal(updatedTask1?.title, 'Master TypeScript 7.0 & Compiler APIs');

  const newTask2 = await db.tasks.get('backup-task-2');
  assert.equal(newTask2?.title, 'Build Distributed Consensus Demo');
});
