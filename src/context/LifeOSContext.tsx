import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ActiveTimerState,
  Category,
  DailyReview,
  Goal,
  GoalMilestone,
  Habit,
  HabitOccurrence,
  HabitOccurrenceStatus,
  MonthlyReview,
  ScheduleBlock,
  Task,
  TimeSession,
  UserSettings,
  WeeklyReview,
  YearlyReview,
} from '../types';
import { db, DEFAULT_SETTINGS, initializeDatabase } from '../db';
import { formatDateIso, getTodayDateString } from '../utils/dateUtils';

interface LifeOSContextType {
  tasks: Task[];
  habits: Habit[];
  occurrences: HabitOccurrence[];
  scheduleBlocks: ScheduleBlock[];
  timeSessions: TimeSession[];
  goals: Goal[];
  milestones: GoalMilestone[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  yearlyReviews: YearlyReview[];
  categories: Category[];
  settings: UserSettings;
  loading: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Active Timer
  activeTimer: ActiveTimerState | null;
  timerElapsedSeconds: number;
  startTimer: (opts: { title: string; category: string; linkedTaskId?: string; linkedHabitId?: string; linkedGoalId?: string }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopAndSaveTimer: (notes?: string) => Promise<void>;
  discardTimer: () => void;
  recordManualTime: (session: Omit<TimeSession, 'id' | 'createdAt'>) => Promise<void>;

  // Task Mutations
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  resetTask: (id: string) => Promise<void>;

  // Habit Mutations
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  recordHabitOccurrence: (habitId: string, date: string, status: HabitOccurrenceStatus, qty?: number, duration?: number, notes?: string) => Promise<void>;

  // Schedule Mutations
  addScheduleBlock: (block: Omit<ScheduleBlock, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateScheduleBlock: (id: string, updates: Partial<ScheduleBlock>) => Promise<void>;
  deleteScheduleBlock: (id: string) => Promise<void>;
  resetScheduleBlock: (id: string) => Promise<void>;
  clearScheduleBlocksForDate: (date: string) => Promise<void>;
  resetScheduleBlocksForDate: (date: string) => Promise<void>;

  // Goal Mutations
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addMilestone: (milestone: Omit<GoalMilestone, 'id' | 'createdAt'>) => Promise<string>;
  toggleMilestone: (id: string) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;

  // Reviews
  saveDailyReview: (review: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  saveWeeklyReview: (review: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  saveMonthlyReview: (review: Omit<MonthlyReview, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  saveYearlyReview: (review: Omit<YearlyReview, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  // Settings & Categories
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  addCategory: (name: string, color: string, icon?: string) => Promise<void>;
  refreshAll: () => Promise<void>;

  // Theme control
  toggleTheme: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;

  // Quick Add Modal Global Control
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  quickAddType: 'task' | 'habit' | 'schedule' | 'goal' | 'time';
  setQuickAddType: (type: 'task' | 'habit' | 'schedule' | 'goal' | 'time') => void;

  // Global search query
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const LifeOSContext = createContext<LifeOSContextType | null>(null);

export const LifeOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [occurrences, setOccurrences] = useState<HabitOccurrence[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([]);
  const [yearlyReviews, setYearlyReviews] = useState<YearlyReview[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Add State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'task' | 'habit' | 'schedule' | 'goal' | 'time'>('task');

  // Active Timer state
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState | null>(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);

  // Load database state
  const refreshAll = useCallback(async () => {
    try {
      const [
        t,
        h,
        occ,
        sched,
        sessions,
        g,
        m,
        dRev,
        wRev,
        mRev,
        yRev,
        cats,
        sets,
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

      setTasks(t);
      setHabits(h);
      setOccurrences(occ);
      setScheduleBlocks(sched);
      setTimeSessions(sessions);
      setGoals(g);
      setMilestones(m);
      setDailyReviews(dRev);
      setWeeklyReviews(wRev);
      setMonthlyReviews(mRev);
      setYearlyReviews(yRev);
      setCategories(cats);

      const userSet = sets[0] || DEFAULT_SETTINGS;
      setSettings(userSet);

      if (userSet.activeTimerState) {
        setActiveTimer(userSet.activeTimerState);
      }
    } catch (err) {
      console.error('Failed to load database records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize DB on boot
  useEffect(() => {
    initializeDatabase().then(() => {
      refreshAll();
    });
  }, [refreshAll]);

  // Timer Tick Engine based on Date.now() timestamp
  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning || activeTimer.isPaused) {
      if (activeTimer && activeTimer.isPaused) {
        setTimerElapsedSeconds(Math.floor(activeTimer.elapsedBeforePause / 1000));
      } else if (!activeTimer) {
        setTimerElapsedSeconds(0);
      }
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const currentSpan = now - activeTimer.startTime;
      const totalMs = activeTimer.elapsedBeforePause + currentSpan;
      setTimerElapsedSeconds(Math.floor(totalMs / 1000));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Persist timer state to DB so refreshing keeps active session
  const saveTimerToSettings = useCallback(async (timer: ActiveTimerState | null) => {
    setActiveTimer(timer);
    try {
      const current = (await db.settings.get('current_user_settings')) || DEFAULT_SETTINGS;
      await db.settings.put({
        ...current,
        activeTimerState: timer || undefined,
      });
    } catch (e) {
      console.error('Failed to persist timer state', e);
    }
  }, []);

  const startTimer = useCallback((opts: { title: string; category: string; linkedTaskId?: string; linkedHabitId?: string; linkedGoalId?: string }) => {
    const newTimer: ActiveTimerState = {
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      elapsedBeforePause: 0,
      title: opts.title || 'Focus Session',
      category: opts.category || 'Work',
      linkedTaskId: opts.linkedTaskId,
      linkedHabitId: opts.linkedHabitId,
      linkedGoalId: opts.linkedGoalId,
    };
    saveTimerToSettings(newTimer);
  }, [saveTimerToSettings]);

  const pauseTimer = useCallback(() => {
    if (!activeTimer || !activeTimer.isRunning || activeTimer.isPaused) return;
    const now = Date.now();
    const totalElapsed = activeTimer.elapsedBeforePause + (now - activeTimer.startTime);
    const updated: ActiveTimerState = {
      ...activeTimer,
      isPaused: true,
      elapsedBeforePause: totalElapsed,
      pausedAt: now,
    };
    saveTimerToSettings(updated);
  }, [activeTimer, saveTimerToSettings]);

  const resumeTimer = useCallback(() => {
    if (!activeTimer || !activeTimer.isPaused) return;
    const updated: ActiveTimerState = {
      ...activeTimer,
      isPaused: false,
      startTime: Date.now(),
    };
    saveTimerToSettings(updated);
  }, [activeTimer, saveTimerToSettings]);

  const stopAndSaveTimer = useCallback(async (notes?: string) => {
    if (!activeTimer) return;
    const now = Date.now();
    const totalMs = activeTimer.isPaused
      ? activeTimer.elapsedBeforePause
      : activeTimer.elapsedBeforePause + (now - activeTimer.startTime);
    const durationMinutes = Math.max(1, Math.round(totalMs / 60000));

    const newSession: TimeSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: activeTimer.title,
      startTime: new Date(now - totalMs).toISOString(),
      endTime: new Date(now).toISOString(),
      durationMinutes,
      category: activeTimer.category,
      linkedTaskId: activeTimer.linkedTaskId,
      linkedHabitId: activeTimer.linkedHabitId,
      linkedGoalId: activeTimer.linkedGoalId,
      isManual: false,
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };

    await db.timeSessions.put(newSession);

    // If linked to a task, update task's actualDuration
    if (activeTimer.linkedTaskId) {
      const task = await db.tasks.get(activeTimer.linkedTaskId);
      if (task) {
        await db.tasks.update(task.id, {
          actualDuration: (task.actualDuration || 0) + durationMinutes,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // If linked to a habit, update or create today's habit occurrence duration
    if (activeTimer.linkedHabitId) {
      const today = getTodayDateString();
      const existingOcc = await db.habitOccurrences
        .where({ habitId: activeTimer.linkedHabitId, date: today })
        .first();
      if (existingOcc) {
        await db.habitOccurrences.update(existingOcc.id, {
          completedDuration: (existingOcc.completedDuration || 0) + durationMinutes,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.habitOccurrences.put({
          id: `occ-${activeTimer.linkedHabitId}-${today}`,
          habitId: activeTimer.linkedHabitId,
          date: today,
          status: 'partial',
          completedQuantity: 0,
          completedDuration: durationMinutes,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await saveTimerToSettings(null);
    setTimerElapsedSeconds(0);
    await refreshAll();
  }, [activeTimer, refreshAll, saveTimerToSettings]);

  const discardTimer = useCallback(() => {
    saveTimerToSettings(null);
    setTimerElapsedSeconds(0);
  }, [saveTimerToSettings]);

  const recordManualTime = useCallback(async (session: Omit<TimeSession, 'id' | 'createdAt'>) => {
    const newSession: TimeSession = {
      ...session,
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await db.timeSessions.put(newSession);

    // Update task duration if linked
    if (newSession.linkedTaskId) {
      const task = await db.tasks.get(newSession.linkedTaskId);
      if (task) {
        await db.tasks.update(task.id, {
          actualDuration: (task.actualDuration || 0) + newSession.durationMinutes,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await refreshAll();
  }, [refreshAll]);

  // Task Mutations
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newTask: Task = {
      ...taskData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.tasks.put(newTask);
    await refreshAll();
    return id;
  }, [refreshAll]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const current = await db.tasks.get(id);
    if (!current) return;
    const now = new Date().toISOString();
    const finalUpdates = { ...updates, updatedAt: now };

    if (updates.status === 'completed' && current.status !== 'completed') {
      finalUpdates.completedAt = now;
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      } catch {
        // ignore in non-browser
      }
    } else if (updates.status && updates.status !== 'completed') {
      finalUpdates.completedAt = undefined;
    }

    await db.tasks.update(id, finalUpdates);

    // If linked to a schedule block, update schedule block status
    const linkedBlock = await db.scheduleBlocks.where('linkedTaskId').equals(id).first();
    if (linkedBlock && updates.status) {
      const blockStatus = updates.status === 'completed' ? 'completed' : updates.status === 'in_progress' ? 'in_progress' : 'scheduled';
      await db.scheduleBlocks.update(linkedBlock.id, { status: blockStatus, updatedAt: now });
    }

    await refreshAll();
  }, [refreshAll]);

  const deleteTask = useCallback(async (id: string) => {
    const linkedBlock = await db.scheduleBlocks.where('linkedTaskId').equals(id).first();
    if (linkedBlock) {
      await db.scheduleBlocks.update(linkedBlock.id, {
        linkedTaskId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    await db.tasks.delete(id);
    await refreshAll();
  }, [refreshAll]);

  const toggleTaskStatus = useCallback(async (id: string) => {
    const task = await db.tasks.get(id);
    if (!task) return;
    const nextStatus = task.status === 'completed' ? 'not_started' : 'completed';
    await updateTask(id, { status: nextStatus });
  }, [updateTask]);

  const resetTask = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await db.tasks.update(id, {
      status: 'not_started',
      actualDuration: 0,
      completedAt: undefined,
      updatedAt: now,
    });
    const linkedBlock = await db.scheduleBlocks.where('linkedTaskId').equals(id).first();
    if (linkedBlock) {
      await db.scheduleBlocks.update(linkedBlock.id, {
        status: 'scheduled',
        actualDuration: 0,
        notes: '',
        updatedAt: now,
      });
    }
    await refreshAll();
  }, [refreshAll]);

  // Habit Mutations
  const addHabit = useCallback(async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const id = `habit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newHabit: Habit = {
      ...habitData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.habits.put(newHabit);
    await refreshAll();
    return id;
  }, [refreshAll]);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const now = new Date().toISOString();
    await db.habits.update(id, { ...updates, updatedAt: now });
    await refreshAll();
  }, [refreshAll]);

  const deleteHabit = useCallback(async (id: string) => {
    // Preserve occurrences for historical accuracy, or archive
    await db.habits.delete(id);
    await refreshAll();
  }, [refreshAll]);

  const recordHabitOccurrence = useCallback(async (
    habitId: string,
    date: string,
    status: HabitOccurrenceStatus,
    qty?: number,
    duration?: number,
    notes?: string
  ) => {
    const now = new Date().toISOString();
    const existing = await db.habitOccurrences.where({ habitId, date }).first();

    if (existing) {
      if (status === 'missed' && existing.status === 'completed') {
        // Toggle back to not done
        await db.habitOccurrences.delete(existing.id);
      } else {
        await db.habitOccurrences.update(existing.id, {
          status,
          completedQuantity: qty !== undefined ? qty : existing.completedQuantity,
          completedDuration: duration !== undefined ? duration : existing.completedDuration,
          notes: notes !== undefined ? notes : existing.notes,
          completedAt: status === 'completed' ? now : existing.completedAt,
          updatedAt: now,
        });
      }
    } else {
      const id = `occ-${habitId}-${date}`;
      await db.habitOccurrences.put({
        id,
        habitId,
        date,
        status,
        completedQuantity: qty || 0,
        completedDuration: duration || 0,
        notes: notes || '',
        completedAt: status === 'completed' ? now : undefined,
        updatedAt: now,
      });
    }

    if (status === 'completed') {
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      } catch {
        // ignore
      }
    }

    await refreshAll();
  }, [refreshAll]);

  // Schedule Mutations
  const addScheduleBlock = useCallback(async (blockData: Omit<ScheduleBlock, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newBlock: ScheduleBlock = {
      ...blockData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.scheduleBlocks.put(newBlock);
    await refreshAll();
    return id;
  }, [refreshAll]);

  const updateScheduleBlock = useCallback(async (id: string, updates: Partial<ScheduleBlock>) => {
    const now = new Date().toISOString();
    await db.scheduleBlocks.update(id, { ...updates, updatedAt: now });
    await refreshAll();
  }, [refreshAll]);

  const deleteScheduleBlock = useCallback(async (id: string) => {
    const block = await db.scheduleBlocks.get(id);
    const now = new Date().toISOString();
    if (block?.linkedTaskId) {
      await db.tasks.update(block.linkedTaskId, {
        scheduleBlockId: undefined,
        updatedAt: now,
      });
    }
    const allTasks = await db.tasks.toArray();
    for (const t of allTasks) {
      if (t.scheduleBlockId === id) {
        await db.tasks.update(t.id, {
          scheduleBlockId: undefined,
          updatedAt: now,
        });
      }
    }
    await db.scheduleBlocks.delete(id);
    await refreshAll();
  }, [refreshAll]);

  const resetScheduleBlock = useCallback(async (id: string) => {
    const block = await db.scheduleBlocks.get(id);
    if (!block) return;
    const now = new Date().toISOString();
    await db.scheduleBlocks.update(id, {
      status: 'scheduled',
      actualDuration: 0,
      notes: '',
      updatedAt: now,
    });
    if (block.linkedTaskId) {
      await db.tasks.update(block.linkedTaskId, {
        status: 'not_started',
        completedAt: undefined,
        actualDuration: 0,
        updatedAt: now,
      });
    }
    await refreshAll();
  }, [refreshAll]);

  const clearScheduleBlocksForDate = useCallback(async (date: string) => {
    const blocks = await db.scheduleBlocks.where('date').equals(date).toArray();
    const now = new Date().toISOString();
    for (const b of blocks) {
      if (b.linkedTaskId) {
        await db.tasks.update(b.linkedTaskId, {
          scheduleBlockId: undefined,
          updatedAt: now,
        });
      }
      await db.scheduleBlocks.delete(b.id);
    }
    const allTasks = await db.tasks.toArray();
    for (const t of allTasks) {
      if (blocks.some((b) => b.id === t.scheduleBlockId)) {
        await db.tasks.update(t.id, {
          scheduleBlockId: undefined,
          updatedAt: now,
        });
      }
    }
    await refreshAll();
  }, [refreshAll]);

  const resetScheduleBlocksForDate = useCallback(async (date: string) => {
    const blocks = await db.scheduleBlocks.where('date').equals(date).toArray();
    const now = new Date().toISOString();
    for (const b of blocks) {
      await db.scheduleBlocks.update(b.id, {
        status: 'scheduled',
        actualDuration: 0,
        notes: '',
        updatedAt: now,
      });
      if (b.linkedTaskId) {
        await db.tasks.update(b.linkedTaskId, {
          status: 'not_started',
          completedAt: undefined,
          actualDuration: 0,
          updatedAt: now,
        });
      }
    }
    await refreshAll();
  }, [refreshAll]);

  // Goal Mutations
  const addGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const id = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newGoal: Goal = {
      ...goalData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.goals.put(newGoal);
    await refreshAll();
    return id;
  }, [refreshAll]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    const now = new Date().toISOString();
    await db.goals.update(id, { ...updates, updatedAt: now });
    await refreshAll();
  }, [refreshAll]);

  const deleteGoal = useCallback(async (id: string) => {
    await db.goals.delete(id);
    // Delete attached milestones
    await db.goalMilestones.where('goalId').equals(id).delete();
    await refreshAll();
  }, [refreshAll]);

  const addMilestone = useCallback(async (milestoneData: Omit<GoalMilestone, 'id' | 'createdAt'>) => {
    const id = `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    await db.goalMilestones.put({
      ...milestoneData,
      id,
      createdAt: new Date().toISOString(),
    });
    await refreshAll();
    return id;
  }, [refreshAll]);

  const toggleMilestone = useCallback(async (id: string) => {
    const m = await db.goalMilestones.get(id);
    if (!m) return;
    const now = new Date().toISOString();
    await db.goalMilestones.update(id, {
      isCompleted: !m.isCompleted,
      completedAt: !m.isCompleted ? now : undefined,
    });
    if (!m.isCompleted) {
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    }
    await refreshAll();
  }, [refreshAll]);

  const deleteMilestone = useCallback(async (id: string) => {
    await db.goalMilestones.delete(id);
    await refreshAll();
  }, [refreshAll]);

  // Review Mutations
  const saveDailyReview = useCallback(async (reviewData: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existing = await db.dailyReviews.where('date').equals(reviewData.date).first();
    if (existing) {
      await db.dailyReviews.update(existing.id, { ...reviewData, updatedAt: now });
    } else {
      await db.dailyReviews.put({
        ...reviewData,
        id: `drev-${reviewData.date}`,
        createdAt: now,
        updatedAt: now,
      });
    }
    await refreshAll();
  }, [refreshAll]);

  const saveWeeklyReview = useCallback(async (reviewData: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existing = await db.weeklyReviews.where('weekStart').equals(reviewData.weekStart).first();
    if (existing) {
      await db.weeklyReviews.update(existing.id, { ...reviewData, updatedAt: now });
    } else {
      await db.weeklyReviews.put({
        ...reviewData,
        id: `wrev-${reviewData.weekStart}`,
        createdAt: now,
        updatedAt: now,
      });
    }
    await refreshAll();
  }, [refreshAll]);

  const saveMonthlyReview = useCallback(async (reviewData: Omit<MonthlyReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existing = await db.monthlyReviews.where('month').equals(reviewData.month).first();
    if (existing) {
      await db.monthlyReviews.update(existing.id, { ...reviewData, updatedAt: now });
    } else {
      await db.monthlyReviews.put({
        ...reviewData,
        id: `mrev-${reviewData.month}`,
        createdAt: now,
        updatedAt: now,
      });
    }
    await refreshAll();
  }, [refreshAll]);

  const saveYearlyReview = useCallback(async (reviewData: Omit<YearlyReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existing = await db.yearlyReviews.where('year').equals(reviewData.year).first();
    if (existing) {
      await db.yearlyReviews.update(existing.id, { ...reviewData, updatedAt: now });
    } else {
      await db.yearlyReviews.put({
        ...reviewData,
        id: `yrev-${reviewData.year}`,
        createdAt: now,
        updatedAt: now,
      });
    }
    await refreshAll();
  }, [refreshAll]);

  // Settings & Category
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const current = (await db.settings.get('current_user_settings')) || DEFAULT_SETTINGS;
    const merged = { ...current, ...updates };
    await db.settings.put(merged);
    setSettings(merged);
    await refreshAll();
  }, [refreshAll]);

  const addCategory = useCallback(async (name: string, color: string, icon = 'tag') => {
    const id = `cat-${Date.now()}`;
    await db.categories.put({ id, name, color, icon, isDefault: false });
    await refreshAll();
  }, [refreshAll]);

  // Theme Effect: sync HTML root class and data-theme with user settings
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = settings.theme || 'light';

    const applyTheme = (themeValue: 'light' | 'dark' | 'system') => {
      let resolved: 'light' | 'dark' = 'light';
      if (themeValue === 'system') {
        const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = isDark ? 'dark' : 'light';
      } else {
        resolved = themeValue;
      }

      if (resolved === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', resolved === 'dark' ? '#09090b' : '#f8fafc');
      }
    };

    applyTheme(currentTheme);

    if (currentTheme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  const setTheme = useCallback(async (newTheme: 'light' | 'dark' | 'system') => {
    await updateSettings({ theme: newTheme });
  }, [updateSettings]);

  const toggleTheme = useCallback(async () => {
    const isDark = document.documentElement.classList.contains('dark');
    const nextTheme = isDark ? 'light' : 'dark';
    await updateSettings({ theme: nextTheme });
  }, [updateSettings]);

  const value = useMemo(
    () => ({
      tasks,
      habits,
      occurrences,
      scheduleBlocks,
      timeSessions,
      goals,
      milestones,
      dailyReviews,
      weeklyReviews,
      monthlyReviews,
      yearlyReviews,
      categories,
      settings,
      loading,
      selectedDate,
      setSelectedDate,
      activeTimer,
      timerElapsedSeconds,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopAndSaveTimer,
      discardTimer,
      recordManualTime,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskStatus,
      resetTask,
      addHabit,
      updateHabit,
      deleteHabit,
      recordHabitOccurrence,
      addScheduleBlock,
      updateScheduleBlock,
      deleteScheduleBlock,
      resetScheduleBlock,
      clearScheduleBlocksForDate,
      resetScheduleBlocksForDate,
      addGoal,
      updateGoal,
      deleteGoal,
      addMilestone,
      toggleMilestone,
      deleteMilestone,
      saveDailyReview,
      saveWeeklyReview,
      saveMonthlyReview,
      saveYearlyReview,
      updateSettings,
      addCategory,
      refreshAll,
      quickAddOpen,
      setQuickAddOpen,
      quickAddType,
      setQuickAddType,
      searchQuery,
      setSearchQuery,
      toggleTheme,
      setTheme,
    }),
    [
      tasks,
      habits,
      occurrences,
      scheduleBlocks,
      timeSessions,
      goals,
      milestones,
      dailyReviews,
      weeklyReviews,
      monthlyReviews,
      yearlyReviews,
      categories,
      settings,
      loading,
      selectedDate,
      activeTimer,
      timerElapsedSeconds,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopAndSaveTimer,
      discardTimer,
      recordManualTime,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskStatus,
      resetTask,
      addHabit,
      updateHabit,
      deleteHabit,
      recordHabitOccurrence,
      addScheduleBlock,
      updateScheduleBlock,
      deleteScheduleBlock,
      resetScheduleBlock,
      clearScheduleBlocksForDate,
      resetScheduleBlocksForDate,
      addGoal,
      updateGoal,
      deleteGoal,
      addMilestone,
      toggleMilestone,
      deleteMilestone,
      saveDailyReview,
      saveWeeklyReview,
      saveMonthlyReview,
      saveYearlyReview,
      updateSettings,
      addCategory,
      refreshAll,
      quickAddOpen,
      quickAddType,
      searchQuery,
      toggleTheme,
      setTheme,
    ]
  );

  return <LifeOSContext.Provider value={value}>{children}</LifeOSContext.Provider>;
};

export function useLifeOS() {
  const context = useContext(LifeOSContext);
  if (!context) {
    throw new Error('useLifeOS must be used within a LifeOSProvider');
  }
  return context;
}
