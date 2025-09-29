
import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('POST /api/v1/project - happy-path', () => {
  let requestContext: APIRequestContext;
  let createdProjectId: string;
  let oauthToken: string;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    
    // First, fetch OAuth token from local endpoint
    try {
      console.log('🔐 Fetching OAuth token from local endpoint...');
      const tokenContext = await request.newContext();
      const tokenResponse = await tokenContext.post('http://localhost:5051/api/environments/test-oauth-token', {
        data: {
          clientId: "shaheen",
          clientSecret: "4f93f37f-0d79-4533-8519-7dd42492c647",
          tokenUrl: "https://keycloak.dev.g42a.ae/auth/realms/g42a/protocol/openid-connect/token",
          scope: "openid",
          grantType: "password",
          username: "piyush.safaya",
          password: "piyush1234"
        }
      });
      
      if (tokenResponse.status() === 200) {
        const tokenData = await tokenResponse.json();
        oauthToken = tokenData.token;
        console.log('✅ OAuth token fetched successfully from local endpoint');
      } else {
        console.error('❌ Failed to fetch OAuth token from local endpoint:', tokenResponse.status());
        throw new Error(`Failed to fetch OAuth token: ${tokenResponse.status()}`);
      }
      
      await tokenContext.dispose();
    } catch (error) {
      console.error('❌ Error fetching OAuth token:', error);
      throw error;
    }

    // Now create the main request context with the fetched token
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || 'https://p-tray.dev.g42a.ae',
      extraHTTPHeaders: {
        'Authorization': `Bearer ${oauthToken}`,
        'X-Space': process.env.X_SPACE || 'default'
      },
      timeout: parseInt(process.env.TIMEOUT || '30000', 10)
    });
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test.afterEach(async () => {
    if (createdProjectId) {
      try {
        const deleteResponse: APIResponse = await requestContext.delete(`/api/v1/project/${createdProjectId}`);
        console.log(`Project cleanup attempt for ID ${createdProjectId}: Status ${deleteResponse.status()}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Project cleanup for ID ${createdProjectId} not possible:`, errorMessage);
      }
    }
  });

  test('should create a Create project successfully', async () => {
    const requestData = {
      name: `test${Date.now()}`,
      description: `test${Date.now()}`
    };

    console.log('📤 Sending request data:', JSON.stringify(requestData, null, 2));
    console.log('🔐 Using OAuth token:', oauthToken ? 'Token available' : 'No token');

    const startTime = Date.now();
    const response: APIResponse = await requestContext.post('/api/v1/project', {
      data: requestData
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('📥 Response status:', response.status());
    console.log('📥 Response headers:', response.headers());

    // Get response body regardless of status
    let responseBody;
    try {
      responseBody = await response.json();
      console.log('📥 Response body:', JSON.stringify(responseBody, null, 2));
    } catch (e) {
      const textBody = await response.text();
      console.log('📥 Response body (text):', textBody);
      responseBody = { error: textBody };
    }

    // If we get an error, log it but don't fail immediately
    if (response.status() !== 200) {
      console.error('❌ API returned error status:', response.status());
      console.error('❌ Error details:', responseBody);
      
      // Attach error details to Allure
      await allure.attachment('Error Response', JSON.stringify(responseBody, null, 2), 'application/json');
      await allure.attachment('Request Data', JSON.stringify(requestData, null, 2), 'application/json');
    }

    // Validate response status
    expect(response.status()).toBe(200);

    // Validate response time
    expect(responseTime).toBeLessThan(10000);

    // Validate response headers
    expect(response.headers()['content-type']).toContain('application/json');

    // Extract ID for cleanup
    if (responseBody && responseBody.id) {
      createdProjectId = responseBody.id;
    }

    // Basic assertions
    expect(responseBody.name).toBe(requestData.name);
    expect(responseBody.description).toBe(requestData.description);
    expect(responseBody.id).toBeDefined();

    // Allure reporting
    await allure.attachment('Request Data', JSON.stringify(requestData, null, 2), 'application/json');
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
    await allure.attachment('Response Time', `${responseTime}ms`, 'text/plain');
    
    allure.label('severity', 'critical');
    allure.epic('project-controller Management');
    allure.feature('Create project');
    allure.story('Happy Path');
    allure.description('This test verifies that a create project can be created successfully via the API.');
  });
});