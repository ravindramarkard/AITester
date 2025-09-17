import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';
import { allure } from 'allure-playwright';



test.describe('POST /pet - happy-path', () => {
  let requestContext: APIRequestContext;
  const baseURL = process.env.BASE_URL || 'https://petstore.swagger.io/';
  const timeout = parseInt(process.env.TIMEOUT || '30000');

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout
    });
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });

  test('happy-path: Add a new pet to the store with valid data', async () => {
    await allure.description('Test the happy path scenario for adding a new pet with valid request data');
    await allure.tag('happy-path');
    await allure.tag('api');
    await allure.tag('post');

    const testData = {
      id: Math.floor(Math.random() * 1000000),
      category: {
        id: 1,
        name: 'Dogs'
      },
      name: 'Buddy',
      photoUrls: ['https://example.com/pet1.jpg'],
      tags: [
        {
          id: 1,
          name: 'friendly'
        }
      ],
      status: 'available'
    };

    let response: APIResponse;
    const startTime = Date.now();

    try {
      response = await requestContext.post('/pet', {
        data: testData,
        timeout
      });

      const responseTime = Date.now() - startTime;

      await allure.step('Request Details', async () => {
        await allure.attachment('Request Body', JSON.stringify(testData, null, 2), 'application/json');
        await allure.attachment('Request Headers', JSON.stringify(response.request().headers(), null, 2), 'application/json');
      });

      await allure.step('Response Details', async () => {
        await allure.attachment('Response Body', await response!.text(), 'application/json');
        await allure.attachment('Response Headers', JSON.stringify(response!.headers(), null, 2), 'application/json');
        await allure.attachment('Response Time', responseTime.toString(), 'text/plain');
      });

      expect(response!.status()).toBe(200);
      expect(responseTime).toBeLessThan(2000);

      const responseBody = await response!.json();
      
      expect(responseBody).toMatchObject({
        id: expect.any(Number),
        name: testData.name,
        status: testData.status
      });

      expect(responseBody.id).toBe(testData.id);
      expect(responseBody.category).toEqual(testData.category);
      expect(responseBody.photoUrls).toEqual(testData.photoUrls);
      expect(responseBody.tags).toEqual(testData.tags);

      expect(response!.headers()['content-type']).toContain('application/json');

    } catch (error: unknown) {
      await allure.step('Error Details', async () => {
        await allure.attachment('Error Message', error instanceof Error ? error.message : String(error), 'text/plain');
        await allure.attachment('Stack Trace', error instanceof Error ? error.stack || '' : '', 'text/plain');
      });
      throw error;
    }
  });

  test('edge-case: Add pet with boundary values', async () => {
    await allure.description('Test edge cases with boundary values and special characters');
    await allure.tag('edge-case');
    await allure.tag('api');

    const edgeCaseData = {
      id: 0,
      category: {
        id: 0,
        name: ''
      },
      name: 'A', // Minimum length
      photoUrls: [''],
      tags: [
        {
          id: 0,
          name: 'test@special#chars$%^&*()'
        }
      ],
      status: 'pending'
    };

    const response: APIResponse = await requestContext.post('/pet', {
      data: edgeCaseData,
      timeout
    });

    expect(response!.status()).toBe(200);
    const responseBody = await response!.json();
    expect(responseBody.name).toBe(edgeCaseData.name);
  });

  test('negative-test: Add pet with missing required fields', async () => {
    await allure.description('Test negative scenario with missing required fields');
    await allure.tag('negative');
    await allure.tag('api');

    const invalidData = {
      id: Math.floor(Math.random() * 1000000),
      // Missing required 'name' field
      photoUrls: [],
      status: 'available'
    };

    const response: APIResponse = await requestContext.post('/pet', {
      data: invalidData,
      timeout
    });

    expect(response!.status()).toBeGreaterThanOrEqual(400);
  });

  test('performance: Response time under load', async () => {
    await allure.description('Test performance with multiple concurrent requests');
    await allure.tag('performance');
    await allure.tag('api');

    const requests = Array(5).fill(null).map(async () => {
      const testData = {
        id: Math.floor(Math.random() * 1000000),
        name: 'PerformanceTestPet',
        photoUrls: ['https://example.com/test.jpg'],
        status: 'available'
      };

      const startTime = Date.now();
      const response: APIResponse = await requestContext.post('/pet', {
        data: testData,
        timeout
      });
      const responseTime = Date.now() - startTime;

      expect(response!.status()).toBe(200);
      expect(responseTime).toBeLessThan(3000);

      return responseTime;
    });

    const responseTimes = await Promise.all(requests);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    await allure.step('Performance Metrics', async () => {
      await allure.attachment('Response Times', JSON.stringify(responseTimes, null, 2), 'application/json');
      await allure.attachment('Average Response Time', averageResponseTime.toString(), 'text/plain');
    });

    expect(averageResponseTime).toBeLessThan(2000);
  });
});