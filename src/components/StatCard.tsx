import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: {
    text: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  onClick?: () => void;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  trend,
  onClick,
  accentColor,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all ${
        onClick ? 'cursor-pointer hover:bg-neutral-850' : ''
      }`}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-5 right-5 h-0.5 rounded-full opacity-60"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        {icon && <div className="text-neutral-400">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-neutral-100">
          {value}
        </span>
        {subValue && (
          <span className="text-xs font-medium text-neutral-500">
            {subValue}
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span
            className={`font-medium ${
              trend.isNeutral
                ? 'text-neutral-400'
                : trend.isPositive
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {trend.text}
          </span>
        </div>
      )}
    </div>
  );
};
