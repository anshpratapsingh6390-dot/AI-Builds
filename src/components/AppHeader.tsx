import React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Pause,
  Square,
  Search,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { addDays, formatDateIso, parseDate } from '../utils/dateUtils';
import { PWAInstallButton } from './PWAInstallButton';

interface AppHeaderProps {
  onToggleMobileNav: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onToggleMobileNav }) => {
  const {
    selectedDate,
    setSelectedDate,
    activeTimer,
    timerElapsedSeconds,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    setQuickAddOpen,
    searchQuery,
    setSearchQuery,
    settings,
    toggleTheme,
  } = useLifeOS();

  const handlePrevDay = () => {
    const prev = addDays(parseDate(selectedDate), -1);
    setSelectedDate(formatDateIso(prev));
  };

  const handleNextDay = () => {
    const next = addDays(parseDate(selectedDate), 1);
    setSelectedDate(formatDateIso(next));
  };

  const handleToday = () => {
    setSelectedDate(formatDateIso(new Date()));
  };

  // Format timer seconds: HH:MM:SS
  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Date label formatting
  const dateObj = parseDate(selectedDate);
  const isToday = selectedDate === formatDateIso(new Date());
  const dateStringFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile Nav toggle + Date Nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs">
          <button
            onClick={handlePrevDay}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              isToday
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            {isToday ? 'Today' : 'Go to Today'}
          </button>

          <span className="hidden sm:inline font-medium text-neutral-200 px-1.5 border-l border-neutral-800">
            {dateStringFormatted}
          </span>

          <button
            onClick={handleNextDay}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center flex-1 max-w-xs relative">
        <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3" />
        <input
          type="text"
          placeholder="Search tasks, habits, goals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 text-xs text-neutral-500 hover:text-neutral-300"
          >
            ×
          </button>
        )}
      </div>

      {/* Right: Active Timer Widget + Quick Add */}
      <div className="flex items-center gap-3">
        {/* Active Timer Floating Pill */}
        {activeTimer && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs animate-in fade-in">
            <span className="relative flex h-2 w-2">
              {!activeTimer.isPaused && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="font-mono font-bold tracking-tight text-white">
              {formatTimer(timerElapsedSeconds)}
            </span>
            <span className="hidden xl:inline text-neutral-400 truncate max-w-[120px]">
              {activeTimer.title}
            </span>

            <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-indigo-500/30">
              {activeTimer.isPaused ? (
                <button
                  onClick={resumeTimer}
                  className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                  aria-label="Resume timer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="p-1 rounded text-amber-400 hover:bg-amber-500/20"
                  aria-label="Pause timer"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => stopAndSaveTimer()}
                className="p-1 rounded text-rose-400 hover:bg-rose-500/20"
                aria-label="Stop and save session"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Theme Toggle Button (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors border border-neutral-800/80 bg-neutral-900/60"
          title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle light or dark theme"
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* In-App PWA Install Button */}
        <PWAInstallButton compact />

        {/* Universal Quick Add Button */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm shadow-indigo-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </button>
      </div>
    </header>
  );
};
