// stats.js — Exam history & learning progress persistence in localStorage

const STORAGE_KEY = 'prawko_stats';
const LEARN_KEY = 'prawko_learn';

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

export function saveLearnAnswer(category, questionId) {
  const data = loadLearnData();
  if (!Array.isArray(data[category])) data[category] = [];
  if (!data[category].includes(questionId)) {
    data[category].push(questionId);
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
  return true;
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
  return data[category]?.length || 0;
}

export function getLearnAnswered(category) {
  const data = loadLearnData();
  return new Set(data[category] || []);
}
