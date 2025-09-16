import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';
import { allure } from 'allure-playwright';



test.describe('POST /pet/{petId} - happy-path', () => {
  let requestContext: APIRequestContext;
  let createdPetId: number;
  const baseURL = process.env.BASE_URL || 'https://petstore.swagger.io/';
  const timeout = parseInt(process.env.TIMEOUT || '30000');

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      timeout
    });

    // Create a pet first to ensure we have a valid petId for testing
    const createResponse: APIResponse = await requestContext.post('/pet', {
      data: {
        id: Math.floor(Math.random() * 10000),
        name: 'TestPet',
        category: { id: 1, name: 'Dogs' },
        photoUrls: ['https://example.com/pet.jpg'],
        tags: [{ id: 1, name: 'friendly' }],
        status: 'available'
      }
    });

    expect(createResponse.status()).toBe(200);
    const createdPet = await createResponse.json();
    createdPetId = createdPet.id;
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });

  test('happy-path: update pet with valid form data', async () => {
    await allure.description('Test the happy path scenario for updating a pet with valid form data');
    await allure.tags('api', 'pet-store', 'happy-path');

    const testData = {
      name: 'UpdatedPetName',
      status: 'sold'
    };

    const startTime = Date.now();
    let response: APIResponse;

    try {
      response = await requestContext.post(`/pet/${createdPetId}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: testData,
        timeout
      });

      const responseTime = Date.now() - startTime;

      await allure.step('Validate response status', async () => {
        expect(response!.status()).toBe(200);
      });

      await allure.step('Validate response headers', async () => {
        expect(response!.headers()['content-type']).toContain('application/json');
      });

      await allure.step('Validate response time', async () => {
        expect(responseTime).toBeLessThan(2000);
      });

      await allure.step('Validate response body structure', async () => {
        const responseBody = await response!.json();
        
        expect(responseBody).toHaveProperty('code');
        expect(responseBody).toHaveProperty('type');
        expect(responseBody).toHaveProperty('message');
        
        expect(typeof responseBody.code).toBe('number');
        expect(typeof responseBody.type).toBe('string');
        expect(typeof responseBody.message).toBe('string');
        
        expect(responseBody.code).toBe(200);
        expect(responseBody.type).toBe('unknown');
        expect(responseBody.message).toBe(String(createdPetId));
      });

      await allure.attachment('Request Data', JSON.stringify(testData, null, 2), {
        contentType: 'application/json'
      });

      await allure.attachment('Response Data', JSON.stringify(await response!.json(), null, 2), {
        contentType: 'application/json'
      });

      await allure.attachment('Performance Metrics', JSON.stringify({
        responseTime: `${responseTime}ms`,
        statusCode: response!.status(),
        success: response.ok()
      }, null, 2), {
        contentType: 'application/json'
      });

    } catch (error: unknown) {
      await allure.step('Error Handling', async () => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await allure.attachment('Error Details', errorMessage, {
          contentType: 'text/plain'
        });
        throw error;
      });
    }
  });

  test('verify pet was actually updated', async () => {
    await allure.description('Verify that the pet was actually updated by fetching it again');
    await allure.tags('api', 'pet-store', 'verification');

    const response: APIResponse = await requestContext.get(`/pet/${createdPetId}`);
    
    expect(response!.status()).toBe(200);
    
    const petData = await response!.json();
    
    expect(petData.name).toBe('UpdatedPetName');
    expect(petData.status).toBe('sold');
  });
});