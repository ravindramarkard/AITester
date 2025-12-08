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
      // Type username into Username placeholder field
      await page.getByPlaceholder('Username').fill('piyush.safaya');

      // Type password into Password placeholder field
      await page.getByPlaceholder('Password').fill('piyush1234');

      // Click on Log in button
      await page.getByRole('button', { name: 'Log In' }).click();

      // Wait for the page title to be 'Shaheen-Cases'
      await page.waitForFunction(() => document.title === 'Shaheen-Cases');

      // Wait for page load case list item
      await page.waitForSelector('.case-list-item');

      // Click on get by text "Default Case"
      await page.getByText('Default Case').click();

      // Wait for navigation bar enable
      await page.waitForSelector('.navbar');

      // Click on data-icon='user'
      await page.locator('[data-icon="user"]').click();

      // Wait for page load "profile"
      await page.waitForSelector('.profile');
    } catch (error) {
      throw new Error(`Test failed: ${error.message}`);
    }
  });
});