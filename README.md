# LIFE OS

> **Personal Productivity, Habit Tracking, Time Management & Goal Intelligence Platform**

LIFE OS is a local-first personal productivity operating system designed for multi-year daily use. Built on the principle of **One Source of Truth**, tasks, habits, time logs, schedules, and multi-horizon goals are interconnected so completing a session or activity automatically updates all relevant metrics without duplicate manual entry.

---

## 🌟 Key Capabilities

1. **Dashboard (Cockpit)**: Summarizes today's tasks planned, completed, remaining, overdue, habit completions, planned vs actual working hours, schedule adherence %, and a transparent productivity score.
2. **Daily Planner**: Time-blocking schedule with 24h/12h clocks, configurable day boundaries, timeline & agenda views, overlap conflict warnings, and planned vs actual time variance.
3. **Task Execution Manager**: Prioritized to-do list (Urgent, High, Medium, Low) with tags, estimated durations, actual time tracking, overdue detection, and direct goal linkages.
4. **Habit Tracker**: Multi-frequency habits (daily, weekdays, weekends, custom days) with binary, duration, or quantity targets, a 14-day visual consistency matrix, streak calculations with unscheduled day protection, and historical inspections.
5. **Time Tracker**: Reliable live stopwatch engine persisting state via timestamps across browser reloads, category time distribution, and manual time entry.
6. **Goal Management & Intelligence**: Weekly, Monthly, Six-Month, and Yearly goals with subgoals and milestones. Goal progress is derived automatically from linked time logs, completed tasks, or habits without double-counting.
7. **Calendar & Archive**: Historical navigation across months and years with deep date inspection. Preserves all historical truth permanently.
8. **Automated Analytics Engine**: Transparent rule-based metrics across daily, weekly, monthly, 6-month, and yearly horizons with planned vs actual bar comparisons.
9. **Retrospectives & Reviews**: Permanent daily, weekly, monthly, and yearly reviews pre-populated with calculated statistics.
10. **Data Safety & Sovereignty**: Full JSON export and restore (with Replace or Merge options), CSV report downloads, and IndexedDB persistence.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Icons & Animation**: Lucide React, Canvas Confetti
- **Persistence**: IndexedDB (`LifeOSDB`) via Dexie.js for multi-year offline storage
- **Unit Testing**: Node test runner (`node:test`, `node:assert/strict`) via `tsx`

---

## 🚀 Running the Application Locally

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation & Startup

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

The production assets will be generated in the `dist/` directory.

---

## 💾 Local Persistence & Offline-First Capabilities

LIFE OS is engineered with a **local-first, offline-capable architecture**:
- **Service Worker (`vite-plugin-pwa`)**: Precaches the application shell, assets, SVGs, and bundles. The web application loads and operates with zero active network connection.
- **IndexedDB (`LifeOSDB` via Dexie.js)**: Persists all tasks, habits, occurrences, time tracking sessions, goals, milestones, reviews, and categories locally on your device.
- **Offline Indicator**: A real-time connectivity monitor alerts users when offline, confirming that local IndexedDB storage and cached service worker assets are active.
- **Installable PWA**: Features standard Web App Manifest (`manifest.webmanifest`), 192x192 & 512x512 icons, maskable Android icons, and iOS Safari Add-to-Home-Screen workflows.
- **Data Sovereignty**: Data survives page reloads, tab closures, and device restarts. No cloud accounts or paid API keys are required.

### Backing Up & Restoring Your Data

1. Open **Data & Settings** from the sidebar.
2. Click **Export JSON Backup** to save a timestamped `.json` file to your computer.
3. To restore or move data to another device or browser, click **Restore from JSON**, select your backup file, and choose whether to **Replace** or **Merge** records.
4. To export reports for spreadsheets, click any of the **CSV Export** buttons (Tasks, Time Logs, Habits, Schedule).

---

## 🧪 Running Automated Unit Tests

LIFE OS includes deterministic unit tests verifying all core rules (habit streaks, unscheduled day preservation, task completion rates, schedule adherence, normalized productivity score weights, and goal progress derivation):

```bash
npx --yes tsx --test src/utils/rules.test.ts
```

All calculations are tested without DOM overhead.
