import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

const TARGET_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';

test.describe('Create a case without Collaborators assigned', () => {
  test.beforeEach(async ({ page }) => {
    await allure.tag('ui-test');
    await allure.tag('smoke');
  });

  test('Test Case : Create a case without Collaborators assigned', async ({ page }) => {
    try {
      console.log('1. Navigate to given url');
      await page.goto(TARGET_URL);
      await page.waitForLoadState('networkidle');

      console.log('2. Type username piyush.safaya into Username placeholder field');
      await page.getByPlaceholder('Username').fill(process.env.UI_USERNAME || 'piyush.safaya');

      console.log('3. Type password piyush1234 into Password placeholder field');
      await page.getByPlaceholder('Password').fill(process.env.UI_PASSWORD || 'piyush1234');

      console.log('4. Click on Log in button');
      await page.getByRole('button', { name: 'Log In' }).click();

      console.log('5. Wait for spinner disappear');
      await page.waitForSelector('#spinner', { state: 'detached', timeout: 30000 });

      console.log('6. Wait for page load "cases"');
      await page.waitForSelector('text=cases', { timeout: 30000 });

      console.log('7. Click on Create New Case button');
      await page.getByRole('button', { name: 'Create New Case' }).click();

      console.log('8. Type test case Auto-Sept2 into enter case name placeholder');
      await page.getByPlaceholder('Enter case name').fill('Auto-Sept2');

      console.log('9. Type Description "Automation Desc" into enter description placeholder');
      await page.getByPlaceholder('Enter description').fill('Automation Desc');

      console.log('10. Click on Save Button');
      await page.getByRole('button', { name: 'Save' }).click();

      console.log('11. Verify created case available');
      await page.waitForSelector('text=Auto-Sept2', { timeout: 30000 });
      await expect(page.getByText('Auto-Sept2')).toBeVisible();
    } catch (error) {
      console.error('Test failed:', error);
      await allure.attachment('screenshot', await page.screenshot({ path: 'failure-screenshot.png' }), 'image/png');
      throw error;
    }
  });
});