import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLocalInstruction,
  executeWoliAIActions,
  processWoliAIInput,
  WoliAIContext,
} from './woliAIEngine.ts';

function createMockContext(): WoliAIContext {
  return {
    todayDate: '2026-11-02',
    selectedDate: '2026-11-02',
    scheduleBlocks: [
      {
        id: 'block-1',
        title: 'Morning Study',
        date: '2026-11-02',
        startTime: '06:00',
        endTime: '07:00',
        plannedDuration: 60,
        actualDuration: 60,
        status: 'completed',
        category: 'Study',
        priority: 'medium',
        includeInWorkingTime: true,
        createdAt: '2026-11-02T06:00:00Z',
        updatedAt: '2026-11-02T07:00:00Z',
      },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Solve LeetCode Daily',
        category: 'Coding',
        priority: 'high',
        status: 'not_started',
        dueDate: '2026-11-02',
        estimatedDuration: 60,
        actualDuration: 0,
        tags: [],
        createdAt: '2026-11-02T06:00:00Z',
        updatedAt: '2026-11-02T06:00:00Z',
      },
    ],
    goals: [
      {
        id: 'goal-1',
        title: 'Master Core DSA',
        category: 'Study',
        horizon: 'monthly',
        startDate: '2026-11-01',
        targetDate: '2026-11-30',
        priority: 'high',
        goalType: 'duration',
        targetValue: 60,
        currentValue: 1,
        unit: 'hours',
        progressMethod: 'automatic_time',
        status: 'in_progress',
        linkedCategories: ['Study', 'Coding'],
        linkedHabitIds: [],
        linkedTaskIds: ['task-1'],
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ],
    habits: [
      {
        id: 'habit-1',
        name: 'Technical Reading',
        category: 'Study',
        icon: 'Book',
        color: '#6366f1',
        startDate: '2026-11-01',
        frequency: 'daily',
        selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        targetType: 'duration',
        targetQuantity: 30,
        unitOfMeasurement: 'minutes',
        isArchived: false,
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ],
    occurrences: [
      {
        id: 'occ-1',
        habitId: 'habit-1',
        date: '2026-11-02',
        status: 'completed',
        completedQuantity: 30,
        completedDuration: 30,
        completedAt: '2026-11-02T08:00:00Z',
        updatedAt: '2026-11-02T08:00:00Z',
      },
    ],
    timeSessions: [
      {
        id: 'session-1',
        title: 'Morning Study',
        category: 'Study',
        startTime: '2026-11-02T06:00:00Z',
        endTime: '2026-11-02T07:00:00Z',
        durationMinutes: 60,
        isManual: false,
        createdAt: '2026-11-02T07:00:00Z',
      },
    ],
  };
}

function createMockLifeOSActions(store: any) {
  return {
    addScheduleBlock: async (b: any) => {
      const id = `block-${Date.now()}-${Math.random()}`;
      store.scheduleBlocks.push({ id, ...b });
      return id;
    },
    updateScheduleBlock: async (id: string, updates: any) => {
      const idx = store.scheduleBlocks.findIndex((b: any) => b.id === id);
      if (idx !== -1) {
        store.scheduleBlocks[idx] = { ...store.scheduleBlocks[idx], ...updates };
      }
    },
    deleteScheduleBlock: async (id: string) => {
      store.scheduleBlocks = store.scheduleBlocks.filter((b: any) => b.id !== id);
    },
    addTask: async (t: any) => {
      const id = `task-${Date.now()}-${Math.random()}`;
      store.tasks.push({ id, ...t });
      return id;
    },
    updateTask: async (id: string, updates: any) => {
      const idx = store.tasks.findIndex((t: any) => t.id === id);
      if (idx !== -1) {
        store.tasks[idx] = { ...store.tasks[idx], ...updates };
      }
    },
    toggleTaskStatus: async (id: string) => {
      const t = store.tasks.find((task: any) => task.id === id);
      if (t) {
        t.status = t.status === 'completed' ? 'not_started' : 'completed';
      }
    },
    addGoal: async (g: any) => {
      const id = `goal-${Date.now()}-${Math.random()}`;
      store.goals.push({ id, ...g });
      return id;
    },
    recordHabitOccurrence: async (habitId: string, date: string, status: any) => {
      store.occurrences.push({ id: `occ-${Date.now()}`, habitId, date, status });
    },
  };
}

test('TEST 1: Basic text command creates schedule block in IndexedDB', async () => {
  const context = createMockContext();
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  const parsed = parseLocalInstruction('Schedule DSA tomorrow from 6 AM to 7 AM.', context);
  assert.equal(parsed.intent, 'create_schedule_blocks');
  assert.equal(parsed.data.blocks.length, 1);
  assert.equal(parsed.data.blocks[0].title, 'DSA');
  assert.equal(parsed.data.blocks[0].date, '2026-11-03');
  assert.equal(parsed.data.blocks[0].startTime, '06:00');
  assert.equal(parsed.data.blocks[0].endTime, '07:00');
  assert.equal(parsed.data.blocks[0].includeInWorkingTime, true);

  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);
  assert.equal(res.actionsExecuted.length, 1);
  assert.ok(res.reply.includes('DSA'));
  assert.equal(store.scheduleBlocks.length, 2);
  assert.equal(store.scheduleBlocks[1].title, 'DSA');
});

