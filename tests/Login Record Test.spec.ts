import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Login Record Test', () => {
  test.beforeEach(async ({ page }) => {
    // Add Allure metadata
    allure.label('testType', 'codegen');
    allure.label('testCase', 'Login Record Test');
    allure.label('url', 'https://staging-shaheen.dev.g42a.ae/');
    allure.label('browser', 'chromium');
    allure.owner('Test Generator');
    allure.severity('normal');
    allure.tag('codegen', 'ui-test');
  });

  test('Login Record Test', async ({ page }) => {
    await allure.step('Login Record Test', async () => {
      // Original test actions
      await page.goto('https://keycloak.dev.g42a.ae/auth/realms/g42a/protocol/openid-connect/auth?response_type=code&scope=openid&client_id=shaheen&redirect_uri=https://staging-shaheen.dev.g42a.ae/openid/redirect&state=openid');
  await expect(page.getByRole('link', { name: 'presight' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('piyush.safaya');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('piyush1234');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.goto('https://staging-shaheen.dev.g42a.ae/cases');
  await expect(page.getByRole('listitem')).toContainText('All Classes');
  await page.locator('#dark').getByText('PS').click();
  await expect(page.getByRole('tooltip', { name: 'Username : piyush.safaya DLS' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto('https://keycloak.dev.g42a.ae/auth/realms/g42a/protocol/openid-connect/auth?response_type=code&scope=openid&client_id=shaheen&redirect_uri=https://staging-shaheen.dev.g42a.ae/openid/redirect&state=openid');
    });
  });
});