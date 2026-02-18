const { test, expect } = require('@playwright/test');

// Helper: navigate to categories and start learn mode for category B
async function startLearnMode(page) {
  await page.goto('/');
  await page.waitForSelector('#home.active');
  await page.click('[data-navigate="categories"]');
  await page.waitForSelector('#categories.active');
  // Ensure "Nauka" mode is selected (default)
  await page.click('.mode-btn[data-mode="learn"]');
  await page.click('.category-card[data-category="B"]');
  await page.waitForSelector('#quiz.active');
}

// Helper: navigate to categories and start exam mode for category PT (smallest)
async function startExamMode(page) {
  await page.goto('/');
  await page.waitForSelector('#home.active');
  await page.click('[data-navigate="categories"]');
  await page.waitForSelector('#categories.active');
  await page.click('.mode-btn[data-mode="exam"]');
  await page.click('.category-card[data-category="PT"]');
  await page.waitForSelector('#quiz.active');
}

test.describe('Results screen back button', () => {

  test('results header has back-to-categories button', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#home.active');

    // Check the button exists in the HTML
    const backBtn = page.locator('#results .screen-header .btn-back');
    await expect(backBtn).toHaveAttribute('data-navigate', 'categories');
    await expect(backBtn).toHaveAttribute('data-i18n', 'backToCategories');
  });

  test('results back button navigates to categories', async ({ page }) => {
    // Start an exam and finish it quickly by clicking through all questions
    await startExamMode(page);

    // Wait for first question, then end exam via the end button + confirm
    await page.waitForSelector('.question-text:not(:empty)');
    await page.click('.btn-end-exam');
    await page.waitForSelector('.modal-overlay.active');
    await page.click('.btn-confirm-end');
    await page.waitForSelector('#results.active');

    // Click the back button in the results header
    const backBtn = page.locator('#results .screen-header .btn-back');
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await page.waitForSelector('#categories.active');
  });
});

test.describe('Quiz back button (learn mode only)', () => {

  test('quiz-back button is visible in learn mode', async ({ page }) => {
    await startLearnMode(page);
    const quizBack = page.locator('.quiz-back');
    await expect(quizBack).toBeVisible();
  });

  test('quiz-back button is hidden in exam mode', async ({ page }) => {
    await startExamMode(page);
    const quizBack = page.locator('.quiz-back');
    await expect(quizBack).not.toBeVisible();
  });

  test('quiz-back button navigates to categories', async ({ page }) => {
    await startLearnMode(page);
    await page.click('.quiz-back');
    await page.waitForSelector('#categories.active');
  });
});

test.describe('Video autoplay', () => {

  test('video elements have muted and autoplay attributes', async ({ page }) => {
    await startLearnMode(page);

    // Find a question with video by navigating through questions
    // We'll check by evaluating the renderQuestion logic - look for any video element
    const hasVideo = await page.evaluate(() => {
      const video = document.querySelector('.media-area video');
      return video ? { muted: video.muted, autoplay: video.autoplay } : null;
    });

    if (hasVideo) {
      expect(hasVideo.muted).toBe(true);
      expect(hasVideo.autoplay).toBe(true);
    } else {
      // No video on first question - verify the attributes are set in the source code
      // by checking that the renderQuestion function sets them
      const uiSource = await page.evaluate(async () => {
        const resp = await fetch('/js/ui.js');
        return resp.text();
      });
      expect(uiSource).toContain('video.muted = true');
      expect(uiSource).toContain('video.autoplay = true');
    }
  });
});

test.describe('Language switch during quiz', () => {
  test('language switch updates html lang and radio state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#home.active');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.locator('.lang-btn[data-lang="pl"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-checked', 'false');

    await page.click('.lang-btn[data-lang="en"]');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.lang-btn[data-lang="pl"]')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-checked', 'true');
  });

  test('switching language updates question text in learn mode', async ({ page }) => {
    await startLearnMode(page);

    // Get the Polish question text
    const questionTextPl = await page.textContent('.question-text');
    expect(questionTextPl.length).toBeGreaterThan(0);

    // Switch to English
    await page.click('.lang-btn[data-lang="en"]');
    // Wait for translations to load
    await page.waitForTimeout(500);

    // Get the English question text
    const questionTextEn = await page.textContent('.question-text');
    expect(questionTextEn.length).toBeGreaterThan(0);

    // The text should have changed (translation applied)
    expect(questionTextEn).not.toBe(questionTextPl);
  });

  test('switching language updates answer buttons in learn mode', async ({ page }) => {
    await startLearnMode(page);

    // Get Polish answer text (TAK/NIE for basic questions)
    const answersPl = await page.evaluate(() =>
      [...document.querySelectorAll('.answer-btn')].map(b => b.textContent.trim())
    );

    // Switch to English
    await page.click('.lang-btn[data-lang="en"]');
    await page.waitForTimeout(500);

    const answersEn = await page.evaluate(() =>
      [...document.querySelectorAll('.answer-btn')].map(b => b.textContent.trim())
    );

    // For basic questions: TAK/NIE → YES/NO
    // For specialist: answer text should be translated
    expect(answersEn).not.toEqual(answersPl);
  });

  test('switching language preserves answer highlight in learn mode', async ({ page }) => {
    await startLearnMode(page);

    // Answer the question
    await page.click('.answer-btn:first-child');
    await page.waitForTimeout(200);

    // Verify a highlight exists (correct or incorrect class)
    const hasHighlight = await page.evaluate(() => {
      const btns = document.querySelectorAll('.answer-btn');
      return [...btns].some(b => b.classList.contains('correct') || b.classList.contains('incorrect'));
    });
    expect(hasHighlight).toBe(true);

    // Switch to English
    await page.click('.lang-btn[data-lang="en"]');
    await page.waitForTimeout(500);

    // Highlight should still be present
    const hasHighlightAfter = await page.evaluate(() => {
      const btns = document.querySelectorAll('.answer-btn');
      return [...btns].some(b => b.classList.contains('correct') || b.classList.contains('incorrect'));
    });
    expect(hasHighlightAfter).toBe(true);
  });

  test('switching language updates UI labels on quiz screen', async ({ page }) => {
    await startLearnMode(page);

    // Check that data-i18n elements update (e.g., nav buttons)
    const prevPl = await page.textContent('.btn-prev');
    expect(prevPl).toBe('Poprzednie');

    await page.click('.lang-btn[data-lang="en"]');
    await page.waitForTimeout(500);

    const prevEn = await page.textContent('.btn-prev');
    expect(prevEn).toBe('Previous');
  });

  test('switching language updates question text in exam mode', async ({ page }) => {
    await startExamMode(page);

    const questionTextPl = await page.textContent('.question-text');
    expect(questionTextPl.length).toBeGreaterThan(0);

    // Switch to English
    await page.click('.lang-btn[data-lang="en"]');
    await page.waitForTimeout(500);

    const questionTextEn = await page.textContent('.question-text');
    expect(questionTextEn.length).toBeGreaterThan(0);
    expect(questionTextEn).not.toBe(questionTextPl);
  });
});
