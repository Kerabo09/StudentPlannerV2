import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackIcon, CloseIcon } from './icon';
import {
  Checkbox,
  Chip,
  DueBadge,
  formatMinutes,
  PriorityBadge,
  ProgressBar,
  scorePercent,
  Screen,
  confirmDelete,
  useApp,
  useSafeBack,
} from './tasks';
import { colors, detailsStyles, focusStyles, scoreStyles, stepStyles } from './tasks.styles';

export function TaskDetailsScreen() {
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  const goBack = useSafeBack();
  const { tasks, deleteTask, toggleTaskDone } = useApp();

  const a = tasks.find(x => x.id === taskId);

  if (!a) {
    return (
      <Screen>
        <Pressable onPress={goBack} style={detailsStyles.notFoundBack} accessibilityRole="button" accessibilityLabel="Back">
          <BackIcon />
        </Pressable>
        <Text style={detailsStyles.notFound}>Task not found.</Text>
      </Screen>
    );
  }

  const handleDelete = () =>
    confirmDelete('Delete Task', `Delete "${a.title}"?`, 'Delete', () => {
      goBack();
      deleteTask(a.id);
    });

  return (
    <Screen>
      <View style={detailsStyles.topBar}>
        <Pressable onPress={goBack} style={detailsStyles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <BackIcon />
        </Pressable>
        <Text style={detailsStyles.topBarTitle}>Task</Text>
        <Pressable
          onPress={() => router.push(`/task/edit/${a.id}`)}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={detailsStyles.editText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        style={detailsStyles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={detailsStyles.hero}>
          <View style={detailsStyles.heroMeta}>
            {a.subject ? (
              <View style={detailsStyles.subjBadge}>
                <Text style={detailsStyles.subjBadgeText}>Subject: {a.subject}</Text>
              </View>
            ) : null}
            <PriorityBadge priority={a.priority} label={`${a.priority} priority`} />
          </View>
          <Text style={detailsStyles.heroTitle}>{a.title}</Text>
          <View style={detailsStyles.heroMeta}>
            {a.type ? (
              <View style={detailsStyles.subjBadge}>
                <Text style={detailsStyles.subjBadgeText}>{a.type}</Text>
              </View>
            ) : null}
            <DueBadge task={a} />
          </View>
          {a.repeat && a.repeat !== 'None' ? (
            <Text style={detailsStyles.heroSub}>Repeats {a.repeat.toLowerCase()}. The next one is added when you finish this.</Text>
          ) : null}
        </View>

        <Pressable
          style={[detailsStyles.doneBtn, a.done && detailsStyles.doneBtnReopen]}
          onPress={() => toggleTaskDone(a.id)}
          accessibilityRole="button"
        >
          <Text style={[detailsStyles.doneBtnText, a.done && detailsStyles.doneBtnTextReopen]}>
            {a.done ? 'Reopen task' : 'Mark as done'}
          </Text>
        </Pressable>

        {a.notes ? (
          <View style={detailsStyles.card}>
            <Text style={detailsStyles.cardTitle}>Notes</Text>
            <Text style={detailsStyles.notesText}>{a.notes}</Text>
          </View>
        ) : null}

        <StepsCard task={a} />

        {a.done ? <ScoreCard task={a} /> : null}

        <FocusTimerCard task={a} />

        <Pressable style={detailsStyles.deleteBtn} onPress={handleDelete} accessibilityRole="button">
          <Text style={detailsStyles.deleteBtnText}>Delete task</Text>
        </Pressable>

        <View style={detailsStyles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

/* ======================================================================
   STEPS CHECKLIST (break a big task into small steps)
   ====================================================================== */

function StepsCard({ task }) {
  const { addSubtask, toggleSubtask, deleteSubtask } = useApp();
  const [text, setText] = useState('');
  const steps = task.subtasks ?? [];
  const doneCount = steps.filter(s => s.done).length;
  const canAdd = text.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    addSubtask(task.id, text);
    setText('');
  };

  return (
    <View style={detailsStyles.card}>
      <View style={stepStyles.headRow}>
        <Text style={[detailsStyles.cardTitle, { marginBottom: 0 }]}>Steps</Text>
        {steps.length > 0 ? (
          <Text style={stepStyles.count}>
            {doneCount}/{steps.length} done
          </Text>
        ) : null}
      </View>

      {steps.length > 0 ? <ProgressBar value={doneCount / steps.length} /> : <Text style={stepStyles.empty}>Break this task into small steps.</Text>}

      {steps.map(step => (
        <View key={step.id} style={stepStyles.row}>
          <Checkbox checked={step.done} onPress={() => toggleSubtask(task.id, step.id)} />
          <Text style={[stepStyles.title, step.done && stepStyles.titleDone]}>{step.title}</Text>
          <Pressable
            onPress={() => deleteSubtask(task.id, step.id)}
            hitSlop={8}
            style={stepStyles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove step ${step.title}`}
          >
            <CloseIcon />
          </Pressable>
        </View>
      ))}

      <View style={stepStyles.addRow}>
        <TextInput
          style={stepStyles.input}
          placeholder="Add a step..."
          placeholderTextColor={colors.faint}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          onPress={handleAdd}
          disabled={!canAdd}
          style={[stepStyles.addBtn, !canAdd && stepStyles.addBtnDisabled]}
          accessibilityRole="button"
        >
          <Text style={stepStyles.addBtnText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ======================================================================
   SCORE (shown once the task is done - feeds the average on the Completed tab)
   ====================================================================== */

const toNumber = text => {
  const n = parseFloat(String(text).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function ScoreCard({ task }) {
  const { updateTask } = useApp();
  const [score, setScore] = useState(task.score === null || task.score === undefined ? '' : String(task.score));
  const [maxScore, setMaxScore] = useState(task.maxScore ? String(task.maxScore) : '');
  const [message, setMessage] = useState('');

  const scoreValue = toNumber(score);
  const maxValue = toNumber(maxScore);
  const canSave = scoreValue !== null && scoreValue >= 0 && maxValue !== null && maxValue > 0;
  const percent = scorePercent(task);

  const handleSave = () => {
    if (!canSave) return;
    updateTask(task.id, { score: scoreValue, maxScore: maxValue });
    setMessage('Score saved.');
  };

  const handleClear = () => {
    updateTask(task.id, { score: null, maxScore: null });
    setScore('');
    setMaxScore('');
    setMessage('Score cleared.');
  };

  return (
    <View style={detailsStyles.card}>
      <View style={stepStyles.headRow}>
        <Text style={[detailsStyles.cardTitle, { marginBottom: 0 }]}>Score</Text>
        {percent !== null ? <Text style={scoreStyles.percent}>{percent}%</Text> : null}
      </View>
      <View style={scoreStyles.row}>
        <TextInput
          style={[stepStyles.input, scoreStyles.input]}
          placeholder="Your score"
          placeholderTextColor={colors.faint}
          value={score}
          onChangeText={text => {
            setScore(text);
            setMessage('');
          }}
          keyboardType="decimal-pad"
          accessibilityLabel="Your score"
        />
        <Text style={scoreStyles.out}>out of</Text>
        <TextInput
          style={[stepStyles.input, scoreStyles.input]}
          placeholder="Total"
          placeholderTextColor={colors.faint}
          value={maxScore}
          onChangeText={text => {
            setMaxScore(text);
            setMessage('');
          }}
          keyboardType="decimal-pad"
          accessibilityLabel="Total points"
        />
      </View>
      <View style={focusStyles.buttonRow}>
        <Pressable
          style={[focusStyles.primaryBtn, !canSave && stepStyles.addBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
        >
          <Text style={focusStyles.primaryBtnText}>Save score</Text>
        </Pressable>
        {task.score !== null && task.score !== undefined ? (
          <Pressable style={focusStyles.secondaryBtn} onPress={handleClear} accessibilityRole="button">
            <Text style={focusStyles.secondaryBtnText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {message ? <Text style={focusStyles.message}>{message}</Text> : null}
    </View>
  );
}

/* ======================================================================
   FOCUS TIMER (study timer that logs minutes to THIS task)
   ====================================================================== */

const PRESETS = [15, 25, 45];
const pad = n => String(n).padStart(2, '0');

function FocusTimerCard({ task }) {
  const { logFocus } = useApp();
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  const total = minutes * 60;
  const started = remaining !== total;

  // Refs so the timer and the "leave the screen" cleanup always see the latest values.
  const endAt = useRef(0);
  const elapsed = useRef(0); // seconds studied in this session that are not logged yet
  const latest = useRef({ logFocus, taskId: task.id });
  latest.current = { logFocus, taskId: task.id };

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      elapsed.current = total - left;
      setRemaining(left);
      if (left === 0) {
        clearInterval(id);
        setRunning(false);
        latest.current.logFocus(latest.current.taskId, minutes);
        elapsed.current = 0;
        setRemaining(total);
        setMessage(`Session complete. ${minutes} min added to this task.`);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, total, minutes]);

  // Leaving the screen with time on the clock still counts the full minutes studied.
  useEffect(
    () => () => {
      const mins = Math.floor(elapsed.current / 60);
      if (mins > 0) latest.current.logFocus(latest.current.taskId, mins);
    },
    [],
  );

  const handleStartPause = () => {
    setMessage('');
    if (running) {
      setRunning(false);
      return;
    }
    endAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  const handleLogAndReset = () => {
    const mins = Math.floor(elapsed.current / 60);
    setRunning(false);
    if (mins > 0) {
      logFocus(task.id, mins);
      setMessage(`${mins} min added to this task.`);
    } else {
      setMessage('Study for at least 1 minute to log it.');
    }
    elapsed.current = 0;
    setRemaining(total);
  };

  const pickPreset = m => {
    setMinutes(m);
    setRemaining(m * 60);
    setMessage('');
  };

  return (
    <View style={detailsStyles.card}>
      <Text style={detailsStyles.cardTitle}>Focus timer</Text>
      <Text style={focusStyles.time}>
        {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
      </Text>

      <View style={focusStyles.presetRow}>
        {PRESETS.map(m => (
          <Chip
            key={m}
            label={`${m} min`}
            active={minutes === m}
            onPress={() => {
              if (!started && !running) pickPreset(m);
            }}
          />
        ))}
      </View>

      <View style={focusStyles.buttonRow}>
        <Pressable style={focusStyles.primaryBtn} onPress={handleStartPause} accessibilityRole="button">
          <Text style={focusStyles.primaryBtnText}>{running ? 'Pause' : started ? 'Resume' : 'Start'}</Text>
        </Pressable>
        {started ? (
          <Pressable style={focusStyles.secondaryBtn} onPress={handleLogAndReset} accessibilityRole="button">
            <Text style={focusStyles.secondaryBtnText}>Log and reset</Text>
          </Pressable>
        ) : null}
      </View>

      {message ? <Text style={focusStyles.message}>{message}</Text> : null}
      {task.estimateMin > 0 ? (
        <View style={focusStyles.estimate}>
          <ProgressBar value={(task.focusMinutes ?? 0) / task.estimateMin} />
          <Text style={focusStyles.total}>
            {formatMinutes(task.focusMinutes ?? 0)} of {formatMinutes(task.estimateMin)} planned
          </Text>
        </View>
      ) : (
        <Text style={focusStyles.total}>Total studied on this task: {formatMinutes(task.focusMinutes ?? 0)}</Text>
      )}
    </View>
  );
}
