import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Login Tests', () => {
  test.beforeEach(async () => {
    await allure.tag('ui-test');
    await allure.tag('login');
    await allure.tag('invalid-credentials');
  });

  test('Test invalid login', async ({ page }) => {
    try {
      await allure.step('Navigate to login page', async () => {
        await page.goto(process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
        await page.waitForLoadState('networkidle');
      });

      await allure.step('Enter invalid credentials', async () => {
        await page.getByPlaceholder('Username').waitFor({ state: 'visible', timeout: 15000 });
        await page.getByPlaceholder('Username').fill('invalid_user');
        await page.getByPlaceholder('Password').fill('invalid_password');
      });

      await allure.step('Submit login form', async () => {
        await page.getByRole('button', { name: 'Login' }).click();
      });

      await allure.step('Verify error message', async () => {
        const errorAlert = page.getByRole('alert');
        await errorAlert.waitFor({ state: 'visible', timeout: 10000 });
        await expect(errorAlert).toContainText('Invalid credentials');
      });

    } catch (error) {
      await allure.attachment('screenshot-on-failure', await page.screenshot(), 'image/png');
      throw error;
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await allure.attachment('test-failure-screenshot', await page.screenshot(), 'image/png');
    }
  });
});