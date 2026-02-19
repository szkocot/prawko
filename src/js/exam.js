// exam.js — Exam simulation engine (32 questions, real scoring & timers)

import { QuestionTimer, ExamTimer, formatTime } from './timer.js';
import { renderQuestion, highlightAnswer, renderResults, showConfirmModal, confirmModalAction, hideModal, preloadMedia } from './ui.js';
import { saveResult } from './stats.js';
import { t } from './i18n.js';

let state = null;
let lastExamCategory = null;
let answerDelegateHandler = null;
let keydownHandler = null;
let beforeUnloadHandler = null;
let pendingAdvanceTimeout = null;

const ANSWER_ADVANCE_DELAY_MS = 600;

export function getLastExamCategory() { return lastExamCategory; }

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function removeAnswerDelegate() {
  if (answerDelegateHandler) {
    const answersContainer = document.querySelector('.answers');
    if (answersContainer) {
      answersContainer.removeEventListener('click', answerDelegateHandler);
    }
    answerDelegateHandler = null;
  }
}

function clearPendingAdvance() {
  if (!pendingAdvanceTimeout) return;
  clearTimeout(pendingAdvanceTimeout);
  pendingAdvanceTimeout = null;
}

function queueAdvance(delayMs = ANSWER_ADVANCE_DELAY_MS) {
  clearPendingAdvance();
  pendingAdvanceTimeout = window.setTimeout(() => {
    pendingAdvanceTimeout = null;
    advanceQuestion();
  }, delayMs);
}

function isActiveExam() {
  return Boolean(state && state.started && !state.finished);
}

function setupBeforeUnloadWarning() {
  if (beforeUnloadHandler) return;
  beforeUnloadHandler = (event) => {
    if (!isActiveExam()) return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);
}

function teardownBeforeUnloadWarning() {
  if (!beforeUnloadHandler) return;
  window.removeEventListener('beforeunload', beforeUnloadHandler);
  beforeUnloadHandler = null;
}

function disableAnswerButtons() {
  document.querySelector('.answers')?.querySelectorAll('.answer-btn').forEach((btn) => {
    btn.disabled = true;
  });
}

function lockCurrentQuestion({ answer = null, timedOut = false } = {}) {
  if (!state || state.finished || !state.started) return false;
  const item = state.questions[state.currentIndex];
  if (!item || item.locked) return false;

  item.locked = true;
  item.timedOut = timedOut;

  if (answer !== null) {
    item.given = answer;
    item.isCorrect = answer === item.question.correct;
  }

  state.questionTimer.stop();
  disableAnswerButtons();
  return true;
}

function cancelExamIntroIfPending() {
  if (!state || state.finished || state.started || !state.introPending) return false;
  cleanupExam();
  window.location.hash = 'categories';
  return true;
}

function showExamIntroNotice() {
  if (!state || state.finished) return;
  state.introPending = true;
  const introDesc = `${t('examIntroDesc')} ${t('modeExamDesc')}.`;
  showConfirmModal(
    t('examIntroTitle'),
    introDesc,
    () => {
      if (!state || state.finished) return;
      state.introPending = false;
      state.started = true;
      document.querySelector('.btn-end-exam').classList.add('visible');
      setupBeforeUnloadWarning();
      showQuestion();
      state.examTimer.start();
    },
    {
      confirmLabel: t('examIntroStart'),
      cancelLabel: t('examIntroCancel'),
      confirmVariant: 'secondary',
    }
  );
}

