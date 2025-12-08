import { allure } from 'allure-playwright';
import { test, expect, APIRequestContext } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { v4 as uuidv4 } from 'uuid';

interface TestData {
  createdUserId?: number;
  originalUser?: any;
  updatedUser?: any;
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
      timeout: 299998
    });
  } catch (error: any) {
    throw new Error(`Authentication setup failed: ${error.message || error}`);
  }
});


test.describe('Generated Test', () => {
  test('should execute test steps', async ({ page }) => {




const BASE_URL = process.env.BASE_URL || 'https://p-tray.dev.g42a.ae';
const TIMEOUT = parseInt(process.env.TIMEOUT || '30000', 10);

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

let apiRequestContext: APIRequestContext;
let testData: TestData = { createdProject?: Project };

test.beforeAll(async ({ playwright }) => {
  apiRequestContext = await playwright.request.newContext({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
  });

  let token = process.env.API_TOKEN || process.env.BEARER_TOKEN || process.env.ACCESS_TOKEN;

  if (!token) {
    const tokenResponse = await apiRequestContext.post('/oauth/token', {
      form: {
        grant_type: 'client_credentials',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: 'openid',
      },
    });

    if (tokenResponse.ok()) {
      const tokenData = await tokenResponse.json();
      token = tokenData.access_token;
    } else {
      throw new Error('Failed to fetch OAuth2 token');
    }
  }

  apiRequestContext.setExtraHTTPHeaders({
    Authorization: `Bearer ${token}`,
  });
});

test.afterEach(async () => {
  if (testData.createdProject) {
    const deleteResponse = await apiRequestContext.delete(`/api/v1/project/${testData.createdProject.id}`);
    expect(deleteResponse.status()).toBe(204);
  }
});

test.afterAll(async () => {
  await apiRequestContext.dispose();
});

function generateValidProjectData(): Project {
  return {
    id: uuidv4(),
    name: `Test Project ${uuidv4()}`,
    description: 'A test project for API testing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function generateInvalidProjectData(): Partial<Project> {
  return {
    name: '',
    description: '',
  };
}

function generateBoundaryProjectData(): Project {
  return {
    id: uuidv4(),
    name: 'A'.repeat(255),
    description: 'A'.repeat(1000),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test('E2E API Test Suite for CRUD Operations on e2n Resource', async () => {
  allure.epic('E2E API Tests');
  allure.feature('CRUD Operations');
  allure.story('Project Resource');

  // CREATE
  const createData = generateValidProjectData();
  const createResponse = await apiRequestContext.post('/api/v1/project', {
    data: createData,
  });
  expect(createResponse.status()).toBe(201);
  const createdProject = await createResponse.json();
  expect(createdProject).toMatchObject(createData);
  expect(createdProject.createdAt).toBeDefined();
  expect(createdProject.updatedAt).toBeDefined();
  testData.createdProject = createdProject;

  // READ
  const readResponse = await apiRequestContext.get(`/api/v1/project/${createdProject.id}`);
  expect(readResponse.status()).toBe(200);
  const readProject = await readResponse.json();
  expect(readProject).toEqual(createdProject);

  // UPDATE
  const updateData = { name: `Updated ${createdProject.name}` };
  const updateResponse = await apiRequestContext.put(`/api/v1/project/${createdProject.id}`, {
    data: updateData,
  });
  expect(updateResponse.status()).toBe(200);
  const updatedProject = await updateResponse.json();
  expect(updatedProject.name).toBe(updateData.name);
  expect(updatedProject.description).toBe(createdProject.description);
  expect(updatedProject.updatedAt).not.toBe(createdProject.updatedAt);

  // DELETE
  const deleteResponse = await apiRequestContext.delete(`/api/v1/project/${createdProject.id}`);
  expect(deleteResponse.status()).toBe(204);

  // Verify Deletion
  const verifyDeleteResponse = await apiRequestContext.get(`/api/v1/project/${createdProject.id}`);
  expect(verifyDeleteResponse.status()).toBe(404);
});
  });
});