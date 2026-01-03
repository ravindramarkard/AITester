import { test, expect } from '../../../../../../fixtures/self-healing';
import { allure } from 'allure-playwright';
import { Page } from '@playwright/test';

test.describe('Case Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await allure.tag('ui-test');
    await allure.tag('smoke');
    await allure.tag('case-management');
  });

  test('Test Case: Create a case with Collaborators assigned', async ({ page }) => {
    const TARGET_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
    
    try {
      // Step 1: Navigate to given url
      console.log('Step 1: Navigating to URL:', TARGET_URL);
      await page.goto(TARGET_URL);
      await page.waitForLoadState('networkidle');
      
      // Step 2: Type username piyush.safaya into Username placeholder field
      console.log('Step 2: Entering username');
      await page.getByPlaceholder('Username').fill('piyush.safaya');
      
      // Step 3: Type password piyush1234 into Password placeholder field
      console.log('Step 3: Entering password');
      await page.getByPlaceholder('Password').fill('piyush1234');
      
      // Step 4: Click on Log in button
      console.log('Step 4: Clicking login button');
      await page.locator('#kc-login').click();
      
      // Step 5: Wait for spinner disappear
      console.log('Step 5: Waiting for spinner to disappear');
      await page.waitForSelector('.spinner, .loading, [data-testid="spinner"]', { state: 'hidden', timeout: 30000 }).catch(() => {
        console.log('Spinner element not found, continuing...');
      });
      
      // Step 6: Wait for page load "cases"
      console.log('Step 6: Waiting for cases page to load');
      await page.waitForURL(/cases/i, { timeout: 30000 });
      await page.waitForLoadState('networkidle');
      
      // Step 7: Click on Create New Case button
      console.log('Step 7: Clicking Create New Case button');
      await page.getByRole('button', { name: /create new case/i }).click();
      
      // Step 8: Type test case Auto-Sept2.1 into enter case name placeholder
      console.log('Step 8: Entering case name');
      await page.getByPlaceholder(/enter case name/i).fill('test case Auto-Sept2.1');
      
      // Step 9: Type Description "Automation Desc" into enter description placeholder
      console.log('Step 9: Entering description');
      await page.getByPlaceholder(/enter description/i).fill('Automation Desc');
      
      // Step 10: Click on contains Type to search for user placeholder
      console.log('Step 10: Clicking on user search field');
      await page.getByPlaceholder(/type to search for user/i).click();
      
      // Step 11: Fill ravindra.markard
      console.log('Step 11: Entering user name');
      await page.getByPlaceholder(/type to search for user/i).fill('ravindra.markard');
      
      // Step 12: Click on Add Button
      console.log('Step 12: Clicking Add button');
      await page.getByRole('button', { name: /add/i }).click();
      
      // Step 13: Click on Save button
      console.log('Step 13: Clicking Save button');
      await page.getByRole('button', { name: /save/i }).click();
      
      // Step 14: Verify created case available in list
      console.log('Step 14: Verifying case is created and available in list');
      await page.waitForSelector('text=test case Auto-Sept2.1', { state: 'visible', timeout: 30000 });
      await expect(page.locator('text=test case Auto-Sept2.1')).toBeVisible();
      
      console.log('Test completed successfully: Case created with collaborators assigned');
      
    } catch (error) {
      console.error('Test failed:', error);
      await page.screenshot({ path: 'failure-screenshot.png', fullPage: true });
      await allure.attachment('Failure Screenshot', await page.screenshot({ fullPage: true }), 'image/png');
      throw error;
    }
  });
});