import React, { useState } from 'react';
import { Download, Share, X, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, suppress button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop prompt
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl font-semibold text-xs transition-all ${
          compact
            ? 'px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
            : 'px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950'
        }`}
        title="Install WOLI OS as a standalone desktop or mobile app"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold border border-neutral-700"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4 text-neutral-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" /> Install on iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
                <div className="flex items-start gap-2.5 bg-neutral-950/80 p-3 rounded-xl border border-neutral-850">
                  <span className="font-bold text-indigo-400">1.</span>
                  <span>
                    Tap the <strong>Share</strong> button (box with upward arrow) in your Safari toolbar.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 bg-neutral-950/80 p-3 rounded-xl border border-neutral-850">
                  <span className="font-bold text-indigo-400">2.</span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 bg-neutral-950/80 p-3 rounded-xl border border-neutral-850">
                  <span className="font-bold text-indigo-400">3.</span>
                  <span>
                    WOLI OS will run in offline standalone mode with persistent IndexedDB storage!
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
