export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom_days';
export type HabitTargetType = 'binary' | 'quantity' | 'duration' | 'count';
export type HabitOccurrenceStatus = 'completed' | 'partial' | 'missed' | 'skipped';
export type ScheduleBlockStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
export type GoalHorizon = 'weekly' | 'monthly' | 'six_month' | 'yearly' | 'custom';
export type GoalType = 'numeric' | 'duration' | 'completion' | 'consistency' | 'percentage' | 'milestone';
export type GoalProgressMethod = 'automatic_time' | 'automatic_tasks' | 'automatic_habits' | 'milestones' | 'manual';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'behind' | 'abandoned';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  startDate?: string;
  priority: Priority;
  importance?: 'high' | 'medium' | 'low';
  status: TaskStatus;
  category: string;
  estimatedDuration: number; // minutes
  actualDuration: number; // minutes
  scheduleBlockId?: string;
  linkedHabitId?: string;
  linkedGoalId?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  delayReason?: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon: string;
  color: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  frequency: HabitFrequency;
  selectedWeekdays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  targetType: HabitTargetType;
  targetQuantity: number;
  unitOfMeasurement: string;
  preferredTime?: string; // HH:MM
  linkedGoalId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitOccurrence {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: HabitOccurrenceStatus;
  completedQuantity: number;
  completedDuration: number; // minutes
  notes?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  plannedDuration: number; // minutes
  actualStart?: string;
  actualEnd?: string;
  actualDuration: number; // minutes
  category: string;
  priority: Priority;
  status: ScheduleBlockStatus;
  linkedTaskId?: string;
  linkedHabitId?: string;
  linkedGoalId?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrenceRule?: 'daily' | 'weekdays' | 'weekly';
  createdAt: string;
  updatedAt: string;
}

export interface TimeSession {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationMinutes: number;
  category: string;
  linkedTaskId?: string;
  linkedHabitId?: string;
  linkedGoalId?: string;
  linkedScheduleBlockId?: string;
  isManual: boolean;
  notes?: string;
  createdAt: string;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  targetDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  weight: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  horizon: GoalHorizon;
  startDate: string;
  targetDate: string;
  priority: Priority;
  goalType: GoalType;
  targetValue: number;
  currentValue: number;
  unit: string;
  progressMethod: GoalProgressMethod;
  parentGoalId?: string;
  linkedCategories: string[];
  linkedHabitIds: string[];
  linkedTaskIds: string[];
  status: GoalStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD
  whatWentWell: string;
  whatDidNotGoWell: string;
  delaysReason: string;
  whatLearned: string;
  tomorrowImprovement: string;
  topPriorityTomorrow: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  achievements: string;
  incompleteGoals: string;
  habitReflections: string;
  timeAnalysis: string;
  obstacles: string;
  lessons: string;
  nextWeekPriorities: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyReview {
  id: string;
  month: string; // YYYY-MM
  achievements: string;
  goalPercentages: string;
  habitTrends: string;
  timeAllocation: string;
  missedTargets: string;
  comparisons: string;
  nextMonthPriorities: string;
  createdAt: string;
  updatedAt: string;
}

export interface YearlyReview {
  id: string;
  year: string; // YYYY
  annualGoalReview: string;
  majorMilestones: string;
  habitsLongTerm: string;
  totalTrackedSummary: string;
  keyLessons: string;
  nextYearPriorities: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isDefault?: boolean;
}

export interface ActiveTimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number; // Date.now() timestamp
  elapsedBeforePause: number; // in milliseconds
  pausedAt?: number;
  title: string;
  category: string;
  linkedTaskId?: string;
  linkedHabitId?: string;
  linkedGoalId?: string;
}

export interface UserSettings {
  id: string;
  theme: 'dark' | 'light' | 'system';
  timeFormat: '12h' | '24h';
  weekStartDay: 0 | 1; // 0=Sun, 1=Mon
  dayStartHour: number; // 0-23, default 6
  dayEndHour: number; // 0-23, default 23
  defaultTaskDuration: number; // in minutes, default 30
  productivityWeights: {
    taskRate: number;
    habitRate: number;
    scheduleAdherence: number;
  };
  showProductivityScore: boolean;
  activeTimerState?: ActiveTimerState;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  tasks: Task[];
  habits: Habit[];
  habitOccurrences: HabitOccurrence[];
  scheduleBlocks: ScheduleBlock[];
  timeSessions: TimeSession[];
  goals: Goal[];
  goalMilestones: GoalMilestone[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  yearlyReviews: YearlyReview[];
  categories: Category[];
  settings: UserSettings;
}
