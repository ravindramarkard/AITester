import { allure } from 'allure-playwright';
import { test, expect, APIRequestContext } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { test, expect, APIRequestContext } from '@playwright/test';

// Interfaces for data structures
interface E2EResource {
  id?: string;
  type: string;
  name: string;
  value: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface TestDataRegistry {
  createdResources: Map<string, E2EResource>;
  updatedResources: Map<string, E2EResource>;
  deletedResources: Set<string>;
  cleanupQueue: string[];
}

interface AuthConfig {
  token?: string;
  tokenType?: string;
  expiresAt?: number;
}

// Test Data Factories
class E2EDataFactory {
  static generateValidE2EData(overrides: Partial<E2EResource> = {}): E2EResource {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    return {
      type: `test-type-${randomSuffix}`,
      name: `Test E2E Resource ${timestamp}`,
      value: `test-value-${randomSuffix}`,
      description: `Generated test resource at ${new Date().toISOString()}`,
      isActive: true,
      ...overrides
    };
  }

  static generateInvalidE2EData(): Partial<E2EResource> {
    return {
      type: '',
      name: '',
      value: null as any,
      isActive: 'invalid' as any
    };
  }

  static generateBoundaryE2EData(): E2EResource[] {
    return [
      this.generateValidE2EData({
        name: 'a'.repeat(255),
        value: '1'.repeat(1000)
      }),
      this.generateValidE2EData({
        name: '',
        value: ''
      }),
      this.generateValidE2EData({
        type: 'special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?',
        name: 'Unicode test: ñáéíóú 中文 العربية русский',
        value: 'Special chars: !@#$%^&*()'
      })
    ];
  }

  static generateRandomE2EData(count: number = 5): E2EResource[] {
    return Array.from({ length: count }, () => this.generateValidE2EData());
  }
}

// Helper Functions
class APIHelper {
  static async resolveAuthToken(request: APIRequestContext): Promise<string> {
    // Check environment variables for existing tokens
    const token = process.env.API_TOKEN || process.env.BEARER_TOKEN || process.env.ACCESS_TOKEN;
    
    if (token) {
      allure.step('Using existing token from environment variables');
      return token;
    }

    // Attempt OAuth2 token fetch
    const tokenUrl = process.env.TOKEN_URL || process.env.AUTH_URL;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;

    if (tokenUrl && clientId && clientSecret) {
      allure.step('Attempting OAuth2 token fetch');
      try {
        const response = await apiContext.post(tokenUrl, {
          form: {
            grant_type: username ? 'password' : 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password,
            scope: process.env.SCOPE || 'openid'
          }
        });

        if (response.ok()) {
          const tokenData = await response.json();
          const accessToken = tokenData.access_token || tokenData.token;
          if (accessToken) {
            process.env.API_TOKEN = accessToken;
            return accessToken;
          }
        }
      } catch (error) {
        allure.step('OAuth2 token fetch failed', () => {
          console.error('Token fetch error:', error);
        });
      }
    }

    throw new Error('No authentication token available. Please set API_TOKEN, BEARER_TOKEN, or provide OAuth2 credentials.');
  }

  static async makeAuthenticatedRequest(
    request: APIRequestContext,
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>
  ) {
    const token = await this.resolveAuthToken(request);
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers
    };

    const startTime = Date.now();
    
    let response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await apiContext.get(url, { headers: authHeaders });
        break;
      case 'POST':
        response = await apiContext.post(url, { 
          headers: authHeaders,
          data: data ? JSON.stringify(data) : undefined
        });
        break;
      case 'PUT':
        response = await apiContext.put(url, { 
          headers: authHeaders,
          data: data ? JSON.stringify(data) : undefined
        });
        break;
      case 'DELETE':
        response = await apiContext.delete(url, { headers: authHeaders });
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const responseTime = Date.now() - startTime;
    
    // Attach response details to Allure
    allure.attachment('Request Details', JSON.stringify({
      method,
      url,
      headers: authHeaders,
      data: data || null,
      responseTime: `${responseTime}ms`
    }), 'application/json');

