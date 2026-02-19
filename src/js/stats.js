// stats.js — Exam history & learning progress persistence in localStorage

const STORAGE_KEY = 'prawko_stats';
const LEARN_KEY = 'prawko_learn';
const DAY_MS = 24 * 60 * 60 * 1000;

export function saveResult(result) {
  const history = loadHistory();
  history.push({
    date: new Date().toISOString(),
    category: result.category,
    score: result.score,
    maxPoints: result.maxPoints,
    passed: result.passed,
    basicScore: result.basicScore,
    specialistScore: result.specialistScore,
  });
  // Keep last 50 results
  if (history.length > 50) history.splice(0, history.length - 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      console.warn('localStorage quota exceeded while saving exam result:', e);
    }
    return false;
  }
}

export function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(r =>
      typeof r === 'object' && r !== null &&
      typeof r.score === 'number' &&
      typeof r.category === 'string'
    );
  } catch {
    return [];
  }
}

export function getCategoryStats(category) {
  const history = loadHistory().filter(r => r.category === category);
  if (!history.length) return null;
  const passed = history.filter(r => r.passed).length;
  const lastScore = history[history.length - 1].score;
  return { attempts: history.length, passed, lastScore };
}

function normalizeLearnEntry(raw) {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const answer = typeof raw.answer === 'string' ? raw.answer : null;
    const streak = Number.isFinite(raw.streak) && raw.streak > 0
      ? Math.floor(raw.streak)
      : 0;
    const dueAt = Number.isFinite(raw.dueAt) ? raw.dueAt : null;
    return { answer, streak, dueAt };
  }
  return {
    answer: typeof raw === 'string' ? raw : null,
    streak: 0,
    dueAt: null,
  };
}

function getNextDueAt(streak) {
  const intervalDays = Math.min(30, 2 ** Math.max(0, streak - 1));
  return Date.now() + intervalDays * DAY_MS;
}

export function saveLearnAnswer(category, questionId, answer, isCorrect = null) {
  const data = loadLearnData();
  if (typeof data[category] !== 'object' || Array.isArray(data[category])) {
    // Migrate from old array format
    const oldArr = Array.isArray(data[category]) ? data[category] : [];
    data[category] = {};
    oldArr.forEach(id => { data[category][id] = null; });
  }

  const prevEntry = normalizeLearnEntry(data[category][questionId]);
  const nextEntry = {
    answer: answer || null,
    streak: prevEntry.streak,
    dueAt: prevEntry.dueAt,
  };

  if (isCorrect === true) {
    nextEntry.streak = prevEntry.streak + 1;
    nextEntry.dueAt = getNextDueAt(nextEntry.streak);
  } else if (isCorrect === false) {
    nextEntry.streak = 0;
    nextEntry.dueAt = Date.now();
  }

  data[category][questionId] = nextEntry;
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      console.warn('localStorage quota exceeded while saving learn progress:', e);
    }
    return false;
  }
}

function loadLearnData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEARN_KEY));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function getLearnProgress(category) {
  const data = loadLearnData();
  const catData = data[category];
  if (!catData) return 0;
  if (Array.isArray(catData)) return catData.length;
  return Object.keys(catData).length;
}

export function getLearnAnswered(category) {
  const data = loadLearnData();
  const catData = data[category];
  if (!catData) return new Set();
  if (Array.isArray(catData)) return new Set(catData);
  return new Set(Object.keys(catData));
}

export function clearHistory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function getLearnAnswerForQuestion(category, questionId) {
  const data = loadLearnData();
  const catData = data[category];
  if (!catData || Array.isArray(catData)) return null;
  return normalizeLearnEntry(catData[questionId]).answer;
}

export function getLearnMetaForQuestion(category, questionId) {
  const data = loadLearnData();
  const catData = data[category];
  if (!catData || Array.isArray(catData)) return null;
  const entry = normalizeLearnEntry(catData[questionId]);
  if (entry.answer === null && entry.streak === 0 && entry.dueAt === null) return null;
  return { streak: entry.streak, dueAt: entry.dueAt };
}
