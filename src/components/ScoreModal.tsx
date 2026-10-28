import React from 'react';
import { X, Info, Sliders, CheckCircle2 } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number | null;
  breakdown: { label: string; rawValue: number | null; weight: number; effectiveWeight: number }[];
  isInsufficientData: boolean;
}

export const ScoreModal: React.FC<ScoreModalProps> = ({
  isOpen,
  onClose,
  score,
  breakdown,
  isInsufficientData,
}) => {
  const { settings, updateSettings } = useLifeOS();
  const [taskW, setTaskW] = React.useState(settings.productivityWeights.taskRate);
  const [habitW, setHabitW] = React.useState(settings.productivityWeights.habitRate);
  const [schedW, setSchedW] = React.useState(settings.productivityWeights.scheduleAdherence);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  React.useEffect(() => {
    setTaskW(settings.productivityWeights.taskRate);
    setHabitW(settings.productivityWeights.habitRate);
    setSchedW(settings.productivityWeights.scheduleAdherence);
  }, [settings.productivityWeights]);

  if (!isOpen) return null;

  const totalW = taskW + habitW + schedW;
  const isValid = totalW === 100;

  const handleSaveWeights = async () => {
    if (!isValid) return;
    await updateSettings({
      productivityWeights: {
        taskRate: taskW,
        habitRate: habitW,
        scheduleAdherence: schedW,
      },
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]"
        role="dialog"
        aria-labelledby="score-modal-title"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 id="score-modal-title" className="text-lg font-bold text-neutral-100">
                Productivity Score Intelligence
              </h3>
              <p className="text-xs text-neutral-400">Formula transparency & component breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Card */}
        <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Calculated Score
            </span>
            <div className="text-3xl font-extrabold text-neutral-100 mt-0.5">
              {score !== null ? `${score}/100` : 'Insufficient Data'}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Internal indicator of routine consistency, not a measure of personal worth.
            </p>
          </div>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold border ${
              score === null
                ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                : score >= 80
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : score >= 50
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {score !== null ? `${score}%` : '--'}
          </div>
        </div>

        {/* Components Breakdown */}
        <div>
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Component Breakdown
          </h4>
          <div className="space-y-2.5">
            {breakdown.map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-xl bg-neutral-850/60 border border-neutral-800 flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-medium text-neutral-200">{item.label}</div>
                  <div className="text-xs text-neutral-500">
                    Base Weight: {item.weight}% | Effective: {item.effectiveWeight}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-neutral-100">
                    {item.rawValue !== null ? `${item.rawValue}%` : 'No data'}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {item.rawValue !== null ? 'Included' : 'Normalized out'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weight Customizer */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Adjust Formula Weights
            </h4>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                isValid
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              Total: {totalW}% {isValid ? '(Valid)' : '(Must equal 100%)'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Tasks Completion Weight</span>
                <span className="font-semibold text-neutral-200">{taskW}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={taskW}
                onChange={(e) => setTaskW(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Habits Consistency Weight</span>
                <span className="font-semibold text-neutral-200">{habitW}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={habitW}
                onChange={(e) => setHabitW(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Schedule Adherence Weight</span>
                <span className="font-semibold text-neutral-200">{schedW}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={schedW}
                onChange={(e) => setSchedW(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setTaskW(40);
                setHabitW(30);
                setSchedW(30);
              }}
              className="text-xs text-neutral-400 hover:text-neutral-200 underline"
            >
              Reset to Defaults (40 / 30 / 30)
            </button>
            <button
              disabled={!isValid}
              onClick={handleSaveWeights}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 transition-colors"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </>
              ) : (
                'Save Weights'
              )}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-850/80 border border-neutral-800 text-xs text-neutral-400">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p>
            When no activities exist for a component on a given day (e.g., zero scheduled habits), the
            system normalizes the remaining components proportionally rather than assigning a false zero.
          </p>
        </div>
      </div>
    </div>
  );
};
