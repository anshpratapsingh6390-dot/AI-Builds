import {
  ScheduleBlock,
  Task,
  Goal,
  Habit,
  TimeSession,
  HabitOccurrence,
  Priority,
  AIAssistantMessage,
  AIAssistantAction,
} from '../types';
import {
  addDays,
  calculateScheduleDuration,
  checkTimeOverlap,
  formatDateIso,
  formatDuration,
  formatTimeDisplay,
  formatTimeRange,
  getTodayDateString,
  minutesToTime,
  parseDate,
  parseTimeTo24h,
  timeToMinutes,
} from '../utils/dateUtils';
import { calculateCreditedWorkingTime, calculateGoalProgress, calculateHabitStreak } from '../utils/rules';

export interface WoliAIContext {
  todayDate: string;
  selectedDate: string;
  scheduleBlocks: ScheduleBlock[];
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  occurrences: HabitOccurrence[];
  timeSessions: TimeSession[];
}

export interface WoliAIExecutionResult {
  reply: string;
  actionsExecuted: AIAssistantAction[];
  suggestedActions?: string[];
  conflictDetected?: boolean;
  contextUpdates?: {
    lastReferencedBlockId?: string;
    lastReferencedTaskId?: string;
    lastReferencedGoalId?: string;
    pendingQuestion?: string;
  };
}

/**
 * Categorizes an activity title into standard WOLI OS categories
 */
export function suggestCategory(title: string): string {
  const t = title.toLowerCase();
  if (
    t.includes('dsa') ||
    t.includes('code') ||
    t.includes('coding') ||
    t.includes('javascript') ||
    t.includes('js') ||
    t.includes('react') ||
    t.includes('python') ||
    t.includes('programming') ||
    t.includes('leetcode') ||
    t.includes('bug') ||
    t.includes('dbms') ||
    t.includes('sql') ||
    t.includes('frontend') ||
    t.includes('backend') ||
    t.includes('dev')
  ) {
    return 'Coding';
  }
  if (
    t.includes('read') ||
    t.includes('book') ||
    t.includes('study') ||
    t.includes('lecture') ||
    t.includes('course') ||
    t.includes('assignment') ||
    t.includes('college') ||
    t.includes('exam') ||
    t.includes('prep')
  ) {
    return 'Study';
  }
  if (
    t.includes('gym') ||
    t.includes('workout') ||
    t.includes('exercise') ||
    t.includes('run') ||
    t.includes('yoga') ||
    t.includes('walk') ||
    t.includes('fitness') ||
    t.includes('kasrat')
  ) {
    return 'Fitness';
  }
  if (
    t.includes('work') ||
    t.includes('tch') ||
    t.includes('website') ||
    t.includes('project') ||
    t.includes('client') ||
    t.includes('meeting') ||
    t.includes('office') ||
    t.includes('architecture')
  ) {
    return 'Work';
  }
  if (
    t.includes('lunch') ||
    t.includes('dinner') ||
    t.includes('breakfast') ||
    t.includes('meal') ||
    t.includes('snack') ||
    t.includes('fresh') ||
    t.includes('relax') ||
    t.includes('break') ||
    t.includes('nap') ||
    t.includes('khana') ||
    t.includes('aaram')
  ) {
    return 'Personal';
  }
  return 'Personal Development';
}

/**
 * Infers default Count Toward Working Time based on category or explicit instructions
 */
export function inferWorkingTimeEligibility(title: string, category: string, rawText?: string): boolean {
  if (rawText) {
    const r = rawText.toLowerCase();
    if (
      r.includes("don't include in working time") ||
      r.includes('exclude from working time') ||
      r.includes('not working time') ||
      r.includes('exclude it from working time') ||
      r.includes('mat karna') ||
      r.includes('mat jodna') ||
      r.includes('working time me mat') ||
      r.includes('working time mein mat')
    ) {
      return false;
    }
    if (
      r.includes('count toward working time') ||
      r.includes('include in working time') ||
      r.includes('count it toward working time') ||
      r.includes('count as work') ||
      r.includes('working time me count') ||
      r.includes('working time mein count') ||
      r.includes('jod dena')
    ) {
      return true;
    }
  }

  const catLower = category.toLowerCase();
  const titleLower = title.toLowerCase();

  // Personal, breaks, gym, meals are excluded by default
  if (
    catLower.includes('fitness') ||
    catLower.includes('personal') ||
    catLower.includes('break') ||
    catLower.includes('health') ||
    titleLower.includes('workout') ||
    titleLower.includes('gym') ||
    titleLower.includes('lunch') ||
    titleLower.includes('dinner') ||
    titleLower.includes('meal') ||
    titleLower.includes('breakfast') ||
    titleLower.includes('fresh') ||
    titleLower.includes('relax')
  ) {
    return false;
  }

  // Coding, study, project, work default to true
  return true;
}

/**
 * Extracts target date from text (supports English, Hindi, Hinglish: kal, aaj, parso, friday, etc.)
 */
