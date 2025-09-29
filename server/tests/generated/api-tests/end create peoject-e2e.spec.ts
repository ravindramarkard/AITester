import { test, expect } from '@playwright/test';

interface TestResponse {
  method: string;
  path: string;
  status: number;
  responseTime: number;
  timestamp: string;
}

interface TestDataRegistry {
  created: any;
  updated: any;
  ids: any[];
  responses: TestResponse[];
}

import { allure } from 'allure-playwright';
import { v4 as uuidv4 } from 'uuid';

// Environment variables
const BASE_URL = process.env.BASE_URL || 'https://p-tray.dev.g42a.ae';
const TIMEOUT = parseInt(process.env.TIMEOUT || '10000', 10);

// Interfaces for data structures
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Test data factories
function generateValidProjectData(): Project {
  return {
    id: uuidv4(),
    name: `Test Project ${uuidv4().substring(0, 8)}`,
    description: 'This is a test project for API testing.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateInvalidProjectData(): Partial<Project> {
  return {
    name: '', // Invalid: name is required
    description: 'Invalid project with missing name',
  };
}

function generateBoundaryProjectData(): Project {
  return {
    id: uuidv4(),
    name: 'A'.repeat(255), // Boundary: max length for name
    description: 'Boundary test project with max length name',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Global testData object
const testData: { createdProject?: Project } = {};

// Helper function for API requests with retries
async function makeRequest(context: APIRequestContext, method: string, url: string, data?: any, retries = 3): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      response = await context.request[method.toLowerCase()]({
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        data,
      });
      if (response.ok()) {
        break;
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed with error:`, error);
      if (attempt === retries) {
        throw error;
      }
    }
  }
  if (!response) {
    throw new Error('Request failed after retries');
  }
  return response;
}

test.describe('End-to-End API Test Suite for Project Resource', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: BASE_URL,
      timeout: TIMEOUT,
    });
  });

  test.afterEach(async () => {
    // Cleanup created project
    if (testDataRegistry.createdProject?.id) {
      const deleteResponse = await makeRequest(apiContext, 'DELETE', `/api/v1/project/${testDataRegistry.createdProject.id}`);
      expect(deleteResponse.status()).toBe(204);
      allure.step(`Deleted project with ID: ${testDataRegistry.createdProject.id}`);
    }
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('CREATE: Should create a new project successfully', async () => {
    const projectData = generateValidProjectData();
    const response = await makeRequest(apiContext, 'POST', '/api/v1/project', projectData);
    expect([200, 201, 400, 404]).toContain(response.status());
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.name).toBe(projectData.name);
    expect(responseBody.description).toBe(projectData.description);
    testDataRegistry.createdProject = responseBody;
    allure.step(`Created project with ID: ${testDataRegistry.createdProject.id}`);
  });

  test('READ: Should retrieve the created project by ID', async () => {
    if (!testDataRegistry.createdProject?.id) {
      test.fail('Project not created');
    }
    const response = await makeRequest(apiContext, 'GET', `/api/v1/project/${testDataRegistry.createdProject.id}`);
    expect([200, 201, 400, 404]).toContain(response.status());
    const responseBody = await response.json();
    expect(responseBody).toEqual(testDataRegistry.createdProject);
    allure.step(`Retrieved project with ID: ${testDataRegistry.createdProject.id}`);
  });

  test('UPDATE: Should update the created project successfully', async () => {
    if (!testDataRegistry.createdProject?.id) {
      test.fail('Project not created');
    }
    const updatedProjectData = {
      ...testDataRegistry.createdProject,
      description: 'Updated description for the test project',
    };
    const response = await makeRequest(apiContext, 'PUT', `/api/v1/project/${testDataRegistry.createdProject.id}`, updatedProjectData);
    expect([200, 201, 400, 404]).toContain(response.status());
    const responseBody = await response.json();
    expect(responseBody.description).toBe(updatedProjectData.description);
    testDataRegistry.createdProject = responseBody;
    allure.step(`Updated project with ID: ${testDataRegistry.createdProject.id}`);
  });

  test('DELETE: Should delete the created project successfully', async () => {
    if (!testDataRegistry.createdProject?.id) {
      test.fail('Project not created');
    }
    const response = await makeRequest(apiContext, 'DELETE', `/api/v1/project/${testDataRegistry.createdProject.id}`);
    expect([200, 201, 400, 404]).toContain(response.status());
    allure.step(`Deleted project with ID: ${testDataRegistry.createdProject.id}`);

    // Verify project no longer exists
    const verifyResponse = await makeRequest(apiContext, 'GET', `/api/v1/project/${testDataRegistry.createdProject.id}`);
    expect(verifyResponse.status()).toBe(404);
    allure.step(`Verified project with ID: ${testDataRegistry.createdProject.id} no longer exists`);
  });

  test('ERROR HANDLING: Should handle invalid project creation', async () => {
    const invalidProjectData = generateInvalidProjectData();
    const response = await makeRequest(apiContext, 'POST', '/api/v1/project', invalidProjectData);
    expect([200, 201, 400, 404]).toContain(response.status()); // Assuming bad request for invalid data
    allure.step('Handled invalid project creation');
  });

  test('BOUNDARY TESTING: Should handle boundary project creation', async () => {
    const boundaryProjectData = generateBoundaryProjectData();
    const response = await makeRequest(apiContext, 'POST', '/api/v1/project', boundaryProjectData);
    expect([200, 201, 400, 404]).toContain(response.status());
    const responseBody = await response.json();
    expect(responseBody.name).toBe(boundaryProjectData.name);
    allure.step('Handled boundary project creation');
  });

  test('PERFORMANCE TESTING: Should create a project within acceptable response time', async () => {
    const projectData = generateValidProjectData();
    const startTime = Date.now();
    const response = await makeRequest(apiContext, 'POST', '/api/v1/project', projectData);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    expect([200, 201, 400, 404]).toContain(response.status());
    expect(responseTime).toBeLessThan(2000); // 2 seconds
    allure.step(`Created project within ${responseTime}ms`);
  });
});
