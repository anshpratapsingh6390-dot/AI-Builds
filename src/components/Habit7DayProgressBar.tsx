import React from 'react';
import { Flame, Award, Check, Minus } from 'lucide-react';
import { DayConsistencyStatus } from '../utils/rules';

interface Habit7DayProgressBarProps {
  currentStreak: number;
  bestStreak: number;
  totalCompletions?: number;
  consistency: {
    scheduledDays: number;
    completedDays: number;
    rate: number;
    days: DayConsistencyStatus[];
  };
  todayStr: string;
}

export const Habit7DayProgressBar: React.FC<Habit7DayProgressBarProps> = ({
  currentStreak,
  bestStreak,
  totalCompletions,
  consistency,
  todayStr,
}) => {
  const { rate, scheduledDays, completedDays, days } = consistency;

  // Streak status badge
  let streakBadge = { label: 'Start streak today', color: 'text-neutral-400 bg-neutral-800/80 border-neutral-750' };
  if (currentStreak >= 14) {
    streakBadge = { label: 'Legendary 🔥', color: 'text-amber-300 bg-amber-500/15 border-amber-500/40 shadow-xs shadow-amber-500/10' };
  } else if (currentStreak >= 7) {
    streakBadge = { label: 'On Fire! 🔥', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
  } else if (currentStreak >= 3) {
    streakBadge = { label: 'Building Momentum ⚡', color: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' };
  } else if (currentStreak >= 1) {
    streakBadge = { label: 'Active Streak ✨', color: 'text-sky-300 bg-sky-500/15 border-sky-500/30' };
  }

  // Progress bar color based on 7-day consistency rate
  let progressColor = 'bg-neutral-700';
  let rateBadgeColor = 'text-neutral-400';
  if (rate >= 80) {
    progressColor = 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs shadow-emerald-500/20';
    rateBadgeColor = 'text-emerald-400';
  } else if (rate >= 50) {
    progressColor = 'bg-gradient-to-r from-sky-500 to-indigo-500 shadow-xs shadow-sky-500/20';
    rateBadgeColor = 'text-sky-400';
  } else if (rate > 0) {
    progressColor = 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-xs shadow-amber-500/20';
    rateBadgeColor = 'text-amber-400';
  }

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-850">
      {/* Visual Streak Counter Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs ${
              currentStreak > 0
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-xs shadow-amber-500/10'
                : 'bg-neutral-850 border-neutral-750 text-neutral-400'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${currentStreak > 0 ? 'text-amber-400 fill-amber-400/30 animate-pulse' : 'text-neutral-500'}`} />
            <span>{currentStreak} {currentStreak === 1 ? 'day' : 'days'} streak</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium hidden sm:inline-block ${streakBadge.color}`}>
            {streakBadge.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1" title="Personal best streak">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Best: <strong className="text-neutral-200">{bestStreak}d</strong></span>
          </div>
          {totalCompletions !== undefined && (
            <span className="text-neutral-600 hidden md:inline">• {totalCompletions} total</span>
          )}
        </div>
      </div>

      {/* 7-Day Consistency Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-300 text-[11px] flex items-center gap-1.5">
            <span>7-Day Consistency</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold ${rateBadgeColor}`}>{rate}%</span>
            <span className="text-[10px] text-neutral-500">
              ({completedDays}/{scheduledDays} scheduled)
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.max(rate > 0 ? 4 : 0, rate)}%` }}
          />
        </div>
      </div>

      {/* 7-Day Day-by-Day Visual Dots */}
      <div className="grid grid-cols-7 gap-1 pt-1">
        {days.map((d) => {
          const isToday = d.date === todayStr;
          let statusStyle = 'bg-neutral-900/60 border-neutral-800 text-neutral-600';
          let statusIcon = null;

          if (!d.isScheduled) {
            statusStyle = 'bg-neutral-900/30 border-dashed border-neutral-800 text-neutral-600';
            statusIcon = <Minus className="w-2.5 h-2.5 opacity-50" />;
          } else if (d.isCompleted) {
            statusStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-xs shadow-emerald-500/10';
            statusIcon = <Check className="w-2.5 h-2.5 stroke-[3]" />;
          } else if (d.isPartial) {
            statusStyle = 'bg-amber-500/20 border-amber-500/60 text-amber-400';
            statusIcon = <span className="text-[9px] font-bold">½</span>;
          } else {
            statusStyle = 'bg-neutral-900 border-neutral-800 text-neutral-500';
            statusIcon = <span className="w-1 h-1 rounded-full bg-neutral-700" />;
          }

          return (
            <div
              key={d.date}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg border text-center transition-all ${statusStyle} ${
                isToday ? 'ring-1 ring-indigo-500/70 border-indigo-500/50' : ''
              }`}
              title={`${d.date} (${d.dayLabel}): ${
                !d.isScheduled
                  ? 'Rest / Unscheduled'
                  : d.isCompleted
                  ? 'Completed'
                  : d.isPartial
                  ? 'Partially completed'
                  : 'Missed / Pending'
              }${isToday ? ' (Today)' : ''}`}
            >
              <span className="text-[9px] font-semibold uppercase leading-none opacity-80">
                {d.dayLabel.charAt(0)}
              </span>
              <div className="h-4 flex items-center justify-center my-0.5">
                {statusIcon}
              </div>
              <span className="text-[8px] leading-none opacity-70">
                {d.dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
