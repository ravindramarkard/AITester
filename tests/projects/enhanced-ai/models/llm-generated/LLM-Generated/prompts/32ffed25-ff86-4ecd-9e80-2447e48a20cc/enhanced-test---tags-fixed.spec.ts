import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

test.describe('Enhanced Test - Tags Fixed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', screenshot, 'image/png');
    }
  });

  test('should navigate to login page, enter credentials, and verify dashboard is displayed', async ({ page }) => {
    try {
      // Step 1: Navigate to login page
      await page.goto(`${BASE_URL}/login`);

      // Step 2: Enter username 'admin'
      const usernameInput = page.getByLabel('Username');
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.fill('admin');

      // Step 3: Enter password 'admin123'
      const passwordInput = page.getByLabel('Password');
      await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
      await passwordInput.fill('admin123');

      // Step 4: Click login button
      const loginButton = page.getByRole('button', { name: 'Log In' });
      await loginButton.waitFor({ state: 'visible', timeout: 15000 });
      await loginButton.click();

      // Step 5: Verify dashboard is displayed
      const dashboardHeading = page.getByRole('heading', { name: 'Welcome to Dashboard' });
      await dashboardHeading.waitFor({ state: 'visible', timeout: 30000 });
      await expect(dashboardHeading).toBeVisible();

      // Allure Reporting
      allure.tag('UI Test');
      allure.epic('Login Functionality');
      allure.feature('Login Page');
      allure.story('Successful Login');
      allure.description('This test verifies that a user can log in with valid credentials and access the dashboard.');
      allure.severity('critical');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});