test('TEST 2: Multiple schedule creation from single command', async () => {
  const context = createMockContext();
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  const parsed = parseLocalInstruction(
    'Kal subah 6 se 7 DSA, 10 se 11 reading aur 2 se 4 JavaScript schedule kar do.',
    context
  );
  assert.equal(parsed.intent, 'create_schedule_blocks');
  assert.equal(parsed.data.blocks.length, 3);
  assert.equal(parsed.data.blocks[0].title, 'DSA');
  assert.equal(parsed.data.blocks[0].startTime, '06:00');
  assert.equal(parsed.data.blocks[1].title, 'Reading');
  assert.equal(parsed.data.blocks[1].startTime, '10:00');
  assert.equal(parsed.data.blocks[2].title, 'JavaScript');
  assert.equal(parsed.data.blocks[2].startTime, '14:00');
  assert.equal(parsed.data.blocks[2].endTime, '16:00');

  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);
  assert.equal(res.actionsExecuted.length, 3);
  assert.equal(store.scheduleBlocks.length, 4); // 1 initial + 3 created
});

test('TEST 3: Hindi command for workout creation with working time false', async () => {
  const context = createMockContext();
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  const parsed = parseLocalInstruction('Kal subah 7 baje workout schedule kar do.', context);
  assert.equal(parsed.intent, 'create_schedule_blocks');
  assert.equal(parsed.data.blocks.length, 1);
  assert.equal(parsed.data.blocks[0].title, 'Workout');
  assert.equal(parsed.data.blocks[0].category, 'Fitness');
  assert.equal(parsed.data.blocks[0].includeInWorkingTime, false);

  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);
  assert.equal(res.actionsExecuted.length, 1);
  assert.equal(store.scheduleBlocks.length, 2);
  assert.equal(store.scheduleBlocks[1].includeInWorkingTime, false);
});

test('TEST 4: Hinglish overnight command (10 PM to 12 AM)', async () => {
  const context = createMockContext();
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  const parsed = parseLocalInstruction(
    'Aaj raat 10 se 12 JavaScript practice karni hai, schedule kar do.',
    context
  );
  assert.equal(parsed.intent, 'create_schedule_blocks');
  assert.equal(parsed.data.blocks.length, 1);
  assert.equal(parsed.data.blocks[0].startTime, '22:00');
  assert.equal(parsed.data.blocks[0].endTime, '00:00');
  assert.equal(parsed.data.blocks[0].endsNextDay, true);

  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);
  assert.equal(res.actionsExecuted.length, 1);
  assert.equal(store.scheduleBlocks.length, 2);
  assert.equal(store.scheduleBlocks[1].plannedDuration, 120);
});

test('TEST 5: Reschedule / Move follow-up command', async () => {
  const context = createMockContext();
  context.scheduleBlocks.push({
    id: 'block-dsa',
    title: 'DSA',
    date: '2026-11-02',
    startTime: '06:00',
    endTime: '07:00',
    plannedDuration: 60,
    actualDuration: 0,
    status: 'scheduled',
    category: 'Coding',
    priority: 'medium',
    includeInWorkingTime: true,
    createdAt: '2026-11-02T06:00:00Z',
    updatedAt: '2026-11-02T06:00:00Z',
  });
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  const parsed = parseLocalInstruction('Move DSA to 8 AM', context);
  assert.equal(parsed.intent, 'update_schedule_block');
  assert.equal(parsed.data.newStartTime, '08:00');

  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);
  assert.equal(res.actionsExecuted.length, 1);
  const updated = store.scheduleBlocks.find((b: any) => b.id === 'block-dsa');
  assert.ok(updated, 'block-dsa should be found in store');
  assert.equal(updated!.startTime, '08:00');
  assert.equal(updated!.endTime, '09:00');
});

test('TEST 6: Task creation with deadline (Friday tak DBMS assignment)', async () => {
  const context = createMockContext();
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  const parsed = parseLocalInstruction(
    'Friday tak DBMS assignment complete karna hai, task bana do.',
    context
  );
  assert.equal(parsed.intent, 'create_task');
  assert.ok(parsed.data.title.toLowerCase().includes('dbms'));

  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);
  assert.equal(res.actionsExecuted.length, 1);
  assert.equal(store.tasks.length, 2);
  assert.ok(store.tasks[1].title.toLowerCase().includes('dbms'));
});

test('TEST 7: Productivity query retrieves real calculation without fabrication', async () => {
  const context = createMockContext();
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  const parsed = parseLocalInstruction('How much productive working time did I complete today?', context);
  assert.equal(parsed.intent, 'query_productivity');

  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);
  assert.ok(res.reply.includes('Tracked Working Time: 1h'));
  assert.ok(res.reply.includes('Planned Productive Time: 1h'));
});

test('TEST 8: Schedule conflict detection when times overlap', async () => {
  const context = createMockContext();
  const store = { ...context };
  const actions = createMockLifeOSActions(store);

  // Attempt to schedule at 06:00 - 07:00 when Morning Study already exists on that date
  const parsed = parseLocalInstruction('Schedule DSA from 6 to 7 AM', context);
  const res = await executeWoliAIActions(parsed.intent, parsed.data, context, actions);

  assert.equal(res.conflictDetected, true);
  assert.ok(res.reply.includes('Morning Study'));
});
