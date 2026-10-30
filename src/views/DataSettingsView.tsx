import React, { useState, useEffect } from 'react';
import {
  Settings,
  Download,
  Upload,
  Database,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ShieldCheck,
  Tag,
  Plus,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  db,
  DEFAULT_SETTINGS,
  exportFullBackup,
  exportToCsv,
  restoreFromBackup,
  validateBackupData,
} from '../db';
import { ConfirmModal } from '../components/ConfirmModal';
import { RestorePreviewModal } from '../components/RestorePreviewModal';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { ExportData, RestoreEntityCounts } from '../types';

export const DataSettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    setTheme,
    categories,
    addCategory,
    tasks,
    habits,
    timeSessions,
    scheduleBlocks,
    refreshAll,
  } = useLifeOS();

  // Settings form state
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(settings.theme || 'light');
  const [timeFormat, setTimeFormat] = useState(settings.timeFormat);
  const [weekStartDay, setWeekStartDay] = useState(settings.weekStartDay);
  const [dayStartHour, setDayStartHour] = useState(settings.dayStartHour);
  const [dayEndHour, setDayEndHour] = useState(settings.dayEndHour);
  const [defaultTaskDuration, setDefaultTaskDuration] = useState(settings.defaultTaskDuration);
  const [showProductivityScore, setShowProductivityScore] = useState(settings.showProductivityScore);

  // Sync state if settings update externally
  useEffect(() => {
    if (settings.theme) {
      setThemeState(settings.theme);
    }
  }, [settings.theme]);

  // Productivity score formula weights
  const [taskWeight, setTaskWeight] = useState(settings.productivityWeights.taskRate);
  const [habitWeight, setHabitWeight] = useState(settings.productivityWeights.habitRate);
  const [schedWeight, setSchedWeight] = useState(settings.productivityWeights.scheduleAdherence);

  const [settingsSaved, setSettingsSaved] = useState(false);

  // New Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');

  // Backup / Restore states
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ usedMb: string; quotaMb: string } | null>(null);

  // Restore preview modal state
  const [pendingRestore, setPendingRestore] = useState<{
    data: ExportData;
    mode: 'replace' | 'merge';
    filename: string;
    exportedAt?: string;
    version: number;
    counts: RestoreEntityCounts;
  } | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMb = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
        setStorageInfo({ usedMb, quotaMb });
      }).catch(() => {
        // ignore estimation error
      });
    }
  }, [tasks, habits, timeSessions]);

  const totalWeight = taskWeight + habitWeight + schedWeight;
  const isWeightValid = totalWeight === 100;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeightValid) return;

    await updateSettings({
      theme,
      timeFormat,
      weekStartDay,
      dayStartHour: Number(dayStartHour),
      dayEndHour: Number(dayEndHour),
      defaultTaskDuration: Number(defaultTaskDuration),
      showProductivityScore,
      productivityWeights: {
        taskRate: Number(taskWeight),
        habitRate: Number(habitWeight),
        scheduleAdherence: Number(schedWeight),
      },
    });

    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleExportJson = async () => {
    try {
      const data = await exportFullBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `woli_os_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export backup', err);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Validating backup file...');
    setImportError(null);

    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON format: file could not be parsed.');
      }

      const validation = validateBackupData(json);
      if (!validation.valid || !validation.data || !validation.counts) {
        throw new Error(validation.error || 'Invalid backup structure.');
      }

      setPendingRestore({
        data: validation.data,
        mode: restoreMode,
        filename: file.name,
        exportedAt: validation.data.exportedAt,
        version: validation.data.version,
        counts: validation.counts,
      });
      setIsRestoreModalOpen(true);
      setImportStatus(null);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse backup JSON.');
      setImportStatus(null);
    } finally {
      e.target.value = '';
    }
  };

  const handleExecuteRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    setImportError(null);
    try {
      const res = await restoreFromBackup(pendingRestore.data, pendingRestore.mode);
      setImportStatus(res.message);
      setIsRestoreModalOpen(false);
      setPendingRestore(null);
      await refreshAll();
    } catch (err: any) {
      setImportError(err.message || 'Failed to restore backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleWipeDatabase = async () => {
    await Promise.all([
      db.tasks.clear(),
      db.habits.clear(),
      db.habitOccurrences.clear(),
      db.scheduleBlocks.clear(),
      db.timeSessions.clear(),
      db.goals.clear(),
      db.goalMilestones.clear(),
      db.dailyReviews.clear(),
      db.weeklyReviews.clear(),
      db.monthlyReviews.clear(),
      db.yearlyReviews.clear(),
    ]);
    // Persist isInitialSeedCompleted: true so wiping keeps database empty after reload/refresh
    const currentSettings = (await db.settings.get('current_user_settings')) || DEFAULT_SETTINGS;
    await db.settings.put({ ...currentSettings, isInitialSeedCompleted: true });

    setIsWipeModalOpen(false);
    await refreshAll();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory(newCatName.trim(), newCatColor);
    setNewCatName('');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
          <Settings className="w-3.5 h-3.5" />
          <span>Local Data Sovereignty & Preferences</span>
        </div>
        <h1 className="text-2xl font-extrabold text-neutral-100 mt-0.5">Data & Settings</h1>
        <p className="text-xs text-neutral-400">
          Export full database backups, restore previous snapshots, customize formula weights, and manage categories.
        </p>
      </div>

      {/* Main Grid: Data Safety Section & Application Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Data Backups & CSV Export */}
        <div className="space-y-6">
          {/* Backup & Restore Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">Database Backup & Recovery</h3>
                <p className="text-xs text-neutral-400">Save a complete snapshot to your computer.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-950 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>

              <div className="relative">
                <input
                  type="file"
                  id="backup-input"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <label
                  htmlFor="backup-input"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Restore from JSON</span>
                </label>
              </div>
            </div>

            {/* Restore conflict mode */}
            <div className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
              <span className="font-medium text-neutral-300">Restore mode:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                  className="accent-indigo-500"
                />
                <span>Replace Existing</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="accent-indigo-500"
                />
                <span>Merge with Existing</span>
              </label>
            </div>

            {importStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 text-xs text-neutral-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                All tasks, habits, occurrences, goals, milestones, reviews, and time logs are saved in
                browser IndexedDB (`LifeOSDB`). Backups preserve referential integrity.
              </p>
            </div>
          </div>

          {/* Service Worker & Offline Cache Diagnostics Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100">Offline-First Service Worker & Cache</h3>
                  <p className="text-xs text-neutral-400">Zero network dependencies for routine daily use.</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Offline Ready</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-neutral-500">Service Worker</span>
                <div className="font-bold text-neutral-200">Precached & Active</div>
                <span className="text-[10px] text-neutral-400">App shell cached via Workbox</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-neutral-500">IndexedDB Storage</span>
                <div className="font-bold text-indigo-400 font-mono">
                  {storageInfo ? `${storageInfo.usedMb} MB used` : 'Active (~100% free)'}
                </div>
                <span className="text-[10px] text-neutral-400">
                  {storageInfo ? `of ~${storageInfo.quotaMb} MB device quota` : 'Persistent offline'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-400">Install as standalone app:</span>
              <PWAInstallButton />
            </div>
          </div>

          {/* Export CSV Reports Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">Export Reports to CSV</h3>
                <p className="text-xs text-neutral-400">Open in spreadsheet programs (Excel, Sheets).</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => exportToCsv(tasks, 'tasks_report')}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 text-left font-medium flex items-center justify-between"
              >
                <span>Tasks CSV ({tasks.length})</span>
                <Download className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              <button
                onClick={() => exportToCsv(timeSessions, 'time_sessions_report')}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 text-left font-medium flex items-center justify-between"
              >
                <span>Time Logs CSV ({timeSessions.length})</span>
                <Download className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              <button
                onClick={() => exportToCsv(habits, 'habits_report')}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 text-left font-medium flex items-center justify-between"
              >
                <span>Habits CSV ({habits.length})</span>
                <Download className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              <button
                onClick={() => exportToCsv(scheduleBlocks, 'schedule_report')}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 text-left font-medium flex items-center justify-between"
              >
                <span>Schedule CSV ({scheduleBlocks.length})</span>
                <Download className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-rose-950/40 space-y-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </h3>
            <p className="text-xs text-neutral-400">
              Clear all tasks, habits, and time records. Settings and categories will remain preserved.
            </p>
            <button
              onClick={() => setIsWipeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Database Records</span>
            </button>
          </div>
        </div>

        {/* Right Column: User Settings & Productivity Formula Customizer */}
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100">Preferences & Defaults</h3>
                  <p className="text-xs text-neutral-400">Configure day boundaries and format options.</p>
                </div>
              </div>

              {settingsSaved && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            {/* Theme & Appearance */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Theme & Appearance
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setThemeState('light');
                    setTheme('light');
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    theme === 'light'
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/30'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setThemeState('dark');
                    setTheme('dark');
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/30'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setThemeState('system');
                    setTheme('system');
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    theme === 'system'
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/30'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-neutral-400" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Time Format</label>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs"
                >
                  <option value="24h">24-hour clock (14:30)</option>
                  <option value="12h">12-hour clock (2:30 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Week Start Day</label>
                <select
                  value={weekStartDay}
                  onChange={(e) => setWeekStartDay(Number(e.target.value) as 0 | 1)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs"
                >
                  <option value={1}>Monday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Day Start Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={dayStartHour}
                  onChange={(e) => setDayStartHour(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Day End Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={dayEndHour}
                  onChange={(e) => setDayEndHour(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Task Duration</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={defaultTaskDuration}
                  onChange={(e) => setDefaultTaskDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs"
                />
              </div>
            </div>

            {/* Productivity Score Formula Configuration */}
            <div className="pt-3 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                    Productivity Score Weights
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Must total 100%. (Current: {totalWeight}%)
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isWeightValid
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {isWeightValid ? 'Valid' : 'Must sum to 100%'}
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Task Completion Rate Weight</span>
                    <span className="font-semibold text-neutral-200">{taskWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={taskWeight}
                    onChange={(e) => setTaskWeight(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Habit Consistency Rate Weight</span>
                    <span className="font-semibold text-neutral-200">{habitWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={habitWeight}
                    onChange={(e) => setHabitWeight(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Schedule Adherence Weight</span>
                    <span className="font-semibold text-neutral-200">{schedWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={schedWeight}
                    onChange={(e) => setSchedWeight(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                disabled={!isWeightValid}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs shadow-sm shadow-indigo-950 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </form>

          {/* Category Management Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">Category Taxonomy</h3>
                <p className="text-xs text-neutral-400">Used across tasks, habits, and time blocks.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-850 text-xs text-neutral-200"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: c.color || '#6366f1' }}
                  />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>

            {/* Add custom category form */}
            <form onSubmit={handleAddCategory} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="New Category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-500"
              />
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer p-1 shrink-0"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold shrink-0"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Wipe Confirmation Dialog */}
      <ConfirmModal
        isOpen={isWipeModalOpen}
        title="Clear All Database Records"
        message="Are you sure you want to clear your local tasks, habits, time logs, and goals? We recommend exporting a JSON backup first. This action is irreversible."
        confirmLabel="Wipe Everything"
        isDestructive
        onConfirm={handleWipeDatabase}
        onCancel={() => setIsWipeModalOpen(false)}
      />

      {/* Restore Preview and Confirmation Modal */}
      {pendingRestore && (
        <RestorePreviewModal
          isOpen={isRestoreModalOpen}
          filename={pendingRestore.filename}
          exportedAt={pendingRestore.exportedAt}
          version={pendingRestore.version}
          mode={pendingRestore.mode}
          counts={pendingRestore.counts}
          isRestoring={isRestoring}
          onConfirm={handleExecuteRestore}
          onCancel={() => {
            setIsRestoreModalOpen(false);
            setPendingRestore(null);
          }}
        />
      )}
    </div>
  );
};