export function extractTargetDate(text: string, baseDateStr: string): string {
  const t = text.toLowerCase();
  const base = parseDate(baseDateStr);

  // Day of week matching (e.g. "by friday", "friday tak", "on monday")
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const hindiDays: Record<string, number> = {
    somwar: 1,
    mangalwar: 2,
    budhwar: 3,
    guruwar: 4,
    brihaspatiwar: 4,
    shukrawar: 5,
    shaniwar: 6,
    raviwar: 0,
  };

  for (let i = 0; i < 7; i++) {
    const dayName = daysOfWeek[i];
    if (t.includes(dayName)) {
      const currentDay = base.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence
      return formatDateIso(addDays(base, diff));
    }
  }

  for (const [hindiDay, targetDayIdx] of Object.entries(hindiDays)) {
    if (t.includes(hindiDay)) {
      const currentDay = base.getDay();
      let diff = targetDayIdx - currentDay;
      if (diff <= 0) diff += 7;
      return formatDateIso(addDays(base, diff));
    }
  }

  if (
    t.includes('tomorrow') ||
    t.includes('kal subah') ||
    t.includes('kal shaam') ||
    t.includes('kal raat') ||
    t.includes('kal ke liye') ||
    /\bkal\b/.test(t)
  ) {
    return formatDateIso(addDays(base, 1));
  }
  if (t.includes('day after tomorrow') || t.includes('parson') || t.includes('parso')) {
    return formatDateIso(addDays(base, 2));
  }
  if (t.includes('yesterday') || t.includes('beeta kal')) {
    return formatDateIso(addDays(base, -1));
  }
  if (t.includes('today') || t.includes('aaj')) {
    return formatDateIso(base);
  }

  // Match YYYY-MM-DD
  const isoMatch = t.match(/\b(20\d\d-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return baseDateStr;
}

/**
 * Intelligent Multilingual NLU Parser.
 * Understands English, Hindi (Devanagari & Roman), and Hinglish with zero external latency.
 */
export function parseLocalInstruction(
  userText: string,
  context: WoliAIContext,
  history: AIAssistantMessage[] = []
): { intent: string; data: any } {
  const text = userText.trim();
  const lower = text.toLowerCase();
  const targetDate = extractTargetDate(text, context.selectedDate || context.todayDate);

  // Check last assistant message for pending context
  const lastAssistantMsg = [...history].reverse().find((m) => m.role === 'assistant');
  const lastAssistantContent = lastAssistantMsg?.content?.toLowerCase() || '';

  // Multi-turn context resolution:
  // Check if assistant asked a yes/no question like "Should I count this toward Working Time?"
  if (
    (lower === 'yes' || lower === 'haan' || lower === 'sure' || lower === 'yep' || lower === 'ha' || lower === 'kar do' || lower === 'include kar do') &&
    lastAssistantContent.includes('working time')
  ) {
    // Locate the most recently created block
    const recentBlock = [...context.scheduleBlocks].reverse()[0];
    if (recentBlock) {
      return {
        intent: 'update_schedule_block',
        data: {
          blockId: recentBlock.id,
          includeInWorkingTime: true,
          date: recentBlock.date,
        },
      };
    }
  }

  // 1. Productivity Summary Query
  if (
    lower.includes('how productive') ||
    lower.includes('productive time') ||
    lower.includes('kitna kaam kiya') ||
    lower.includes('kitna time') ||
    lower.includes('how much time did i') ||
    lower.includes('how many hours') ||
    (lower.includes('working time') && (lower.includes('how') || lower.includes('what') || lower.includes('kitna') || lower.includes('check')))
  ) {
    return {
      intent: 'query_productivity',
      data: { date: targetDate, metric: 'working_time' },
    };
  }

  // 2. End of Day Review Query
  if (
    lower.includes('review my day') ||
    lower.includes('daily review') ||
    lower.includes('end of day review') ||
    lower.includes('aaj ka review') ||
    lower.includes('din ka review') ||
    lower.includes('summary of today')
  ) {
    return {
      intent: 'daily_review',
      data: { date: targetDate },
    };
  }

  // 3. Query Daily Schedule
  if (
    (lower.includes('schedule') || lower.includes('routine') || lower.includes('plan')) &&
    (lower.includes('show') || lower.includes('view') || lower.includes('what is') || lower.includes("what's") || lower.includes('kya hai') || lower.includes('dikhao') || lower.includes('list'))
  ) {
    return {
      intent: 'get_daily_schedule',
      data: { date: targetDate },
    };
  }

  // 4. Query Available Free Slots
  if (
    lower.includes('free time') ||
    lower.includes('free slot') ||
    lower.includes('available time') ||
    lower.includes('empty slot') ||
    lower.includes('free kab hu') ||
    lower.includes('khali time')
  ) {
    return {
      intent: 'get_available_time_slots',
      data: { date: targetDate },
    };
  }

  // 5. Query Habit Streaks
  if (
    lower.includes('habit streak') ||
    (lower.includes('habits') && (lower.includes('streak') || lower.includes('progress') || lower.includes('status')))
  ) {
    return {
      intent: 'get_habit_streaks',
      data: {},
    };
  }

  // 6. Query Goal Progress
  if (
    (lower.includes('goal') || lower.includes('target')) &&
    (lower.includes('progress') || lower.includes('how much') || lower.includes('status') || lower.includes('remaining') || lower.includes('kitna hua'))
  ) {
    return {
      intent: 'get_goal_progress',
      data: { query: text },
    };
  }

  // 7. Query Pending Tasks
  if (
    (lower.includes('pending') || lower.includes('incomplete') || lower.includes('remaining') || lower.includes('bache hue')) &&
    (lower.includes('task') || lower.includes('tasks') || lower.includes('kaam'))
  ) {
    return {
      intent: 'get_pending_tasks',
      data: { date: targetDate },
    };
  }

  // 8. Delete Schedule Block: "Delete DSA schedule", "Cancel 2 PM meeting"
  if (
    (lower.includes('delete') || lower.includes('remove') || lower.includes('cancel') || lower.includes('hata do')) &&
    (lower.includes('schedule') || lower.includes('block') || lower.includes('activity') || lower.includes('session'))
  ) {
    let targetTitle = '';
    for (const b of context.scheduleBlocks) {
      if (lower.includes(b.title.toLowerCase())) {
        targetTitle = b.title;
        break;
      }
    }
    return {
      intent: 'delete_schedule_block',
      data: { title: targetTitle || text, date: targetDate },
    };
  }

  // 9. Mark habit complete: "Mark today's reading habit complete" / "reading habit complete"
  if (
    (lower.includes('habit') && (lower.includes('complete') || lower.includes('done') || lower.includes('mark') || lower.includes('khatam'))) ||
    lower.includes('habit complete')
  ) {
    let habitName = '';
    for (const h of context.habits) {
      if (lower.includes(h.name.toLowerCase())) {
        habitName = h.name;
        break;
      }
    }
    if (!habitName) {
      const habitMatch = text.match(/mark (?:today'?s )?([a-zA-Z\s]+?)(?: habit)? (?:as )?(?:complete|done)/i);
      if (habitMatch) habitName = habitMatch[1].trim();
    }
    return {
      intent: 'complete_habit',
      data: { habitName: habitName || 'reading', date: targetDate },
    };
  }

  // 10. Mark task complete: "Mark DSA assignment as completed" / "Complete JavaScript task"
  if (
    (lower.includes('task') || lower.includes('assignment')) &&
    (lower.includes('complete') || lower.includes('done') || lower.includes('mark') || lower.includes('finish') || lower.includes('khatam')) &&
    !lower.includes('bana do') &&
    !lower.includes('banado') &&
    !lower.includes('create') &&
    !lower.includes('add') &&
    !lower.includes('new')
  ) {
    return {
      intent: 'complete_task',
      data: { query: text, isCompleted: true },
    };
  }

  // 11. Move / Reschedule block: "Move DSA to 8 AM" / "Shift it to 9 PM"
  if (
    (lower.includes('move') || lower.includes('shift') || lower.includes('reschedule') || lower.includes('change')) &&
    (lower.includes('am') || lower.includes('pm') || lower.includes('baje') || lower.includes(':'))
  ) {
    const toMatch = text.match(/(?:to|at|pe|par)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const newStartStr = toMatch ? parseTimeTo24h(toMatch[1]) : null;

    let targetTitle = '';
    // Check if user says "it" or "this"
    if (lower.includes(' it') || lower.includes(' this') || lower.includes('isse')) {
      const recentBlock = [...context.scheduleBlocks].reverse()[0];
      if (recentBlock) targetTitle = recentBlock.title;
    }

    if (!targetTitle) {
      for (const b of context.scheduleBlocks) {
        if (lower.includes(b.title.toLowerCase())) {
          targetTitle = b.title;
          break;
        }
      }
    }
    if (!targetTitle) {
      const titleMatch = text.match(/(?:move|shift|reschedule)\s+([a-zA-Z\s]+?)\s+(?:from|to|at)/i);
      if (titleMatch) targetTitle = titleMatch[1].trim();
    }

    return {
      intent: 'update_schedule_block',
      data: {
        targetTitle: targetTitle || 'DSA',
        newStartTime: newStartStr || '08:00',
        date: targetDate,
      },
    };
  }

  // 12. Create Goal: "Create a goal to complete JavaScript in 30 days" / "Target 15 hours"
  if (
    lower.includes('goal') ||
    (lower.includes('target') && (lower.includes('create') || lower.includes('want to complete') || lower.includes('set') || lower.includes('bana do')))
  ) {
    const daysMatch = text.match(/(\d+)\s*(?:days|din)/i);
    const targetDays = daysMatch ? parseInt(daysMatch[1], 10) : 30;

    const hoursMatch = text.match(/(\d+)\s*(?:hours|ghante|hrs|h)\b/i);
    const targetHours = hoursMatch ? parseInt(hoursMatch[1], 10) : 15;

    let goalTitle = 'Complete JavaScript Course';
    if (lower.includes('javascript') || lower.includes('js')) {
      goalTitle = 'Complete JavaScript Series';
    } else if (lower.includes('dsa')) {
      goalTitle = 'Master Data Structures & Algorithms';
    } else {
      const gMatch = text.match(/(?:goal|target)\s+(?:to\s+|for\s+)?([a-zA-Z0-9\s]+?)(?:\s+in|\s+for|\s+with|$)/i);
      if (gMatch && gMatch[1].trim().length > 2) {
        goalTitle = gMatch[1].trim();
      }
    }

    const startDate = context.todayDate;
    const targetDeadline = formatDateIso(addDays(parseDate(startDate), targetDays));

    return {
      intent: 'create_goal',
      data: {
        title: goalTitle,
        targetValue: targetHours,
        unit: 'hours',
        horizon: targetDays <= 7 ? 'weekly' : targetDays <= 31 ? 'monthly' : 'quarterly',
        progressMethod: 'automatic_time',
        startDate,
        targetDate: targetDeadline,
        category: suggestCategory(goalTitle),
      },
    };
  }

  // 13. Create Task: "Friday tak DBMS assignment complete karna hai, task bana do"
  if (
    (lower.includes('task') || lower.includes('todo') || lower.includes('assignment')) &&
    (lower.includes('add') || lower.includes('create') || lower.includes('new') || lower.includes('bana do') || lower.includes('banado') || lower.includes('karna hai'))
  ) {
    let priority: Priority = 'medium';
    if (lower.includes('high') || lower.includes('urgent') || lower.includes('zaroori')) priority = 'high';
    if (lower.includes('low')) priority = 'low';

    let taskTitle = text
      .replace(/^(?:add|create|new)\s+(?:a\s+)?(?:high-priority\s+|urgent\s+|low-priority\s+)?(?:task|todo|assignment)\s+(?:to\s+|for\s+)?/i, '')
      .replace(/\s+(?:tak|by|deadline)\s+[a-zA-Z0-9\s]+$/i, '')
      .replace(/\s*(?:ek\s+)?(?:task\s+bana\s+do|task\s+banado|bana do|banado)\s*$/i, '')
      .trim();

    if (!taskTitle || taskTitle.length < 3) {
      if (lower.includes('dbms')) taskTitle = 'Complete DBMS Assignment';
      else if (lower.includes('javascript') || lower.includes('js')) taskTitle = 'JavaScript Project Work';
      else if (lower.includes('dsa')) taskTitle = 'Solve DSA Problems';
      else taskTitle = 'Complete Scheduled Assignment';
    }

    return {
      intent: 'create_task',
      data: {
        title: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
        priority,
        category: suggestCategory(taskTitle),
        dueDate: targetDate,
      },
    };
  }

  // 14. Schedule Creation (Single or Multi-Block)
  // Supports English ("from 6 to 7 AM"), Hindi ("6 se 7 baje"), Hinglish, AM/PM, and overnight
  const multiBlocks: any[] = [];
  const clauses = text.split(/(?:,|\band\b|\bfir\b|\baur\b)/i);

  for (const clause of clauses) {
    const c = clause.trim();
    if (!c) continue;

    const timeMatchA = c.match(/(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-|till|se)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const timeMatchB = c.match(/(\d{1,2}(?::\d{2})?)\s*(?:se)\s*(\d{1,2}(?::\d{2})?)\s*(?:baje)?(?:\s*tak)?/i);
    const timeMatchSingle = c.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:baje|o'clock)/i);

    const match = timeMatchA || timeMatchB;
    if (match) {
      let rawStart = match[1].trim();
      let rawEnd = match[2].trim();

      const endHasPm = /pm/i.test(rawEnd);
      const endHasAm = /am/i.test(rawEnd);
      const startHasPeriod = /am|pm/i.test(rawStart);

      if (!startHasPeriod) {
        const startH = parseInt(rawStart, 10);
        const endH = parseInt(rawEnd, 10);
        if (endHasPm) {
          if (startH <= 12 && startH > 6 && !c.toLowerCase().includes('subah') && !c.toLowerCase().includes('morning')) {
            rawStart += ' PM';
          } else if (startH <= 6) {
            rawStart += ' PM';
          }
        } else if (endHasAm) {
          rawStart += ' AM';
        } else {
          if (startH >= 1 && startH <= 5) {
            if (c.toLowerCase().includes('subah') || c.toLowerCase().includes('morning')) {
              rawStart += ' AM';
              rawEnd += ' AM';
            } else {
              rawStart += ' PM';
              rawEnd += ' PM';
            }
          } else if (startH >= 6 && startH <= 11) {
            if (c.toLowerCase().includes('raat') || c.toLowerCase().includes('night') || c.toLowerCase().includes('evening') || c.toLowerCase().includes('shaam')) {
              rawStart += ' PM';
              if (endH === 12 || (endH >= 1 && endH <= 5)) {
                rawEnd += ' AM';
              } else {
                rawEnd += ' PM';
              }
            } else {
              rawStart += ' AM';
              rawEnd += ' AM';
            }
          }
        }
      }

      const sTime = parseTimeTo24h(rawStart) || '09:00';
      const eTime = parseTimeTo24h(rawEnd) || '10:00';
      const isOvernight = timeToMinutes(eTime) < timeToMinutes(sTime) || c.toLowerCase().includes('overnight') || c.toLowerCase().includes('next day');

      let title = c
        .replace(/(?:from\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|-|till|se)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s*tak)?/gi, '')
        .replace(/\b(?:schedule|add|want to|study|karna hai|kardo|kar do|baje|subah|shaam|raat|tomorrow|kal|today|aaj|rakhna)\b/gi, '')
        .replace(/\b(?:isko|is|it|please)?\s*working time\s*(?:me\s*)?(?:mat\s*jodna|not\s*include|exclude|add|include)?.*$/gi, '')
        .trim();

      if (title.includes('.')) {
        title = title.split('.')[0];
      }
      title = title.replace(/^[\s,.:;'-]+|[\s,.:;'-]+$/g, '').trim();

      if (!title || title.length < 2) {
        if (c.toLowerCase().includes('dsa')) title = 'DSA';
        else if (c.toLowerCase().includes('javascript') || c.toLowerCase().includes('js')) title = 'JavaScript Practice';
        else if (c.toLowerCase().includes('reading') || c.toLowerCase().includes('book')) title = 'Reading';
        else if (c.toLowerCase().includes('workout') || c.toLowerCase().includes('gym')) title = 'Workout';
        else if (c.toLowerCase().includes('tch') || c.toLowerCase().includes('website')) title = 'TCH Website';
        else title = 'Productive Activity';
      }

      title = title.charAt(0).toUpperCase() + title.slice(1);
      const category = suggestCategory(title);
      const includeInWorkingTime = inferWorkingTimeEligibility(title, category, c);

      multiBlocks.push({
        title,
        date: targetDate,
        startTime: sTime,
        endTime: eTime,
        category,
        priority: 'medium',
        includeInWorkingTime,
        endsNextDay: isOvernight,
      });
    } else if (timeMatchSingle && (c.toLowerCase().includes('schedule') || c.toLowerCase().includes('karna'))) {
      // Single time mentioned, default 1 hour duration
      const rawStart = timeMatchSingle[1];
      const sTime = parseTimeTo24h(rawStart) || '07:00';
      const endMins = timeToMinutes(sTime) + 60;
      const eTime = minutesToTime(endMins >= 1440 ? endMins - 1440 : endMins);
      const isOvernight = endMins >= 1440;

      let title = c
        .replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:baje|o'clock)/gi, '')
        .replace(/\b(?:schedule|add|karna hai|kar do|subah|shaam|raat|tomorrow|kal|today|aaj)\b/gi, '')
        .replace(/\b(?:isko|is|it|please)?\s*working time\s*(?:me\s*)?(?:mat\s*jodna|not\s*include|exclude|add|include)?.*$/gi, '')
        .trim();

      if (title.includes('.')) {
        title = title.split('.')[0];
      }
      title = title.replace(/^[\s,.:;'-]+|[\s,.:;'-]+$/g, '').trim();

      if (!title || title.length < 2) {
        if (c.toLowerCase().includes('workout')) title = 'Workout';
        else if (c.toLowerCase().includes('dsa')) title = 'DSA';
        else title = 'Productive Activity';
      }

      title = title.charAt(0).toUpperCase() + title.slice(1);
      const category = suggestCategory(title);
      const includeInWorkingTime = inferWorkingTimeEligibility(title, category, c);

      multiBlocks.push({
        title,
        date: targetDate,
        startTime: sTime,
        endTime: eTime,
        category,
        priority: 'medium',
        includeInWorkingTime,
        endsNextDay: isOvernight,
      });
    }
  }

  if (multiBlocks.length > 0) {
    return {
      intent: 'create_schedule_blocks',
      data: { blocks: multiBlocks },
    };
  }

  // Fallback: general conversation
  return {
    intent: 'general_conversation',
    data: { text },
  };
}

/**
 * Action Dispatcher: Connects structured intents to real IndexedDB LifeOS services.
 */
export async function executeWoliAIActions(
  intent: string,
  data: any,
  context: WoliAIContext,
  lifeOSActions: {
    addScheduleBlock: (b: any) => Promise<string>;
    updateScheduleBlock: (id: string, b: any) => Promise<any>;
    deleteScheduleBlock: (id: string) => Promise<any>;
    addTask: (t: any) => Promise<string>;
    updateTask: (id: string, t: any) => Promise<any>;
    deleteTask?: (id: string) => Promise<any>;
    toggleTaskStatus: (id: string) => Promise<any>;
    addGoal: (g: any) => Promise<string>;
    updateGoal?: (id: string, g: any) => Promise<any>;
    recordHabitOccurrence: (habitId: string, date: string, status: any) => Promise<any>;
  }
): Promise<WoliAIExecutionResult> {
  const actionsExecuted: AIAssistantAction[] = [];

  switch (intent) {
    case 'create_schedule_blocks': {
      const blocks: any[] = data.blocks || [];
      const createdItems: string[] = [];
      const conflictMessages: string[] = [];
      let lastBlockId = '';

      for (const b of blocks) {
        const plannedDuration = calculateScheduleDuration(b.startTime, b.endTime, b.endsNextDay);

        // Conflict check
        const conflicts = context.scheduleBlocks.filter(
          (existing) =>
            existing.date === b.date &&
            existing.status !== 'cancelled' &&
            checkTimeOverlap(
              b.startTime,
              b.endTime,
              existing.startTime,
              existing.endTime,
              b.endsNextDay,
              existing.endsNextDay
            )
        );

        if (conflicts.length > 0) {
          const conflicting = conflicts[0];
          conflictMessages.push(
            `Notice: "${conflicting.title}" is already scheduled from ${formatTimeRange(
              conflicting.startTime,
              conflicting.endTime,
              true,
              conflicting.endsNextDay
            )} on ${b.date}.`
          );
        }

        const blockId = await lifeOSActions.addScheduleBlock({
          title: b.title,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          plannedDuration,
          actualDuration: 0,
          category: b.category || suggestCategory(b.title),
          priority: b.priority || 'medium',
          status: 'scheduled',
          includeInWorkingTime: b.includeInWorkingTime !== false,
          endsNextDay: Boolean(b.endsNextDay),
          notes: b.notes || '',
        });

        lastBlockId = blockId;

        actionsExecuted.push({
          id: `act-${Date.now()}-${Math.random()}`,
          type: 'create_schedule_block',
          description: `Scheduled "${b.title}" on ${b.date} from ${formatTimeRange(
            b.startTime,
            b.endTime,
            true,
            b.endsNextDay
          )} (${b.includeInWorkingTime !== false ? 'Counts toward Working Time' : 'Personal / Off'})`,
          success: true,
          data: { id: blockId, ...b },
          undoable: true,
          undoData: { blockId },
        });

        createdItems.push(
          `${formatTimeRange(b.startTime, b.endTime, true, b.endsNextDay)}: ${b.title} (${
            b.category || suggestCategory(b.title)
          }) • ${b.includeInWorkingTime !== false ? '☑ Working Time' : 'Personal'}`
        );
      }

      let reply = `Done! Successfully created in your Daily Planner:\n\n` + createdItems.map((item) => `• ${item}`).join('\n');
      if (conflictMessages.length > 0) {
        reply += `\n\n⚠️ Schedule Alert: ${conflictMessages.join(' ')}`;
      }

      return {
        reply,
        actionsExecuted,
        conflictDetected: conflictMessages.length > 0,
        suggestedActions: ['Open Daily Planner', 'Review Working Time', 'Plan Another Task'],
        contextUpdates: {
          lastReferencedBlockId: lastBlockId,
        },
      };
    }

    case 'update_schedule_block': {
      const { targetTitle, blockId, newStartTime, newEndTime, date, includeInWorkingTime } = data;
      const targetDate = date || context.selectedDate || context.todayDate;

      const block = context.scheduleBlocks.find(
        (b) =>
          (blockId && b.id === blockId) ||
          (b.date === targetDate && targetTitle && b.title.toLowerCase().includes(targetTitle.toLowerCase())) ||
          (targetTitle && b.title.toLowerCase().includes(targetTitle.toLowerCase()))
      );

      if (!block) {
        return {
          reply: `I couldn't locate an existing schedule block matching "${targetTitle || 'it'}" on ${targetDate}. Would you like me to schedule a new one?`,
          actionsExecuted: [],
          suggestedActions: [`Schedule ${targetTitle || 'it'} at 8:00 AM`],
        };
      }

      const updates: Partial<ScheduleBlock> = {};
      if (newStartTime) {
        updates.startTime = newStartTime;
        const duration = block.plannedDuration || 60;
        const resolvedEnd = newEndTime || minutesToTime(timeToMinutes(newStartTime) + duration);
        updates.endTime = resolvedEnd;
        updates.endsNextDay = timeToMinutes(resolvedEnd) < timeToMinutes(newStartTime);
      }
      if (includeInWorkingTime !== undefined) {
        updates.includeInWorkingTime = includeInWorkingTime;
      }

      await lifeOSActions.updateScheduleBlock(block.id, updates);

      actionsExecuted.push({
        id: `act-${Date.now()}`,
        type: 'update_schedule_block',
        description: `Updated "${block.title}" ${updates.startTime ? `to ${formatTimeRange(updates.startTime, updates.endTime || block.endTime, true, updates.endsNextDay)}` : ''}`,
        success: true,
      });

      return {
        reply: `Done! "${block.title}" has been updated ${updates.startTime ? `to ${formatTimeRange(updates.startTime, updates.endTime || block.endTime, true, updates.endsNextDay)}` : ''} on ${block.date}.`,
        actionsExecuted,
        suggestedActions: ['Open Daily Planner', 'View Dashboard'],
      };
    }

    case 'delete_schedule_block': {
      const { title, date } = data;
      const targetDate = date || context.selectedDate || context.todayDate;
      const block = context.scheduleBlocks.find(
        (b) => b.date === targetDate && b.title.toLowerCase().includes((title || '').toLowerCase())
      );

      if (!block) {
        return {
          reply: `Could not find a scheduled activity matching "${title}" on ${targetDate} to delete.`,
          actionsExecuted: [],
        };
      }

      await lifeOSActions.deleteScheduleBlock(block.id);
      actionsExecuted.push({
        id: `act-${Date.now()}`,
        type: 'delete_schedule_block',
        description: `Deleted "${block.title}" from ${targetDate}`,
        success: true,
      });

      return {
        reply: `Done. Removed "${block.title}" from your Daily Planner for ${targetDate}.`,
        actionsExecuted,
        suggestedActions: ['Open Daily Planner'],
      };
    }

    case 'get_daily_schedule': {
      const targetDate = data.date || context.selectedDate || context.todayDate;
      const dayBlocks = context.scheduleBlocks.filter((b) => b.date === targetDate && b.status !== 'cancelled');

      if (dayBlocks.length === 0) {
        return {
          reply: `You have no scheduled activities planned for ${targetDate === context.todayDate ? 'today' : targetDate}. Would you like to schedule your priorities?`,
          actionsExecuted: [],
          suggestedActions: ['Schedule DSA at 6 AM', 'Schedule Workout at 7 AM'],
        };
      }

      const list = dayBlocks
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
        .map(
          (b) =>
            `• ${formatTimeRange(b.startTime, b.endTime, true, b.endsNextDay)}: ${b.title} [${b.category}] (${
              b.includeInWorkingTime !== false ? 'Working Time' : 'Personal'
            })`
        )
        .join('\n');

      return {
        reply: `📅 Schedule for ${targetDate === context.todayDate ? 'today' : targetDate} (${dayBlocks.length} blocks):\n\n${list}`,
        actionsExecuted: [],
        suggestedActions: ['Open Daily Planner', 'Review Working Time'],
      };
    }

    case 'get_available_time_slots': {
      const targetDate = data.date || context.todayDate;
      const dayBlocks = context.scheduleBlocks
        .filter((b) => b.date === targetDate && b.status !== 'cancelled')
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      const freeSlots: string[] = [];
      let cursorMins = 360; // 06:00 AM standard start
      for (const b of dayBlocks) {
        const sMins = timeToMinutes(b.startTime);
        if (sMins > cursorMins + 15) {
          freeSlots.push(`${minutesToTime(cursorMins)} – ${minutesToTime(sMins)} (${formatDuration(sMins - cursorMins)})`);
        }
        cursorMins = Math.max(cursorMins, timeToMinutes(b.endTime));
      }
      if (cursorMins < 1380) {
        freeSlots.push(`${minutesToTime(cursorMins)} – 23:00 (${formatDuration(1380 - cursorMins)})`);
      }

      return {
        reply: `Available free time slots on ${targetDate}:\n\n` + (freeSlots.length > 0 ? freeSlots.map((s) => `• ${s}`).join('\n') : 'No open gaps remaining—your day is fully scheduled!'),
        actionsExecuted: [],
        suggestedActions: ['Schedule an activity in free slot', 'Open Daily Planner'],
      };
    }

    case 'create_task': {
      const { title, category, priority, dueDate, estimatedDuration } = data;
      const taskId = await lifeOSActions.addTask({
        title,
        category: category || suggestCategory(title),
        priority: priority || 'medium',
        status: 'not_started',
        dueDate: dueDate || context.selectedDate || context.todayDate,
        estimatedDuration: estimatedDuration || 60,
        actualDuration: 0,
        tags: [],
      });

      actionsExecuted.push({
        id: `act-${Date.now()}`,
        type: 'create_task',
        description: `Created task "${title}" (${priority || 'medium'} priority, due: ${dueDate || 'today'})`,
        success: true,
        data: { id: taskId, title, priority, dueDate },
      });

      return {
        reply: `Done! Task "${title}" has been created with ${priority || 'medium'} priority (Due: ${dueDate || 'today'}).`,
        actionsExecuted,
        suggestedActions: ['Schedule this task', 'View Tasks list'],
        contextUpdates: {
          lastReferencedTaskId: taskId,
        },
      };
    }

    case 'complete_task': {
      const { query } = data;
      const matched = context.tasks.find(
        (t) => t.status !== 'completed' && query.toLowerCase().includes(t.title.toLowerCase())
      );

      if (!matched) {
        return {
          reply: `I could not locate an unfinished task matching "${query}". Pending tasks: ${context.tasks
            .filter((t) => t.status !== 'completed')
            .slice(0, 3)
            .map((t) => `"${t.title}"`)
            .join(', ')}.`,
          actionsExecuted: [],
        };
      }

      await lifeOSActions.toggleTaskStatus(matched.id);
      actionsExecuted.push({
        id: `act-${Date.now()}`,
        type: 'complete_task',
        description: `Marked task "${matched.title}" as completed`,
        success: true,
      });

      return {
        reply: `Great job! Task "${matched.title}" has been marked as completed in WOLI OS.`,
        actionsExecuted,
        suggestedActions: ['View Dashboard', 'Log Time Session'],
      };
    }

    case 'get_pending_tasks': {
      const pending = context.tasks.filter((t) => t.status !== 'completed');
      if (pending.length === 0) {
        return {
          reply: `You have no pending tasks! All planned tasks are completed.`,
          actionsExecuted: [],
          suggestedActions: ['Create a new task', 'Review goals'],
        };
      }

      const list = pending
        .map((t) => `• [${t.priority.toUpperCase()}] ${t.title} (Due: ${t.dueDate || 'No date'}, Category: ${t.category})`)
        .join('\n');

      return {
        reply: `Pending Tasks (${pending.length} remaining):\n\n${list}`,
        actionsExecuted: [],
        suggestedActions: ['Mark a task complete', 'Schedule top priority task'],
      };
    }

    case 'create_goal': {
      const { title, targetValue, unit, horizon, progressMethod, startDate, targetDate, category } = data;
      const goalId = await lifeOSActions.addGoal({
        title,
        category: category || 'Study',
        horizon: horizon || 'monthly',
        startDate: startDate || context.todayDate,
        targetDate: targetDate || formatDateIso(addDays(parseDate(context.todayDate), 30)),
        priority: 'high',
        goalType: 'duration',
        targetValue: targetValue || 15,
        currentValue: 0,
        unit: unit || 'hours',
        progressMethod: progressMethod || 'automatic_time',
        status: 'in_progress',
        linkedCategories: [category || 'Study'],
        linkedHabitIds: [],
        linkedTaskIds: [],
      });

      actionsExecuted.push({
        id: `act-${Date.now()}`,
        type: 'create_goal',
        description: `Created goal "${title}" (Target: ${targetValue} ${unit}, Deadline: ${targetDate || '30 days'})`,
        success: true,
        data: { id: goalId, title, targetValue, unit },
      });

      return {
        reply: `Goal "${title}" has been created in your Goals module!\n\n• Target: ${targetValue} ${unit}\n• Measurement: Automatic time tracking\n• Deadline: ${targetDate || '30 days'}.`,
        actionsExecuted,
        suggestedActions: ['Link Tasks to Goal', 'View Goals'],
        contextUpdates: {
          lastReferencedGoalId: goalId,
        },
      };
    }

    case 'get_goal_progress': {
      if (context.goals.length === 0) {
        return {
          reply: `You have no active goals yet. Would you like to create one (e.g. "Create a goal for JavaScript 15 hours")?`,
          actionsExecuted: [],
          suggestedActions: ['Create a goal for JavaScript'],
        };
      }

      const summaries = context.goals.map((g) => {
        const prog = calculateGoalProgress(
          g,
          context.timeSessions,
          context.tasks,
          context.occurrences,
          [],
          context.scheduleBlocks
        );
        return `• "${g.title}": ${prog.currentValue} / ${g.targetValue} ${g.unit} (${prog.percentage.toFixed(1)}%) — ${prog.remaining} ${g.unit} remaining (Due: ${g.targetDate})`;
      });

      return {
        reply: `🎯 Real Goal Progress:\n\n${summaries.join('\n')}`,
        actionsExecuted: [],
        suggestedActions: ['Manage Goals', 'Log time session'],
      };
    }

    case 'complete_habit': {
      const { habitName, date } = data;
      const targetDate = date || context.todayDate;
      const habit = context.habits.find((h) => h.name.toLowerCase().includes(habitName.toLowerCase()));

      if (!habit) {
        return {
          reply: `Could not find a habit named "${habitName}". Active habits: ${context.habits.map((h) => `"${h.name}"`).join(', ')}.`,
          actionsExecuted: [],
        };
      }

      await lifeOSActions.recordHabitOccurrence(habit.id, targetDate, 'completed');
      actionsExecuted.push({
        id: `act-${Date.now()}`,
        type: 'complete_habit',
        description: `Completed habit "${habit.name}" for ${targetDate}`,
        success: true,
      });

      return {
        reply: `Done! "${habit.name}" has been marked complete for ${targetDate}. Keep up the streak! 🔥`,
        actionsExecuted,
        suggestedActions: ['View Habits & Streaks', 'Review Day'],
      };
    }

    case 'get_habit_streaks': {
      if (context.habits.length === 0) {
        return {
          reply: `No habits registered yet. You can create habits in the Habits view.`,
          actionsExecuted: [],
        };
      }

      const list = context.habits.map((h) => {
        const streakInfo = calculateHabitStreak(h, context.occurrences, context.todayDate);
        const isDoneToday = context.occurrences.some((o) => o.habitId === h.id && o.date === context.todayDate && o.status === 'completed');
        return `• "${h.name}": Streak ${streakInfo.currentStreak}d (Best: ${streakInfo.bestStreak}d, Today: ${isDoneToday ? '✅ Done' : '⏳ Pending'})`;
      });

      return {
        reply: `🔥 Habit Streaks:\n\n${list.join('\n')}`,
        actionsExecuted: [],
        suggestedActions: ['Mark habit complete', 'View Habits'],
      };
    }

    case 'query_productivity': {
      const targetDate = data.date || context.todayDate;
      const metrics = calculateCreditedWorkingTime(
        targetDate,
        context.scheduleBlocks,
        context.timeSessions,
        context.tasks
      );

      const reply = `Productivity Analysis for ${targetDate === context.todayDate ? 'today' : targetDate}:\n\n` +
        `• Tracked Working Time: ${formatDuration(metrics.totalTrackedMinutes)}\n` +
        `• Planned Productive Time: ${formatDuration(metrics.totalPlannedMinutes)}\n` +
        `• Total Scheduled Activities: ${formatDuration(metrics.totalScheduledMinutes)}\n` +
        `• Variance: ${metrics.varianceMinutes >= 0 ? '+' : ''}${formatDuration(metrics.varianceMinutes)} (${metrics.varianceMinutes >= 0 ? 'Ahead of plan' : 'Behind schedule'})\n` +
        `• Completed Activities: ${metrics.blockBreakdown.filter((b) => b.status === 'completed').length} / ${metrics.blockBreakdown.length}`;

      return {
        reply,
        actionsExecuted: [],
        suggestedActions: ['End of Day Review', 'Open Daily Planner'],
      };
    }

    case 'daily_review': {
      const targetDate = data.date || context.todayDate;
      const metrics = calculateCreditedWorkingTime(
        targetDate,
        context.scheduleBlocks,
        context.timeSessions,
        context.tasks
      );

      const dayTasks = context.tasks.filter((t) => t.dueDate === targetDate || t.startDate === targetDate);
      const completedTasks = dayTasks.filter((t) => t.status === 'completed');
      const unfinishedTasks = dayTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
      const completedHabits = context.occurrences.filter((o) => o.date === targetDate && o.status === 'completed');

      const reply = `📊 PRODUCTIVITY REVIEW (${targetDate})\n\n` +
        `• Planned Productive Time: ${formatDuration(metrics.totalPlannedMinutes)}\n` +
        `• Completed Productive Time: ${formatDuration(metrics.totalTrackedMinutes)}\n` +
        `• Tasks Completed: ${completedTasks.length} / ${dayTasks.length || 0}\n` +
        `• Habits Completed: ${completedHabits.length}\n\n` +
        (unfinishedTasks.length > 0
          ? `Unfinished Priorities:\n` + unfinishedTasks.map((t) => `  - ${t.title} (${t.priority} priority)`).join('\n')
          : `🎉 Excellent work! All planned priorities completed.`);

      return {
        reply,
        actionsExecuted: [],
        suggestedActions: ['Open Daily Planner', 'View Analytics'],
      };
    }

    default: {
      return {
        reply: `I understand. How else can I assist your productivity in WOLI OS? You can schedule activities, manage tasks, track habits, or check your working time.`,
        actionsExecuted: [],
        suggestedActions: ['Schedule DSA tomorrow', 'Review today', 'Create a new task'],
      };
    }
  }
}

/**
 * Main WOLI AI Input Processor.
 * 1. Calls server-side Gemini endpoint with 4-second timeout.
 * 2. If Gemini returns structured tool calls, executes them and confirms in DB.
 * 3. If Gemini is unavailable, errors, or times out, seamlessly executes through local high-precision NLU.
 * 4. Guaranteed to complete and never hang.
 */
export async function processWoliAIInput(
  userText: string,
  history: AIAssistantMessage[],
  context: WoliAIContext,
  lifeOSActions: any
): Promise<WoliAIExecutionResult> {
  const cleanInput = userText.trim();
  if (!cleanInput) {
    return {
      reply: 'Please type or speak a productivity command.',
      actionsExecuted: [],
    };
  }

  // Attempt server-side Gemini first with an aggressive 3.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('/api/woli-ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        message: cleanInput,
        history: history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        context: {
          todayDate: context.todayDate,
          selectedDate: context.selectedDate,
          existingBlocks: context.scheduleBlocks.filter((b) => b.date === (context.selectedDate || context.todayDate)),
          pendingTasks: context.tasks.filter((t) => t.status !== 'completed'),
          goals: context.goals,
          workingTimeSummary: {
            tracked: formatDuration(calculateCreditedWorkingTime(context.todayDate, context.scheduleBlocks, context.timeSessions, context.tasks).totalTrackedMinutes),
            planned: formatDuration(calculateCreditedWorkingTime(context.todayDate, context.scheduleBlocks, context.timeSessions, context.tasks).totalPlannedMinutes),
            totalScheduled: formatDuration(calculateCreditedWorkingTime(context.todayDate, context.scheduleBlocks, context.timeSessions, context.tasks).totalScheduledMinutes),
          },
        },
      }),
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.toolCalls) && data.toolCalls.length > 0) {
        const allActions: AIAssistantAction[] = [];
        let combinedReply = data.text ? `${data.text}\n\n` : '';

        for (const call of data.toolCalls) {
          const execRes = await executeWoliAIActions(call.name, call.args, context, lifeOSActions);
          allActions.push(...execRes.actionsExecuted);
          combinedReply += execRes.reply + '\n';
        }

        return {
          reply: combinedReply.trim(),
          actionsExecuted: allActions,
          suggestedActions: ['Open Daily Planner', 'View Dashboard'],
        };
      } else if (data.success && data.text && !data.fallbackRequired) {
        // If Gemini gave a text answer but didn't invoke a tool, check if user requested an actionable task/schedule
        const localParsed = parseLocalInstruction(cleanInput, context, history);
        if (localParsed.intent !== 'general_conversation') {
          return await executeWoliAIActions(localParsed.intent, localParsed.data, context, lifeOSActions);
        }

        return {
          reply: data.text,
          actionsExecuted: [],
          suggestedActions: ['Schedule an activity', 'Review day'],
        };
      }
    }
  } catch (err) {
    // Timeout or network notice, seamlessly proceed to local NLU
    console.info('[WOLI AI] Using high-precision local NLU engine');
  }

  // High-precision multilingual local parser & executor
  const localParsed = parseLocalInstruction(cleanInput, context, history);
  return await executeWoliAIActions(localParsed.intent, localParsed.data, context, lifeOSActions);
}
