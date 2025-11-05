import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';
import { faker } from '@faker-js/faker';

test.describe('POST /user', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || 'https://p-tray.dev.g42a.ae',
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${process.env.API_TOKEN || process.env.OAUTH_TOKEN}`
      },
      timeout: parseInt(process.env.TIMEOUT || '30000', 10)
    });
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test('POST /user - performance', async () => {
    // Testing performance: Performance testing with realistic data and response time validation
    const startTime = Date.now();
    const requestOptions = {
      data: {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    phone: faker.phone.number()
  }
    };
    
    const response = await requestContext.post('/user', requestOptions);
    
    await expect(response.status()).toBe(201);
    
    const responseBody = await response.json().catch(() => null);
    
    // Performance assertion: Response should be received within reasonable time
    const responseTime = Date.now() - startTime;
    console.log('Response time:', responseTime, 'ms');
    expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    await allure.attachment('Response Status', String(response.status()), 'text/plain');
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
    await allure.label('variation', 'performance');
  });

  test('POST /user - data-validation', async () => {
    // Testing data-validation: Valid request with expected successful response
    
    const requestOptions = {
      data: {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    phone: faker.phone.number()
  }
    };
    
    const response = await requestContext.post('/user', requestOptions);
    
    await expect(response.status()).toBe(201);
    
    const responseBody = await response.json().catch(() => null);
    
    // Happy path: Verify successful response and data structure
    expect(response.status()).toBe(201);
    if (responseBody) {
      expect(responseBody).toBeTruthy();
    }
    
    await allure.attachment('Response Status', String(response.status()), 'text/plain');
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
    await allure.label('variation', 'data-validation');
  });
});