import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Shoppin checkout', () => {
  test.beforeEach(async () => {
    await allure.tag('ui-test');
    await allure.tag('checkout-flow');
  });

  test('Complete shopping checkout flow for DevOps book', async ({ page }) => {
    try {
      // Step 1: Navigate to the shopping website
      await page.goto(process.env.BASE_URL || 'https://practice.expandtesting.com/bookstore');
      await page.waitForSelector('#search-input', { state: 'visible', timeout: 15000 });
      await allure.attachment('Homepage loaded', await page.screenshot(), 'image/png');

      // Step 2: Search for "devops"
      await page.locator('#search-input').fill('devops');
      await page.locator('#search-btn').click();
      await page.waitForSelector('[data-testid="cart-67410b8c6cb6226060a20da4"]', { state: 'visible', timeout: 10000 });
      
      // Verify search results
      await expect(page.locator('a:has-text("The DevOps Handbook")')).toBeVisible();
      await allure.attachment('Search results', await page.screenshot(), 'image/png');

      // Step 3: Add to cart and click cart icon
      await page.locator('[data-testid="cart-67410b8c6cb6226060a20da4"]').click();
      await page.locator('a[href="/bookstore/cart"]').click();
      await page.waitForURL(/\/cart/, { timeout: 15000 });
      await allure.attachment('Cart page', await page.screenshot(), 'image/png');

      // Step 4: Proceed to checkout verification
      await expect(page).toHaveURL(/\/cart/);
      await expect(page.locator('h1:has-text("Shopping Cart")')).toBeVisible();
      
    } catch (error) {
      await allure.attachment('Error Screenshot', await page.screenshot(), 'image/png');
      throw error;
    }
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot();
      await allure.attachment(`Test Failed Screenshot - ${testInfo.title}`, screenshot, 'image/png');
    }
  });
});