import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

test.describe('UI Test: Create a case with Collaborators assigned', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({ headless: HEADLESS_MODE });
    page = await context.newPage();
    await page.goto(BASE_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', screenshot, 'image/png');
    }
    await page.close();
  });

  test('Test Case: Create a case with Collaborators assigned', async () => {
    try {
      // Step 2: Type username piyush.safaya into Username placeholder field
      await page.getByPlaceholder('Username').fill('piyush.safaya');

      // Step 3: Type password piyush1234 into Password placeholder field
      await page.getByPlaceholder('Password').fill('piyush1234');

      // Step 4: Click on Log in button
      await page.getByRole('button', { name: 'Log In' }).click();

      // Step 5: Wait for page load "cases"
      await page.waitForURL('**/cases');

      // Step 6: Click on Create New Case button
      await page.getByRole('button', { name: 'Create New Case' }).click();

      // Step 7: Type test case Auto-Sept2.1 into enter case name placeholder
      await page.getByPlaceholder('Enter case name').fill('Auto-Sept2.1');

      // Step 8: Type Description "Automation Desc" into enter description placeholder
      await page.getByPlaceholder('Enter description').fill('Automation Desc');

      // Step 9: Click on placeholder "Type to search for user"
      await page.getByPlaceholder('Type to search for user').click();

      // Step 10: Enter Ravindra.markard and select from list
      await page.getByPlaceholder('Type to search for user').fill('Ravindra.markard');
      await page.waitForSelector('div[role="listbox"] div[role="option"]');
      await page.locator('div[role="listbox"] div[role="option"]').first().click();

      // Step 11: Click on Add Button
      await page.getByRole('button', { name: 'Add' }).click();

      // Step 12: Click on Save button
      await page.getByRole('button', { name: 'Save' }).click();

      // Step 13: Verify created case available in list
      await page.waitForSelector('table tbody tr');
      const caseName = await page.locator('table tbody tr').first().getByRole('cell').innerText();
      await expect(caseName).toContain('Auto-Sept2.1');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});