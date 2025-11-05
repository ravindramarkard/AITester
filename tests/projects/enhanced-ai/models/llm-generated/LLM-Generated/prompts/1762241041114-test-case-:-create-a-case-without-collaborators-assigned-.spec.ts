import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const TARGET_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';

test.describe('Create a case without Collaborators assigned', () => {
  test.beforeEach(async ({ page }) => {
    await allure.tag('ui-test');
    await allure.tag('smoke');
    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', Buffer.from(screenshot), 'image/png');
    }
  });

  test('Test Case : Create a case without Collaborators assigned', async ({ page }) => {
    console.log('Step 1: Navigate to given url');
    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');

    console.log('Step 2: Type username into Username placeholder field');
    await page.getByPlaceholder('Username').fill(process.env.UI_USERNAME || 'piyush.safaya');

    console.log('Step 3: Type password into Password placeholder field');
    await page.getByPlaceholder('Password').fill(process.env.UI_PASSWORD || 'piyush1234');

    console.log('Step 4: Click on Log in button');
    await page.getByRole('button', { name: 'Log In' }).click();

    console.log('Step 5: Wait for page load "cases"');
    await page.waitForURL('**/cases');
    await page.waitForLoadState('networkidle');

    console.log('Step 6: Click on Create New Case button');
    await page.getByRole('button', { name: 'Create New Case' }).click();

    console.log('Step 7: Type test case name into enter case name placeholder');
    await page.getByPlaceholder('Enter case name').fill('Auto-Sept2');

    console.log('Step 8: Type Description into enter description placeholder');
    await page.getByPlaceholder('Enter description').fill('Automation Desc');

    console.log('Step 9: Click on Save Button');
    await page.getByRole('button', { name: 'Save' }).click();

    console.log('Step 10: Verify created case available');
    await page.waitForSelector('text=Auto-Sept2');
    await expect(page.getByText('Auto-Sept2')).toBeVisible();
  });
});