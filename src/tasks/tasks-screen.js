import React, { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Checkbox,
  Chip,
  DueBadge,
  formatMinutes,
  getStats,
  getStreak,
  getWeekDays,
  matchesDay,
  PriorityBadge,
  ProgressBar,
  sortByDeadline,
  sortByPriority,
  TASK_SORTS,
  TaskExtras,
  useApp,
} from '@/shared/app';
import { ClipboardEmptyIcon, SearchIcon } from '@/shared/icon';
import { colors, styles } from '@/shared/styles';

export function TasksScreen() {
  const { tasks } = useApp();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('Deadline');
  const [day, setDay] = useState(null); // 'YYYY-MM-DD' picked on the week strip, or null

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();

  const stats = getStats(tasks);
  const streak = getStreak(tasks);
  const weekDays = getWeekDays(tasks);
  const { open, filtered } = getVisibleTasks(tasks, search, sort, day);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskCard task={item} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={styles.dateRow}>
              <View>
                <Text style={styles.dateLabel}>
                  {dayName}, {dateStr}
                </Text>
                <Text style={styles.dateTitle}>Today's Schedule</Text>
              </View>
              <Text style={styles.taskCount}>
                {filtered.length} task{filtered.length !== 1 ? 's' : ''} shown
              </Text>
            </View>

            {stats.total > 0 ? (
              <View style={styles.progressCard}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressTitle}>Overall progress</Text>
                  <Text style={styles.progressMeta}>
                    {stats.done} of {stats.total} done
                  </Text>
                </View>
                <ProgressBar value={stats.progress} />
                {stats.focusMinutes > 0 ? (
                  <Text style={styles.progressMeta}>{formatMinutes(stats.focusMinutes)} studied with the focus timer</Text>
                ) : null}
                {streak > 0 ? <Text style={styles.streakText}>{streak}-day study streak</Text> : null}
              </View>
            ) : null}

            <WeekStrip days={weekDays} selected={day} onPick={key => setDay(d => (d === key ? null : key))} />

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <SearchIcon size={15} color={colors.faint} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tasks or subjects..."
                  placeholderTextColor={colors.faint}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
              </View>
            </View>

            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort by</Text>
              {TASK_SORTS.map(s => (
                <Chip key={s} label={s} active={sort === s} onPress={() => setSort(s)} />
              ))}
            </View>
          </>
        }
        ListEmptyComponent={<EmptyState {...getEmptyMessage(open.length, search, day)} />}
        ListFooterComponent={<View style={styles.listFooter} />}
      />
    </SafeAreaView>
  );
}

/** The next 7 days. Tap a day to see only the tasks due then; tap again to clear. */
function WeekStrip({ days, selected, onPick }) {
  return (
    <View style={styles.weekRow}>
      {days.map(d => {
        const active = selected === d.key;
        return (
          <Pressable
            key={d.key}
            onPress={() => onPick(d.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${d.label} ${d.dayNumber}, ${d.count} due`}
            style={[styles.dayPill, active && styles.dayPillActive]}
          >
            <Text style={[styles.dayLabel, active && styles.dayTextActive]}>{d.label}</Text>
            <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{d.dayNumber}</Text>
            <Text style={[styles.dayCount, active && styles.dayTextActive]}>{d.count > 0 ? d.count : ' '}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TaskCard({ task }) {
  const router = useRouter();
  const { toggleTaskDone } = useApp();
  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardRow}>
        <Checkbox checked={task.done} onPress={() => toggleTaskDone(task.id)} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{task.title}</Text>
          <View style={styles.cardBadges}>
            <PriorityBadge priority={task.priority} />
            <DueBadge task={task} />
          </View>
          <Text style={styles.cardMeta}>
            {task.subject || 'No subject'}
            {task.type ? `  \u00B7  ${task.type}` : ''}
          </Text>
          <TaskExtras task={task} style={styles.cardExtra} />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ title, body }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <ClipboardEmptyIcon />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function getEmptyMessage(openCount, search, day) {
  if (openCount === 0) return { title: 'No tasks yet', body: 'Open the Add Task tab to add your first task.' };
  if (search.trim()) return { title: 'No matching tasks', body: 'Try a different search.' };
  if (day) return { title: 'Nothing due that day', body: 'Tap the day again to see all your tasks.' };
  return { title: 'All caught up', body: 'You have no open tasks right now.' };
}

// Open tasks only -> search -> picked day -> sort.
function getVisibleTasks(tasks, search, sort, day) {
  const text = search.trim().toLowerCase();
  const open = tasks.filter(t => !t.done);
  const matching = open.filter(
    t =>
      (t.title.toLowerCase().includes(text) || (t.subject ?? '').toLowerCase().includes(text)) &&
      (!day || matchesDay(t, day)),
  );
  return { open, filtered: sort === 'Priority' ? sortByPriority(matching) : sortByDeadline(matching) };
}
