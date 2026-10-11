import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'study_tracker_data';

// Makes sure every task has the V2 fields, so tasks saved by V1 still work.
function readTasks(data) {
  const list = Array.isArray(data?.tasks)
    ? data.tasks
    : Array.isArray(data?.assignments)
      ? data.assignments
      : [];
  const legacySubjects = Array.isArray(data?.subjects) ? data.subjects : [];
  return list.map(item => {
    const { subjectId, ...rest } = item;
    const legacy = legacySubjects.find(s => s.id === subjectId);
    return {
      ...rest,
      subject: typeof rest.subject === 'string' ? rest.subject : legacy?.name || legacy?.code || '',
      done: !!rest.done,
      subtasks: Array.isArray(rest.subtasks) ? rest.subtasks : [],
      focusMinutes: Number(rest.focusMinutes) || 0,
      completedAt: rest.completedAt ?? null,
      type: rest.type || 'Assignment',
      repeat: rest.repeat || 'None',
      estimateMin: Number(rest.estimateMin) > 0 ? Number(rest.estimateMin) : null,
      score: Number.isFinite(rest.score) ? rest.score : null,
      maxScore: Number(rest.maxScore) > 0 ? Number(rest.maxScore) : null,
      focusLog: rest.focusLog && typeof rest.focusLog === 'object' ? rest.focusLog : {},
      spawnedNext: !!rest.spawnedNext,
    };
  });
}

export async function loadTasks() {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return saved ? readTasks(JSON.parse(saved)) : [];
}

export function saveTasks(tasks) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks }));
}
