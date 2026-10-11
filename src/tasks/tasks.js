/**
 * TASKS FOLDER - shared core of the app
 * ---------------------------------------
 * tasks.js          - this file: app state, helpers, shared UI, deadline + stats helpers, root navigator
 * tasks.styles.js   - every style + the colours
 * icon.js           - SVG icons
 * storage.js        - AsyncStorage load / save (the only file that touches AsyncStorage)
 * tasks-screen.js   - Tasks tab (stats, filters, search, list)
 * task-details.js   - Task Details screen (steps checklist + focus timer)
 * tabs.js           - bottom tab bar
 *
 * Import direction (one-way, no circular imports):
 *   tasks.styles / icon / storage  <-  tasks.js  <-  tasks-screen / task-details / add-task / completed
 * Never import the screen files from this file.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadTasks, saveTasks } from './storage';
import { CheckIcon } from './icon';
import {
  badgeStyles,
  checkboxStyles,
  chipStyles,
  colors,
  PRIORITY_STYLES,
  progressStyles,
  rootStyles,
  screenStyles,
  URGENCY_STYLES,
} from './tasks.styles';

/* ======================================================================
   2. APP STATE (shared by every screen through useApp())
   ====================================================================== */

/**
 * The shape of our data:
 *
 *  Task = { id, title, subject, priority, dueDate, notes, done,
 *           subtasks, focusMinutes, completedAt,
 *           type, repeat, estimateMin, score, maxScore, focusLog, spawnedNext }
 *         - subject is plain text typed by the student (e.g. "Mobile Programming")
 *         - priority is 'High', 'Medium' or 'Low'
 *         - dueDate is "2026-10-15" (older free text like "Thursday, Dec 5" still works)
 *         - subtasks is [{ id, title, done }]  (the steps checklist)
 *         - focusMinutes is the total study time logged by the focus timer
 *         - completedAt is an ISO time set when the task is ticked off (or null)
 *         - type is one of TASK_TYPES, repeat is one of REPEATS ('None' | 'Daily' | 'Weekly')
 *         - estimateMin is how long the student thinks it will take (or null)
 *         - score / maxScore is the grade the student got (or null)
 *         - focusLog is { 'YYYY-MM-DD': minutes } - study time per day (for the streak + weekly chart)
 *         - spawnedNext is true once a repeating task already created its next copy
 *
 * What useApp() gives each screen:
 *   tasks, ready,
 *   addTask, updateTask, deleteTask, toggleTaskDone, clearCompletedTasks,
 *   addSubtask, toggleSubtask, deleteSubtask, logFocus
 */
const AppContext = createContext(null);

// Makes a unique id for each new task.
const NEW_TASK_DEFAULTS = {
  subtasks: [],
  focusMinutes: 0,
  completedAt: null,
  type: 'Assignment',
  repeat: 'None',
  estimateMin: null,
  score: null,
  maxScore: null,
  focusLog: {},
  spawnedNext: false,
};

