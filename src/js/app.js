// app.js — Router, initialization, and event wiring

import { fetchMeta, fetchCategory } from './data.js';
import { startExam, setupExamListeners, cleanupExam, getLastExamCategory } from './exam.js';
import { startLearn, setupLearnListeners, cleanupLearn } from './learn.js';
import { showScreen, renderCategories, applyLanguage } from './ui.js';
import { setLang, getLang, loadQuestionTranslations, t } from './i18n.js';
import { downloadCategoryMedia, getDownloadedCategories } from './offline.js';

let meta = null;
let currentMode = 'learn'; // 'learn' or 'exam'
let pendingCategory = null;

// ---- Router ----
function navigate(screen) {
  window.location.hash = screen;
}

const VALID_SCREENS = new Set(['home', 'categories', 'quiz', 'results', 'zrodlo-danych']);

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'home';

  if (!VALID_SCREENS.has(hash)) {
    window.location.hash = 'home';
    return;
  }

  // Cleanup active sessions when leaving quiz
  if (hash !== 'quiz') {
    cleanupExam();
    cleanupLearn();
  }

  // If navigating to quiz with a pending category, start the session
  if (hash === 'quiz' && pendingCategory) {
    const cat = pendingCategory;
    pendingCategory = null;
    showScreen('quiz');
    launchSession(cat);
    return;
  }

  // Redirect stale quiz screen (no pending session) to categories
  if (hash === 'quiz' && !pendingCategory) {
    window.location.hash = 'categories';
    return;
  }

  if (hash === 'categories' && meta) renderCategories(meta, getDownloadedCategories());
  showScreen(hash);
}

// ---- Category & Mode Selection ----
async function launchSession(categoryId) {
  try {
    const data = await fetchCategory(categoryId);
    if (currentMode === 'exam') {
      startExam(data, meta);
    } else {
      startLearn(data);
    }
  } catch {
    window.location.hash = 'categories';
  }
}

function handleCategorySelect(categoryId) {
  pendingCategory = categoryId;
  navigate('quiz');
}

// ---- Init ----
async function init() {
  // Load metadata
  try {
    meta = await fetchMeta();
    renderCategories(meta, getDownloadedCategories());
  } catch {
    document.getElementById('app').textContent = 'Failed to load app data. Please refresh.';
    return;
  }

  // Navigation buttons (data-navigate attribute)
  document.querySelectorAll('[data-navigate]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.navigate);
    });
  });

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
    });
  });

  // Category cards
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      handleCategorySelect(card.dataset.category);
    });
  });

  // Retry button
  document.querySelector('.btn-retry')?.addEventListener('click', async () => {
    const lastCat = getLastExamCategory();
    if (lastCat) {
      pendingCategory = lastCat;
      currentMode = 'exam';
      navigate('quiz');
    }
  });

  // Theme toggle
  const savedTheme = localStorage.getItem('prawko_theme') || 'light';
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  const themeBtn = document.querySelector('.theme-btn');
  const themeIcon = themeBtn.querySelector('.theme-icon');
  if (savedTheme === 'dark') themeIcon.textContent = '☀️';
  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      themeIcon.textContent = '🌙';
      try { localStorage.setItem('prawko_theme', 'light'); } catch {}
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeIcon.textContent = '☀️';
      try { localStorage.setItem('prawko_theme', 'dark'); } catch {}
    }
  });

  // Language toggle
  const savedLang = getLang();
  if (savedLang !== 'pl') {
    setLang(savedLang);
    applyLanguage();
    await loadQuestionTranslations();
  }
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.dataset.lang === savedLang) {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setLang(lang);
      applyLanguage();
      renderCategories(meta, getDownloadedCategories());
      if (lang === 'en') await loadQuestionTranslations();
    });
  });

  // Offline download handler
  document.querySelector('.category-grid').addEventListener('click', async (e) => {
    const dlBtn = e.target.closest('.offline-btn');
    if (!dlBtn) return;
    e.stopPropagation();
    e.preventDefault();

    const catId = dlBtn.dataset.category;
    if (dlBtn.classList.contains('downloaded') || dlBtn.classList.contains('downloading')) return;

    dlBtn.classList.add('downloading');
    dlBtn.textContent = '\u2193 0%';

    try {
      await downloadCategoryMedia(catId, (done, total) => {
        const pct = Math.round((done / total) * 100);
        dlBtn.textContent = `\u2193 ${pct}%`;
      });
      dlBtn.classList.remove('downloading');
      dlBtn.classList.add('downloaded');
      dlBtn.textContent = `\u2713 ${t('savedOffline')}`;
    } catch {
      dlBtn.classList.remove('downloading');
      dlBtn.textContent = `\u2193 ${t('saveOffline')}`;
    }
  });

  // Setup exam and learn listeners
  setupExamListeners();
  setupLearnListeners();

  // Hash routing
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed:', err));
  }
}

document.addEventListener('DOMContentLoaded', init);
