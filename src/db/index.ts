import Dexie, { Table } from 'dexie';
import {
  Category,
  DailyReview,
  ExportData,
  Goal,
  GoalMilestone,
  Habit,
  HabitOccurrence,
  MonthlyReview,
  ScheduleBlock,
  Task,
  TimeSession,
  UserSettings,
  WeeklyReview,
  YearlyReview,
} from '../types';

export class LifeOSDatabase extends Dexie {
  tasks!: Table<Task, string>;
  habits!: Table<Habit, string>;
  habitOccurrences!: Table<HabitOccurrence, string>;
  scheduleBlocks!: Table<ScheduleBlock, string>;
  timeSessions!: Table<TimeSession, string>;
  goals!: Table<Goal, string>;
  goalMilestones!: Table<GoalMilestone, string>;
  dailyReviews!: Table<DailyReview, string>;
  weeklyReviews!: Table<WeeklyReview, string>;
  monthlyReviews!: Table<MonthlyReview, string>;
  yearlyReviews!: Table<YearlyReview, string>;
  categories!: Table<Category, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('LifeOSDB');
    this.version(1).stores({
      tasks: 'id, dueDate, status, category, priority, linkedGoalId, linkedHabitId, createdAt',
      habits: 'id, isArchived, category, createdAt',
      habitOccurrences: 'id, habitId, date, status, [habitId+date]',
      scheduleBlocks: 'id, date, status, category, linkedTaskId, linkedGoalId',
      timeSessions: 'id, startTime, category, linkedTaskId, linkedHabitId, linkedGoalId, isManual',
      goals: 'id, horizon, status, category, parentGoalId, startDate, targetDate',
      goalMilestones: 'id, goalId, isCompleted',
      dailyReviews: 'id, date',
      weeklyReviews: 'id, weekStart',
      monthlyReviews: 'id, month',
      yearlyReviews: 'id, year',
      categories: 'id, name',
      settings: 'id',
    });
  }
}

export const db = new LifeOSDatabase();

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-study', name: 'Study', color: '#6366f1', icon: 'book', isDefault: true },
  { id: 'cat-coding', name: 'Coding', color: '#0ea5e9', icon: 'code', isDefault: true },
  { id: 'cat-exercise', name: 'Exercise', color: '#10b981', icon: 'activity', isDefault: true },
  { id: 'cat-reading', name: 'Reading', color: '#8b5cf6', icon: 'book-open', isDefault: true },
  { id: 'cat-work', name: 'Work', color: '#f59e0b', icon: 'briefcase', isDefault: true },
  { id: 'cat-personal-dev', name: 'Personal Development', color: '#ec4899', icon: 'sparkles', isDefault: true },
  { id: 'cat-personal', name: 'Personal', color: '#64748b', icon: 'user', isDefault: true },
  { id: 'cat-break', name: 'Break', color: '#94a3b8', icon: 'coffee', isDefault: true },
  { id: 'cat-other', name: 'Other', color: '#71717a', icon: 'more-horizontal', isDefault: true },
];

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'current_user_settings',
  theme: 'light',
  timeFormat: '24h',
  weekStartDay: 1, // Monday
  dayStartHour: 6,
  dayEndHour: 23,
  defaultTaskDuration: 30,
  productivityWeights: {
    taskRate: 40,
    habitRate: 30,
    scheduleAdherence: 30,
  },
  showProductivityScore: true,
};

/**
 * Initializes database with default categories, settings, and starter data if empty.
 */