const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [ready, setReady] = useState(false);

  // 1. LOAD once when the app starts.
  useEffect(() => {
    async function loadData() {
      try {
        setTasks(await loadTasks());
      } catch (error) {
        console.warn('Could not load saved data', error);
      }
      setReady(true);
    }
    loadData();
  }, []);

  // 2. SAVE every time the data changes (but only after loading, so we never overwrite saved data with an empty list).
  useEffect(() => {
    if (!ready) return;
    saveTasks(tasks).catch(error => console.warn('Could not save data', error));
  }, [ready, tasks]);

  // 3. ACTIONS. React needs a NEW array each time (never edit the old one),
  //    so we use [...old, new] to add, .map() to update and .filter() to delete.

  function addTask(task) {
    setTasks(prev => [...prev, { ...NEW_TASK_DEFAULTS, ...task, id: createId() }]);
  }

  function updateTask(id, changes) {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...changes } : t)));
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  // Ticking a task off also remembers WHEN, so we can show "done this week".
  // A repeating task (Daily / Weekly) creates its next copy the first time it is completed.
  function toggleTaskDone(id) {
    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const nowDone = !target.done;
      const spawn = nowDone && target.repeat && target.repeat !== 'None' && !target.spawnedNext;
      const updated = prev.map(t =>
        t.id === id
          ? { ...t, done: nowDone, completedAt: nowDone ? new Date().toISOString() : null, spawnedNext: t.spawnedNext || spawn }
          : t,
      );
      return spawn ? [...updated, makeNextOccurrence(target, createId())] : updated;
    });
  }

  // Steps checklist inside a task.
  function addSubtask(id, title) {
    const text = title.trim();
    if (!text) return;
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, subtasks: [...(t.subtasks ?? []), { id: createId(), title: text, done: false }] } : t,
      ),
    );
  }

  function toggleSubtask(id, subtaskId) {
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, subtasks: (t.subtasks ?? []).map(st => (st.id === subtaskId ? { ...st, done: !st.done } : st)) }
          : t,
      ),
    );
  }

  function deleteSubtask(id, subtaskId) {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, subtasks: (t.subtasks ?? []).filter(st => st.id !== subtaskId) } : t)),
    );
  }

  // Adds study minutes (from the focus timer) to a task.
  function logFocus(id, minutes) {
    if (!(minutes > 0)) return;
    const today = dateKey(new Date());
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              focusMinutes: (t.focusMinutes ?? 0) + minutes,
              focusLog: { ...(t.focusLog ?? {}), [today]: ((t.focusLog ?? {})[today] ?? 0) + minutes },
            }
          : t,
      ),
    );
  }

  // Used by the Completed tab's "Delete all" button.
  function clearCompletedTasks() {
    setTasks(prev => prev.filter(t => !t.done));
  }

  return (
    <AppContext.Provider
      value={{
        tasks,
        ready,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskDone,
        clearCompletedTasks,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        logFocus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// The hook every screen uses:  const { tasks, addTask } = useApp();
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}

/* ======================================================================
   3. HELPERS
   ====================================================================== */

/**
 * Go back if there is history, otherwise land on the home tab.
 * (A plain `router.back()` does nothing after a web refresh or a deep link into a modal.)
 */
export function useSafeBack() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
}

// Alert.alert does nothing on web, so use window.confirm there.
export function confirmDelete(title, message, confirmLabel, onConfirm) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/* ======================================================================
   6. SHARED UI: Screen, PriorityBadge, Checkbox
   ====================================================================== */

/** Full-screen container that respects device safe areas. */
export function Screen({ children, edges = ['top'], style }) {
  return (
    <SafeAreaView edges={edges} style={[screenStyles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Small colored pill showing a task's priority (e.g. "High"). */
export function PriorityBadge({ priority, label }) {
  const c = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Medium;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.badgeText, { color: c.text }]}>{label ?? priority}</Text>
    </View>
  );
}

export function Checkbox({ checked, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[checkboxStyles.checkbox, checked && checkboxStyles.checkboxChecked]}
    >
      {checked ? <CheckIcon size={12} /> : null}
    </Pressable>
  );
}

/** Colored pill that says how close the deadline is ("Overdue by 2 days", "Due today"). */
export function DueBadge({ task }) {
  const info = getDueInfo(task);
  if (!info) return null;
  const c = URGENCY_STYLES[info.tone];
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.badgeText, { color: c.text }]}>{info.text}</Text>
    </View>
  );
}

/** Small tappable filter / choice pill. */
export function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[chipStyles.chip, active && chipStyles.chipActive]}
    >
      <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Thin progress bar. value is 0 to 1. */
export function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

/** "2/4 steps  ·  45 min of 1h 30m  ·  Repeats weekly" line under a task card. Returns null when there is nothing to show. */
export function TaskExtras({ task, style }) {
  const parts = [];
  const steps = task.subtasks ?? [];
  if (steps.length > 0) parts.push(`${steps.filter(st => st.done).length}/${steps.length} steps`);
  if (task.estimateMin > 0) parts.push(`${formatMinutes(task.focusMinutes ?? 0)} of ${formatMinutes(task.estimateMin)}`);
  else if (task.focusMinutes > 0) parts.push(`${formatMinutes(task.focusMinutes)} studied`);
  if (task.repeat && task.repeat !== 'None') parts.push(`Repeats ${task.repeat.toLowerCase()}`);
  if (parts.length === 0) return null;
  return <Text style={style}>{parts.join('  \u00B7  ')}</Text>;
}

/* ======================================================================
   7. DEADLINE SORTING
   ====================================================================== */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';

/** Roll a month/day with no explicit year into the nearest sensible year. */
function withImpliedYear(month, day, now) {
  const candidate = new Date(now.getFullYear(), month, day);
  const sixMonthsMs = 1000 * 60 * 60 * 24 * 183;
  // "Jan 10" typed in December means next January, not eleven months ago.
  if (now.getTime() - candidate.getTime() > sixMonthsMs) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

/**
 * Best-effort parse of due dates: "2026-12-05" (what the forms produce) plus older
 * free text such as "Thursday, Dec 5", "5 Dec", "12/5" or "12/5/2026".
 * Returns null when nothing recognisable is found.
 */
export function parseDueDate(text, now = new Date()) {
  const s = (text ?? '').trim().toLowerCase();
  if (!s) return null;

  let m = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  m = s.match(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`));
  if (m) {
    const month = MONTHS.indexOf(m[1]);
    const day = Number(m[2]);
    return m[3] ? new Date(Number(m[3]), month, day) : withImpliedYear(month, day, now);
  }

  m = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:,?\\s+(\\d{4}))?`));
  if (m) {
    const month = MONTHS.indexOf(m[2]);
    const day = Number(m[1]);
    return m[3] ? new Date(Number(m[3]), month, day) : withImpliedYear(month, day, now);
  }

  m = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    const month = Number(m[1]) - 1;
    const day = Number(m[2]);
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    if (m[3]) {
      const year = Number(m[3]);
      return new Date(year < 100 ? 2000 + year : year, month, day);
    }
    return withImpliedYear(month, day, now);
  }

  return null;
}

