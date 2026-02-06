// learn.js — Learning mode (sequential browsing, no timer, immediate feedback)

import { renderQuestion, highlightAnswer } from './ui.js';
import { saveLearnAnswer, getLearnAnswered } from './stats.js';

let state = null;

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

  // Show learn nav, hide exam controls
  document.querySelector('.learn-nav').classList.add('visible');
  document.querySelector('.btn-end-exam').classList.remove('visible');

  // Hide timers in learn mode
  document.querySelector('.timer-display').style.display = 'none';

  showLearnQuestion();
  updateNavButtons();
}

function showLearnQuestion() {
  if (!state) return;
  state.answered = false;
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

export function cleanupLearn() {
  // Stop any playing video
  const video = document.querySelector('.media-area video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  document.querySelector('.timer-display').style.display = '';
  document.querySelector('.learn-nav').classList.remove('visible');
  state = null;
}
