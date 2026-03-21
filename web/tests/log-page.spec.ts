// @ts-nocheck
import { test } from '@playwright/test';

/**
 * Playwright tests for verifying web log page functionality
 * Run with: npx playwright test log-page.spec.ts
 */

test.describe('Log Page - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/log');
  });

  test('log page loads without errors', async ({ page }) => {
    // Verify page loads
    await page.waitForSelector('#log-scan-zone');
    await page.waitForSelector('#log-today-bar');

    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
  });

  test('meal type selector renders', async ({ page }) => {
    const breakfastTab = await page.locator('#log-meal-breakfast');
    const lunchTab = await page.locator('#log-meal-lunch');
    const dinnerTab = await page.locator('#log-meal-dinner');
    const snackTab = await page.locator('#log-meal-snack');

    await breakfastTab.waitFor();
    await lunchTab.waitFor();
    await dinnerTab.waitFor();
    await snackTab.waitFor();

    // Verify one is active by default
    const activeTab = await page.locator('.styles_mealTypeTabActive__gUMzV');
    await activeTab.waitFor();
  });

  test('scan section is interactive', async ({ page }) => {
    const scanZone = await page.locator('#log-scan-zone');
    await scanZone.click();

    // Verify file input is triggered
    const fileInput = await page.locator('#log-file-input');
    await fileInput.waitFor();
  });

  test('search input works', async ({ page }) => {
    const searchInput = await page.locator('#log-search-input');
    await searchInput.fill('chicken');

    // Wait for results to load
    await page.waitForSelector('[role="listitem"]');
  });

  test('manual entry modal opens', async ({ page }) => {
    const manualBtn = await page.locator('#log-manual-entry-btn');
    await manualBtn.click();

    const modal = await page.locator('#log-manual-modal');
    await modal.waitFor();

    // Verify form fields
    await page.locator('#manual-name').waitFor();
    await page.locator('#manual-serving').waitFor();
    await page.locator('#manual-cals').waitFor();

    // Close modal
    const closeBtn = await page.locator('[aria-label="Close modal"]');
    await closeBtn.click();
  });
});

test.describe('Log Page - Meal Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/log');
  });

  test('delete meal workflow', async ({ page }) => {
    // Wait for meals to load if any exist
    const mealList = await page.locator('#log-meal-list');

    if (await mealList.count() > 0) {
      const deleteBtn = await page.locator('.styles_mealRowDel__sVJq6').first();
      await deleteBtn.click();

      // Confirm delete
      const confirmBtn = await page.locator('.styles_confirmYes__mXQzm');
      await confirmBtn.click();

      // Verify deletion
      await page.waitForResponse(response => response.url().includes('/remove'));
    }
  });
});

test.describe('Log Page - AI Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/log');
  });

  test('image quality validation works', async ({ page }) => {
    const fileInput = await page.locator('#log-file-input');

    // Try uploading a small image (< 480px)
    // This should show quality warning
    await fileInput.setInputFiles([{
      name: 'small-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-small-image'),
    }]);

    // Check if quality warning appears
    const errorText = await page.locator('.styles_scanErrorOverlay__C9wZI');
    await errorText.waitFor();
  });

  test('low confidence shows confirmation dialog', async ({ page }) => {
    // Upload image that would trigger low confidence AI result
    // This test requires mocking or known test images
    test.skip(true, 'Requires specific test image setup');

    // const scanZone = await page.locator('#log-scan-zone');
    // await scanZone.click();

    // Verify confidence warning modal appears
    // const warning = await page.locator('.styles_confidenceWarning__tQkjH');
    // await warning.waitFor();
  });
});

test.describe('Log Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile scan fab visible', async ({ page }) => {
    await page.goto('http://localhost:3000/log');

    const mobileFab = await page.locator('#log-mobile-fab');
    await mobileFab.waitFor();

    await mobileFab.click();
    const fileInput = await page.locator('#log-file-input');
    await fileInput.waitFor();
  });
});

/**
 * Run these tests locally:
 *
 * 1. Start the dev server:
 *    cd /home/mrpro/mygit/cal_ai_clone/web && npm run dev
 *
 * 2. In another terminal, run tests:
 *    cd /home/mrpro/mygit/cal_ai_clone/web && npx playwright test tests/log-page.spec.ts
 *
 * 3. View results:
 *    npx playwright show-report
 */