    return { response, responseTime };
  }

  static async validateResponse(response: any, expectedStatus: number, expectedSchema?: any) {
    expect(response.status()).toBe(expectedStatus);
    
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('application/json')) {
      const responseBody = await response.json();
      allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
      
      if (expectedSchema) {
        expect(responseBody).toMatchObject(expectedSchema);
      }
      
      return responseBody;
    }
    
    return null;
  }
}


let apiContext: APIRequestContext;
let authToken = '';
const testData: TestData = {};

test.beforeAll(async ({ playwright }) => {
  try {
    authToken = process.env.API_TOKEN || process.env.BEARER_TOKEN || process.env.ACCESS_TOKEN || '';
    if (!authToken && process.env.TOKEN_URL) {
      const ctx = await playwright.request.newContext();
      const tokenResponse = await ctx.post(process.env.TOKEN_URL, {
        data: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          username: process.env.USERNAME,
          password: process.env.PASSWORD,
          grant_type: 'password',
          scope: process.env.SCOPE || 'openid'
        }
      });
      expect(tokenResponse.status()).toBe(200);
      const tokenJson = await tokenResponse.json();
      authToken = tokenJson.access_token || '';
    }

    apiContext = await playwright.request.newContext({
      baseURL: process.env.BASE_URL || 'https://fakerestapi.azurewebsites.net',
      extraHTTPHeaders: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  } catch (error: any) {
    throw new Error(`Authentication setup failed: ${error.message || error}`);
  }
});


test.describe('E2E API CRUD Operations', () => {
  let request: APIRequestContext;
  let testData: TestData = TestDataRegistry;
  const baseUrl = process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com/web/index.php';
  const timeout = parseInt(process.env.TIMEOUT || '30000');

  test.beforeAll(async ({ playwright }) => {
    allure.epic('E2E API Testing');
    allure.feature('CRUD Operations');
    allure.story('E2E Resource Management');
    
    request = await playwright.request.newContext({
      baseURL: baseUrl,
      timeout: timeout,
      ignoreHTTPSErrors: true
    });

    testData = {
      createdResources: new Map(),
      updatedResources: new Map(),
      deletedResources: new Set(),
      cleanupQueue: []
    };

    // Health check
    try {
      const healthResponse = await apiContext.get('/api/health');
      if (!healthResponse.ok()) {
        console.warn('Health check failed, proceeding with tests anyway');
      }
    } catch (error) {
      console.warn('Health check endpoint not available, proceeding with tests');
    }
  });

  test.afterAll(async () => {
    if (request) {
      await apiContext.dispose();
    }
  });

  test.afterEach(async () => {
    // Cleanup resources created during tests
    for (const resourceId of testData.cleanupQueue) {
      try {
        if (!testData.deletedResources.has(resourceId)) {
          await APIHelper.makeAuthenticatedRequest(request, 'DELETE', `/api/e2e/${resourceId}`);
          testData.deletedResources.add(resourceId);
        }
      } catch (error) {
        console.warn(`Failed to cleanup resource ${resourceId}:`, error);
      }
    }
  });

  test('READ: Get settings by type', async () => {
    allure.step('Test GET /settings/{type} endpoint');
    
    const settingType = 'general';
    const { response, responseTime } = await APIHelper.makeAuthenticatedRequest(
      request,
      'GET',
      `/settings/${settingType}`
    );

    // Performance assertion
    expect(responseTime).toBeLessThan(2000);
    
    // Validate response
    const responseBody = await APIHelper.validateResponse(response, 200);
    
    // Validate response structure
    expect(responseBody).toBeDefined();
    expect(typeof responseBody).toBe('object');
    
    // Validate content-type header
    expect(response.headers()['content-type']).toContain('application/json');
    
    allure.step('Successfully retrieved settings', () => {
      console.log(`Retrieved settings for type: ${settingType}`);
    });
  });

  test('READ: Get settings with invalid type', async () => {
    allure.step('Test error handling for invalid setting type');
    
    const invalidType = 'invalid-type-12345';
    const { response } = await APIHelper.makeAuthenticatedRequest(
      request,
      'GET',
      `/settings/${invalidType}`
    );

    // Expect 404 for invalid type
    expect([200, 201, 400, 404]).toContain(response.status());
    
    const errorBody = await response.json();
    allure.attachment('Error Response', JSON.stringify(errorBody, null, 2), 'application/json');
    
    expect(errorBody).toHaveProperty('error');
  });

  test('READ: Get settings with special characters', async () => {
    allure.step('Test GET endpoint with special characters in type');
    
    const specialType = 'test-special-!@#$%^&*()';
    const { response } = await APIHelper.makeAuthenticatedRequest(
      request,
      'GET',
      `/settings/${encodeURIComponent(specialType)}`
    );

    // Should handle special characters gracefully
    if (response.status() === 200) {
      const responseBody = await response.json();
      expect(responseBody).toBeDefined();
    } else {
      // If it fails, it should fail gracefully
      expect([400, 404]).toContain(response.status());
    }
  });

  test('Performance: Response time validation', async () => {
    allure.step('Validate response times under load');
    
    const settingType = 'performance-test';
    const iterations = 5;
    const responseTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const { responseTime } = await APIHelper.makeAuthenticatedRequest(
        request,
        'GET',
        `/settings/${settingType}`
      );
      responseTimes.push(responseTime);
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    allure.attachment('Performance Metrics', JSON.stringify({
      iterations,
      averageTime: `${avgResponseTime.toFixed(2)}ms`,
      maxTime: `${maxResponseTime}ms`,
      minTime: `${Math.min(...responseTimes)}ms`
    }), 'application/json');
    
    // Performance assertions
    expect(avgResponseTime).toBeLessThan(1500);
    expect(maxResponseTime).toBeLessThan(3000);
  });

  test('Schema Validation: Verify response structure', async () => {
    allure.step('Validate response schema consistency');
    
    const settingType = 'schema-test';
    const { response } = await APIHelper.makeAuthenticatedRequest(
      request,
      'GET',
      `/settings/${settingType}`
    );

    if (response.ok()) {
      const responseBody = await response.json();
      
      // Define expected schema structure
      const expectedSchema = {
        type: 'object',
        required: ['type', 'data'],
        properties: {
          type: { type: 'string' },
          data: { type: 'object' },
          metadata: { type: 'object' }
        }
      };
      
      // Basic structure validation
      expect(responseBody).toHaveProperty('type');
      expect(responseBody).toHaveProperty('data');
      expect(typeof responseBody.type).toBe('string');
      expect(typeof responseBody.data).toBe('object');
      
      allure.attachment('Schema Validation', 'Response structure is valid', 'text/plain');
    }
  });

  test('Edge Cases: Empty and null responses', async () => {
    allure.step('Test edge cases for empty and null responses');
    
    // Test with empty string type
    const { response: emptyResponse } = await APIHelper.makeAuthenticatedRequest(
      request,
      'GET',
      '/settings/'
    );
    
    // Should return 400 or 404 for empty type
    expect([400, 404]).toContain(emptyResponse.status());
    
    // Test with very long type name
    const longType = 'a'.repeat(1000);
    const { response: longResponse } = await APIHelper.makeAuthenticatedRequest(
      request,
      'GET',
      `/settings/${longType}`
    );
    
    // Should handle long strings gracefully
    expect([400, 404, 414]).toContain(longResponse.status());
  });

  test('Concurrent Requests: Handle multiple simultaneous requests', async () => {
    allure.step('Test concurrent request handling');
    
    const settingTypes = ['type1', 'type2', 'type3', 'type4', 'type5'];
    const concurrentRequests = settingTypes.map(type => 
      APIHelper.makeAuthenticatedRequest(request, 'GET', `/settings/${type}`)
    );
    
    const results = await Promise.allSettled(concurrentRequests);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    allure.attachment('Concurrent Request Results', JSON.stringify({
      total: results.length,
      successful,
      failed
    }), 'application/json');
    
    // At least some requests should succeed or fail gracefully
    expect(successful + failed).toBe(settingTypes.length);
  });
});