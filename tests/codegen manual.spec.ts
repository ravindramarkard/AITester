import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('codegen manual', () => {
  test.beforeEach(async ({ page }) => {
    // Add Allure metadata
    allure.label('testType', 'codegen');
    allure.label('testCase', 'codegen manual');
    allure.label('url', 'https://staging-shaheen.dev.g42a.ae/');
    allure.label('browser', 'chromium');
    allure.owner('Test Generator');
    allure.severity('normal');
    allure.tag('codegen', 'ui-test');
  });

  test('codegen manual', async ({ page }) => {
    await allure.step('codegen manual', async () => {
      // Original test actions
      await page.goto('https://keycloak.dev.g42a.ae/auth/realms/g42a/protocol/openid-connect/auth?response_type=code&scope=openid&client_id=shaheen&redirect_uri=https://staging-shaheen.dev.g42a.ae/openid/redirect&state=openid');
  await expect(page.getByRole('link', { name: 'presight' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('dasd');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('dsadas');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.locator('#kc-content-wrapper')).toContainText('Invalid username or password.');
    });
  });
});