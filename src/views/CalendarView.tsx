import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Repeat,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  addDays,
  formatDateIso,
  formatDuration,
  getDaysInMonth,
  getEndOfWeek,
  getStartOfWeek,
  getTodayDateString,
  parseDate,
} from '../utils/dateUtils';
import { ViewType } from '../components/AppSidebar';

interface CalendarViewProps {
  onNavigate: (view: ViewType) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate }) => {
  const {
    tasks,
    habits,
    occurrences,
    scheduleBlocks,
    timeSessions,
    selectedDate,
    setSelectedDate,
  } = useLifeOS();

  const [calMode, setCalMode] = useState<'month' | 'week'>('month');
  const [currentYear, setCurrentYear] = useState(parseDate(selectedDate).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(parseDate(selectedDate).getMonth());

  const todayStr = getTodayDateString();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleTodayMonth = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Month days array
  const monthDays = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = monthDays[0].getDay(); // 0 is Sunday, 1 is Monday
  // Days to prepend for alignment (assuming Monday start)
  const offset = (firstDayIndex + 6) % 7;

  // Selected date details
  const selTasks = tasks.filter((t) => t.dueDate === selectedDate);
  const selBlocks = scheduleBlocks.filter((b) => b.date === selectedDate);
  const selOccurrences = occurrences.filter((o) => o.date === selectedDate);
  const selSessions = timeSessions.filter((s) => s.startTime.startsWith(selectedDate));
  const selTrackedMinutes = selSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Master Timeline & Historical Archive</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Calendar & History</h1>
          <p className="text-xs text-neutral-400">
            Browse any year or past date. Preserves completed tasks, time logs, and habits indefinitely.
          </p>
        </div>

        {/* Month Navigator Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleTodayMonth}
              className="px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-bold text-neutral-100 px-2">{monthName}</span>
        </div>
      </div>

      {/* Main Grid: Calendar Month Grid & Selected Date Agenda Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 spans: Month Calendar Grid */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-neutral-400 pb-2 border-b border-neutral-800">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Month days cells */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank offset tiles */}
            {Array.from({ length: offset }, (_, i) => (
              <div key={`blank-${i}`} className="min-h-[85px] rounded-xl bg-neutral-950/20 opacity-30" />
            ))}

            {monthDays.map((d) => {
              const dStr = formatDateIso(d);
              const isToday = dStr === todayStr;
              const isSelected = dStr === selectedDate;

              // Aggregate counts for cell
              const dayTasks = tasks.filter((t) => t.dueDate === dStr);
              const dayBlocks = scheduleBlocks.filter((b) => b.date === dStr);
              const dayOccs = occurrences.filter((o) => o.date === dStr && o.status === 'completed');
              const daySessions = timeSessions.filter((s) => s.startTime.startsWith(dStr));
              const dayMinutes = daySessions.reduce((s, item) => s + item.durationMinutes, 0);

              return (
                <div
                  key={dStr}
                  onClick={() => setSelectedDate(dStr)}
                  className={`min-h-[85px] p-2 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-neutral-850 border-indigo-500 shadow-sm shadow-indigo-950'
                      : isToday
                      ? 'bg-neutral-900/90 border-indigo-500/40'
                      : 'bg-neutral-950/60 border-neutral-850 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 rounded-md flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : isSelected
                          ? 'text-indigo-400'
                          : 'text-neutral-300'
                      }`}
                    >
                      {d.getDate()}
                    </span>

                    {dayMinutes > 0 && (
                      <span className="text-[10px] font-mono text-sky-400">
                        {formatDuration(dayMinutes)}
                      </span>
                    )}
                  </div>

                  {/* Day activity dots/pills */}
                  <div className="space-y-1 mt-1">
                    {dayTasks.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{dayTasks.length} tasks</span>
                      </div>
                    )}
                    {dayOccs.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        <span>{dayOccs.length} habits</span>
                      </div>
                    )}
                    {dayBlocks.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{dayBlocks.length} blocks</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 span: Selected Date Inspector */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Date Inspector
              </span>
              <h3 className="text-base font-bold text-neutral-100 mt-0.5">{selectedDate}</h3>
            </div>
            <button
              onClick={() => onNavigate('planner')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Open Planner <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick summary for selected date */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Tracked Time</span>
              <span className="text-sm font-bold text-sky-400 font-mono mt-0.5 block">
                {formatDuration(selTrackedMinutes)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Habits Done</span>
              <span className="text-sm font-bold text-indigo-400 font-mono mt-0.5 block">
                {selOccurrences.filter((o) => o.status === 'completed').length} finished
              </span>
            </div>
          </div>

          {/* Scheduled Blocks on Date */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Scheduled Blocks ({selBlocks.length})
            </h4>
            {selBlocks.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No schedule blocks on this date.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-850 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold text-neutral-200">{b.title}</span>
                      <span className="text-[10px] text-neutral-500 block">
                        {b.startTime} - {b.endTime}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        b.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks Due on Date */}
          <div className="space-y-2 pt-2 border-t border-neutral-850">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Tasks Due ({selTasks.length})
            </h4>
            {selTasks.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No tasks due on this date.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-850 text-xs flex justify-between items-center"
                  >
                    <span
                      className={`font-semibold ${
                        t.status === 'completed' ? 'line-through text-neutral-500' : 'text-neutral-200'
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="text-[10px] text-neutral-400">{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
