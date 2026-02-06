// exam.js — Exam simulation engine (32 questions, real scoring & timers)

import { QuestionTimer, ExamTimer, formatTime } from './timer.js';
import { renderQuestion, highlightAnswer, renderResults, showModal, hideModal } from './ui.js';
import { saveResult } from './stats.js';

let state = null;
let lastExamCategory = null;

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

export function startExam(categoryData, meta) {
  const rules = meta.exam;
  const basic = shuffle(categoryData.questions.filter(q => q.type === 'basic'));
  const specialist = shuffle(categoryData.questions.filter(q => q.type === 'specialist'));

  const selectedBasic = basic.slice(0, rules.basicQuestions);
  const selectedSpecialist = specialist.slice(0, rules.specialistQuestions);

  // Build question list with point values
  const questions = [];
  selectedBasic.forEach((q, i) => {
    questions.push({
      question: q,
      points: rules.basicPoints[i] || 1,
      given: null,
      isCorrect: false,
    });
  });
  selectedSpecialist.forEach((q, i) => {
    questions.push({
      question: q,
      points: rules.specialistPoints[i] || 1,
      given: null,
      isCorrect: false,
    });
  });

  state = {
    category: categoryData.category,
    questions,
    currentIndex: 0,
    rules,
    questionTimer: null,
    examTimer: null,
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
    () => advanceQuestion()
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
  document.querySelector('.btn-end-exam').classList.add('visible');
  timerDisplay.classList.remove('warning', 'total-warning');
  totalTimerEl.textContent = formatTime(rules.totalTimeSeconds);

  showQuestion();
  state.examTimer.start();
}

function showQuestion() {
  if (!state || state.finished) return;
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

  // Setup answer handlers
  const answersDiv = document.querySelector('.answers');
  answersDiv.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn.dataset.answer));
  });

  // Reset and start question timer
  const timeLimit = q.type === 'basic' ? rules.basicTimeSeconds : rules.specialistTimeSeconds;
  state.questionTimer.reset(timeLimit);
  document.querySelector('.question-timer').textContent = formatTime(timeLimit);
  document.querySelector('.timer-display').classList.remove('warning');
  state.questionTimer.start();
}

function handleAnswer(answer) {
  if (!state || state.finished) return;
  const item = state.questions[state.currentIndex];
  if (item.given !== null) return; // Already answered

  item.given = answer;
  item.isCorrect = answer === item.question.correct;

  state.questionTimer.stop();

  // Brief highlight then advance
  highlightAnswer(document.querySelector('.answers'), answer, item.question.correct);
  setTimeout(() => advanceQuestion(), 600);
}

function advanceQuestion() {
  if (!state || state.finished) return;
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
  state.questionTimer.stop();
  state.examTimer.stop();

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

export function setupExamListeners() {
  // End exam button → show modal
  document.querySelector('.btn-end-exam').addEventListener('click', () => {
    if (state && !state.finished) showModal();
  });

  // Modal confirm
  document.querySelector('.btn-confirm-end').addEventListener('click', () => {
    hideModal();
    finishExam();
  });

  // Modal cancel
  document.querySelector('.btn-cancel-end').addEventListener('click', () => {
    hideModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('confirm-modal').classList.contains('active')) {
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
