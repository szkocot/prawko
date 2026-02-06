// ui.js — DOM rendering utilities

import { t, getLang, translateQuestion } from './i18n.js';
import { getCategoryStats, getLearnProgress } from './stats.js';
import { MEDIA_BASE } from './data.js';

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  if (screen) screen.classList.add('active');
}

export function showModal() {
  const modal = document.getElementById('confirm-modal');
  modal.classList.add('active');
  const firstBtn = modal.querySelector('button');
  if (firstBtn) firstBtn.focus();
}

export function hideModal() {
  document.getElementById('confirm-modal').classList.remove('active');
}

export function renderCategories(meta) {
  meta.categories.forEach(cat => {
    const card = document.querySelector(`.category-card[data-category="${CSS.escape(cat.id)}"]`);
    if (!card) return;
    const countEl = card.querySelector('.question-count');
    if (countEl) countEl.textContent = t('questionsCount').replace('{n}', cat.questionCount);

    // Progress info
    let progressEl = card.querySelector('.category-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.className = 'category-progress';
      card.appendChild(progressEl);
    }

    const learnDone = getLearnProgress(cat.id);
    const examStats = getCategoryStats(cat.id);
    const total = cat.questionCount;
    const percent = total > 0 ? Math.round((learnDone / total) * 100) : 0;

    progressEl.textContent = '';
    if (learnDone > 0) {
      const bar = document.createElement('div');
      bar.className = 'progress-mini';
      const fill = document.createElement('div');
      fill.className = 'progress-mini-fill';
      fill.style.width = `${percent}%`;
      bar.appendChild(fill);
      progressEl.appendChild(bar);
      const span = document.createElement('span');
      span.className = 'progress-text';
      span.textContent = `${learnDone}/${total}`;
      progressEl.appendChild(span);
    }
    if (examStats) {
      const badge = document.createElement('span');
      badge.className = `exam-badge ${examStats.passed > 0 ? 'pass' : 'fail'}`;
      badge.textContent = examStats.passed > 0 ? t('passed') : `${examStats.lastScore}/74`;
      progressEl.appendChild(badge);
    }
  });
}

export function renderQuestion(question, container) {
  const q = translateQuestion(question);
  const mediaArea = container.querySelector('.media-area');
  const questionText = container.querySelector('.question-text');
  const answersDiv = document.querySelector('.answers');

  // Stop any playing video before clearing
  const oldVideo = mediaArea.querySelector('video');
  if (oldVideo) { oldVideo.pause(); oldVideo.removeAttribute('src'); oldVideo.load(); }
  mediaArea.innerHTML = '';
  mediaArea.classList.remove('has-media');
  if (q.media) {
    mediaArea.classList.add('has-media');
    if (q.mediaType === 'video') {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = `${MEDIA_BASE}/vid/${encodeURIComponent(q.media)}`;
      mediaArea.appendChild(video);
    } else if (q.mediaType === 'image') {
      const img = document.createElement('img');
      img.src = `${MEDIA_BASE}/img/${encodeURIComponent(q.media)}`;
      img.alt = t('imgAlt');
      img.loading = 'eager';
      mediaArea.appendChild(img);
    }
  }

  // Question text
  questionText.textContent = q.q;

  // Answers
  answersDiv.innerHTML = '';
  if (q.type === 'basic') {
    answersDiv.classList.add('yn-answers');
    answersDiv.classList.remove('abc-answers');
    ['T', 'N'].forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.answer = val;
      btn.textContent = val === 'T' ? t('yes') : t('no');
      answersDiv.appendChild(btn);
    });
  } else {
    answersDiv.classList.remove('yn-answers');
    answersDiv.classList.add('abc-answers');
    ['A', 'B', 'C'].forEach(val => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.answer = val;
      const label = document.createElement('span');
      label.className = 'answer-label';
      label.textContent = val + '.';
      btn.appendChild(label);
      btn.appendChild(document.createTextNode(' ' + (q[val.toLowerCase()] || '')));
      answersDiv.appendChild(btn);
    });
  }
}

export function highlightAnswer(answersDiv, selected, correct) {
  const buttons = answersDiv.querySelectorAll('.answer-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.answer === correct) {
      btn.classList.add('correct');
    }
    if (btn.dataset.answer === selected && selected !== correct) {
      btn.classList.add('incorrect');
    }
  });
}

export function renderResults(result) {
  const scoreValue = document.querySelector('.score-value');
  const verdict = document.querySelector('.result-verdict');
  const basicScore = document.querySelector('.basic-score');
  const specialistScore = document.querySelector('.specialist-score');
  const totalScore = document.querySelector('.total-score');
  const incorrectList = document.querySelector('.incorrect-list');
  const scoreCircle = document.querySelector('.score-circle');

  scoreValue.textContent = result.score;
  basicScore.textContent = result.basicScore;
  specialistScore.textContent = result.specialistScore;
  totalScore.textContent = '';
  const strong = document.createElement('strong');
  strong.textContent = result.score;
  totalScore.appendChild(strong);

  // Score circle visual
  const percent = Math.round((result.score / result.maxPoints) * 100);
  scoreCircle.style.setProperty('--score-percent', percent);
  scoreCircle.classList.remove('pass', 'fail');
  scoreCircle.classList.add(result.passed ? 'pass' : 'fail');

  // Verdict
  verdict.textContent = result.passed ? t('passed') : t('failed');
  verdict.classList.remove('pass', 'fail');
  verdict.classList.add(result.passed ? 'pass' : 'fail');

  // Incorrect answers
  const incorrectItems = result.answers.filter(a => !a.isCorrect);
  const heading = document.createElement('h3');
  heading.textContent = `${t('incorrectAnswers')} (${incorrectItems.length})`;
  incorrectList.innerHTML = '';
  incorrectList.appendChild(heading);

  if (incorrectItems.length === 0) {
    const p = document.createElement('p');
    p.textContent = t('noIncorrect');
    incorrectList.appendChild(p);
    return;
  }

  incorrectItems.forEach(item => {
    const q = translateQuestion(item.question);
    const div = document.createElement('div');
    div.className = 'incorrect-item';
    const correctLabel = q.type === 'basic'
      ? (q.correct === 'T' ? t('yes') : t('no'))
      : `${q.correct}. ${q[q.correct.toLowerCase()] || ''}`;
    const yourLabel = item.given
      ? (q.type === 'basic'
        ? (item.given === 'T' ? t('yes') : t('no'))
        : `${item.given}. ${q[item.given.toLowerCase()] || ''}`)
      : t('noAnswer');

    const qDiv = document.createElement('div');
    qDiv.className = 'incorrect-question';
    qDiv.textContent = q.q;
    const yourDiv = document.createElement('div');
    yourDiv.className = 'incorrect-your-answer';
    yourDiv.textContent = `${t('yourAnswer')} ${yourLabel}`;
    const correctDiv = document.createElement('div');
    correctDiv.className = 'incorrect-correct-answer';
    correctDiv.textContent = `${t('correctAnswer')} ${correctLabel}`;
    div.append(qDiv, yourDiv, correctDiv);
    incorrectList.appendChild(div);
  });
}

/** Apply current language to all data-i18n elements */
export function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
