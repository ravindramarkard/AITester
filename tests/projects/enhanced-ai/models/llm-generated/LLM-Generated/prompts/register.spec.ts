import { test, expect } from '../../../../../../fixtures/self-healing';
import { allure } from 'allure-playwright';

test.describe('register', () => {
  test('register', async ({ page }) => {
    const TARGET_URL = process.env.BASE_URL || 'https://parabank.parasoft.com/parabank/index.htm?';
    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to the ParaBank URL
    await page.goto('https://parabank.parasoft.com/parabank/index.htm');
    // Click on the 'Register' link
    await page.getByText('Register').click();
  });
});