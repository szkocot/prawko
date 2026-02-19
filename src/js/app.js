// app.js — Router, initialization, and event wiring

import { fetchMeta, fetchCategory } from './data.js';
import { startExam, setupExamListeners, cleanupExam, getLastExamCategory, refreshExamQuestion } from './exam.js';
import { startLearn, setupLearnListeners, cleanupLearn, refreshLearnQuestion } from './learn.js';
import { showScreen, renderCategories, applyLanguage, renderHistory, showConfirmModal } from './ui.js';
import { setLang, getLang, loadQuestionTranslations, t } from './i18n.js';
import { downloadCategoryMedia, getDownloadedCategories, reconcileDownloadedCategories } from './offline.js';
import { clearHistory } from './stats.js';

let meta = null;
let currentMode = 'learn'; // 'learn' or 'exam'
let pendingCategory = null;
const RECENT_CATEGORIES_KEY = 'prawko_recent_categories';
const RECENT_CATEGORIES_LIMIT = 4;
const EXAM_SKIN_KEY = 'prawko_exam_skin';

// ---- Router ----
function navigate(screen) {
  window.location.hash = screen;
}

const VALID_SCREENS = new Set(['home', 'categories', 'quiz', 'results', 'history', 'zrodlo-danych']);

function focusCurrentScreenHeading(screenId) {
  const screen = document.getElementById(screenId);
  const heading = screen?.querySelector('h1, h2');
  if (!heading) return;
  const hadTabIndex = heading.hasAttribute('tabindex');
  if (!hadTabIndex) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
  if (!hadTabIndex) {
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  }
}

function getAvailableCategoryIds() {
  return new Set((meta?.categories || []).map(cat => cat.id));
}

function loadRecentCategories() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_CATEGORIES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecentCategories(ids) {
  try { localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(ids)); } catch {}
}

function addRecentCategory(categoryId) {
  const next = [categoryId, ...loadRecentCategories().filter(id => id !== categoryId)].slice(0, RECENT_CATEGORIES_LIMIT);
  saveRecentCategories(next);
}

function syncCategoryCardVisibility() {
  const available = getAvailableCategoryIds();
  document.querySelectorAll('.category-grid .category-card').forEach((card) => {
    card.hidden = !available.has(card.dataset.category);
  });
}

function applyCategorySearch() {
  const searchInput = document.getElementById('category-search');
  const query = (searchInput?.value || '').trim().toLowerCase();
  document.querySelectorAll('#categories .category-card').forEach((card) => {
    if (card.closest('.category-grid') && card.hidden) return;
    const text = `${card.dataset.category || ''} ${card.querySelector('.category-name')?.textContent || ''}`.toLowerCase();
    card.style.display = !query || text.includes(query) ? '' : 'none';
  });
  const recentSection = document.getElementById('recent-categories');
  const recentRow = document.getElementById('recent-categories-row');
  if (!recentSection || !recentRow) return;
  const hasVisibleRecent = [...recentRow.querySelectorAll('.category-card')].some(card => card.style.display !== 'none');
  recentSection.hidden = recentRow.children.length === 0 || !hasVisibleRecent;
}

function renderRecentCategories() {
  const recentSection = document.getElementById('recent-categories');
  const recentRow = document.getElementById('recent-categories-row');
  if (!recentSection || !recentRow) return;
  const available = getAvailableCategoryIds();
  const ids = loadRecentCategories().filter(id => available.has(id)).slice(0, RECENT_CATEGORIES_LIMIT);
  recentRow.textContent = '';
  ids.forEach((id) => {
    const sourceCard = document.querySelector(`.category-grid .category-card[data-category="${CSS.escape(id)}"]`);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-card recent-category-card';
    btn.dataset.category = id;
    const letter = document.createElement('span');
    letter.className = 'category-letter';
    letter.textContent = sourceCard?.querySelector('.category-letter')?.textContent || id;
    const name = document.createElement('span');
    name.className = 'category-name';
    name.textContent = sourceCard?.querySelector('.category-name')?.textContent || id;
    btn.append(letter, name);
    recentRow.appendChild(btn);
  });
  recentSection.hidden = ids.length === 0;
}