export function startExam(categoryData, meta) {
  const rules = {
    ...meta.exam,
    basicPoints: [...meta.exam.basicPoints],
    specialistPoints: [...meta.exam.specialistPoints],
  };
  const basic = shuffle(categoryData.questions.filter(q => q.type === 'basic'));
  const specialist = shuffle(categoryData.questions.filter(q => q.type === 'specialist'));

  const selectedBasic = basic.slice(0, rules.basicQuestions);
  const selectedSpecialist = specialist.slice(0, rules.specialistQuestions);

  // Validate question counts and scale rules if needed
  const originalMaxPoints = rules.maxPoints;
  if (selectedBasic.length < rules.basicQuestions) {
    console.warn(`Exam: expected ${rules.basicQuestions} basic questions but only ${selectedBasic.length} available. Scaling rules proportionally.`);
    rules.basicQuestions = selectedBasic.length;
    rules.basicPoints = rules.basicPoints.slice(0, selectedBasic.length);
  }
  if (selectedSpecialist.length < rules.specialistQuestions) {
    console.warn(`Exam: expected ${rules.specialistQuestions} specialist questions but only ${selectedSpecialist.length} available. Scaling rules proportionally.`);
    rules.specialistQuestions = selectedSpecialist.length;
    rules.specialistPoints = rules.specialistPoints.slice(0, selectedSpecialist.length);
  }
  const newMaxPoints = rules.basicPoints.reduce((s, p) => s + p, 0)
    + rules.specialistPoints.reduce((s, p) => s + p, 0);
  if (newMaxPoints < originalMaxPoints) {
    rules.maxPoints = newMaxPoints;
    rules.passThreshold = Math.round(rules.passThreshold * (newMaxPoints / originalMaxPoints));
  }

  // Build question list with point values
  const questions = [];
  selectedBasic.forEach((q, i) => {
    questions.push({
      question: q,
      points: rules.basicPoints[i] || 1,
      given: null,
      isCorrect: false,
      locked: false,
      timedOut: false,
    });
  });
  selectedSpecialist.forEach((q, i) => {
    questions.push({
      question: q,
      points: rules.specialistPoints[i] || 1,
      given: null,
      isCorrect: false,
      locked: false,
      timedOut: false,
    });
  });

  state = {
    category: categoryData.category,
    questions,
    currentIndex: 0,
    rules,
    questionTimer: null,
    examTimer: null,
    started: false,
    introPending: false,
    finished: false,
  };

  // Setup timers
  const timerDisplay = document.querySelector('.timer-display');
  const questionTimerEl = document.querySelector('.question-timer');
  const totalTimerEl = document.querySelector('.total-timer');

  state.questionTimer = new QuestionTimer(
    rules.basicTimeSeconds,
    (remaining) => {
      questionTimerEl.textContent = formatTime(remaining);
      timerDisplay.classList.toggle('warning', remaining <= 5);
    },
    () => {
      if (!lockCurrentQuestion({ timedOut: true })) return;
      queueAdvance();
    }
  );

  state.examTimer = new ExamTimer(
    rules.totalTimeSeconds,
    (remaining) => {
      totalTimerEl.textContent = formatTime(remaining);
      timerDisplay.classList.toggle('total-warning', remaining <= 120);
    },
    () => finishExam()
  );

  // Setup quiz UI for exam mode
  document.querySelector('.learn-nav').classList.remove('visible');
  document.querySelector('.quiz-back').classList.remove('visible');
  document.querySelector('.btn-end-exam').classList.remove('visible');
  timerDisplay.classList.remove('warning', 'total-warning');
  totalTimerEl.textContent = formatTime(rules.totalTimeSeconds);

  // Setup delegated answer handler (one listener for all questions)
  removeAnswerDelegate();
  const answersContainer = document.querySelector('.answers');
  answerDelegateHandler = (e) => {
    const btn = e.target.closest('.answer-btn');
    if (btn && answersContainer.contains(btn)) {
      handleAnswer(btn.dataset.answer);
    }
  };
  answersContainer.addEventListener('click', answerDelegateHandler);

  // Keyboard shortcuts
  if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
  keydownHandler = (e) => {
    if (document.getElementById('confirm-modal')?.classList.contains('active')) return;
    if (!state || state.finished) return;
    if (!state.started) return;
    const item = state.questions[state.currentIndex];
    if (item.given !== null || item.locked) return;
    const key = e.key.toLowerCase();
    const answersDiv = document.querySelector('.answers');
    const isBasic = answersDiv?.classList.contains('yn-answers');

    if (isBasic) {
      if (key === 't' || key === '1') { e.preventDefault(); handleAnswer('T'); }
      else if (key === 'n' || key === '2') { e.preventDefault(); handleAnswer('N'); }
    } else {
      if (key === '1') { e.preventDefault(); handleAnswer('A'); }
      else if (key === '2') { e.preventDefault(); handleAnswer('B'); }
      else if (key === '3') { e.preventDefault(); handleAnswer('C'); }
    }
  };
  document.addEventListener('keydown', keydownHandler);

  showExamIntroNotice();
}

