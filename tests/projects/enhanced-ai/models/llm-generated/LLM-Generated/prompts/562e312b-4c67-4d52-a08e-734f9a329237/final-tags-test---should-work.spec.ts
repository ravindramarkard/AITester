import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

test.describe('Final Tags Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', Buffer.from(screenshot), 'image/png');
    }
  });

  test('Should Work', async ({ page }) => {
    try {
      // Step 1: Navigate to login page
      await page.goto(`${BASE_URL}/login`);

      // Step 2: Enter username 'test'
      const usernameInput = page.getByLabel('Username');
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.fill('test');

      // Step 3: Enter password 'test123'
      const passwordInput = page.getByLabel('Password');
      await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
      await passwordInput.fill('test123');

      // Step 4: Click login button
      const loginButton = page.getByRole('button', { name: 'Log In' });
      await loginButton.waitFor({ state: 'visible', timeout: 15000 });
      await loginButton.click();

      // Step 5: Verify success message
      const successMessage = page.getByRole('alert', { name: 'Login successful' });
      await successMessage.waitFor({ state: 'visible', timeout: 15000 });
      await expect(successMessage).toBeVisible();

      // Allure Reporting
      allure.tag('UI Test');
      allure.epic('Login Functionality');
      allure.feature('Login Page');
      allure.story('Successful Login');
      allure.description('This test verifies that a user can successfully log in with valid credentials.');
      allure.severity('critical');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});