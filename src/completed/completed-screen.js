import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Checkbox,
  confirmDelete,
  formatMinutes,
  getStats,
  getStreak,
  getSubjectInsights,
  getWeekStudy,
  PriorityBadge,
  scorePercent,
  sortByDeadline,
  TaskExtras,
  useApp,
} from '@/tasks/tasks';
import { CheckEmptyIcon, TrashIcon } from '@/tasks/icon';
import { styles } from './completed.styles';

export function CompletedScreen() {
  const { tasks, deleteTask, clearCompletedTasks } = useApp();
  const completed = sortByDeadline(tasks.filter(t => t.done));
  const stats = getStats(tasks);

  const handleDeleteOne = t =>
    confirmDelete('Delete Task', `Delete "${t.title}"?`, 'Delete', () => deleteTask(t.id));

  const handleDeleteAll = () =>
    confirmDelete(
      'Delete All Completed',
      `Delete all ${completed.length} completed task${completed.length !== 1 ? 's' : ''}? This cannot be undone.`,
      'Delete All',
      clearCompletedTasks,
    );

 

function TaskCard({ task, onDelete }) {
  const router = useRouter();
  const { toggleTaskDone } = useApp();
  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, styles.cardDone, pressed && styles.cardPressed]}
    >
      <View style={styles.cardRow}>
        <Checkbox checked={task.done} onPress={() => toggleTaskDone(task.id)} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, styles.cardTitleDone]}>{task.title}</Text>
          <PriorityBadge priority={task.priority} />
          <Text style={styles.cardMeta}>{task.subject || 'No subject'}</Text>
          {task.dueDate ? <Text style={styles.cardMeta}>Due {task.dueDate}</Text> : null}
          {task.completedAt ? <Text style={styles.cardMeta}>Completed {formatDay(task.completedAt)}</Text> : null}
          {scorePercent(task) !== null ? <Text style={styles.cardScore}>Score {scorePercent(task)}%</Text> : null}
          <TaskExtras task={task} style={styles.cardMeta} />
        </View>
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.title}`}
        >
          <TrashIcon />
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Study streak, minutes studied per day this week, and a summary for each subject. */
function InsightsCard({ tasks }) {
  const week = getWeekStudy(tasks);
  const streak = getStreak(tasks);
  const subjects = getSubjectInsights(tasks).slice(0, 6);
  const weekTotal = week.reduce((sum, d) => sum + d.minutes, 0);
  const maxMinutes = Math.max(...week.map(d => d.minutes), 1);

  return (
    <View style={styles.insights}>
      <View style={styles.insightsHead}>
        <Text style={styles.insightsTitle}>Study insights</Text>
        <Text style={styles.insightsMeta}>
          {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
        </Text>
      </View>

      <View style={styles.bars}>
        {week.map(d => (
          <View key={d.key} style={styles.barCol}>
            <Text style={styles.barValue}>{d.minutes > 0 ? d.minutes : ' '}</Text>
            <View style={[styles.bar, { height: 4 + Math.round((d.minutes / maxMinutes) * 56) }, d.minutes > 0 && styles.barActive]} />
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.insightsMeta}>
        {weekTotal > 0 ? `${formatMinutes(weekTotal)} studied in the last 7 days (minutes per day)` : 'Use the focus timer on a task to see your study time here.'}
      </Text>

      <View style={styles.subjectList}>
        {subjects.map(r => (
          <View key={r.subject} style={styles.subjectRow}>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectName}>{r.subject}</Text>
              <Text style={styles.insightsMeta}>
                {r.done}/{r.total} done
                {r.minutes > 0 ? `  \u00B7  ${formatMinutes(r.minutes)} studied` : ''}
              </Text>
            </View>
            {r.average !== null ? <Text style={styles.subjectAvg}>Avg {r.average}%</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyState({ title, body }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <CheckEmptyIcon />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function formatDay(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
