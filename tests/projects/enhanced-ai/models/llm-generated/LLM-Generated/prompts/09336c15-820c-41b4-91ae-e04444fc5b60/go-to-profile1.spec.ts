import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

test.describe('UI Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await allure.tag('ui-test');
    await allure.tag('smoke');
    await page.goto(BASE_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', screenshot, 'image/png');
    }
  });

  test('Go to Profile1', async ({ page }) => {
    try {
      // Step 2: Type username into Username placeholder field
      await page.getByPlaceholder('Username').fill('piyush.safaya');

      // Step 3: Type password into Password placeholder field
      await page.getByPlaceholder('Password').fill('piyush1234');

      // Step 4: Click on Log in button
      await page.getByRole('button', { name: 'Log In' }).click();

      // Step 5: Wait for page load case list item
      await page.waitForLoadState('networkidle');

      // Step 6: Click on first pop from case list item
      await page.locator('.case-list-item').first().click();

      // Step 7: Wait for page load
      await page.waitForLoadState('networkidle');

      // Step 8: Click on hyperlink Profile from left side
      await page.getByRole('link', { name: 'Profile' }).click();

      // Step 9: Wait for page load "profile"
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*\/profile$/);

    } catch (error) {
      throw new Error(`Test failed: ${error.message}`);
    }
  });
});