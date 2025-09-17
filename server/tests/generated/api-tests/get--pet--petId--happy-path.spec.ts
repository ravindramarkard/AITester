import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';
import { allure } from 'allure-playwright';



test.describe('GET /pet/{petId} - happy-path', () => {
  let requestContext: APIRequestContext;
  const BASE_URL = process.env.BASE_URL || 'https://petstore.swagger.io/';
  const API_TOKEN = process.env.API_TOKEN || 'test-token';
  const API_KEY = process.env.API_KEY || 'test-api-key';
  const TIMEOUT = parseInt(process.env.TIMEOUT || '30000');

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "X-API-Key": API_KEY
      },
      timeout: TIMEOUT
    });
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });

  test('happy-path: valid pet ID returns pet details with proper schema', async ({}, testInfo) => {
    await allure.description('Test the happy path scenario for GET /pet/{petId} endpoint');
    await allure.tags('api', 'pet-store', 'happy-path', 'schema-validation');

    const testPetId = 1;
    const startTime = Date.now();
    let response: APIResponse;

    try {
      response = await requestContext.get(`/pet/${testPetId}`);
      const responseTime = Date.now() - startTime;

      await allure.step('Validate response status and headers', async () => {
        expect(response!.status(), 'Response status should be 200').toBe(200);
        expect(response!.headers()['content-type'], 'Content-Type should be application/json').toContain('application/json');
      });

      await allure.step('Validate response time performance', async () => {
        expect(responseTime, 'Response time should be less than 2000ms').toBeLessThan(2000);
        await allure.attachment('performance-metrics', JSON.stringify({
          responseTimeMs: responseTime,
          timestamp: new Date().toISOString()
        }), 'application/json');
      });

      const responseBody = await response!.json();
      await allure.attachment('response-body', JSON.stringify(responseBody, null, 2), 'application/json');

      await allure.step('Validate response schema structure', async () => {
        expect(responseBody).toHaveProperty('id');
        expect(responseBody).toHaveProperty('name');
        expect(responseBody).toHaveProperty('category');
        expect(responseBody).toHaveProperty('photoUrls');
        expect(responseBody).toHaveProperty('tags');
        expect(responseBody).toHaveProperty('status');
      });

      await allure.step('Validate data types and required fields', async () => {
        expect(typeof responseBody.id, 'ID should be a number').toBe('number');
        expect(typeof responseBody.name, 'Name should be a string').toBe('string');
        expect(responseBody.name.length, 'Name should not be empty').toBeGreaterThan(0);
        expect(Array.isArray(responseBody.photoUrls), 'photoUrls should be an array').toBe(true);
        expect(Array.isArray(responseBody.tags), 'tags should be an array').toBe(true);
        
        if (responseBody.category) {
          expect(responseBody.category).toHaveProperty('id');
          expect(responseBody.category).toHaveProperty('name');
        }
      });

      await allure.step('Validate specific pet ID matches request', async () => {
        expect(responseBody.id, 'Returned pet ID should match requested ID').toBe(testPetId);
      });

      await allure.step('Validate status values are valid', async () => {
        const validStatuses = ['available', 'pending', 'sold'];
        expect(validStatuses).toContain(responseBody.status);
      });

    } catch (error: unknown) {
      await allure.attachment('error-details', JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        testCase: 'happy-path'
      }), 'application/json');
      
      throw error;
    }
  });

  test('edge-case: pet with maximum ID value', async () => {
    await allure.tags('edge-case', 'boundary-values');
    
    const maxPetId = Number.MAX_SAFE_INTEGER;
    const response: APIResponse = await requestContext.get(`/pet/${maxPetId}`);
    
    if (response!.status() === 200) {
      const responseBody = await response!.json();
      expect(responseBody.id).toBe(maxPetId);
    } else if (response!.status() === 404) {
      const errorBody = await response!.json();
      expect(errorBody).toHaveProperty('message');
    }
  });

  test('negative-case: non-existent pet ID returns 404', async () => {
    await allure.tags('negative', 'error-handling');
    
    const nonExistentPetId = 999999999;
    const response: APIResponse = await requestContext.get(`/pet/${nonExistentPetId}`);
    
    expect(response!.status(), 'Non-existent pet should return 404').toBe(404);
    
    const errorBody = await response!.json();
    expect(errorBody).toHaveProperty('message');
    expect(errorBody.message).toContain('Pet not found');
  });

  test('security: SQL injection attempt in pet ID', async () => {
    await allure.tags('security', 'sql-injection');
    
    const sqlInjectionPayload = "1'; DROP TABLE pets; --";
    const response: APIResponse = await requestContext.get(`/pet/${sqlInjectionPayload}`);
    
    expect(response!.status()).not.toBe(500);
    const responseBody = await response!.json();
    expect(responseBody).toHaveProperty('message');
  });

  test('performance: multiple concurrent requests', async () => {
    await allure.tags('performance', 'concurrency');
    
    const concurrentRequests = 5;
    const testPetId = 1;
    const requests = Array(concurrentRequests).fill(null).map(() => 
      requestContext.get(`/pet/${testPetId}`)
    );
    
    const responses: APIResponse[] = await Promise.all(requests);
    
    responses.forEach(response => {
      expect(response!.status()).toBe(200);
    });
    
    const responseTimes = await Promise.all(responses.map(async (response) => {
      const timing = response.timing();
      return timing?.responseEnd ? timing.responseEnd - timing.requestStart : 0;
    }));
    
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    expect(avgResponseTime, 'Average response time should be reasonable').toBeLessThan(1000);
  });
});