export async function initializeDatabase(): Promise<void> {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put(DEFAULT_SETTINGS);
  }

  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkPut(DEFAULT_CATEGORIES);
  }

  // Seed sample starter data only if tasks and habits are completely empty
  const taskCount = await db.tasks.count();
  const habitCount = await db.habits.count();

  if (taskCount === 0 && habitCount === 0) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const starterGoalId = 'goal-seed-dsa';
    const starterHabitId = 'habit-seed-coding';

    // 1. Starter Goal
    await db.goals.put({
      id: starterGoalId,
      title: 'Master Core DSA & Problem Solving',
      description: 'Solve 100 algorithmic challenges and complete 60 hours of focused practice.',
      category: 'Study',
      horizon: 'monthly',
      startDate: `${y}-${m}-01`,
      targetDate: `${y}-${m}-30`,
      priority: 'high',
      goalType: 'duration',
      targetValue: 60,
      currentValue: 0,
      unit: 'hours',
      progressMethod: 'automatic_time',
      linkedCategories: ['Study', 'Coding'],
      linkedHabitIds: [starterHabitId],
      linkedTaskIds: ['task-seed-1', 'task-seed-2'],
      status: 'in_progress',
      notes: 'Key focus on dynamic programming, graphs, and system design patterns.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.goalMilestones.bulkPut([
      { id: 'm1', goalId: starterGoalId, title: 'Complete Trees & Binary Search', isCompleted: true, completedAt: todayStr, weight: 1, createdAt: new Date().toISOString() },
      { id: 'm2', goalId: starterGoalId, title: 'Solve 20 Dynamic Programming Problems', isCompleted: false, weight: 1, createdAt: new Date().toISOString() },
      { id: 'm3', goalId: starterGoalId, title: 'Mock Technical Interview', isCompleted: false, weight: 1, createdAt: new Date().toISOString() },
    ]);

    // 2. Starter Habits
    await db.habits.bulkPut([
      {
        id: starterHabitId,
        name: 'DSA & Coding Practice',
        description: 'Solve at least one medium LeetCode / algorithmic challenge.',
        category: 'Coding',
        icon: 'terminal',
        color: '#0ea5e9',
        startDate: `${y}-${m}-01`,
        frequency: 'daily',
        selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        targetType: 'duration',
        targetQuantity: 60,
        unitOfMeasurement: 'minutes',
        preferredTime: '09:00',
        linkedGoalId: starterGoalId,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'habit-seed-exercise',
        name: 'Morning Workout & Stretch',
        description: 'Cardio, strength session, or mobility exercise.',
        category: 'Exercise',
        icon: 'activity',
        color: '#10b981',
        startDate: `${y}-${m}-01`,
        frequency: 'weekdays',
        selectedWeekdays: [1, 2, 3, 4, 5],
        targetType: 'binary',
        targetQuantity: 1,
        unitOfMeasurement: 'session',
        preferredTime: '07:30',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'habit-seed-read',
        name: 'Technical Reading',
        description: 'Read 15 pages of architecture books or papers.',
        category: 'Reading',
        icon: 'book-open',
        color: '#8b5cf6',
        startDate: `${y}-${m}-01`,
        frequency: 'daily',
        selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
        targetType: 'quantity',
        targetQuantity: 15,
        unitOfMeasurement: 'pages',
        preferredTime: '21:30',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // Starter Habit Occurrences
    await db.habitOccurrences.bulkPut([
      {
        id: `occ-${starterHabitId}-${todayStr}`,
        habitId: starterHabitId,
        date: todayStr,
        status: 'completed',
        completedQuantity: 60,
        completedDuration: 60,
        notes: 'Solved Tree diameter and LCA problems.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `occ-habit-seed-exercise-${todayStr}`,
        habitId: 'habit-seed-exercise',
        date: todayStr,
        status: 'completed',
        completedQuantity: 1,
        completedDuration: 45,
        notes: '30 min HIIT & stretching.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // 3. Starter Tasks
    await db.tasks.bulkPut([
      {
        id: 'task-seed-1',
        title: 'Review Graph Traversal & Dijkstra Algorithm',
        description: 'Implement shortest path and topological sort with unit tests.',
        dueDate: todayStr,
        startDate: todayStr,
        priority: 'high',
        importance: 'high',
        status: 'completed',
        category: 'Coding',
        estimatedDuration: 60,
        actualDuration: 60,
        linkedGoalId: starterGoalId,
        linkedHabitId: starterHabitId,
        tags: ['algorithms', 'graphs'],
        notes: 'Clean O((V+E)logV) implementation.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      {
        id: 'task-seed-2',
        title: 'Implement WOLI OS Data Architecture',
        description: 'Setup typed models, IndexedDB persistence, and analytical rule engines.',
        dueDate: todayStr,
        startDate: todayStr,
        priority: 'urgent',
        importance: 'high',
        status: 'in_progress',
        category: 'Work',
        estimatedDuration: 90,
        actualDuration: 45,
        tags: ['life-os', 'architecture'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-seed-3',
        title: 'Draft Monthly Systems Review',
        description: 'Synthesize monthly progress, time distribution, and habits.',
        dueDate: todayStr,
        priority: 'medium',
        importance: 'medium',
        status: 'not_started',
        category: 'Personal Development',
        estimatedDuration: 30,
        actualDuration: 0,
        tags: ['planning', 'reflection'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // 4. Starter Schedule Blocks for Today
    await db.scheduleBlocks.bulkPut([
      {
        id: 'block-1',
        title: 'Morning Workout & Stretch',
        date: todayStr,
        startTime: '07:30',
        endTime: '08:15',
        plannedDuration: 45,
        actualDuration: 45,
        category: 'Exercise',
        priority: 'medium',
        status: 'completed',
        linkedHabitId: 'habit-seed-exercise',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'block-2',
        title: 'DSA: Graph Traversal & Dijkstra',
        date: todayStr,
        startTime: '09:00',
        endTime: '10:30',
        plannedDuration: 90,
        actualDuration: 90,
        category: 'Coding',
        priority: 'high',
        status: 'completed',
        linkedTaskId: 'task-seed-1',
        linkedHabitId: starterHabitId,
        linkedGoalId: starterGoalId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'block-3',
        title: 'Deep Work: WOLI OS Architecture',
        date: todayStr,
        startTime: '11:00',
        endTime: '13:00',
        plannedDuration: 120,
        actualDuration: 75,
        category: 'Work',
        priority: 'urgent',
        status: 'in_progress',
        linkedTaskId: 'task-seed-2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // 5. Starter Time Sessions
    await db.timeSessions.bulkPut([
      {
        id: 'session-1',
        title: 'Morning Workout',
        startTime: `${todayStr}T07:30:00Z`,
        endTime: `${todayStr}T08:15:00Z`,
        durationMinutes: 45,
        category: 'Exercise',
        linkedHabitId: 'habit-seed-exercise',
        isManual: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'session-2',
        title: 'DSA: Graphs & Shortest Path',
        startTime: `${todayStr}T09:00:00Z`,
        endTime: `${todayStr}T10:30:00Z`,
        durationMinutes: 90,
        category: 'Coding',
        linkedTaskId: 'task-seed-1',
        linkedHabitId: starterHabitId,
        linkedGoalId: starterGoalId,
        isManual: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }
}

/**
 * Exports all database tables to a unified JSON backup object.
 */
export async function exportFullBackup(): Promise<ExportData> {
  const [
    tasks,
    habits,
    habitOccurrences,
    scheduleBlocks,
    timeSessions,
    goals,
    goalMilestones,
    dailyReviews,
    weeklyReviews,
    monthlyReviews,
    yearlyReviews,
    categories,
    settingsList,
  ] = await Promise.all([
    db.tasks.toArray(),
    db.habits.toArray(),
    db.habitOccurrences.toArray(),
    db.scheduleBlocks.toArray(),
    db.timeSessions.toArray(),
    db.goals.toArray(),
    db.goalMilestones.toArray(),
    db.dailyReviews.toArray(),
    db.weeklyReviews.toArray(),
    db.monthlyReviews.toArray(),
    db.yearlyReviews.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    habits,
    habitOccurrences,
    scheduleBlocks,
    timeSessions,
    goals,
    goalMilestones,
    dailyReviews,
    weeklyReviews,
    monthlyReviews,
    yearlyReviews,
    categories,
    settings: settingsList[0] || DEFAULT_SETTINGS,
  };
}

/**
 * Restores database from a validated JSON backup.
 * Supports replacement mode or merging mode.
 */
export async function restoreFromBackup(
  backup: ExportData,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string }> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup file: not a JSON object.');
  }

  if (!Array.isArray(backup.tasks) || !Array.isArray(backup.habits)) {
    throw new Error('Invalid backup file: missing required tasks or habits tables.');
  }

  await db.transaction('rw', [
    db.tasks,
    db.habits,
    db.habitOccurrences,
    db.scheduleBlocks,
    db.timeSessions,
    db.goals,
    db.goalMilestones,
    db.dailyReviews,
    db.weeklyReviews,
    db.monthlyReviews,
    db.yearlyReviews,
    db.categories,
    db.settings,
  ], async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.tasks.clear(),
        db.habits.clear(),
        db.habitOccurrences.clear(),
        db.scheduleBlocks.clear(),
        db.timeSessions.clear(),
        db.goals.clear(),
        db.goalMilestones.clear(),
        db.dailyReviews.clear(),
        db.weeklyReviews.clear(),
        db.monthlyReviews.clear(),
        db.yearlyReviews.clear(),
        db.categories.clear(),
        db.settings.clear(),
      ]);
    }

    if (backup.categories?.length) await db.categories.bulkPut(backup.categories);
    if (backup.tasks?.length) await db.tasks.bulkPut(backup.tasks);
    if (backup.habits?.length) await db.habits.bulkPut(backup.habits);
    if (backup.habitOccurrences?.length) await db.habitOccurrences.bulkPut(backup.habitOccurrences);
    if (backup.scheduleBlocks?.length) await db.scheduleBlocks.bulkPut(backup.scheduleBlocks);
    if (backup.timeSessions?.length) await db.timeSessions.bulkPut(backup.timeSessions);
    if (backup.goals?.length) await db.goals.bulkPut(backup.goals);
    if (backup.goalMilestones?.length) await db.goalMilestones.bulkPut(backup.goalMilestones);
    if (backup.dailyReviews?.length) await db.dailyReviews.bulkPut(backup.dailyReviews);
    if (backup.weeklyReviews?.length) await db.weeklyReviews.bulkPut(backup.weeklyReviews);
    if (backup.monthlyReviews?.length) await db.monthlyReviews.bulkPut(backup.monthlyReviews);
    if (backup.yearlyReviews?.length) await db.yearlyReviews.bulkPut(backup.yearlyReviews);
    if (backup.settings) await db.settings.put(backup.settings);
  });

  return { success: true, message: `Successfully restored ${mode === 'replace' ? 'and replaced' : 'and merged'} database records.` };
}

/**
 * Exports data to CSV string format.
 */
export function exportToCsv(data: any[], filenamePrefix: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((fieldName) => {
        const val = (row as any)[fieldName];
        if (val === null || val === undefined) return '""';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