/**
 * Sort by nearest deadline. Open tasks come before completed ones,
 * tasks with a recognisable date come before those without.
 */
export function sortByDeadline(list) {
  const now = new Date();
  const keyed = list.map((a, index) => ({
    a,
    index,
    t: parseDueDate(a.dueDate, now)?.getTime() ?? null,
  }));
  keyed.sort((x, y) => {
    if (!!x.a.done !== !!y.a.done) return x.a.done ? 1 : -1;
    if (x.t !== null && y.t !== null && x.t !== y.t) return x.t - y.t;
    if (x.t !== null && y.t === null) return -1;
    if (x.t === null && y.t !== null) return 1;
    return x.index - y.index; // keep insertion order otherwise
  });
  return keyed.map(k => k.a);
}


/* ======================================================================
   8. DEADLINE LABELS, FILTERS, SORTING AND STATS (used by every tab)
   ====================================================================== */

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole days from today until the due date (negative = overdue). null when there is no readable date. */
export function daysUntil(dueDate, now = new Date()) {
  const due = parseDueDate(dueDate, now);
  if (!due) return null;
  return Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

/** { text, tone } for the DueBadge. tone is 'overdue' | 'today' | 'soon' | 'neutral'. */
export function getDueInfo(task, now = new Date()) {
  if (!task.dueDate) return null;
  if (task.done) return { text: `Due ${task.dueDate}`, tone: 'neutral' };
  const days = daysUntil(task.dueDate, now);
  if (days === null) return { text: `Due ${task.dueDate}`, tone: 'neutral' };
  if (days < 0) return { text: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, tone: 'overdue' };
  if (days === 0) return { text: 'Due today', tone: 'today' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'soon' };
  if (days <= 7) return { text: `Due in ${days} days`, tone: 'soon' };
  return { text: `Due ${task.dueDate}`, tone: 'neutral' };
}

/** "45 min" or "1h 20m". */
export function formatMinutes(total) {
  const m = Math.round(total || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

export const TASK_FILTERS = ['All', 'Today', 'This week', 'Overdue'];

/** Does an OPEN task belong in this filter? */
export function matchesFilter(task, filter, now = new Date()) {
  if (filter === 'All') return true;
  const days = daysUntil(task.dueDate, now);
  if (days === null) return false;
  if (filter === 'Today') return days === 0;
  if (filter === 'This week') return days >= 0 && days <= 7;
  if (filter === 'Overdue') return days < 0;
  return true;
}

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

export const TASK_SORTS = ['Deadline', 'Priority'];

/** Highest priority first, nearest deadline breaks ties. */
export function sortByPriority(list) {
  const byDeadline = sortByDeadline(list);
  return byDeadline
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const pa = PRIORITY_RANK[a.task.priority] ?? 3;
      const pb = PRIORITY_RANK[b.task.priority] ?? 3;
      return pa !== pb ? pa - pb : a.index - b.index;
    })
    .map(x => x.task);
}

/** Numbers for the stats tiles and the progress bar. */
export function getStats(tasks, now = new Date()) {
  const open = tasks.filter(t => !t.done);
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const done = tasks.length - open.length;
  return {
    total: tasks.length,
    done,
    open: open.length,
    overdue: open.filter(t => matchesFilter(t, 'Overdue', now)).length,
    dueToday: open.filter(t => matchesFilter(t, 'Today', now)).length,
    doneThisWeek: tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt).getTime() >= weekAgo).length,
    focusMinutes: tasks.reduce((sum, t) => sum + (t.focusMinutes ?? 0), 0),
    progress: tasks.length ? done / tasks.length : 0,
  };
}

