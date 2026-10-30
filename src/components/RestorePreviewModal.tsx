import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  X,
  ListTodo,
  Repeat,
  CalendarDays,
  Clock,
  Target,
  Sparkles,
  Tag,
  BookOpen,
} from 'lucide-react';
import { RestoreEntityCounts } from '../types';

interface RestorePreviewModalProps {
  isOpen: boolean;
  filename: string;
  exportedAt?: string;
  version: number;
  mode: 'replace' | 'merge';
  counts: RestoreEntityCounts;
  isRestoring?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RestorePreviewModal: React.FC<RestorePreviewModalProps> = ({
  isOpen,
  filename,
  exportedAt,
  version,
  mode,
  counts,
  isRestoring = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const totalRecords =
    counts.tasks +
    counts.habits +
    counts.habitOccurrences +
    counts.scheduleBlocks +
    counts.timeSessions +
    counts.goals +
    counts.goalMilestones +
    counts.categories +
    counts.reviews;

  const formattedDate = exportedAt
    ? new Date(exportedAt).toLocaleString()
    : 'Unknown date';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                mode === 'replace'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 id="restore-modal-title" className="text-base font-bold text-neutral-100">
                Restore Backup Preview
              </h3>
              <p className="text-xs text-neutral-400">
                Verify snapshot contents before applying changes.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isRestoring}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File and Mode Metadata */}
        <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-850 space-y-2 text-xs">
          <div className="flex items-center justify-between text-neutral-300">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Backup File:</span>
            </span>
            <span className="font-mono text-neutral-200 truncate max-w-[220px]" title={filename}>
              {filename}
            </span>
          </div>

          <div className="flex items-center justify-between text-neutral-300">
            <span className="text-neutral-400">Export Timestamp:</span>
            <span className="font-mono text-neutral-300">{formattedDate}</span>
          </div>

          <div className="flex items-center justify-between text-neutral-300">
            <span className="text-neutral-400">Schema Version:</span>
            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-200 font-mono text-[10px]">
              v{version} (Supported)
            </span>
          </div>

          <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-neutral-900">
            <span className="text-neutral-400">Restore Mode:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                mode === 'replace'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {mode === 'replace' ? 'Replace Existing (Overwrite)' : 'Merge into Existing'}
            </span>
          </div>
        </div>

        {/* Warning or Notice Banner */}
        {mode === 'replace' ? (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-rose-200 block">Replace Mode Warning</span>
              All existing tasks, habits, schedules, and goals will be completely wiped and replaced with the contents of this backup.
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-2.5 text-xs text-indigo-300">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-indigo-200 block">Merge Conflict Handling</span>
              Incoming records will be appended. Existing records with identical IDs are updated only if the backup timestamp is newer or equal. No duplicate IDs will be created.
            </div>
          </div>
        )}

        {/* Entity Counts Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
            <span>Entity Breakdown</span>
            <span className="text-[11px] font-mono text-neutral-400">
              Total: {totalRecords} {totalRecords === 1 ? 'record' : 'records'}
              {totalRecords === 0 && ' (Empty backup)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-sky-400" />
                <span>Tasks</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.tasks}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                <span>Habits</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.habits}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                <span>Schedule</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.scheduleBlocks}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Time Logs</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.timeSessions}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span>Goals</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.goals}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Milestones</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.goalMilestones}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Categories</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.categories}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between col-span-1 sm:col-span-2">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                <span>Periodic Reviews</span>
              </span>
              <span className="font-mono font-bold text-neutral-200">{counts.reviews}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className={`px-5 py-2.5 text-xs font-semibold rounded-xl text-white shadow-sm transition-colors flex items-center gap-2 ${
              mode === 'replace'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950'
            }`}
          >
            {isRestoring ? (
              <span>Restoring...</span>
            ) : (
              <span>{mode === 'replace' ? 'Confirm Replace & Restore' : 'Confirm Merge & Restore'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
