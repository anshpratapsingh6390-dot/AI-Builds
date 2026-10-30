import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { db, initializeDatabase } from './index';
import { calculateGoalProgress } from '../utils/rules';
import { Goal, Task, TimeSession } from '../types';

test('Integration: Task discovery loads all eligible tasks without hardcoded limits', async () => {
  await db.delete();
  await db.open();
  await initializeDatabase();

  // Add 6 custom tasks across categories
  for (let i = 1; i <= 6; i++) {
    await db.tasks.put({
      id: `task-custom-${i}`,
      title: `Custom Project Task ${i}`,
      category: i % 2 === 0 ? 'Work' : 'Study',
      priority: 'high',
      status: 'not_started',
      estimatedDuration: 45,
      actualDuration: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const allTasks = await db.tasks.toArray();
  const eligible = allTasks.filter((t) => t.status !== 'cancelled');
  // Starter had 3 tasks, plus 6 custom tasks = at least 9 tasks available
  assert.ok(eligible.length >= 9, 'All tasks retrieved dynamically without 3-record limit');

  // Search by title
  const searchResults = eligible.filter((t) => t.title.toLowerCase().includes('task 4'));
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, 'task-custom-4');
});

test('Integration: Create task inline, link to goal, record 60m work -> 1h / 15h (6.67%)', async () => {
  await db.delete();
  await db.open();
  await initializeDatabase();

  // Create Goal: 15 hours automatic time tracking
  const goalId = 'goal-js-series-integration';
  const goal: Goal = {
    id: goalId,
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
    linkedTaskIds: [],
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.goals.put(goal);

  // 1. Create Task inline (Option B)
  const taskId = 'task-js-lectures-new';
  const newTask: Task = {
    id: taskId,
    title: 'JavaScript lectures by rohit negi',
    category: 'Coding',
    priority: 'high',
    estimatedDuration: 90,
    actualDuration: 0, // initially 0
    status: 'not_started',
    linkedGoalId: goalId,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.tasks.put(newTask);

  // Link task in goal
  await db.goals.update(goalId, {
    linkedTaskIds: [taskId],
  });

  // Verify that with 0m actual work, progress is 0%
  let updatedGoal = (await db.goals.get(goalId))!;
  let updatedTasks = await db.tasks.toArray();
  let progress = calculateGoalProgress(updatedGoal, [], updatedTasks, [], [], []);
  assert.equal(progress.currentValue, 0);
  assert.equal(progress.percentage, 0);

  // 2. Record 60 minutes of actual work
  const session1: TimeSession = {
    id: 'session-lec-1',
    title: 'JavaScript lectures study block',
    startTime: '2026-10-28T10:00:00Z',
    endTime: '2026-10-28T11:00:00Z',
    durationMinutes: 60,
    category: 'Coding',
    linkedTaskId: taskId,
    linkedGoalId: goalId,
    isManual: false,
    createdAt: new Date().toISOString(),
  };
  await db.timeSessions.put(session1);
  await db.tasks.update(taskId, { actualDuration: 60 });

  updatedGoal = (await db.goals.get(goalId))!;
  updatedTasks = await db.tasks.toArray();
  const sessions = await db.timeSessions.toArray();

  progress = calculateGoalProgress(updatedGoal, sessions, updatedTasks, [], [], []);
  // Completed: 1 hour, Target: 15 hours, Remaining: 14 hours, Progress: 6.67%
  assert.equal(progress.currentValue, 1.0);
  assert.equal(progress.percentage, 6.67);
  assert.equal(progress.remaining, 14.0);

  // 3. Add second task "DSA" with 30m actual work
  const taskId2 = 'task-dsa-new';
  const newTask2: Task = {
    id: taskId2,
    title: 'DSA',
    category: 'Coding',
    priority: 'high',
    estimatedDuration: 45,
    actualDuration: 30, // 30 mins
    status: 'in_progress',
    linkedGoalId: goalId,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.tasks.put(newTask2);

  const session2: TimeSession = {
    id: 'session-dsa-1',
    title: 'DSA problem solving',
    startTime: '2026-10-28T14:00:00Z',
    endTime: '2026-10-28T14:30:00Z',
    durationMinutes: 30,
    category: 'Coding',
    linkedTaskId: taskId2,
    linkedGoalId: goalId,
    isManual: false,
    createdAt: new Date().toISOString(),
  };
  await db.timeSessions.put(session2);

  await db.goals.update(goalId, {
    linkedTaskIds: [taskId, taskId2],
  });

  updatedGoal = (await db.goals.get(goalId))!;
  updatedTasks = await db.tasks.toArray();
  const allSessions = await db.timeSessions.toArray();

  progress = calculateGoalProgress(updatedGoal, allSessions, updatedTasks, [], [], []);
  // Completed: 1.5 hours, Target: 15 hours, Remaining: 13.5 hours, Progress: 10%
  assert.equal(progress.currentValue, 1.5);
  assert.equal(progress.percentage, 10.0);
  assert.equal(progress.remaining, 13.5);

  // 4. Edit session 1 from 60m to 90m:
  await db.timeSessions.update('session-lec-1', { durationMinutes: 90 });
  await db.tasks.update(taskId, { actualDuration: 90 });
  const editedSessions = await db.timeSessions.toArray();
  updatedTasks = await db.tasks.toArray();
  progress = calculateGoalProgress(updatedGoal, editedSessions, updatedTasks, [], [], []);
  // 90m + 30m = 120m = 2.0 hours -> 2 / 15 = 13.33%
  assert.equal(progress.currentValue, 2.0);
  assert.equal(progress.percentage, 13.33);

  // 5. Delete session 1: only session 2 (30m = 0.5h) remains
  await db.timeSessions.delete('session-lec-1');
  await db.tasks.update(taskId, { actualDuration: 0 });
  const afterDeleteSessions = await db.timeSessions.toArray();
  updatedTasks = await db.tasks.toArray();
  progress = calculateGoalProgress(updatedGoal, afterDeleteSessions, updatedTasks, [], [], []);
  assert.equal(progress.currentValue, 0.5);
  assert.equal(progress.percentage, 3.33);
});
