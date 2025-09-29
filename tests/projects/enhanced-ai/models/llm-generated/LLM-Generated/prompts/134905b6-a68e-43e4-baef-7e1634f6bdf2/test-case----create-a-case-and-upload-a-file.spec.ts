import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const USERNAME = process.env.USERNAME || 'piyush.safaya';
const PASSWORD = process.env.PASSWORD || 'piyush1234';
const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

test.describe('Create a case and upload a file', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      allure.attachment('Screenshot', screenshot, 'image/png');
    }
  });

  test('Test Case: Create a case and upload a file', async ({ page }) => {
    try {
      // Step 2: Type username into Username placeholder field
      await page.getByPlaceholder('Username').fill(USERNAME);

      // Step 3: Type password into Password placeholder field
      await page.getByPlaceholder('Password').fill(PASSWORD);

      // Step 4: Click on Log in button
      await page.getByRole('button', { name: 'Log In' }).click();

      // Step 5: Wait for page load "cases"
      await page.waitForURL('**/cases');

      // Step 6: Click on Create New Case button
      await page.getByRole('button', { name: 'Create New Case' }).click();

      // Step 7: Type test case name into enter case name placeholder
      await page.getByPlaceholder('Enter case name').fill('Auto-Sept2');

      // Step 8: Type Description into enter description placeholder
      await page.getByPlaceholder('Enter description').fill('Automation Desc');

      // Step 9: Click on Save Button
      await page.getByRole('button', { name: 'Save' }).click();

      // Step 10: Verify created case available in list
      await page.waitForSelector('text=Auto-Sept2');
      await expect(page.locator('text=Auto-Sept2')).toBeVisible();

      // Step 11: Double click on has text with “Auto-Sept2” and it second position
      await page.locator('text=Auto-Sept2').nth(2).dblclick();

      // Step 12: Double click on has text with “Class”
      await page.locator('text=Class').dblclick();

      // Step 13: Click on Upload button
      await page.getByRole('button', { name: 'Upload' }).click();

      // Step 14: Upload a file from specified path
      await page.setInputFiles('input[type="file"]', '/Users/ravindra.markard/Downloads/flight.jpeg');

      // Step 15: Click on upload button
      await page.getByRole('button', { name: 'Upload' }).click();

      // Additional wait to ensure file is uploaded
      await page.waitForTimeout(5000); // Adjust timeout as necessary

    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});