function applyCategoryUiTranslations() {
  const searchInput = document.getElementById('category-search');
  if (!searchInput) return;
  searchInput.placeholder = t('categoriesSearchPlaceholder');
  searchInput.setAttribute('aria-label', t('categoriesSearchLabel'));
}

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
    focusCurrentScreenHeading('quiz');
    launchSession(cat);
    return;
  }

  // Redirect stale quiz screen (no pending session) to categories
  if (hash === 'quiz' && !pendingCategory) {
    window.location.hash = 'categories';
    return;
  }

  if (hash === 'categories' && meta) {
    renderCategories(meta, getDownloadedCategories());
    syncCategoryCardVisibility();
    renderRecentCategories();
    applyCategorySearch();
  }
  if (hash === 'history') renderHistory();
  showScreen(hash);
  focusCurrentScreenHeading(hash);
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
  addRecentCategory(categoryId);
  pendingCategory = categoryId;
  navigate('quiz');
}

function updateLanguageButtons(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
}

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('prawko_theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme, themeIcon, themeBtn) {
  const isDark = theme === 'dark';
  if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  if (themeIcon) themeIcon.innerHTML = isDark ? '<use href="#icon-sun"/>' : '<use href="#icon-moon"/>';
  if (themeBtn) themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
}

function getInitialExamSkin() {
  try {
    return localStorage.getItem(EXAM_SKIN_KEY) === 'strict';
  } catch {
    return false;
  }
}

function applyExamSkin(enabled, examSkinBtn) {
  if (enabled) document.documentElement.setAttribute('data-exam-skin', 'strict');
  else document.documentElement.removeAttribute('data-exam-skin');
  if (!examSkinBtn) return;
  examSkinBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  examSkinBtn.classList.toggle('active', enabled);
  examSkinBtn.setAttribute('aria-label', enabled ? `${t('examSkin')}: on` : `${t('examSkin')}: off`);
}

function showUpdateBanner() {
  const banner = document.getElementById('update-banner');
  if (banner) banner.style.display = '';
}

