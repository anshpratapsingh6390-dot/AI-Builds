import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Repeat,
  Clock,
  Target,
  Calendar,
  BarChart3,
  BookOpen,
  Settings,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { formatDateIso } from '../utils/dateUtils';

export type ViewType =
  | 'dashboard'
  | 'planner'
  | 'tasks'
  | 'habits'
  | 'timer'
  | 'goals'
  | 'calendar'
  | 'analytics'
  | 'history'
  | 'settings';

interface AppSidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onSelectView,
  mobileOpen,
  onCloseMobile,
}) => {
  const { tasks, activeTimer, habits } = useLifeOS();

  // Calculate overdue tasks count for badge
  const todayStr = formatDateIso(new Date());
  const overdueCount = tasks.filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled' || t.status === 'skipped') return false;
    return t.dueDate && t.dueDate < todayStr;
  }).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'Daily Planner', icon: CalendarDays },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: overdueCount > 0 ? overdueCount : undefined, badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
    { id: 'habits', label: 'Habits', icon: Repeat },
    { id: 'timer', label: 'Time Tracker', icon: Clock, badge: activeTimer ? 'Active' : undefined, badgeColor: 'bg-indigo-500/20 text-indigo-400 animate-pulse' },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History & Reviews', icon: BookOpen },
    { id: 'settings', label: 'Data & Settings', icon: Settings },
  ];

  const handleNavClick = (id: ViewType) => {
    onSelectView(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-neutral-925 border-r border-neutral-800/80 text-neutral-300 w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-neutral-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/50">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-neutral-100 text-base">WOLI OS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-none">Productivity Intelligence</p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/40 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    item.badgeColor || 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Status / Local-First guarantee */}
      <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/40">
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Local-First DB
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="IndexedDB Connected" />
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            Multi-year persistent offline storage via IndexedDB. Your data stays entirely in your browser.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-64 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
