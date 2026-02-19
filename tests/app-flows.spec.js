const { test, expect } = require('@playwright/test');

async function openCategories(page) {
  await page.goto('/');
  await page.waitForSelector('#home.active');
  await page.click('[data-navigate="categories"]');
  await page.waitForSelector('#categories.active');
}

async function startExamMode(page, category = 'PT') {
  await openCategories(page);
  await page.click('.mode-btn[data-mode="exam"]');
  await page.click(`.category-card[data-category="${category}"]`);
  await page.waitForSelector('.modal-overlay.active');
}

test.describe('App flow coverage', () => {
  test('stale quiz route redirects to categories', async ({ page }) => {
    await page.goto('/#quiz');
    await page.waitForSelector('#categories.active');
    await expect(page).toHaveURL(/#categories$/);
  });

  test('category search shows empty state and clear restores cards', async ({ page }) => {
    await openCategories(page);

    const input = page.locator('#category-search');
    await input.fill('not-a-real-category');

    await expect(page.locator('#category-empty-state')).toBeVisible();
    await expect(page.locator('#category-search-clear')).toBeVisible();
    await expect(page.locator('.category-grid .category-card[data-category="B"]')).toBeHidden();

    await page.click('#category-search-clear');

    await expect(input).toHaveValue('');
    await expect(page.locator('#category-empty-state')).toBeHidden();
    await expect(page.locator('.category-grid .category-card[data-category="B"]')).toBeVisible();
  });

  test('recent categories are shown in most-recent-first order', async ({ page }) => {
    await openCategories(page);

    await page.click('.category-card[data-category="B"]');
    await page.waitForSelector('#quiz.active');
    await page.click('.quiz-back');
    await page.waitForSelector('#categories.active');

    await page.click('.category-card[data-category="C"]');
    await page.waitForSelector('#quiz.active');
    await page.click('.quiz-back');
    await page.waitForSelector('#categories.active');

    const recentIds = await page.evaluate(() => JSON.parse(localStorage.getItem('prawko_recent_categories') || '[]'));
    expect(recentIds.slice(0, 2)).toEqual(['C', 'B']);

    const recentCards = page.locator('#recent-categories-row .category-card');
    await expect(recentCards).toHaveCount(2);
    await expect(recentCards.nth(0)).toHaveAttribute('data-category', 'C');
    await expect(recentCards.nth(1)).toHaveAttribute('data-category', 'B');
  });

  test('canceling exam intro returns to categories', async ({ page }) => {
    await startExamMode(page, 'PT');
    await page.click('.btn-cancel-end');
    await page.waitForSelector('#categories.active');
    await expect(page).toHaveURL(/#categories$/);
  });

  test('results retry restarts exam intro for last category', async ({ page }) => {
    await startExamMode(page, 'PT');
    await page.click('.btn-confirm-end');
    await page.waitForSelector('#quiz.active');
    await page.click('.btn-end-exam');
    await page.waitForSelector('.modal-overlay.active');
    await page.click('.btn-confirm-end');
    await page.waitForSelector('#results.active');

    await page.click('.btn-retry');
    await page.waitForSelector('.modal-overlay.active');
    await page.click('.btn-confirm-end');
    await page.waitForSelector('#quiz.active');
    await expect(page.locator('.question-text')).not.toBeEmpty();
  });
});
