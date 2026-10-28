/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LifeOSProvider, useLifeOS } from './context/LifeOSContext';
import { AppSidebar, ViewType } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { QuickAddModal } from './components/QuickAddModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DashboardView } from './views/DashboardView';
import { DailyPlannerView } from './views/DailyPlannerView';
import { TasksView } from './views/TasksView';
import { HabitsView } from './views/HabitsView';
import { TimeTrackerView } from './views/TimeTrackerView';
import { GoalsView } from './views/GoalsView';
import { CalendarView } from './views/CalendarView';
import { AnalyticsView } from './views/AnalyticsView';
import { HistoryView } from './views/HistoryView';
import { DataSettingsView } from './views/DataSettingsView';

function LifeOSContent() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { loading } = useLifeOS();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 space-y-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-neutral-300">
          Initializing WOLI OS Local Database...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans antialiased overflow-hidden selection:bg-indigo-600 selection:text-white">
      {/* Desktop & Mobile Sidebar */}
      <AppSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Persistent App Header */}
        <AppHeader onToggleMobileNav={() => setMobileNavOpen((o) => !o)} />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} />}
          {currentView === 'planner' && <DailyPlannerView />}
          {currentView === 'tasks' && <TasksView />}
          {currentView === 'habits' && <HabitsView />}
          {currentView === 'timer' && <TimeTrackerView />}
          {currentView === 'goals' && <GoalsView />}
          {currentView === 'calendar' && <CalendarView onNavigate={setCurrentView} />}
          {currentView === 'analytics' && <AnalyticsView />}
          {currentView === 'history' && <HistoryView />}
          {currentView === 'settings' && <DataSettingsView />}
        </main>
      </div>

      {/* Universal Quick Add Modal */}
      <QuickAddModal />

      {/* Offline Status & IndexedDB Notification */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <LifeOSProvider>
      <LifeOSContent />
    </LifeOSProvider>
  );
}