// ---- Init ----
async function init() {
  // Load metadata
  const spinner = document.getElementById('home-spinner');
  try {
    meta = await fetchMeta();
    renderCategories(meta, getDownloadedCategories());
    syncCategoryCardVisibility();
    renderRecentCategories();
    reconcileDownloadedCategories()
      .then((verifiedSet) => {
        if (meta) {
          renderCategories(meta, verifiedSet);
          syncCategoryCardVisibility();
          renderRecentCategories();
          applyCategorySearch();
        }
      })
      .catch(() => {});
    if (spinner) spinner.classList.add('hidden');
  } catch {
    if (spinner) spinner.classList.add('hidden');
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
      const desc = document.getElementById('mode-description');
      if (desc) {
        const key = currentMode === 'learn' ? 'modeLearnDesc' : 'modeExamDesc';
        desc.textContent = t(key);
        desc.dataset.i18n = key;
      }
    });
  });

  // Category cards (main grid + recent row)
  document.getElementById('categories')?.addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (!card || e.target.closest('.offline-btn')) return;
    const categoryId = card.dataset.category;
    if (!categoryId) return;
    if (card.closest('.category-grid') && card.hidden) return;
    handleCategorySelect(categoryId);
  });

  document.getElementById('category-search')?.addEventListener('input', applyCategorySearch);

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
  const themeBtn = document.querySelector('.theme-btn');
  const themeIcon = themeBtn?.querySelector('.theme-icon');
  const examSkinBtn = document.querySelector('.exam-skin-btn');
  applyTheme(getInitialTheme(), themeIcon, themeBtn);
  applyExamSkin(getInitialExamSkin(), examSkinBtn);
  themeBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    applyTheme(nextTheme, themeIcon, themeBtn);
    try { localStorage.setItem('prawko_theme', nextTheme); } catch {}
  });
  examSkinBtn?.addEventListener('click', () => {
    const isEnabled = document.documentElement.getAttribute('data-exam-skin') === 'strict';
    const nextEnabled = !isEnabled;
    applyExamSkin(nextEnabled, examSkinBtn);
    try { localStorage.setItem(EXAM_SKIN_KEY, nextEnabled ? 'strict' : 'default'); } catch {}
  });

  // Language toggle
  const savedLang = getLang();
  updateLanguageButtons(savedLang);
  if (savedLang !== 'pl') {
    setLang(savedLang);
    applyLanguage();
    await loadQuestionTranslations();
  }
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      updateLanguageButtons(lang);
      setLang(lang);
      applyLanguage();
      applyExamSkin(document.documentElement.getAttribute('data-exam-skin') === 'strict', examSkinBtn);
      renderCategories(meta, getDownloadedCategories());
      syncCategoryCardVisibility();
      renderRecentCategories();
      applyCategoryUiTranslations();
      applyCategorySearch();
      if (lang === 'en') await loadQuestionTranslations();
      // Re-render current question if on quiz screen
      if (document.getElementById('quiz').classList.contains('active')) {
        refreshLearnQuestion();
        refreshExamQuestion();
      }
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
    dlBtn.style.setProperty('--dl-progress', '0');

    try {
      const result = await downloadCategoryMedia(catId, (done, total) => {
        const pct = Math.round((done / total) * 100);
        dlBtn.textContent = `\u2193 ${pct}%`;
        dlBtn.style.setProperty('--dl-progress', String(pct));
      });
      await reconcileDownloadedCategories();
      dlBtn.classList.remove('downloading');
      dlBtn.style.removeProperty('--dl-progress');
      if (result.success) {
        dlBtn.classList.add('downloaded');
        dlBtn.textContent = `\u2713 ${t('savedOffline')}`;
      } else {
        dlBtn.classList.remove('downloaded');
        dlBtn.textContent = `\u2193 ${t('saveOffline')}`;
      }
      renderCategories(meta, getDownloadedCategories());
      syncCategoryCardVisibility();
      renderRecentCategories();
      applyCategorySearch();
    } catch {
      dlBtn.classList.remove('downloading');
      dlBtn.style.removeProperty('--dl-progress');
      dlBtn.textContent = `\u2193 ${t('saveOffline')}`;
      renderCategories(meta, getDownloadedCategories());
      syncCategoryCardVisibility();
      renderRecentCategories();
      applyCategorySearch();
    }
  });

  // Clear history button — with confirmation
  document.querySelector('.btn-clear-history')?.addEventListener('click', () => {
    showConfirmModal(t('confirmClearHistory'), t('confirmClearHistoryDesc'), () => {
      clearHistory();
      renderHistory();
    });
  });

  // Setup exam and learn listeners
  setupExamListeners();
  setupLearnListeners();
  applyCategoryUiTranslations();
  renderRecentCategories();
  applyCategorySearch();

  // Hash routing
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Register service worker
  let swRegistration = null;
  let isReloadingForSw = false;
  if ('serviceWorker' in navigator) {
    swRegistration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(err => {
      console.warn('SW registration failed:', err);
      return null;
    });
    if (swRegistration?.waiting) showUpdateBanner();
    swRegistration?.addEventListener('updatefound', () => {
      const candidate = swRegistration.installing;
      if (!candidate) return;
      candidate.addEventListener('statechange', () => {
        if (candidate.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });

    // Listen for update notifications from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'APP_UPDATED' || event.data?.type === 'DATA_UPDATED') {
        showUpdateBanner();
      }
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isReloadingForSw) return;
      isReloadingForSw = true;
      location.reload();
    });
  }

  // Update banner reload
  document.getElementById('update-banner-btn')?.addEventListener('click', () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }
    location.reload();
  });

  // Offline/online indicator
  const offlineBanner = document.getElementById('offline-banner');
  function updateOnlineStatus() {
    if (offlineBanner) offlineBanner.style.display = navigator.onLine ? 'none' : '';
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Preload category data on hover
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      fetchCategory(card.dataset.category).catch(() => {});
    }, { once: true });
  });
}

document.addEventListener('DOMContentLoaded', init);
