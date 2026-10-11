# StudentPlannerV2

React Native app built with Expo (SDK 57) and Expo Router. It lets students track tasks (title, subject, priority, deadline, notes). Data is stored on-device with AsyncStorage.

## Running the app

```bash
npm install
npm start          # then scan the QR code with Expo Go, or press i / a / w
```

Requires Node 22 (see `.mise.toml`). Use the latest Expo Go from the App Store / Play Store, or press `w` to preview in a browser.

## Project structure

Imports use the `@/` alias (= `src/`), e.g. `@/tasks/tasks`. Each file holds a whole feature, in the order the UI flows (screen first, small parts after).

**`src/tasks/`**
- `tasks.js` - shared core: `RootNavigator`, app state (`AppProvider` / `useApp`: tasks, subtasks, focus minutes), `useSafeBack` + `confirmDelete`, shared UI (`Screen`, `PriorityBadge`, `DueBadge`, `Chip`, `ProgressBar`, `Checkbox`, `TaskExtras`), and helpers (`parseDueDate`, `sortByDeadline`, `sortByPriority`, `getDueInfo`, `matchesFilter`, `matchesDay`, `getWeekDays`, `getWeekStudy`, `getStreak`, `getSubjectInsights`, `scorePercent`, `nextDueDate`, `getStats`, `getSubjects`, `formatMinutes`).
- `tasks-screen.js` - Tasks tab: stats tiles, overall progress + study streak, 7-day week strip, search, filter chips (All / Today / This week / Overdue), sort (Deadline / Priority).
- `task-details.js` - Task Details screen: Mark done / Reopen, Steps checklist, Score (once done), Focus timer (logs minutes to the task, progress vs. time needed).
- `tabs.js` - bottom tab bar. `icon.js` - SVG icons. `tasks.styles.js` - every Tasks style + the app colours (`colors`).
- `storage.js` - AsyncStorage `loadTasks` / `saveTasks` (the only file that touches AsyncStorage). Fills in the V2 fields for tasks saved by V1.

**`src/add-task/`**
- `add-task-screen.js` - Add Task tab: `AddTaskScreen`, `AddTaskForm`, rules (`checkDeadline`, `canSaveTask`).
- `edit-task-screen.js` - Edit Task modal: `EditTaskScreen`, `TaskForm`, `FormHeader`, `checkEditDeadline`.
- `form-fields.js` - `SubjectField` (chips of subjects already used), `ChoiceField` (Type / Repeat / Time needed chips), `DeadlineField` (quick dates + calendar), used by both forms.
- `add-task.styles.js` - styles for all of the above.

**`src/completed/`**
- `completed-screen.js` - Completed tab: Study insights (7-day study chart, streak, per-subject done / time / average score), completion date + score on cards, `CompletedScreen`, `TaskCard`, `EmptyState`. `completed.styles.js` - its styles.

**`app/`** (project root, **outside** `src`) - Expo Router route files. Each is a one-line re-export of a screen above. Every file in it becomes a route, so it is kept separate from `src`.

Import direction (keep it one-way to avoid circular imports): `tasks.styles.js` / `icon.js` / `storage.js` <- `tasks.js` <- `tasks-screen.js` / `task-details.js` / `add-task-screen.js` / `edit-task-screen.js` / `completed-screen.js`. Never import those screen files from `tasks.js`.

All styles live in the `*.styles.js` files; there is no `StyleSheet.create` inside the code files.

## Conventions and gotchas

- **Styling:** React Native `StyleSheet`, kept in the `*.styles.js` files. Shared colours come from `colors` in `src/tasks/tasks.styles.js`; do not hard-code new hex values in screens.
- **Persistence:** `AppContext` loads from AsyncStorage first and only saves once `ready` is true. Do not add a save path that runs before the initial load, or stored data will be overwritten.
- **Hooks:** Never call hooks after an early return. When a screen depends on a record that may not exist (e.g. `/task/edit/[taskId]`), render a not-found view and mount the hook-using component only when the record exists.
- **Navigation back:** use `useSafeBack()` instead of `router.back()`, so modals opened directly (deep link, web refresh) still have somewhere to go.
- **Confirmations:** use `confirmDelete()` from `src/tasks/tasks.js`. `Alert.alert` does nothing on web.
- **Task data (V2):** a task is `{ id, title, subject, priority, dueDate, notes, done, subtasks[], focusMinutes, completedAt, type, repeat, estimateMin, score, maxScore, focusLog, spawnedNext }`. Add new fields in `storage.js` (`readTasks`) too, so older saved tasks keep working.
- **Repeating tasks:** `toggleTaskDone` creates the next copy (`makeNextOccurrence`) the first time a Daily/Weekly task is completed; `spawnedNext` stops it creating a second one if the task is reopened and completed again.
- **Deadlines:** the Add/Edit forms require `YYYY-MM-DD`. Priority has no default: no button is highlighted until one is tapped, and Add Task needs one chosen. `parseDueDate` in `src/tasks/tasks.js` also reads older free-text dates ("Dec 5", "12/5") for sorting; unreadable dates sort last.
- **Safe areas:** use `Screen` from `@/tasks/tasks` (wraps `react-native-safe-area-context`). Do not use `SafeAreaView` from `react-native`.
- **Tabs import:** `Tabs` comes from `expo-router/js-tabs` (the `expo-router` export is deprecated in SDK 57).
- **Dependencies:** install native modules with `npx expo install <pkg>` so versions match the SDK.

## Dependencies

- Runtime: Expo SDK 57, React 19, React Native 0.86, Expo Router, react-native-svg, AsyncStorage, react-native-safe-area-context, react-native-screens.
- Web preview: react-native-web, react-dom.
- Dev: TypeScript.
