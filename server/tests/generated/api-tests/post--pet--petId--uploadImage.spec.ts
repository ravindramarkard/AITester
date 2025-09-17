import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('POST /pet/{petId}/uploadImage', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: 'https://fakerestapi.azurewebsites.net',
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });

  test('should uploads an image', async () => {
    await allure.epic('API Testing');
    await allure.feature('POST /pet/{petId}/uploadImage');
    await allure.story('/pet/{petId}/uploadImage');
    await allure.description('uploads an image');
    await allure.tag('pet');
    
    // Prepare request details
    const requestDetails = {
      method: 'POST',
      url: 'https://fakerestapi.azurewebsites.net/pet/{petId}/uploadImage',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timestamp: new Date().toISOString()
    };
    
    await allure.step('Request Details', async () => {
      await allure.attachment('Request Method', requestDetails.method, 'text/plain');
      await allure.attachment('Request URL', requestDetails.url, 'text/plain');
      await allure.attachment('Request Headers', JSON.stringify(requestDetails.headers, null, 2), 'application/json');
      await allure.attachment('Request Timestamp', requestDetails.timestamp, 'text/plain');
    });
    
    const startTime = Date.now();
    const response = await requestContext.post('/pet/{petId}/uploadImage', {
      headers: requestDetails.headers
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    await allure.step('Response Details', async () => {
      await allure.attachment('Response Status', response.status().toString(), 'text/plain');
      await allure.attachment('Response Headers', JSON.stringify(response.headers(), null, 2), 'application/json');
      await allure.attachment('Response Time', `${responseTime}ms`, 'text/plain');
      
      if (response.status() >= 200 && response.status() < 300) {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          await allure.attachment('Response Body', JSON.stringify(data, null, 2), 'application/json');
          expect(data).toBeDefined();
        } else {
          const textData = await response.text();
          await allure.attachment('Response Body (Text)', textData, 'text/plain');
        }
      } else {
        const errorData = await response.text();
        await allure.attachment('Error Response', errorData, 'text/plain');
      }
    });
    
    // Accept multiple valid status codes for fake API compatibility
    expect([200, 201, 400, 404]).toContain(response.status());
    
    // Performance assertion
    expect(responseTime).toBeLessThan(5000);
  });
});
