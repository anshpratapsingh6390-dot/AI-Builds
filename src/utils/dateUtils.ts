/**
 * Date and time utilities for WOLI OS.
 * All daily boundaries respect the local timezone to preserve historical integrity.
 */

export function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(isoString: string): Date {
  const [y, m, d] = isoString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getTodayDateString(): string {
  return formatDateIso(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeDisplay(timeStr: string, is12h = false): string {
  if (!timeStr) return '';
  if (!is12h) return timeStr;
  const mins = timeToMinutes(timeStr);
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDuration(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = minutes < 0 ? '-' : '';
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/**
 * Calculates scheduled duration in minutes, supporting overnight activities that cross midnight.
 * e.g. 23:00 to 01:00 (endsNextDay) -> 120 minutes
 * e.g. 23:30 to 00:30 (endsNextDay) -> 60 minutes
 * e.g. 01:00 to 03:00 -> 120 minutes
 */
export function calculateScheduleDuration(startTime: string, endTime: string, endsNextDay = false): number {
  if (!startTime || !endTime) return 0;
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (endsNextDay || e < s) {
    return Math.max(1, (24 * 60 - s) + e);
  }
  return Math.max(1, e - s);
}

/**
 * Formats a time range e.g. "11:00 PM – 01:00 AM (+1d)" or "23:00 – 01:00 (+1d)"
 */
export function formatTimeRange(startTime: string, endTime: string, is12h = false, endsNextDay = false): string {
  const isOvernight = endsNextDay || timeToMinutes(endTime) < timeToMinutes(startTime);
  const startFmt = formatTimeDisplay(startTime, is12h);
  const endFmt = formatTimeDisplay(endTime, is12h);
  return `${startFmt} – ${endFmt}${isOvernight ? ' (+1d)' : ''}`;
}

/**
 * Splits 24h HH:MM string into 12h hour (1-12), minute (0-59), and period ('AM' | 'PM')
 */
export function timeTo12hParts(time24: string): { hour: number; minute: number; period: 'AM' | 'PM'; h12: number; ampm: 'AM' | 'PM' } {
  if (!time24) return { hour: 12, minute: 0, period: 'AM', h12: 12, ampm: 'AM' };
  const mins = timeToMinutes(time24);
  const h24 = Math.floor(mins / 60) % 24;
  const minute = mins % 60;
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour = h24 % 12 || 12;
  return { hour, minute, period, h12: hour, ampm: period };
}

/**
 * Converts 12h parts (hour 1-12, minute 0-59, period 'AM' | 'PM') to 24h HH:MM string
 */
export function partsTo24h(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Parses freeform natural or 12h time strings like "6 AM", "7:30 PM", "11:00pm", "23:00", "01:00" to 24h "HH:MM".
 */
export function parseTimeTo24h(input: string): string | null {
  if (!input) return null;
  const str = input.trim().toLowerCase();
  
  // Matches "6:30 pm", "6:30pm", "6 pm", "6pm", "06:30 am", etc.
  const match12 = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2] ? parseInt(match12[2], 10) : 0;
    const period = match12[3];
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Matches 24h "14:30" or "09:00"
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return null;
}

export function checkTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
  endsNextDayA = false,
  endsNextDayB = false
): boolean {
  const sA = timeToMinutes(startA);
  const eA_raw = timeToMinutes(endA);
  const isOvernightA = endsNextDayA || eA_raw < sA;
  const eA = isOvernightA ? eA_raw + 24 * 60 : eA_raw;

  const sB = timeToMinutes(startB);
  const eB_raw = timeToMinutes(endB);
  const isOvernightB = endsNextDayB || eB_raw < sB;
  const eB = isOvernightB ? eB_raw + 24 * 60 : eB_raw;

  // Two intervals [sA, eA) and [sB, eB) overlap if max(sA, sB) < min(eA, eB)
  return Math.max(sA, sB) < Math.min(eA, eB);
}

export function getStartOfWeek(date: Date, weekStartDay: 0 | 1 = 1): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diff = (day < weekStartDay ? 7 : 0) + day - weekStartDay;
  d.setDate(d.getDate() - diff);
  return d;
}

export function getEndOfWeek(date: Date, weekStartDay: 0 | 1 = 1): Date {
  const start = getStartOfWeek(date, weekStartDay);
  return addDays(start, 6);
}

export function getDaysInMonth(year: number, monthIndex: number): Date[] {
  const dates: Date[] = [];
  const date = new Date(year, monthIndex, 1);
  while (date.getMonth() === monthIndex) {
    dates.push(new Date(date.getTime()));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

export function getMonthString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getMonthRange(monthStr: string): { startDate: string; endDate: string } {
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return {
    startDate: formatDateIso(start),
    endDate: formatDateIso(end),
  };
}

export function getYearRange(yearStr: string): { startDate: string; endDate: string } {
  const y = Number(yearStr);
  return {
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
  };
}

export function getSixMonthRange(year: number, half: 1 | 2): { startDate: string; endDate: string; label: string } {
  if (half === 1) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-06-30`,
      label: `H1 ${year} (Jan - Jun)`,
    };
  }
  return {
    startDate: `${year}-07-01`,
    endDate: `${year}-12-31`,
    label: `H2 ${year} (Jul - Dec)`,
  };
}
