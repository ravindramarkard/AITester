import { test, expect } from '../../../../../../fixtures/self-healing';
import { allure } from 'allure-playwright';

test.describe('register', () => {
  test('register', async ({ page }) => {
    const TARGET_URL = process.env.BASE_URL || 'https://parabank.parasoft.com/parabank/index.htm?';
    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to the specified URL
    await page.goto('https://parabank.parasoft.com/parabank/index.htm');
    // Click on the Register link
    await page.getByRole('link', { name: 'Register' }).click();
    // Fill in the first name field
    await page.locator('[name="customer.firstName"]').fill('John');
    // Fill in the last name field
    await page.locator('[name="customer.lastName"]').fill('Doe');
    // Fill in the address field
    await page.locator('[name="customer.address.street"]').fill('123 Main St');
    // Fill in the city field
    await page.locator('[name="customer.address.city"]').fill('New York');
    // Fill in the state field
    await page.locator('[name="customer.address.state"]').fill('NY');
    // Fill in the zip code field
    await page.locator('[name="customer.address.zipCode"]').fill('10001');
    // Fill in the phone number field
    await page.locator('[name="customer.phoneNumber"]').fill('1234567890');
    // Fill in the SSN field
    await page.locator('[name="customer.ssn"]').fill('123-45-6789');
    // Fill in the username field
    await page.locator('[name="customer.username"]').fill('johndoe');
    // Fill in the password field
    await page.locator('[name="customer.password"]').fill('password123');
    // Fill in the confirm password field
    await page.locator('[name="repeatedPassword"]').fill('password123');
    // Click on the Register button
    await page.getByRole('button', { name: 'Register' }).click();
  });
});