import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe.configure({ mode: 'parallel' });

test.beforeEach(async ({ page }, testInfo) => {
  await allure.tag('ui-test');
  await allure.tag('login-tests');
  await allure.tag('smoke');
  await page.goto(process.env.BASE_URL!);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.close();
});

test.describe('Automatic test cases', () => {
  test('Successful login with valid credentials', async ({ page }) => {
    try {
      await allure.step('Enter username', async () => {
        await page.locator('#username').fill('student');
      });

      await allure.step('Enter password', async () => {
        await page.locator('#password').fill('Password123');
      });

      await allure.step('Submit login form', async () => {
        await page.locator('#submit').click();
      });

      await allure.step('Verify successful login', async () => {
        await expect(page).toHaveURL(/logged-in-successfully/);
        await expect(page.getByRole('heading', { name: 'Logged In Successfully' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Log out' })).toBeVisible();
      });

      await allure.attachment('success-login-screenshot', await page.screenshot(), {
        contentType: 'image/png'
      });
    } catch (error) {
      await allure.attachment('error-screenshot', await page.screenshot(), {
        contentType: 'image/png'
      });
      throw error;
    }
  });

  test('Login with invalid username', async ({ page }) => {
    try {
      await allure.step('Enter invalid username', async () => {
        await page.locator('#username').fill('invalid_user');
      });

      await allure.step('Enter valid password', async () => {
        await page.locator('#password').fill('Password123');
      });

      await allure.step('Submit login form', async () => {
        await page.locator('#submit').click();
      });

      await allure.step('Verify error message', async () => {
        await expect(page.locator('#error')).toBeVisible();
        await expect(page.locator('#error')).toContainText('Your username is invalid!');
      });

      await allure.attachment('invalid-username-screenshot', await page.screenshot(), {
        contentType: 'image/png'
      });
    } catch (error) {
      await allure.attachment('error-screenshot', await page.screenshot(), {
        contentType: 'image/png'
      });
      throw error;
    }
  });

  test('Login with invalid password', async ({ page }) => {
    try {
      await allure.step('Enter valid username', async () => {
        await page.locator('#username').fill('student');
      });

      await allure.step('Enter invalid password', async () => {
        await page.locator('#password').fill('wrongpassword');
      });

      await allure.step('Submit login form', async () => {
        await page.locator('#submit').click();
      });

      await allure.step('Verify error message', async () => {
        await expect(page.locator('#error')).toBeVisible();
        await expect(page.locator('#error')).toContainText('Your password is invalid!');
      });

      await allure.attachment('invalid-password-screenshot', await page.screenshot(), {
        contentType: 'image/png'
      });
    } catch (error) {
      await allure.attachment('error-screenshot', await page.screenshot(), {
        contentType: 'image/png'
      });
      throw error;
    }
  });
});