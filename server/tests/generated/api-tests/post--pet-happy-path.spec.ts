import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('POST /pet', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || 'https://petstore.swagger.io/',
      extraHTTPHeaders: {
        ...{
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  "X-API-Key": "${API_KEY}"
        },
        'Authorization': `Bearer ${process.env.API_TOKEN || process.env.OAUTH_TOKEN}`
      },
      timeout: parseInt(process.env.TIMEOUT || '30000', 10)
    });
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test('POST /pet - should return 201', async () => {
    // Build sample request body if applicable from OpenAPI schema
    

    const requestOptions = {
      data: { /* TODO: fill body */ }
    };

    const response = await requestContext.post('/pet', requestOptions);
    await expect(response.status()).toBe(201);

    const responseBody = await response.json().catch(() => null);
    await allure.attachment('Response Status', String(response.status()), 'text/plain');
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
  });
});
