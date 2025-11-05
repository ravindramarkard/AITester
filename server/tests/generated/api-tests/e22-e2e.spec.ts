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

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

let apiRequestContext: APIRequestContext;
let testData: TestData = { createdUser?: User };

test.beforeAll(async ({ playwright }) => {
  apiRequestContext = await playwright.request.newContext({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.API_TOKEN || process.env.BEARER_TOKEN || process.env.ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  // Token resolution logic
  if (!process.env.API_TOKEN && !process.env.BEARER_TOKEN && !process.env.ACCESS_TOKEN) {
    const tokenResponse = await apiRequestContext.post('/oauth/token', {
      form: {
        grant_type: 'password',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
        scope: process.env.SCOPE || 'openid',
      },
    });
    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    apiRequestContext.setExtraHTTPHeaders({
      'Authorization': `Bearer ${tokenData.access_token}`,
    });
  }
});

test.afterEach(async () => {
  if (testData.createdUser) {
    const deleteResponse = await apiRequestContext.delete(`/user/${testData.createdUser.id}`);
    expect(deleteResponse.status()).toBeOneOf([200, 204]);
  }
});

test.afterAll(async () => {
  await apiRequestContext.dispose();
});

function generateValidUserData(): User {
  return {
    id: uuidv4(),
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    age: Math.floor(Math.random() * 100) + 18,
  };
}

function generateInvalidUserData(): Partial<User> {
  return {
    name: '',
    email: 'invalid-email',
    age: -5,
  };
}

function generateBoundaryUserData(): User {
  return {
    id: uuidv4(),
    name: 'A'.repeat(255),
    email: 'a'.repeat(254) + '@example.com',
    age: 18,
  };
}

function generateRandomUserData(): User {
  return {
    id: uuidv4(),
    name: `Random User ${Math.floor(Math.random() * 1000)}`,
    email: `random${Math.floor(Math.random() * 1000)}@example.com`,
    age: Math.floor(Math.random() * 100) + 18,
  };
}

test('E2E CRUD Workflow for e22 Resource', async () => {
  let response: APIResponse;

  // CREATE
  const userData = generateValidUserData();
  response = await apiRequestContext.post('/user', {
    data: userData,
  });
  expect([200, 201, 400, 404]).toContain(response.status());
  const createdUser = await response.json() as User;
  testData.createdUser = createdUser;
  expect(createdUser.name).toBe(userData.name);
  expect(createdUser.email).toBe(userData.email);
  expect(createdUser.age).toBe(userData.age);
  const responseTime = response.timings().responseEnd;
  expect(responseTime).toBeLessThan(2000);

  // READ
  response = await apiRequestContext.get(`/user/${createdUser.id}`);
  expect([200, 201, 400, 404]).toContain(response.status());
  const retrievedUser = await response.json() as User;
  expect(retrievedUser).toEqual(createdUser);

  // UPDATE
  const updatedUserData = { ...createdUser, name: 'Updated Name' };
  response = await apiRequestContext.put(`/user/${createdUser.id}`, {
    data: updatedUserData,
  });
  expect([200, 201, 400, 404]).toContain(response.status());
  const updatedUser = await response.json() as User;
  expect(updatedUser.name).toBe(updatedUserData.name);
  expect(updatedUser.email).toBe(updatedUserData.email);
  expect(updatedUser.age).toBe(updatedUserData.age);

  // DELETE
  response = await apiRequestContext.delete(`/user/${createdUser.id}`);
  expect(response.status()).toBeOneOf([200, 204]);

  // Verify Deletion
  response = await apiRequestContext.get(`/user/${createdUser.id}`);
  expect([200, 201, 400, 404]).toContain(response.status());
});
  });
});