function showQuestion() {
  if (!state || state.finished || !state.started) return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const { questions, currentIndex, rules } = state;
  const item = questions[currentIndex];
  const q = item.question;

  // Progress
  document.querySelector('.question-progress').textContent =
    `${currentIndex + 1} / ${questions.length}`;
  const progressFill = document.querySelector('.progress-fill');
  progressFill.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;

  // Render question
  renderQuestion(q, document.querySelector('.question-card'));

  // Reset and start question timer
  const timeLimit = q.type === 'basic' ? rules.basicTimeSeconds : rules.specialistTimeSeconds;
  state.questionTimer.reset(timeLimit);
  document.querySelector('.question-timer').textContent = formatTime(timeLimit);
  document.querySelector('.timer-display').classList.remove('warning');
  state.questionTimer.start();

  // Preload next question's media
  const nextItem = questions[currentIndex + 1];
  if (nextItem) preloadMedia(nextItem.question);
}

function handleAnswer(answer) {
  if (!lockCurrentQuestion({ answer })) return;
  const item = state.questions[state.currentIndex];

  // Brief highlight then advance
  highlightAnswer(document.querySelector('.answers'), answer, item.question.correct);
  queueAdvance();
}

function advanceQuestion() {
  if (!state || state.finished || !state.started) return;
  state.currentIndex++;
  if (state.currentIndex >= state.questions.length) {
    finishExam();
  } else {
    showQuestion();
  }
}

function finishExam() {
  if (!state || state.finished) return;
  state.finished = true;
  state.introPending = false;
  state.questionTimer.stop();
  state.examTimer.stop();
  clearPendingAdvance();
  teardownBeforeUnloadWarning();
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  removeAnswerDelegate();

  const basicAnswers = state.questions.filter(a => a.question.type === 'basic');
  const specialistAnswers = state.questions.filter(a => a.question.type === 'specialist');

  const basicScore = basicAnswers.reduce((sum, a) => sum + (a.isCorrect ? a.points : 0), 0);
  const specialistScore = specialistAnswers.reduce((sum, a) => sum + (a.isCorrect ? a.points : 0), 0);
  const score = basicScore + specialistScore;

  const result = {
    category: state.category,
    score,
    maxPoints: state.rules.maxPoints,
    passed: score >= state.rules.passThreshold,
    basicScore,
    specialistScore,
    answers: state.questions,
  };

  saveResult(result);
  renderResults(result);

  // Store for retry
  lastExamCategory = state.category;

  // Navigate to results via hash
  window.location.hash = 'results';
}

export function refreshExamQuestion() {
  if (!state || state.finished) return;
  const item = state.questions[state.currentIndex];
  renderQuestion(item.question, document.querySelector('.question-card'));
  if (item.given !== null) {
    highlightAnswer(document.querySelector('.answers'), item.given, item.question.correct);
  }
}

export function setupExamListeners() {
  // End exam button → show modal
  document.querySelector('.btn-end-exam').addEventListener('click', () => {
    if (!state || state.finished) return;
    if (!state.started) {
      cancelExamIntroIfPending();
      return;
    }
    showConfirmModal(
      t('confirmExit'),
      t('confirmExitDesc'),
      () => finishExam(),
      {
        confirmLabel: t('confirmNoFinish'),
        cancelLabel: t('confirmYesContinue'),
        confirmVariant: 'danger',
      }
    );
  });

  // Modal confirm — call generic stored callback
  document.querySelector('.btn-confirm-end').addEventListener('click', () => {
    confirmModalAction();
  });

  // Modal cancel
  document.querySelector('.btn-cancel-end').addEventListener('click', () => {
    if (cancelExamIntroIfPending()) return;
    hideModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('confirm-modal').classList.contains('active')) {
      if (cancelExamIntroIfPending()) return;
      hideModal();
    }
  });

  // Focus trap in modal
  document.getElementById('confirm-modal').addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const buttons = document.getElementById('confirm-modal').querySelectorAll('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

export function cleanupExam() {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  clearPendingAdvance();
  teardownBeforeUnloadWarning();
  removeAnswerDelegate();
  if (state) {
    state.questionTimer?.stop();
    state.examTimer?.stop();
    state = null;
  }
  // Stop any playing video
  const video = document.querySelector('.media-area video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  document.querySelector('.btn-end-exam').classList.remove('visible');
  document.querySelector('.timer-display').classList.remove('warning', 'total-warning');
  hideModal();
}
