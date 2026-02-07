// learn.js — Learning mode (sequential browsing, no timer, immediate feedback)

import { renderQuestion, highlightAnswer } from './ui.js';
import { saveLearnAnswer, getLearnAnswered } from './stats.js';
import { getLang } from './i18n.js';

let state = null;

// Inject toast styles once
(function injectToastStyles() {
  if (document.getElementById('learn-toast-styles')) return;
  const style = document.createElement('style');
  style.id = 'learn-toast-styles';
  style.textContent = `
    .learn-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--bg-card);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 20px;
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      z-index: 150;
    }
    .learn-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
})();

function showResumeToast(currentIndex, total) {
  // Remove any existing toast
  const existing = document.querySelector('.learn-toast');
  if (existing) existing.remove();

  const msg = getLang() === 'en'
    ? `Resuming from question ${currentIndex + 1} of ${total}`
    : `Wznowienie od pytania ${currentIndex + 1} z ${total}`;

  const toast = document.createElement('div');
  toast.className = 'learn-toast';
  toast.textContent = msg;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);

  // Trigger visible class on next frame so transition runs
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function startLearn(categoryData) {
  const answered = getLearnAnswered(categoryData.category);
  let startIndex = 0;
  if (answered.size > 0 && answered.size < categoryData.questions.length) {
    const idx = categoryData.questions.findIndex(q => !answered.has(q.id));
    if (idx !== -1) startIndex = idx;
  }

  state = {
    category: categoryData.category,
    questions: categoryData.questions,
    currentIndex: startIndex,
    answered: false,
  };

  // Show learn nav and back button, hide exam controls
  document.querySelector('.learn-nav').classList.add('visible');
  document.querySelector('.quiz-back').classList.add('visible');
  document.querySelector('.btn-end-exam').classList.remove('visible');

  // Hide timers in learn mode
  document.querySelector('.timer-display').style.display = 'none';

  showLearnQuestion();
  updateNavButtons();

  // Show resume notification if resuming from a non-zero position
  if (startIndex > 0) {
    showResumeToast(startIndex, categoryData.questions.length);
  }
}

function showLearnQuestion() {
  if (!state) return;
  state.answered = false;
  state.givenAnswer = null;
  const q = state.questions[state.currentIndex];

  // Progress
  document.querySelector('.question-progress').textContent =
    `${state.currentIndex + 1} / ${state.questions.length}`;
  document.querySelector('.progress-fill').style.width =
    `${((state.currentIndex + 1) / state.questions.length) * 100}%`;

  renderQuestion(q, document.querySelector('.question-card'));

  // Answer handlers
  document.querySelector('.answers').querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleLearnAnswer(btn.dataset.answer));
  });
}

function handleLearnAnswer(answer) {
  if (!state || state.answered) return;
  state.answered = true;
  state.givenAnswer = answer;
  const q = state.questions[state.currentIndex];
  highlightAnswer(document.querySelector('.answers'), answer, q.correct);
  saveLearnAnswer(state.category, q.id);
}

export function setupLearnListeners() {
  document.querySelector('.btn-prev').addEventListener('click', () => {
    if (!state || state.currentIndex <= 0) return;
    state.currentIndex--;
    showLearnQuestion();
    updateNavButtons();
  });

  document.querySelector('.btn-next').addEventListener('click', () => {
    if (!state) return;
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex++;
      showLearnQuestion();
      updateNavButtons();
    }
  });
}

function updateNavButtons() {
  if (!state) return;
  document.querySelector('.btn-prev').disabled = state.currentIndex <= 0;
  document.querySelector('.btn-next').disabled = state.currentIndex >= state.questions.length - 1;
}

export function refreshLearnQuestion() {
  if (!state) return;
  const q = state.questions[state.currentIndex];
  renderQuestion(q, document.querySelector('.question-card'));
  if (state.answered && state.givenAnswer) {
    highlightAnswer(document.querySelector('.answers'), state.givenAnswer, q.correct);
  } else {
    document.querySelector('.answers').querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => handleLearnAnswer(btn.dataset.answer));
    });
  }
}

export function cleanupLearn() {
  // Stop any playing video
  const video = document.querySelector('.media-area video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  document.querySelector('.timer-display').style.display = '';
  document.querySelector('.learn-nav').classList.remove('visible');
  document.querySelector('.quiz-back').classList.remove('visible');
  state = null;
}