/** All different subjects the student has used, most used first (for the quick-pick chips in the forms). */
export function getSubjects(tasks) {
  const counts = new Map();
  tasks.forEach(t => {
    const name = (t.subject ?? '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    const entry = counts.get(key) ?? { name, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map(e => e.name);
}


export const TASK_TYPES = ['Assignment', 'Quiz', 'Exam', 'Project', 'Reading'];
export const REPEATS = ['None', 'Daily', 'Weekly'];
export const ESTIMATES = [30, 60, 90, 120];

const pad2 = n => String(n).padStart(2, '0');

/** Date -> "2026-10-11" (local time). */
export function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "2026-10-11" + 3 -> "2026-10-14". */
export function addDaysToKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

/** Next due date for a repeating task. Never lands in the past. */
export function nextDueDate(task, now = new Date()) {
  const step = task.repeat === 'Daily' ? 1 : 7;
  const base = parseDueDate(task.dueDate, now) ?? startOfDay(now);
  const today = startOfDay(now).getTime();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + step);
  for (let i = 0; i < 400 && next.getTime() < today; i += 1) next.setDate(next.getDate() + step);
  return dateKey(next);
}

/** A fresh copy of a repeating task: same details, new deadline, nothing done yet. */
export function makeNextOccurrence(task, id) {
  return {
    ...task,
    id,
    done: false,
    completedAt: null,
    dueDate: nextDueDate(task),
    subtasks: (task.subtasks ?? []).map(st => ({ ...st, done: false })),
    focusMinutes: 0,
    focusLog: {},
    score: null,
    maxScore: null,
    spawnedNext: false,
  };
}

/** Is this task due on the given "YYYY-MM-DD" day? */
export function matchesDay(task, key) {
  const due = parseDueDate(task.dueDate);
  return !!due && dateKey(due) === key;
}

/** The next 7 days (starting today) with how many OPEN tasks are due on each. */
export function getWeekDays(tasks, now = new Date()) {
  const todayKey = dateKey(now);
  const open = tasks.filter(t => !t.done);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDaysToKey(todayKey, i);
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return {
      key,
      label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d,
      count: open.filter(t => matchesDay(t, key)).length,
    };
  });
}

/** Study minutes for each of the last 7 days (oldest first), from the focus timer log. */
export function getWeekStudy(tasks, now = new Date()) {
  const todayKey = dateKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDaysToKey(todayKey, i - 6);
    const [y, m, d] = key.split('-').map(Number);
    const minutes = tasks.reduce((sum, t) => sum + ((t.focusLog ?? {})[key] ?? 0), 0);
    return { key, label: new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' }), minutes };
  });
}

/** Days in a row with some study time or a completed task. Today is allowed to be empty (the day is not over). */
export function getStreak(tasks, now = new Date()) {
  const days = new Set();
  tasks.forEach(t => {
    Object.entries(t.focusLog ?? {}).forEach(([key, min]) => {
      if (min > 0) days.add(key);
    });
    if (t.done && t.completedAt) {
      const d = new Date(t.completedAt);
      if (!Number.isNaN(d.getTime())) days.add(dateKey(d));
    }
  });
  let key = dateKey(now);
  if (!days.has(key)) key = addDaysToKey(key, -1);
  let streak = 0;
  while (days.has(key)) {
    streak += 1;
    key = addDaysToKey(key, -1);
  }
  return streak;
}

/** Score as a whole percent, or null when no score was entered. */
export function scorePercent(task) {
  if (!(task.maxScore > 0) || !Number.isFinite(task.score)) return null;
  return Math.round((task.score / task.maxScore) * 100);
}

/** Per subject: tasks done / total, study minutes and average score (only from graded tasks). */
export function getSubjectInsights(tasks) {
  const map = new Map();
  tasks.forEach(t => {
    const name = (t.subject ?? '').trim() || 'No subject';
    const key = name.toLowerCase();
    const row = map.get(key) ?? { subject: name, total: 0, done: 0, minutes: 0, scores: [] };
    row.total += 1;
    if (t.done) row.done += 1;
    row.minutes += t.focusMinutes ?? 0;
    const pct = t.done ? scorePercent(t) : null;
    if (pct !== null) row.scores.push(pct);
    map.set(key, row);
  });
  return [...map.values()]
    .map(r => ({
      subject: r.subject,
      total: r.total,
      done: r.done,
      minutes: r.minutes,
      average: r.scores.length ? Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length) : null,
    }))
    .sort((a, b) => b.minutes - a.minutes || b.total - a.total || a.subject.localeCompare(b.subject));
}

/* ROOT NAVIGATOR */
function RootStack() {
  const { ready } = useApp();

  // Wait for stored data so screens never flash their empty state.
  if (!ready) {
    return (
      <View style={rootStyles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: rootStyles.stackContent }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task/[taskId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="task/edit/[taskId]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

/** The very first component that renders: wraps the whole app in AppProvider. */
export function RootNavigator() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AppProvider>
  );
}
