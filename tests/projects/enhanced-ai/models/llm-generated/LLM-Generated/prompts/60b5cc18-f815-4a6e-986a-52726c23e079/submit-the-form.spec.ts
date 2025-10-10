import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { faker } from '@faker-js/faker';

test.describe('Submit the form', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    await allure.tag('ui-test');
    await allure.tag('smoke');

    page = await browser.newPage({
      baseURL: process.env.BASE_URL || 'https://formy-project.herokuapp.com/form',
    });

    await page.goto('/');
  });

  test('Submit form with valid details', async () => {
    try {
      // Generate test data
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const jobTitle = faker.person.jobTitle();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedDate = tomorrow.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });

      // Fill form fields
      await allure.step('Enter personal details', async () => {
        await page.locator('#first-name').fill(firstName);
        await page.locator('#last-name').fill(lastName);
        await page.locator('#job-title').fill(jobTitle);
      });

      // Select gender
      await allure.step('Select male gender', async () => {
        await page.locator('#radio-button-1').check();
      });

      // Set date and press Tab
      await allure.step('Select next day date', async () => {
        await page.locator('#datepicker').fill(formattedDate);
        await page.keyboard.press('Tab');
      });

      // Submit form
      await allure.step('Submit the form', async () => {
        await page.locator('.btn.btn-lg.btn-primary').click();
        await page.waitForURL('**/thanks', { timeout: 15000 });
      });

      // Verify submission
      await expect(page).toHaveURL(/thanks/);
      await allure.attachment('Submission Screenshot', await page.screenshot(), 'image/png');

    } catch (error) {
      await allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
      throw error;
    }
  });

  test.afterEach(async () => {
    await page.close();
  });
});