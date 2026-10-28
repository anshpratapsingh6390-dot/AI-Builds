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

export function checkTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
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
