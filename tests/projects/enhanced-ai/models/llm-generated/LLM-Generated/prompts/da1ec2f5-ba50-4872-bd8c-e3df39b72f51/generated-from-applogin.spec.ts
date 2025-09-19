import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

test.describe('Generated from Applogin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', Buffer.from(screenshot), 'image/png');
    }
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    try {
      // Step 1: Navigate to given URL
      await page.goto(BASE_URL);

      // Step 2: Type username into Username field
      const usernameField = page.locator('#username');
      await usernameField.waitFor({ state: 'visible', timeout: 30000 });
      await usernameField.fill('ravindra.markard');

      // Step 3: Type password into Password field
      const passwordField = page.locator('#password');
      await passwordField.waitFor({ state: 'visible', timeout: 30000 });
      await passwordField.fill('Stage1234');

      // Step 4: Click on Log in button
      const loginButton = page.locator('#kc-login');
      await loginButton.waitFor({ state: 'visible', timeout: 30000 });
      await loginButton.click();

      // Assertion: Verify successful login by checking for a specific element on the dashboard
      // Assuming there is a specific element on the dashboard after login, e.g., a heading or a link
      const dashboardElement = page.locator('.presight-logo');
      await dashboardElement.waitFor({ state: 'visible', timeout: 30000 });
      await expect(dashboardElement).toBeVisible();

      // Allure Reporting
      allure.label('suite', 'UI Test');
      allure.label('testType', 'UI Test');
      allure.description('Test to verify successful login with valid credentials');
      allure.epic('Authentication');
      allure.feature('Login Functionality');
      allure.story('Successful Login');
      allure.severity('critical');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});