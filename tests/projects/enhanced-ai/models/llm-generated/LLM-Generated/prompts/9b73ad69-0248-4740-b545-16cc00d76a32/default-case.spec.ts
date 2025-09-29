import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

test.describe('Default Case', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', screenshot, 'image/png');
    }
  });

  test('Default Case', async ({ page }) => {
    try {
      // Step 2: Type username into Username placeholder field
      await page.getByPlaceholder('Username').fill('piyush.safaya');

      // Step 3: Type password into Password placeholder field
      await page.getByPlaceholder('Password').fill('piyush1234');

      // Step 4: Click on Log in button
      await page.getByRole('button', { name: 'Log In' }).click();

      // Step 5: Wait for page load "cases"
      await page.waitForURL('**/cases');

      // Step 6: Double click on Default Case where it first position card
      const defaultCaseCard = page.locator('.case-card').nth(0);
      await defaultCaseCard.waitFor({ state: 'visible', timeout: 15000 });
      await defaultCaseCard.dblclick();

      // Assertion: Verify that the default case card is double-clicked and navigates to the correct page
      await expect(page).toHaveURL(/\/cases\/\d+/);

    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});