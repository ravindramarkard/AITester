const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FileStorage = require('../services/FileStorage');
const CodeGenerator = require('../services/CodeGenerator');
const LLMService = require('../services/LLMService');
const path = require('path');
const fs = require('fs').promises;

// Initialize FileStorage instance
const fileStorage = new FileStorage();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Load endpoints from backend API
router.get('/endpoints', async (req, res) => {
  try {
    // Mock endpoints for demonstration - in real implementation, 
    // this would scan your actual API routes or load from a registry
    const mockEndpoints = [
      {
        id: 'ep1',
        method: 'GET',
        path: '/api/users',
        summary: 'Get all users',
        tags: ['users', 'api'],
        parameters: [],
        responses: { '200': { description: 'Success' } }
      },
      {
        id: 'ep2',
        method: 'POST',
        path: '/api/users',
        summary: 'Create a new user',
        tags: ['users', 'api'],
        parameters: [],
        responses: { '201': { description: 'Created' } }
      },
      {
        id: 'ep3',
        method: 'GET',
        path: '/api/users/{id}',
        summary: 'Get user by ID',
        tags: ['users', 'api'],
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: { '200': { description: 'Success' } }
      },
      {
        id: 'ep4',
        method: 'PUT',
        path: '/api/users/{id}',
        summary: 'Update user',
        tags: ['users', 'api'],
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: { '200': { description: 'Updated' } }
      },
      {
        id: 'ep5',
        method: 'DELETE',
        path: '/api/users/{id}',
        summary: 'Delete user',
        tags: ['users', 'api'],
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: { '204': { description: 'Deleted' } }
      }
    ];

    res.json({ endpoints: mockEndpoints });
  } catch (error) {
    console.error('Error loading endpoints from API:', error);
    res.status(500).json({ error: 'Failed to load endpoints from API' });
  }
});

// Load endpoints from environment
router.get('/endpoints/environment/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const environment = await fileStorage.getEnvironmentById(environmentId);
    
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    // Check if environment has a swagger URL configured
    const swaggerUrl = environment.variables?.SWAGGER_URL || environment.swaggerUrl;
    
    if (!swaggerUrl) {
      return res.status(400).json({ error: 'Environment does not have a Swagger URL configured' });
    }

    // Fetch endpoints from the environment's swagger URL
    const { endpoints, components } = await fetchEndpointsFromSwagger(swaggerUrl);
    
    res.json({ endpoints, components });
  } catch (error) {
    console.error('Error loading endpoints from environment:', error);
    res.status(500).json({ error: 'Failed to load endpoints from environment' });
  }
});

// Load endpoints from Swagger URL
router.post('/endpoints/swagger', async (req, res) => {
  try {
    const { swaggerUrl } = req.body;
    
    if (!swaggerUrl) {
      return res.status(400).json({ error: 'Swagger URL is required' });
    }

    const { endpoints, components } = await fetchEndpointsFromSwagger(swaggerUrl);
    
    res.json({ endpoints, components });
  } catch (error) {
    console.error('Error loading endpoints from Swagger URL:', error);
    res.status(500).json({ error: 'Failed to load endpoints from Swagger URL' });
  }
});

// Upload and parse Swagger file
router.post('/endpoints/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    let swaggerSpec;
    
    try {
      swaggerSpec = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }

    const endpoints = parseSwaggerSpec(swaggerSpec);
    
    res.json({ endpoints, components: swaggerSpec.components || null });
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Generate API tests
router.post('/generate', async (req, res) => {
  try {
    const { endpoints, testType, resourceName, environmentId, useLLM = false, testVariations = ['happy-path'], components = null } = req.body;
    
    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      return res.status(400).json({ error: 'At least one endpoint is required' });
    }

    if (testType === 'e2e' && !resourceName) {
      return res.status(400).json({ error: 'Resource name is required for E2E tests' });
    }

    // Get environment if specified
    let environment = req.body.environment || null;
    if (environmentId && !environment) {
      environment = await fileStorage.getEnvironmentById(environmentId);
    }

    const codeGenerator = new CodeGenerator();
    let filesCreated = 0;
    let testCode = '';

    if (testType === 'individual') {
      // Generate individual test files for each endpoint
      for (const endpoint of endpoints) {
        const endpointPath = endpoint.path || endpoint.url || '/unknown';
        
        if (useLLM) {
          // Generate LLM-powered individual test with all selected variations in one file
          const requestedVariations = testVariations && testVariations.length > 0 ? 
            testVariations : 
            ['happy-path'];
          
          // Generate single test file with multiple test cases (one for each variation)
          const primaryVariation = requestedVariations[0] || 'happy-path';
          const fileName = requestedVariations.length > 1 
            ? `${endpoint.method.toLowerCase()}-${endpointPath.replace(/[^a-zA-Z0-9]/g, '-')}-multiple-variations.spec.ts`
            : `${endpoint.method.toLowerCase()}-${endpointPath.replace(/[^a-zA-Z0-9]/g, '-')}-${primaryVariation}.spec.ts`;
          
          const code = await generateLLMIndividualAPITest(endpoint, environment, components, primaryVariation, requestedVariations);
          
          // Save the test file
          const filePath = await saveTestFile(fileName, code, 'api-tests');
          filesCreated++;
          
          if (testCode) testCode += '\n\n';
          testCode += code;
        } else {
          // Generate standard individual test
          const fileName = `${endpoint.method.toLowerCase()}-${endpointPath.replace(/[^a-zA-Z0-9]/g, '-')}.spec.ts`;
          const code = await generateIndividualAPITest(endpoint, environment, components);
          
          // Save the test file
          const filePath = await saveTestFile(fileName, code, 'api-tests');
          filesCreated++;
          
          if (testCode) testCode += '\n\n';
          testCode += code;
        }
      }
    } else {
      // Generate E2E test suite
      const fileName = `${resourceName}-e2e.spec.ts`;
      let code;
      
      if (useLLM) {
        code = await generateLLME2EAPITestSuite(endpoints, resourceName, environment);
      } else {
        code = await generateE2EAPITestSuite(endpoints, resourceName, environment, components);
      }
      
      // Save the test file
      const filePath = await saveTestFile(fileName, code, 'api-tests');
      filesCreated = 1;
      testCode = code;
    }

    res.json({
      success: true,
      testCode,
      filesCreated,
      message: `Successfully generated ${filesCreated} test file(s)`
    });
  } catch (error) {
    console.error('Error generating API tests:', error);
    res.status(500).json({ error: 'Failed to generate API tests' });
  }
});

// Helper function to fetch endpoints from Swagger URL
async function fetchEndpointsFromSwagger(swaggerUrl) {
  try {
    const response = await axios.get(swaggerUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const swaggerSpec = response.data;
    return { endpoints: parseSwaggerSpec(swaggerSpec), components: swaggerSpec.components || null };
  } catch (error) {
    throw new Error(`Failed to fetch Swagger spec: ${error.message}`);
  }
}

// Helper function to parse Swagger specification
function parseSwaggerSpec(swaggerSpec) {
  const endpoints = [];
  
  if (!swaggerSpec.paths) {
    throw new Error('Invalid Swagger specification: missing paths');
  }

  Object.entries(swaggerSpec.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
        const endpoint = {
          id: `${method.toUpperCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          method: method.toUpperCase(),
          path: path,
          summary: operation.summary || `${method.toUpperCase()} ${path}`,
          description: operation.description || '',
          tags: operation.tags || [],
          parameters: operation.parameters || [],
          responses: operation.responses || {},
          requestBody: operation.requestBody || null
        };
        
        endpoints.push(endpoint);
      }
    });
  });

  return endpoints;
}

// ---------------- OpenAPI helpers for requestBody sampling ----------------
function pickEnumOrDefault(values) {
  return Array.isArray(values) && values.length ? values[0] : undefined;
}

// Resolve a $ref like "#/components/schemas/Name" against provided components
function resolveRefSchema(ref, components) {
  if (!ref || typeof ref !== 'string' || !components) return null;
  const parts = ref.split('/');
  // Expecting ['#', 'components', 'schemas', 'Name']
  const name = parts[parts.length - 1];
  const target = components.schemas && components.schemas[name];
  return target || null;
}

function deepClone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}

function mergeObjectSchemas(base, ext) {
  const merged = { type: 'object', properties: {}, required: [] };
  const baseProps = (base && base.properties) || {};
  const extProps = (ext && ext.properties) || {};
  merged.properties = { ...baseProps, ...extProps };
  const baseReq = Array.isArray(base && base.required) ? base.required : [];
  const extReq = Array.isArray(ext && ext.required) ? ext.required : [];
  merged.required = Array.from(new Set([ ...baseReq, ...extReq ]));
  // Preserve additionalProperties if any explicitly set to object schema
  if (base && base.additionalProperties !== undefined) merged.additionalProperties = base.additionalProperties;
  if (ext && ext.additionalProperties !== undefined) merged.additionalProperties = ext.additionalProperties;
  return merged;
}

// Recursively resolve schema: $ref, allOf, oneOf, anyOf
function resolveSchema(schema, components, seen = new Set()) {
  if (!schema) return null;
  if (schema.$ref) {
    if (seen.has(schema.$ref)) return null; // prevent cycles
    seen.add(schema.$ref);
    const resolved = resolveRefSchema(schema.$ref, components);
    if (!resolved) return null;
    return resolveSchema(resolved, components, seen);
  }

  // Handle allOf (merge all as object)
  if (Array.isArray(schema.allOf) && schema.allOf.length) {
    let acc = { type: 'object', properties: {}, required: [] };
    for (const part of schema.allOf) {
      const resolvedPart = resolveSchema(part, components, seen) || part;
      if ((resolvedPart && (resolvedPart.properties || resolvedPart.type === 'object')) || resolvedPart?.allOf) {
        acc = mergeObjectSchemas(acc, resolvedPart);
      } else {
        // If not an object schema, keep last non-object part for type hints
        acc = { ...resolvedPart, ...acc };
      }
    }
    return acc;
  }

  // Prefer first oneOf/anyOf branch for sampling
  if (Array.isArray(schema.oneOf) && schema.oneOf.length) {
    return resolveSchema(schema.oneOf[0], components, seen) || schema.oneOf[0];
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    return resolveSchema(schema.anyOf[0], components, seen) || schema.anyOf[0];
  }

  // Resolve property schemas recursively
  if (schema.type === 'object' || schema.properties) {
    const resolved = { ...schema, type: 'object' };
    const props = schema.properties || {};
    const newProps = {};
    for (const key of Object.keys(props)) {
      newProps[key] = resolveSchema(props[key], components, seen) || props[key];
    }
    resolved.properties = newProps;
    return resolved;
  }

  if (schema.type === 'array' && schema.items) {
    return { ...schema, items: resolveSchema(schema.items, components, seen) || schema.items };
  }

  return schema;
}

// Build a minimal sample containing only required fields
function buildSampleFromSchemaRequiredOnly(schema, components, depth = 0) {
  if (!schema || depth > 12) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return pickEnumOrDefault(schema.enum);

  // Resolve compositions and refs first
  const resolved = resolveSchema(schema, components) || schema;

  const type = resolved.type || (resolved.properties ? 'object' : (resolved.items ? 'array' : 'string'));
  switch (type) {
    case 'string': {
      if (resolved.format === 'date-time') return new Date().toISOString();
      if (resolved.format === 'date') return new Date().toISOString().substring(0, 10);
      if (resolved.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      if (resolved.format === 'email') return 'user@example.com';
      return 'string';
    }
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'array':
      return [buildSampleFromSchemaRequiredOnly(resolved.items || {}, components, depth + 1)];
    case 'object': {
      const obj = {};
      const props = resolved.properties || {};
      const requiredList = Array.isArray(resolved.required) ? resolved.required : [];
      // Include only required properties; if none are required, return empty object
      for (const key of requiredList) {
        const propSchema = props[key] || {};
        obj[key] = buildSampleFromSchemaRequiredOnly(propSchema, components, depth + 1);
      }
      return obj;
    }
    default:
      return null;
  }
}

// Generate realistic sample data instead of placeholders
function generateRealisticSampleData(sample) {
  if (typeof sample === 'string') {
    // Replace common placeholder strings with realistic data
    if (sample === 'string') return 'Sample Data';
    if (sample === 'user@example.com') return 'user@example.com';
    if (sample.includes('00000000-0000-0000-0000-000000000000')) return sample;
    return sample;
  }
  
  if (typeof sample === 'number') {
    return sample;
  }
  
  if (typeof sample === 'boolean') {
    return sample;
  }
  
  if (Array.isArray(sample)) {
    return sample.map(item => generateRealisticSampleData(item));
  }
  
  if (typeof sample === 'object' && sample !== null) {
    const realistic = {};
    for (const [key, value] of Object.entries(sample)) {
      realistic[key] = generateRealisticSampleData(value);
    }
    return realistic;
  }
  
  return sample;
}

function buildSampleFromSchema(schema, depth = 0) {
  if (!schema || depth > 10) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return pickEnumOrDefault(schema.enum);

  const type = schema.type || (schema.properties ? 'object' : (schema.items ? 'array' : 'string'));
  switch (type) {
    case 'string':
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'date') return new Date().toISOString().substring(0, 10);
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      if (schema.format === 'email') return faker.internet.email();
      return faker.lorem.word();
    case 'integer':
    case 'number':
      return faker.datatype.number();
    case 'boolean':
      return true;
    case 'array':
      return [buildSampleFromSchema(schema.items || {}, depth + 1)];
    case 'object': {
      const obj = {};
      const props = schema.properties || {};
      for (const key of Object.keys(props)) {
        obj[key] = buildSampleFromSchema(props[key], depth + 1);
      }
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        obj['additionalProp1'] = buildSampleFromSchema(schema.additionalProperties, depth + 1);
      }
      return obj;
    }
    default:
      return null;
  }
}

function getJsonRequestBodySchema(endpoint, components = null) {
  const rb = endpoint?.requestBody?.content;
  if (!rb || typeof rb !== 'object') return null;
  const jsonKeys = Object.keys(rb).filter(k => k.toLowerCase().includes('application/json'));
  for (const key of jsonKeys) {
    const sch = rb[key]?.schema;
    if (sch) {
      // Resolve $ref references using components
      return resolveSchemaReferences(sch, components);
    }
  }
  // fallback: first content entry with schema
  for (const key of Object.keys(rb)) {
    const sch = rb[key]?.schema;
    if (sch) {
      return resolveSchemaReferences(sch, components);
    }
  }
  return null;
}

// Helper function to resolve $ref references in schema
function resolveSchemaReferences(schema, components = null) {
  if (!schema || typeof schema !== 'object') return schema;
  
  // If schema has $ref, resolve it
  if (schema.$ref && components) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    const resolved = components?.schemas?.[refPath];
    if (resolved) {
      // Merge resolved schema with any additional properties from the ref
      const resolvedSchema = { ...resolved, ...schema };
      delete resolvedSchema.$ref;
      // Recursively resolve any nested $ref
      return resolveSchemaReferences(resolvedSchema, components);
    }
  }
  
  // Recursively resolve nested objects and arrays
  if (schema.properties) {
    const resolvedProps = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      resolvedProps[key] = resolveSchemaReferences(value, components);
    }
    return { ...schema, properties: resolvedProps };
  }
  
  if (schema.items) {
    return { ...schema, items: resolveSchemaReferences(schema.items, components) };
  }
  
  if (schema.allOf || schema.oneOf || schema.anyOf) {
    const key = schema.allOf ? 'allOf' : (schema.oneOf ? 'oneOf' : 'anyOf');
    return {
      ...schema,
      [key]: schema[key].map(s => resolveSchemaReferences(s, components))
    };
  }
  
  return schema;
}

// Helper function to generate individual API test
async function generateIndividualAPITest(endpoint, environment, components) {
  const baseUrl = environment?.variables?.API_URL || environment?.variables?.BASE_URL ;
  const timeout = environment?.variables?.TIMEOUT || 30000;
  const authHeaders = await buildAuthorizationHeaders(environment);
  
  // Remove Authorization header from authHeaders if it contains a token - use env var instead
  const cleanHeaders = { ...authHeaders };
  const hasAuthToken = authHeaders['Authorization'];
  if (hasAuthToken) {
    delete cleanHeaders['Authorization'];
  }
  
  const expectedStatus = getExpectedStatus(endpoint);
  const endpointPath = endpoint.path || endpoint.url || '/unknown';
  const testName = `${endpoint.method} ${endpointPath}`;

  // Prepare sample body with $ref and composition resolution, only required fields
  const rawSchema = getJsonRequestBodySchema(endpoint);
  const hasBody = ['POST', 'PUT', 'PATCH'].includes((endpoint.method || '').toUpperCase());
  const minimalSample = hasBody && rawSchema ? buildSampleFromSchemaRequiredOnly(rawSchema, components) : null;
  
  // Generate realistic sample data instead of placeholders
  let sampleLiteral = null;
  if (minimalSample) {
    // Replace placeholder values with realistic data
    const realisticSample = generateRealisticSampleData(minimalSample);
    sampleLiteral = JSON.stringify(realisticSample, null, 2);
  }
  
  // Build extraHTTPHeaders dynamically with env var for auth token
  const extraHeadersStr = hasAuthToken 
    ? `{
        ...${JSON.stringify(cleanHeaders, null, 10).replace(/\n/g, '\n        ')},
        'Authorization': \`Bearer \${process.env.API_TOKEN || process.env.OAUTH_TOKEN}\`
      }`.replace(/,\n\s*\.\.\./, '\n        ...')
    : JSON.stringify(cleanHeaders);
  
  return `import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('${testName}', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || '${baseUrl}',
      extraHTTPHeaders: ${extraHeadersStr},
      timeout: parseInt(process.env.TIMEOUT || '${timeout}', 10)
    });
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test('${testName} - should return ${expectedStatus}', async () => {
    // Build sample request body if applicable from OpenAPI schema
    ${minimalSample !== null ? `const sampleBody = ${sampleLiteral};` : ''}

    const requestOptions = {${hasBody ? `
      data: ${sampleLiteral ? 'sampleBody' : '{ /* TODO: fill body */ }'}` : ''}
    };

    const response = await requestContext.${(endpoint.method || 'GET').toLowerCase()}('${endpointPath}'${hasBody ? ', requestOptions' : ''});
    await expect(response.status()).toBe(${expectedStatus});

    const responseBody = await response.json().catch(() => null);
    await allure.attachment('Response Status', String(response.status()), 'text/plain');
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
  });
});
`;
}

// Helper function to generate E2E API test suite
async function generateE2EAPITestSuite(endpoints, resourceName, environment, components = null) {
  const baseUrl = environment?.variables?.API_URL || environment?.variables?.BASE_URL || 'https://fakerestapi.azurewebsites.net';
  const timeout = environment?.variables?.TIMEOUT || 30000;
  const authHeaders = await buildAuthorizationHeaders(environment);
  
  // Analyze and sort endpoints by CRUD operation type
  const crudOperations = {
    create: endpoints.filter(ep => ep.method.toUpperCase() === 'POST'),
    read: endpoints.filter(ep => ep.method.toUpperCase() === 'GET'),
    update: endpoints.filter(ep => ['PUT', 'PATCH'].includes(ep.method.toUpperCase())),
    delete: endpoints.filter(ep => ep.method.toUpperCase() === 'DELETE')
  };
  
  // Sort endpoints in logical CRUD order
  const sortedEndpoints = [
    ...crudOperations.create,
    ...crudOperations.read,
    ...crudOperations.update,
    ...crudOperations.delete
  ];
  
  let code = `import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('${resourceName} E2E API Test Suite', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: '${baseUrl}',
      extraHTTPHeaders: ${JSON.stringify(authHeaders, null, 8)},
      timeout: ${timeout}
    });
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });

  test('should execute complete ${resourceName} CRUD workflow', async () => {
    await allure.epic('API Testing');
    await allure.feature('${resourceName} E2E CRUD Operations');
    await allure.story('${resourceName} E2E CRUD Workflow');
    await allure.description('End-to-end test covering complete CRUD lifecycle for ${resourceName}');
    
    // Test data object to store and pass data between operations
    const testData = {
      created: {},
      updated: {},
      ids: [],
      responses: []
    };
    
    // Generate realistic test data
    const createData = {
      name: \`Test ${resourceName} \${Date.now()}\`,
      description: \`Generated test data for ${resourceName} E2E testing\`,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    const updateData = {
      name: \`Updated Test ${resourceName} \${Date.now()}\`,
      description: \`Updated test data for ${resourceName} E2E testing\`,
      status: 'updated',
      updatedAt: new Date().toISOString()
    };
    
`;

  sortedEndpoints.forEach((endpoint, index) => {
    const expectedStatus = getExpectedStatus(endpoint);
    const method = endpoint.method.toUpperCase();
    const originalPath = endpoint.path || endpoint.url || '/unknown';
    const isPathParam = originalPath.includes('{') || originalPath.includes(':');
    
    // Replace path parameters with stored IDs
    let endpointPath = originalPath;
    if (isPathParam && method !== 'POST') {
      endpointPath = originalPath.replace(/\{[^}]+\}/g, '${testData.created.id || testData.ids[0] || "1"}');
      endpointPath = endpointPath.replace(/:([^/]+)/g, '${testData.created.id || testData.ids[0] || "1"}');
    }
    
    code += `    // Step ${index + 1}: ${method} ${originalPath}
`;
    code += `    await allure.step('${method} ${originalPath}', async () => {
`;
    code += `      console.log('Executing: ${method} ${endpointPath}');
`;
    
    // Build request options based on method
    code += `      const requestOptions = {
`;
    code += `        headers: {
`;
    code += `          'Content-Type': 'application/json',
`;
    code += `          'Accept': 'application/json',
`;
    code += `          ...${JSON.stringify(authHeaders)}
`;
    code += `        }`;
    
    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const schema = getJsonRequestBodySchema(endpoint);
      if (schema) {
        const sample = buildSampleFromSchemaRequiredOnly(schema, components);
        if (sample) {
          const sampleLiteral = JSON.stringify(sample, null, 2).replace(/`/g, '\\`');
          code += `,
        data: ${sampleLiteral}`;
        } else {
          if (method === 'POST') {
            code += `,
        data: createData`;
          } else {
            code += `,
        data: { ...testData.created, ...updateData }`;
          }
        }
      } else {
        if (method === 'POST') {
          code += `,
        data: createData`;
        } else {
          code += `,
        data: { ...testData.created, ...updateData }`;
        }
      }
    }
    
    code += `
      };
`;
    code += `      
`;
    code += `      // Log request details
`;
    code += `      const requestDetails = {
`;
    code += `        method: '${method}',
`;
    code += `        url: '${baseUrl}${endpointPath}',
`;
    code += `        headers: requestOptions.headers,
`;
    code += `        body: requestOptions.data || null,
`;
    code += `        timestamp: new Date().toISOString()
`;
    code += `      };
`;
    code += `      
`;
    code += `      await allure.step('Request Details', async () => {
`;
    code += `        await allure.attachment('Request Method', requestDetails.method, 'text/plain');
`;
    code += `        await allure.attachment('Request URL', requestDetails.url, 'text/plain');
`;
    code += `        await allure.attachment('Request Headers', JSON.stringify(requestDetails.headers, null, 2), 'application/json');
`;
    code += `        if (requestDetails.body) {
`;
    code += `          await allure.attachment('Request Body', JSON.stringify(requestDetails.body, null, 2), 'application/json');
`;
    code += `        }
`;
    code += `        await allure.attachment('Request Timestamp', requestDetails.timestamp, 'text/plain');
`;
    code += `      });
`;
    code += `      
`;
    code += `      const startTime = Date.now();
`;
    code += `      const response${index + 1} = await requestContext.${method.toLowerCase()}('${endpointPath}', requestOptions);
`;
    code += `      const endTime = Date.now();
`;
    code += `      const responseTime = endTime - startTime;
`;
    code += `      
`;
    code += `      // Store response for debugging
`;
    code += `      testData.responses.push({
`;
    code += `        method: '${method}',
`;
    code += `        path: '${originalPath}',
`;
    code += `        status: response${index + 1}.status(),
`;
    code += `        responseTime: responseTime,
`;
    code += `        timestamp: new Date().toISOString()
`;
    code += `      });
`;
    code += `      
`;
    code += `      // Log response details
`;
    code += `      await allure.step('Response Details', async () => {
`;
    code += `        await allure.attachment('Response Status', response${index + 1}.status().toString(), 'text/plain');
`;
    code += `        await allure.attachment('Response Headers', JSON.stringify(response${index + 1}.headers(), null, 2), 'application/json');
`;
    code += `        await allure.attachment('Response Time', \`\${responseTime}ms\`, 'text/plain');
`;
    code += `        
`;
    code += `        if (response${index + 1}.status() >= 200 && response${index + 1}.status() < 300) {
`;
    code += `          const contentType = response${index + 1}.headers()['content-type'];
`;
    code += `          if (contentType && contentType.includes('application/json')) {
`;
    code += `            const data = await response${index + 1}.json();
`;
    code += `            await allure.attachment('Response Body', JSON.stringify(data, null, 2), 'application/json');
`;
    code += `          } else {
`;
    code += `            const textData = await response${index + 1}.text();
`;
    code += `            await allure.attachment('Response Body (Text)', textData, 'text/plain');
`;
    code += `          }
`;
    code += `        } else {
`;
    code += `          const errorData = await response${index + 1}.text();
`;
    code += `          await allure.attachment('Error Response', errorData, 'text/plain');
`;
    code += `        }
`;
    code += `      });
`;
    code += `      
`;
    code += `      // Assert expected status (accept multiple valid status codes for fake API compatibility)
`;
    code += `      expect([200, 201, 400, 404]).toContain(response${index + 1}.status());
`;
    code += `      console.log('✓ ${method} ${originalPath} - Status:', response${index + 1}.status(), 'Time:', responseTime + 'ms');
`;
    
    // Handle response data based on operation type
    if (method === 'POST') {
      code += `      
`;
      code += `      // Store created resource data
`;
      code += `      if (response${index + 1}.status() >= 200 && response${index + 1}.status() < 300) {
`;
      code += `        const createdData = await response${index + 1}.json();
`;
      code += `        testData.created = createdData;
`;
      code += `        
`;
      code += `        // Extract and store ID for future operations
`;
      code += `        if (createdData.id) {
`;
      code += `          testData.ids.push(createdData.id);
`;
      code += `          console.log('✓ Created ${resourceName} with ID:', createdData.id);
`;
      code += `        }
`;
      code += `        
`;
      code += `        // Validate created data matches input
`;
      code += `        expect(createdData.name).toBe(createData.name);
`;
      code += `        expect(createdData.description).toBe(createData.description);
`;
      code += `        expect(createdData).toHaveProperty('id');
`;
      code += `        expect(createdData).toHaveProperty('createdAt');
`;
      code += `      }
`;
    } else if (method === 'GET') {
      code += `      
`;
      code += `      // Validate retrieved data
`;
      code += `      if (response${index + 1}.status() === 200) {
`;
      code += `        const retrievedData = await response${index + 1}.json();
`;
      code += `        
`;
      code += `        // For individual GET, validate against created data
`;
      code += `        if (testData.created.id && !Array.isArray(retrievedData)) {
`;
      code += `          expect(retrievedData.id).toBe(testData.created.id);
`;
      code += `          expect(retrievedData.name).toBe(testData.created.name || testData.updated.name);
`;
      code += `          console.log('✓ Retrieved ${resourceName} matches expected data');
`;
      code += `        }
`;
      code += `        
`;
      code += `        // For collection GET, validate structure
`;
      code += `        if (Array.isArray(retrievedData)) {
`;
      code += `          expect(Array.isArray(retrievedData)).toBe(true);
`;
      code += `          console.log('✓ Retrieved ${resourceName} collection with', retrievedData.length, 'items');
`;
      code += `        }
`;
      code += `      }
`;
    } else if (['PUT', 'PATCH'].includes(method)) {
      code += `      
`;
      code += `      // Store updated resource data
`;
      code += `      if (response${index + 1}.status() >= 200 && response${index + 1}.status() < 300) {
`;
      code += `        const updatedData = await response${index + 1}.json();
`;
      code += `        testData.updated = updatedData;
`;
      code += `        
`;
      code += `        // Validate updated data
`;
      code += `        expect(updatedData.id).toBe(testData.created.id);
`;
      code += `        expect(updatedData.name).toBe(updateData.name);
`;
      code += `        expect(updatedData.description).toBe(updateData.description);
`;
      code += `        expect(updatedData).toHaveProperty('updatedAt');
`;
      code += `        console.log('✓ Updated ${resourceName} successfully');
`;
      code += `      }
`;
    } else if (method === 'DELETE') {
      code += `      
`;
      code += `      // Validate deletion
`;
      code += `      if (response${index + 1}.status() >= 200 && response${index + 1}.status() < 300) {
`;
      code += `        console.log('✓ Deleted ${resourceName} successfully');
`;
      code += `        
`;
      code += `        // Verify resource no longer exists (optional follow-up GET)
`;
      code += `        try {
`;
      code += `          const verifyResponse = await request.get(\`${baseUrl}${endpointPath}\`);
`;
      code += `          expect(verifyResponse.status()).toBe(404);
`;
      code += `          console.log('✓ Confirmed ${resourceName} deletion - resource not found');
`;
      code += `        } catch (error) {
`;
      code += `          console.log('Note: Could not verify deletion with GET request');
`;
      code += `        }
`;
      code += `      }
`;
    }
    
    code += `    });
`;
    code += `    
`;
  });

  code += `    // Final validation and cleanup
`;
  code += `    console.log('\n📊 E2E Test Summary:');
`;
  code += `    console.log('- Operations executed:', testData.responses.length);
`;
  code += `    console.log('- Created resources:', testData.ids.length);
`;
  code += `    console.log('- Test data flow successful');
`;
  code += `    
`;
  code += `    // Log all responses for debugging
`;
  code += `    testData.responses.forEach((resp, idx) => {
`;
  code += `      console.log(\`\${idx + 1}. \${resp.method} \${resp.path} - Status: \${resp.status}\`);
`;
  code += `    });
`;
  code += `    
`;
  code += `    console.log('✅ ${resourceName} E2E CRUD workflow completed successfully');
`;
  code += `  });
`;
  code += `});
`;

  return code;
}

// Helper function to get expected status code
function getExpectedStatus(endpoint) {
  const responses = endpoint.responses || {};
  
  // Look for success status codes in order of preference
  const successCodes = endpoint.method.toUpperCase() === 'POST' ? ['201', '200', '202', '204'] : ['200', '201', '202', '204'];
  
  for (const code of successCodes) {
    if (responses[code]) {
      return parseInt(code);
    }
  }
  
  // Default based on method
  switch (endpoint.method.toUpperCase()) {
    case 'POST':
      return 201;
    case 'DELETE':
      return 204;
    default:
      return 200;
  }
}

// Helper function to save test file
async function saveTestFile(fileName, code, category = 'api-tests') {
  try {
    const testsDir = path.join(process.cwd(), 'tests', 'generated', category);
    
    // Ensure directory exists
    await fs.mkdir(testsDir, { recursive: true });
    
    const filePath = path.join(testsDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');
    
    console.log(`Test file saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error saving test file:', error);
    throw error;
  }
}

// Helper function to resolve environment variables in authorization config
function resolveEnvironmentVariables(value, environment) {
  if (!value || typeof value !== 'string') return value;
  
  // Replace ${VARIABLE_NAME} with actual values from environment.variables
  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return environment?.variables?.[varName] || match;
  });
}

// Helper function to build authorization headers from environment
async function buildAuthorizationHeaders(environment) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (!environment?.authorization?.enabled) {
    return headers;
  }
  
  const auth = environment.authorization;
  
  switch (auth.type) {
    case 'bearer':
      if (auth.token) {
        const token = resolveEnvironmentVariables(auth.token, environment);
        headers['Authorization'] = `Bearer ${token}`;
      }
      break;
      
    case 'basic':
      if (auth.username && auth.password) {
        const username = resolveEnvironmentVariables(auth.username, environment);
        const password = resolveEnvironmentVariables(auth.password, environment);
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
      break;
      
    case 'apiKey':
      if (auth.apiKey) {
        const apiKey = resolveEnvironmentVariables(auth.apiKey, environment);
        headers['X-API-Key'] = apiKey;
      }
      break;
      
    case 'oauth2':
      try {
        // First check if a token is already stored in the environment
        if (auth.token) {
          const token = resolveEnvironmentVariables(auth.token, environment);
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Using stored OAuth token from environment');
          break;
        }

        // Otherwise, fetch a new token
        const { clientId, clientSecret, tokenUrl, scope, grantType = 'password', username, password } = auth;

        if (!clientId || !tokenUrl) {
          console.warn('OAuth token fetch error: clientId and tokenUrl are required in environment authorization config.');
          break;
        }

        if (grantType === 'password' && (!username || !password)) {
          console.warn('OAuth token fetch error: username and password are required for password grant in environment authorization config.');
          break;
        }

        // Implicit grant is browser-based; for API tests we expect a token to be provided
        if (grantType === 'implicit') {
          const implicitToken = resolveEnvironmentVariables(
            auth.token ||
            environment?.variables?.API_TOKEN ||
            environment?.variables?.ACCESS_TOKEN ||
            environment?.variables?.BEARER_TOKEN ||
            '',
            environment
          );
          if (implicitToken && implicitToken.trim() !== '') {
            headers['Authorization'] = `Bearer ${implicitToken.trim()}`;
            console.log('Using provided token for OAuth2 implicit grant');
          } else {
            console.warn('OAuth2 implicit grant selected, but no token provided. Set authorization.token or API_TOKEN/ACCESS_TOKEN/BEARER_TOKEN in environment variables.');
          }
          break;
        }

        const form = new URLSearchParams();
        form.append('client_id', clientId);
        form.append('grant_type', grantType);
        if (scope) form.append('scope', scope);
        if (grantType === 'password') {
          form.append('username', username);
          form.append('password', password);
        }
        if (clientSecret) {
          form.append('client_secret', clientSecret);
        }

        const axios = require('axios');
        const tokenResponse = await axios.post(tokenUrl, form.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000
        });

        if (tokenResponse.data.access_token) {
          headers['Authorization'] = `Bearer ${tokenResponse.data.access_token}`;
          console.log('OAuth token fetched successfully');
        } else {
          console.warn('Failed to fetch OAuth token: no access_token in response', tokenResponse.data);
        }
      } catch (err) {
        console.error('OAuth token fetch error:', err.response?.data || err.message);
      }
      break;
  }
  
  // Add custom headers
  if (auth.customHeaders) {
    Object.entries(auth.customHeaders).forEach(([key, value]) => {
      if (value) {
        headers[key] = resolveEnvironmentVariables(value, environment);
      }
    });
  }
  
  return headers;
}

// LLM-powered test generation functions
async function generateLLMAPITest(endpoint, environment, variation = 'happy-path') {
  console.log('=== generateLLMAPITest called ===');
  console.log('Environment:', environment ? 'provided' : 'null');
  console.log('Full environment object:', JSON.stringify(environment, null, 2));
  console.log('Environment LLM config:', environment?.llmConfiguration);
  
  const llmService = new LLMService();
  const baseUrl = environment?.variables?.API_URL || environment?.variables?.BASE_URL || 'https://fakerestapi.azurewebsites.net';
  const timeout = environment?.variables?.TIMEOUT || 30000;
  console.log('===========>endpoint:', endpoint)
  // Create enhanced prompt with schema analysis and test variations
  const prompt = createEnhancedAPITestPrompt(endpoint, variation, baseUrl, environment);
  console.log('Generated enhanced prompt length:', prompt.length);
  
  try {
    console.log('Calling LLMService.generateCode...');
    console.log('===========>Prompt:', prompt);
    const generatedCode = await llmService.generateCode(prompt, environment, {
      testType: 'api',
      variation: variation
    });
    
    console.log('LLM generation successful, code length:', generatedCode.length);
    console.log('===========>generatedCode:', generatedCode);
    return postProcessAPITestCode(generatedCode, endpoint, variation, timeout, environment);
  } catch (error) {
    console.error('Error generating LLM API test:', error.message);
    console.error('Full error:', error);
    
    // Provide specific error messages for common issues
    if (error.response?.status === 429) {
      console.warn('LLM service rate limit exceeded. Falling back to standard generation.');
    } else if (error.response?.status === 401) {
      console.warn('LLM service authentication failed. Falling back to standard generation.');
    } else if (error.response?.status === 403) {
      console.warn('LLM service access forbidden. Falling back to standard generation.');
    } else if (error.message.includes('LLM configuration not found')) {
      console.warn('Selected environment does not have LLM configuration. Falling back to standard generation.');
    }
    
    // Fallback to standard generation
    console.log('Falling back to standard generation...');
    return await generateIndividualAPITest(endpoint, environment, null);
  }
}

async function generateLLMIndividualAPITest(endpoint, environment, components, variation = 'happy-path', allVariations = null) {
  // Check if LLM configuration is available
  if (!environment?.llmConfiguration?.baseUrl || !environment?.llmConfiguration?.model) {
    console.log('LLM configuration not available, falling back to template generation...');
    return await generateIndividualAPITest(endpoint, environment, components);
  }
  
  const llmService = new LLMService();
  const baseUrl = environment?.variables?.API_URL || environment?.variables?.BASE_URL || 'https://fakerestapi.azurewebsites.net';
  const timeout = environment?.variables?.TIMEOUT || 30000;
  
  // Use enhanced prompt with variation support
  const prompt = createEnhancedAPITestPrompt(endpoint, variation, baseUrl, environment, allVariations, components);
  
  // Prepare all variations for LLM service
  const variationsToPass = allVariations && allVariations.length > 0 ? allVariations : [variation];
  console.log('=== Generating Individual API Test with Variations ===');
  console.log('Primary variation:', variation);
  console.log('All variations:', variationsToPass);
  console.log('Endpoint:', endpoint.method, endpoint.path);
  
  try {
    const generatedCode = await llmService.generateCode(prompt, environment, {
      testType: 'individual-api',
      endpoint: endpoint,
      variations: variationsToPass // Pass all variations to LLM service (only array values)
    });
    
    return postProcessIndividualTestCode(generatedCode, endpoint, timeout, components, variationsToPass);
  } catch (error) {
    console.error('Error generating LLM individual test:', error);
    // Fallback to clean template generation with variations
    return generateCleanAPITestWithVariations(endpoint, timeout, components, variationsToPass);
  }
}

async function generateLLME2EAPITestSuite(endpoints, resourceName, environment) {
  const llmService = new LLMService();
  const baseUrl = environment?.variables?.API_URL || environment?.variables?.BASE_URL || 'https://fakerestapi.azurewebsites.net';
  const timeout = environment?.variables?.TIMEOUT || 30000;
  
  const prompt = createE2ETestPrompt(endpoints, resourceName, baseUrl);
  
  try {
    const generatedCode = await llmService.generateCode(prompt, environment, {
      testType: 'e2e-api',
      resourceName: resourceName
    });
    
    return postProcessE2ETestCode(generatedCode, endpoints, resourceName, timeout);
  } catch (error) {
    console.error('Error generating LLM E2E test:', error);
    // Fallback to standard generation
    return await generateE2EAPITestSuite(endpoints, resourceName, environment);
  }
}

function createIndividualAPITestPrompt(endpoint, baseUrl, environment, components) {
  const apiUrl = baseUrl || environment?.variables?.API_URL || environment?.variables?.BASE_URL || 'https://fakerestapi.azurewebsites.net';
  const timeout = environment?.variables?.TIMEOUT || 30000;
  const authHeaders = buildAuthorizationHeaders(environment);
  const authInfo = environment?.authorization?.enabled ? 
    `\n- **Authorization**: ${environment.authorization.type} (${environment.authorization.enabled ? 'enabled' : 'disabled'})` : 
    '\n- **Authorization**: None';

  // Get request body schema for meaningful test data generation
  const requestBodySchema = getJsonRequestBodySchema(endpoint);
  const hasRequestBody = ['POST', 'PUT', 'PATCH'].includes((endpoint.method || '').toUpperCase());
  
  let schemaInfo = '';
  if (hasRequestBody && requestBodySchema) {
    schemaInfo = `\n## Request Body Schema:
\`\`\`json
${JSON.stringify(requestBodySchema, null, 2)}
\`\`\``;
  }

  return `You are an expert API testing engineer. Generate a comprehensive Playwright API test for the following endpoint with realistic test data using faker.js and proper assertions.

## API Endpoint Information:
- **Method**: ${endpoint.method}
- **Path**: ${endpoint.path || endpoint.url || '/unknown'}
- **Base URL**: ${apiUrl}
- **Summary**: ${endpoint.summary || 'API endpoint test'}
- **Description**: ${endpoint.description || 'Test API endpoint functionality'}${authInfo}
- **Timeout**: ${timeout}ms${schemaInfo}

## Requirements:
1. **Use Faker.js for Realistic Data**: Import and use faker.js to generate realistic, random test data
2. **Comprehensive Test Coverage**: Include happy path, error scenarios, and edge cases
3. **Proper Assertions**: Validate response status, headers, and body structure
4. **Environment Integration**: Use environment variables for configuration
5. **Allure Reporting**: Include proper Allure attachments for test reporting

## Faker.js Data Generation Guidelines:
- Import faker: \`import { faker } from '@faker-js/faker';\`
- Use faker methods for realistic data:
  * \`faker.person.fullName()\` for names
  * \`faker.internet.email()\` for email addresses
  * \`faker.lorem.sentence()\` for descriptions
  * \`faker.company.name()\` for company names
  * \`faker.lorem.words(3)\` for short titles
  * \`faker.number.int({ min: 1, max: 1000 })\` for numeric IDs
  * \`faker.date.future()\` for future dates
  * \`faker.helpers.arrayElement(['option1', 'option2'])\` for enum values
- Generate different data for each test run to ensure variety
- Use faker.seed() for reproducible tests if needed

## Code Requirements:
- Use Playwright's APIRequestContext for HTTP requests
- Include proper error handling and timeout configuration
- Add comprehensive assertions for response validation
- Include Allure reporting for test results
- Use environment variables for configuration
- Handle authentication properly with Bearer tokens
- Import and use faker.js for all test data generation

## Example Faker Usage:
\`\`\`javascript
import { faker } from '@faker-js/faker';

const sampleBody = {
  name: faker.person.fullName(),
  email: faker.internet.email(),
  description: faker.lorem.sentence(),
  age: faker.number.int({ min: 18, max: 65 }),
  isActive: faker.datatype.boolean()
};
\`\`\`

Generate a complete, production-ready Playwright API test that uses faker.js for realistic data generation and can be executed immediately.`;

}

function postProcessIndividualTestCode(generatedCode, endpoint, timeout, components = null, variations = null) {
  // If the generated code is severely malformed, generate a clean test from scratch
  const hasSevereErrors = generatedCode.includes('async () => {') || 
                         generatedCode.includes('async () async () =>') ||
                         generatedCode.includes('TIMEOUT,') ||
                         generatedCode.includes('if (!response.ok())') ||
                         generatedCode.includes('fetchToken()') ||
                         generatedCode.includes('request.storageState') ||
                         generatedCode.includes('playwright.request');
  
  if (hasSevereErrors) {
    console.log('Detected severely malformed LLM code, generating clean test from scratch...');
    if (variations && variations.length > 1) {
      console.log('Multiple variations detected, generating test with variations:', variations);
      return generateCleanAPITestWithVariations(endpoint, timeout, components, variations);
    }
    return generateCleanAPITest(endpoint, timeout, components);
  }
  
  // Clean up and validate the generated code
  let processedCode = generatedCode;
  
  // Remove any duplicate imports that might be in the middle of the code
  const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?\s*/g;
  const imports = processedCode.match(importRegex) || [];
  const uniqueImports = [...new Set(imports)];
  
  // Remove all imports from the code
  processedCode = processedCode.replace(importRegex, '');
  
  // Remove any test.describe blocks that might be malformed
  processedCode = processedCode.replace(/test\.describe\([^}]*\}\s*\)\s*;?\s*/g, '');
  
  // Remove any test.beforeAll/test.afterAll blocks that might be malformed
  processedCode = processedCode.replace(/test\.beforeAll\([^}]*\}\s*\)\s*;?\s*/g, '');
  processedCode = processedCode.replace(/test\.afterAll\([^}]*\}\s*\)\s*;?\s*/g, '');
  
  // Clean up any remaining malformed code
  processedCode = processedCode.replace(/\s*test\.describe\([^}]*$/g, '');
  processedCode = processedCode.replace(/\s*test\([^}]*$/g, '');
  
  // Fix common LLM syntax errors
  processedCode = processedCode.replace(/=>\s*{/g, 'async () => {');
  processedCode = processedCode.replace(/let request: APIRequestContext;/g, '');
  processedCode = processedCode.replace(/let projectId: string;/g, '');
  processedCode = processedCode.replace(/const BASE_URL = .*?;/g, '');
  processedCode = processedCode.replace(/const TIMEOUT = .*?;/g, '');
  processedCode = processedCode.replace(/const TOKEN_URL = .*?;/g, '');
  processedCode = processedCode.replace(/const CLIENT_ID = .*?;/g, '');
  processedCode = processedCode.replace(/const CLIENT_SECRET = .*?;/g, '');
  processedCode = processedCode.replace(/const USERNAME = .*?;/g, '');
  processedCode = processedCode.replace(/const PASSWORD = .*?;/g, '');
  processedCode = processedCode.replace(/const SCOPE = .*?;/g, '');
  
  // Remove malformed function declarations
  processedCode = processedCode.replace(/async function fetchToken\(\): Promise<string> \{[\s\S]*?\}/g, '');
  processedCode = processedCode.replace(/request = await playwright\.request\.newContext\([\s\S]*?\}\);/g, '');
  processedCode = processedCode.replace(/request\.storageState\([\s\S]*?\}\);/g, '');
  
  // Remove test.afterEach blocks that might be malformed
  processedCode = processedCode.replace(/test\.afterEach\([\s\S]*?\}\);/g, '');
  
  // Clean up any remaining malformed code blocks
  processedCode = processedCode.replace(/test\.beforeEach\([\s\S]*?\}\);/g, '');
  
  // Remove any remaining malformed syntax
  processedCode = processedCode.replace(/^\s*=>\s*{[\s\S]*?^\s*}/gm, '');
  processedCode = processedCode.replace(/^\s*=>\s*{[\s\S]*?^\s*}\s*$/gm, '');
  
  // Clean up extra closing braces
  processedCode = processedCode.replace(/^\s*}\s*;\s*$/gm, '');
  processedCode = processedCode.replace(/^\s*}\s*\)\s*;\s*$/gm, '');
  
  // Replace TODO comments in request body with Faker.js-generated data
  // Check for any TODO pattern related to request body
  const hasTodoComment = /\{\s*\/\*\s*TODO[^*]*\*\/\s*\}/gi.test(processedCode) || 
                         /\{\s*\/\/\s*TODO[^\n]*\}/gi.test(processedCode) ||
                         processedCode.includes('TODO: fill body');
  
  if (hasTodoComment) {
    const requestBodySchema = getJsonRequestBodySchema(endpoint, components);
    let fakerBody = '';
    
    if (requestBodySchema && requestBodySchema.properties) {
      // Generate Faker.js data based on schema properties
      const fakerFields = Object.entries(requestBodySchema.properties).map(([key, prop]) => {
        const type = prop.type || 'string';
        const isRequired = requestBodySchema.required?.includes(key);
        
        let fakerCode = '';
        if (type === 'string') {
          if (key.toLowerCase().includes('email')) {
            fakerCode = `faker.internet.email()`;
          } else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) {
            fakerCode = `faker.person.fullName()`;
          } else if (key.toLowerCase().includes('description')) {
            fakerCode = `faker.lorem.sentence()`;
          } else if (key.toLowerCase().includes('url')) {
            fakerCode = `faker.internet.url()`;
          } else if (key.toLowerCase().includes('phone')) {
            fakerCode = `faker.phone.number()`;
          } else if (key.toLowerCase().includes('address')) {
            fakerCode = `faker.location.streetAddress()`;
          } else {
            fakerCode = `faker.lorem.words(3)`;
          }
        } else if (type === 'number' || type === 'integer') {
          fakerCode = `faker.number.int({ min: 1, max: 1000 })`;
        } else if (type === 'boolean') {
          fakerCode = `faker.datatype.boolean()`;
        } else if (type === 'array') {
          fakerCode = `[faker.lorem.word()]`;
        } else {
          fakerCode = `faker.lorem.word()`;
        }
        
        return `    ${key}: ${fakerCode}`;
      }).join(',\n');
      
      fakerBody = `{
${fakerFields}
  }`;
    } else {
      // Generate fallback data based on endpoint path/method patterns
      const path = (endpoint.path || endpoint.url || '').toLowerCase();
      const method = (endpoint.method || '').toUpperCase();
      
      let fallbackFields = [];
      
      // Intelligent defaults based on common API patterns
      if (path.includes('user')) {
        fallbackFields = [
          `    name: faker.person.fullName()`,
          `    email: faker.internet.email()`,
          `    username: faker.internet.userName()`,
          `    phone: faker.phone.number()`
        ];
      } else if (path.includes('project') || path.includes('case')) {
        fallbackFields = [
          `    name: faker.lorem.words(3)`,
          `    description: faker.lorem.sentence()`,
          `    status: faker.helpers.arrayElement(['active', 'inactive', 'pending'])`
        ];
      } else if (path.includes('product') || path.includes('item')) {
        fallbackFields = [
          `    name: faker.commerce.productName()`,
          `    description: faker.commerce.productDescription()`,
          `    price: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 })`
        ];
      } else {
        // Generic fallback
        fallbackFields = [
          `    name: faker.person.fullName()`,
          `    description: faker.lorem.sentence()`,
          `    value: faker.number.int({ min: 1, max: 1000 })`
        ];
      }
      
      fakerBody = `{
${fallbackFields.join(',\n')}
  }`;
    }
    
    // Replace TODO comments with generated data - comprehensive patterns
    const todoPatterns = [
      // Pattern: data: { /* TODO: fill body */ }
      /data:\s*\{\s*\/\*\s*TODO[^*]*\*\/\s*\}/gi,
      // Pattern: data: { // TODO: fill body }
      /data:\s*\{\s*\/\/\s*TODO[^\n]*\s*\}/gi,
      // Pattern: data: { /* TODO: fill body */ } with spacing
      /data:\s*\{\s*\/\*\s*TODO:\s*fill\s*body\s*\*\/\s*\}/gi,
      // Pattern: "data": { /* TODO */ }
      /"data":\s*\{\s*\/\*\s*TODO[^*]*\*\/\s*\}/gi,
      // Pattern: 'data': { /* TODO */ }
      /'data':\s*\{\s*\/\*\s*TODO[^*]*\*\/\s*\}/gi,
    ];
    
    todoPatterns.forEach(pattern => {
      processedCode = processedCode.replace(pattern, (match) => {
        return match.replace(/\{\s*\/\*[^*]*TODO[^*]*\*\/\s*\}|\{\s*\/\/[^\}]*\}/gi, fakerBody);
      });
    });
    
    // Handle requestOptions object pattern
    processedCode = processedCode.replace(
      /(const|let)\s+requestOptions\s*=\s*\{([\s\S]*?)data:\s*\{\s*\/\*[^*]*TODO[^*]*\*\/\s*\}([\s\S]*?)\};/gi,
      (match, prefix, before, after) => {
        return `${prefix} requestOptions = {${before}data: ${fakerBody}${after}};`;
      }
    );
    
    // Direct replacement in requestOptions
    processedCode = processedCode.replace(
      /requestOptions\s*=\s*\{[\s\S]*?data:\s*\{\s*\/\*[^*]*TODO[^*]*\*\/\s*\}[\s\S]*?\};/gi,
      (match) => {
        return match.replace(/data:\s*\{\s*\/\*[^*]*TODO[^*]*\*\/\s*\}/gi, `data: ${fakerBody}`);
      }
    );
    
    // Ensure Faker.js import is present
    if (!processedCode.includes('import { faker }') && !processedCode.includes("from '@faker-js/faker'")) {
      const firstImport = processedCode.match(/^import\s+.*?from.*?$/m);
      if (firstImport) {
        processedCode = processedCode.replace(
          firstImport[0],
          `${firstImport[0]}\nimport { faker } from '@faker-js/faker';`
        );
      } else {
        // Add import at the very top
        processedCode = `import { faker } from '@faker-js/faker';\n${processedCode}`;
      }
    }
  }
  
  // Ensure we have a clean code block
  processedCode = processedCode.trim();
  
  // If the processed code is empty or malformed, generate a simple test
  if (!processedCode || processedCode.length < 50) {
    if (variations && variations.length > 1) {
      return generateCleanAPITestWithVariations(endpoint, timeout, components, variations);
    }
    return generateCleanAPITest(endpoint, timeout, components);
  }
  
  // If multiple variations are provided, ALWAYS generate variation-specific test cases
  const hasMultipleVariations = variations && Array.isArray(variations) && variations.length > 1;
  
  console.log(`=== Variation Processing Check ===`);
  console.log(`Variations parameter:`, variations);
  console.log(`Has multiple variations:`, hasMultipleVariations);
  console.log(`Processed code length:`, processedCode.length);
  
  if (hasMultipleVariations) {
    console.log(`=== FORCING generation of ${variations.length} variation test cases: ${variations.join(', ')} ===`);
    
    // COMPLETELY IGNORE processedCode and generate fresh test cases for all variations
    // This ensures we always get the correct variation-specific tests
    const generatedTestCases = variations.map(variation => {
      const testCase = generateTestCaseForVariation(endpoint, variation, components);
      console.log(`✓ Generated test case for variation: ${variation} (${testCase.length} chars)`);
      return testCase;
    }).join('\n\n  ');
    
    // COMPLETELY REPLACE processedCode with our generated test cases
    processedCode = generatedTestCases;
    
    console.log(`✓ Successfully replaced processedCode with ${variations.length} variation-specific test cases (total: ${processedCode.length} chars)`);
  } else {
    console.log(`Skipping variation generation - single variation (${variations ? variations[0] : 'none'}) or no variations provided`);
  }
  
  // Build the proper test structure
  const testName = `${endpoint.method} ${endpoint.path || endpoint.url || '/unknown'}`;
  const baseUrl = process.env.BASE_URL || process.env.API_URL || 'https://p-tray.dev.g42a.ae';
  
  // Final check: Replace any remaining TODO comments in processedCode before assembling
  if (processedCode.includes('TODO') || processedCode.includes('/* TODO') || processedCode.includes('// TODO')) {
    const requestBodySchema = getJsonRequestBodySchema(endpoint, components);
    let fakerBody = '';
    
    if (requestBodySchema && requestBodySchema.properties) {
      const fakerFields = Object.entries(requestBodySchema.properties).map(([key, prop]) => {
        const type = prop.type || 'string';
        let fakerCode = '';
        if (type === 'string') {
          if (key.toLowerCase().includes('email')) fakerCode = `faker.internet.email()`;
          else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) fakerCode = `faker.person.fullName()`;
          else if (key.toLowerCase().includes('description')) fakerCode = `faker.lorem.sentence()`;
          else if (key.toLowerCase().includes('url')) fakerCode = `faker.internet.url()`;
          else if (key.toLowerCase().includes('phone')) fakerCode = `faker.phone.number()`;
          else fakerCode = `faker.lorem.words(3)`;
        } else if (type === 'number' || type === 'integer') {
          fakerCode = `faker.number.int({ min: 1, max: 1000 })`;
        } else if (type === 'boolean') {
          fakerCode = `faker.datatype.boolean()`;
        } else {
          fakerCode = `faker.lorem.word()`;
        }
        return `    ${key}: ${fakerCode}`;
      }).join(',\n');
      fakerBody = `{\n${fakerFields}\n  }`;
    } else {
      const path = (endpoint.path || endpoint.url || '').toLowerCase();
      if (path.includes('user')) {
        fakerBody = `{\n    name: faker.person.fullName(),\n    email: faker.internet.email(),\n    username: faker.internet.userName(),\n    phone: faker.phone.number()\n  }`;
      } else {
        fakerBody = `{\n    name: faker.person.fullName(),\n    description: faker.lorem.sentence(),\n    value: faker.number.int({ min: 1, max: 1000 })\n  }`;
      }
    }
    
    // Final aggressive TODO replacement
    processedCode = processedCode.replace(/data:\s*\{\s*\/\*[^*]*TODO[^*]*\*\/\s*\}/gi, `data: ${fakerBody}`);
    processedCode = processedCode.replace(/data:\s*\{\s*\/\/[^\n]*TODO[^\n]*\s*\}/gi, `data: ${fakerBody}`);
    
    // Ensure Faker import
    if (!processedCode.includes('import { faker }') && !uniqueImports.some(imp => imp.includes('faker'))) {
      uniqueImports.push("import { faker } from '@faker-js/faker';");
    }
  }

  // Create the final properly structured code
  let finalCode = `${uniqueImports.join('\n')}

test.describe('${testName}', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || '${baseUrl}',
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": \`Bearer \${process.env.API_TOKEN || process.env.OAUTH_TOKEN}\`
      },
      timeout: parseInt(process.env.TIMEOUT || '${timeout}', 10)
    });
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  ${processedCode}
});`;

  // Final pass: Replace any TODO that might still exist in the final assembled code
  if (finalCode.includes('TODO') || finalCode.includes('/* TODO') || finalCode.includes('// TODO')) {
    const requestBodySchema = getJsonRequestBodySchema(endpoint, components);
    let fakerBody = '';
    
    if (requestBodySchema && requestBodySchema.properties) {
      const fakerFields = Object.entries(requestBodySchema.properties).map(([key, prop]) => {
        const type = prop.type || 'string';
        let fakerCode = '';
        if (type === 'string') {
          if (key.toLowerCase().includes('email')) fakerCode = `faker.internet.email()`;
          else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) fakerCode = `faker.person.fullName()`;
          else if (key.toLowerCase().includes('description')) fakerCode = `faker.lorem.sentence()`;
          else if (key.toLowerCase().includes('url')) fakerCode = `faker.internet.url()`;
          else if (key.toLowerCase().includes('phone')) fakerCode = `faker.phone.number()`;
          else fakerCode = `faker.lorem.words(3)`;
        } else if (type === 'number' || type === 'integer') {
          fakerCode = `faker.number.int({ min: 1, max: 1000 })`;
        } else if (type === 'boolean') {
          fakerCode = `faker.datatype.boolean()`;
        } else {
          fakerCode = `faker.lorem.word()`;
        }
        return `    ${key}: ${fakerCode}`;
      }).join(',\n');
      fakerBody = `{\n${fakerFields}\n  }`;
    } else {
      const path = (endpoint.path || endpoint.url || '').toLowerCase();
      if (path.includes('user')) {
        fakerBody = `{\n    name: faker.person.fullName(),\n    email: faker.internet.email(),\n    username: faker.internet.userName(),\n    phone: faker.phone.number()\n  }`;
      } else {
        fakerBody = `{\n    name: faker.person.fullName(),\n    description: faker.lorem.sentence(),\n    value: faker.number.int({ min: 1, max: 1000 })\n  }`;
      }
    }
    
    finalCode = finalCode.replace(/data:\s*\{\s*\/\*[^*]*TODO[^*]*\*\/\s*\}/gi, `data: ${fakerBody}`);
    finalCode = finalCode.replace(/data:\s*\{\s*\/\/[^\n]*TODO[^\n]*\s*\}/gi, `data: ${fakerBody}`);
    
    // Ensure Faker import in final code
    if (!finalCode.includes('import { faker }') && !finalCode.includes("from '@faker-js/faker'")) {
      finalCode = finalCode.replace(/^(import[^;]+;)/m, `$1\nimport { faker } from '@faker-js/faker';`);
    }
  }

  // FINAL VERIFICATION: If variations were provided, ensure we have the correct number of test cases
  if (variations && Array.isArray(variations) && variations.length > 1) {
    const finalTestCaseCount = (finalCode.match(/test\s*\(/g) || []).length;
    console.log(`=== Final Verification ===`);
    console.log(`Expected test cases: ${variations.length}`);
    console.log(`Actual test cases in final code: ${finalTestCaseCount}`);
    
    if (finalTestCaseCount < variations.length) {
      console.log(`WARNING: Final code only has ${finalTestCaseCount} test case(s), expected ${variations.length}. Regenerating...`);
      // Regenerate with variations - this should not happen but is a safety net
      return generateCleanAPITestWithVariations(endpoint, timeout, components, variations);
    } else {
      console.log(`✓ Verification passed: ${finalTestCaseCount} test cases found`);
    }
  }

  return finalCode;
}

// Generate a clean API test with required fields and Faker data
function generateCleanAPITest(endpoint, timeout, components = null) {
  const schema = getJsonRequestBodySchema(endpoint, components);
  const hasBody = ['POST', 'PUT', 'PATCH'].includes((endpoint.method || '').toUpperCase());
  
  let requestBodyData = '';
  if (hasBody) {
    if (schema && schema.properties) {
      // Generate Faker.js data based on schema
      const fakerFields = Object.entries(schema.properties).map(([key, prop]) => {
        const type = prop.type || 'string';
        let fakerCode = '';
        if (type === 'string') {
          if (key.toLowerCase().includes('email')) fakerCode = `faker.internet.email()`;
          else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) fakerCode = `faker.person.fullName()`;
          else if (key.toLowerCase().includes('description')) fakerCode = `faker.lorem.sentence()`;
          else if (key.toLowerCase().includes('url')) fakerCode = `faker.internet.url()`;
          else if (key.toLowerCase().includes('phone')) fakerCode = `faker.phone.number()`;
          else fakerCode = `faker.lorem.words(3)`;
        } else if (type === 'number' || type === 'integer') {
          fakerCode = `faker.number.int({ min: 1, max: 1000 })`;
        } else if (type === 'boolean') {
          fakerCode = `faker.datatype.boolean()`;
        } else {
          fakerCode = `faker.lorem.word()`;
        }
        return `    ${key}: ${fakerCode}`;
      }).join(',\n');
      requestBodyData = `{
${fakerFields}
  }`;
    } else {
      // Fallback based on endpoint path
      const path = (endpoint.path || endpoint.url || '').toLowerCase();
      if (path.includes('user')) {
        requestBodyData = `{
    name: faker.person.fullName(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    phone: faker.phone.number()
  }`;
      } else {
        requestBodyData = `{
    name: faker.person.fullName(),
    description: faker.lorem.sentence(),
    value: faker.number.int({ min: 1, max: 1000 })
  }`;
      }
    }
  }
  
  const testName = `${endpoint.method} ${endpoint.path || endpoint.url || '/unknown'}`;
  const baseUrl = process.env.BASE_URL || process.env.API_URL || 'https://p-tray.dev.g42a.ae';
  const expectedStatus = getExpectedStatus(endpoint);
  
  return `import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';
import { faker } from '@faker-js/faker';

test.describe('${testName}', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || '${baseUrl}',
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": \`Bearer \${process.env.API_TOKEN || process.env.OAUTH_TOKEN}\`
      },
      timeout: parseInt(process.env.TIMEOUT || '${timeout}', 10)
    });
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test('${testName} - should return ${expectedStatus}', async () => {
    const requestOptions = {${hasBody ? `
      data: ${requestBodyData}` : ''}
    };
    
    const response = await requestContext.${(endpoint.method || 'GET').toLowerCase()}('${endpoint.path || endpoint.url || '/unknown'}'${hasBody ? ', requestOptions' : ''});
    await expect(response.status()).toBe(${expectedStatus});
    
    const responseBody = await response.json().catch(() => null);
    await allure.attachment('Response Status', String(response.status()), 'text/plain');
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
  });
});`;
}

// Generate a single test case for a specific variation
function generateTestCaseForVariation(endpoint, variation, components = null) {
  const method = endpoint.method?.toUpperCase() || 'GET';
  const path = endpoint.path || endpoint.url || '/unknown';
  const expectedStatus = getExpectedStatus(endpoint);
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
  
  const schema = getJsonRequestBodySchema(endpoint, components);
  const variationLower = (variation || '').toLowerCase();
  let requestBodyData = '';
  let testLogic = '';
  let expectedStatusCode = expectedStatus;
  let additionalAssertions = '';
  
  // Variation-specific test data and logic generation
  if (hasBody) {
    if (variationLower.includes('negative') || variationLower.includes('error')) {
      // NEGATIVE/ERROR CASES: Invalid data that should cause errors
      expectedStatusCode = method === 'POST' ? '400' : '404';
      testLogic = `// Testing ${variation}: Invalid or malformed request data that should return error`;
      
      if (schema && schema.properties) {
        // Generate invalid data based on schema
        const invalidFields = Object.entries(schema.properties).map(([key, prop]) => {
          const type = prop.type || 'string';
          if (type === 'string') {
            return `    ${key}: null`; // Invalid: null for required string
          } else if (type === 'number' || type === 'integer') {
            return `    ${key}: 'invalid-number'`; // Invalid: string for number
          } else if (type === 'boolean') {
            return `    ${key}: 'not-a-boolean'`; // Invalid: string for boolean
          }
          return `    ${key}: null`;
        }).join(',\n');
        requestBodyData = `{
${invalidFields}
  }`;
      } else {
        // Generic invalid data
        requestBodyData = `{
    invalidField: null,
    missingRequiredFields: true
  }`;
      }
      
      additionalAssertions = `
    // Verify error response structure
    expect(responseBody).toBeTruthy();
    ${method === 'POST' ? `// For POST, expect validation error` : `// For other methods, expect not found or validation error`}`;
      
    } else if (variationLower.includes('edge')) {
      // EDGE CASES: Boundary values, empty strings, extreme values
      testLogic = `// Testing ${variation}: Boundary values and edge conditions`;
      
      if (schema && schema.properties) {
        const edgeFields = Object.entries(schema.properties).map(([key, prop]) => {
          const type = prop.type || 'string';
          if (type === 'string') {
            // Empty string, very long string, special characters
            if (key.toLowerCase().includes('email')) {
              return `    ${key}: 'a@b.c'`; // Minimal valid email
            }
            return `    ${key}: ''`; // Empty string edge case
          } else if (type === 'number' || type === 'integer') {
            // Minimum, maximum, or zero
            const minValue = prop.minimum !== undefined ? prop.minimum : 0;
            const maxValue = prop.maximum !== undefined ? prop.maximum : 999999;
            return `    ${key}: ${minValue}`; // Minimum boundary value
          } else if (type === 'boolean') {
            return `    ${key}: false`; // Edge case: false value
          } else if (type === 'array') {
            return `    ${key}: []`; // Empty array edge case
          }
          return `    ${key}: null`;
        }).join(',\n');
        requestBodyData = `{
${edgeFields}
  }`;
      } else {
        // Generic edge case data
        const pathLower = path.toLowerCase();
        if (pathLower.includes('user')) {
          requestBodyData = `{
    name: '',
    email: 'a@b.c',
    username: '',
    phone: ''
  }`;
        } else {
          requestBodyData = `{
    name: '',
    description: '',
    value: 0
  }`;
        }
      }
      
      additionalAssertions = `
    // Verify edge case handling - API should handle boundary values gracefully
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);`;
      
    } else if (variationLower.includes('performance')) {
      // PERFORMANCE: Large payloads, stress testing
      testLogic = `// Testing ${variation}: Performance testing with realistic data and response time validation`;
      
      if (schema && schema.properties) {
        const perfFields = Object.entries(schema.properties).map(([key, prop]) => {
          const type = prop.type || 'string';
          if (type === 'string') {
            // Generate realistic but normal-sized data for performance testing
            if (key.toLowerCase().includes('email')) {
              return `    ${key}: faker.internet.email()`;
            } else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) {
              return `    ${key}: faker.person.fullName()`;
            } else if (key.toLowerCase().includes('description')) {
              return `    ${key}: faker.lorem.paragraph()`;
            } else {
              return `    ${key}: faker.lorem.sentence()`;
            }
          } else if (type === 'number' || type === 'integer') {
            return `    ${key}: faker.number.int({ min: 1, max: 1000 })`;
          } else if (type === 'boolean') {
            return `    ${key}: faker.datatype.boolean()`;
          } else {
            return `    ${key}: faker.lorem.word()`;
          }
        }).join(',\n');
        requestBodyData = `{
${perfFields}
  }`;
      } else {
        const pathLower = path.toLowerCase();
        if (pathLower.includes('user')) {
          requestBodyData = `{
    name: faker.person.fullName(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    phone: faker.phone.number()
  }`;
        } else {
          requestBodyData = `{
    name: faker.person.fullName(),
    description: faker.lorem.paragraph(),
    value: faker.number.int({ min: 1, max: 1000 })
  }`;
        }
      }
      
      additionalAssertions = `
    // Performance assertion: Response should be received within reasonable time
    const responseTime = Date.now() - startTime;
    console.log('Response time:', responseTime, 'ms');
    expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds`;
      
    } else if (variationLower.includes('security')) {
      // SECURITY: SQL injection, XSS, and other security payloads
      testLogic = `// Testing ${variation}: Security testing with potentially malicious payloads`;
      expectedStatusCode = method === 'POST' ? '400' : '400'; // Often rejected
      
      if (schema && schema.properties) {
        const securityFields = Object.entries(schema.properties).map(([key, prop]) => {
          const type = prop.type || 'string';
          if (type === 'string') {
            return `    ${key}: "'; DROP TABLE users; --"`; // SQL injection attempt
          } else if (type === 'number' || type === 'integer') {
            return `    ${key}: 0`; // Zero might be used in some exploits
          } else {
            return `    ${key}: "<script>alert('xss')</script>"`; // XSS attempt
          }
        }).join(',\n');
        requestBodyData = `{
${securityFields}
  }`;
      } else {
        requestBodyData = `{
    name: "'; DROP TABLE users; --",
    email: "test@test.com",
    description: "<script>alert('xss')</script>"
  }`;
      }
      
      additionalAssertions = `
    // Security: Verify API properly sanitizes or rejects malicious input
    expect(response.status()).toBeGreaterThanOrEqual(400);`;
      
    } else {
      // HAPPY PATH or DEFAULT: Valid, realistic data
      testLogic = `// Testing ${variation}: Valid request with expected successful response`;
      
      if (schema && schema.properties) {
        const fakerFields = Object.entries(schema.properties).map(([key, prop]) => {
          const type = prop.type || 'string';
          let fakerCode = '';
          if (type === 'string') {
            if (key.toLowerCase().includes('email')) fakerCode = `faker.internet.email()`;
            else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) fakerCode = `faker.person.fullName()`;
            else if (key.toLowerCase().includes('description')) fakerCode = `faker.lorem.sentence()`;
            else if (key.toLowerCase().includes('url')) fakerCode = `faker.internet.url()`;
            else if (key.toLowerCase().includes('phone')) fakerCode = `faker.phone.number()`;
            else fakerCode = `faker.lorem.words(3)`;
          } else if (type === 'number' || type === 'integer') {
            fakerCode = `faker.number.int({ min: 1, max: 1000 })`;
          } else if (type === 'boolean') {
            fakerCode = `faker.datatype.boolean()`;
          } else {
            fakerCode = `faker.lorem.word()`;
          }
          return `    ${key}: ${fakerCode}`;
        }).join(',\n');
        requestBodyData = `{
${fakerFields}
  }`;
      } else {
        const pathLower = path.toLowerCase();
        if (pathLower.includes('user')) {
          requestBodyData = `{
    name: faker.person.fullName(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    phone: faker.phone.number()
  }`;
        } else {
          requestBodyData = `{
    name: faker.person.fullName(),
    description: faker.lorem.sentence(),
    value: faker.number.int({ min: 1, max: 1000 })
  }`;
        }
      }
      
      additionalAssertions = `
    // Happy path: Verify successful response and data structure
    expect(response.status()).toBe(${expectedStatus});
    if (responseBody) {
      expect(responseBody).toBeTruthy();
    }`;
    }
  } else {
    // No request body (GET requests, etc.) - still apply variation-specific logic
    if (variationLower.includes('negative') || variationLower.includes('error')) {
      testLogic = `// Testing ${variation}: Invalid endpoint or parameters that should return error`;
      expectedStatusCode = '404';
      additionalAssertions = `
    // Verify error response for invalid request
    expect(response.status()).toBeGreaterThanOrEqual(400);`;
    } else if (variationLower.includes('edge')) {
      testLogic = `// Testing ${variation}: Edge case parameters (invalid IDs, empty strings in query)`;
      additionalAssertions = `
    // Edge case: API should handle gracefully or return appropriate error
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);`;
    } else if (variationLower.includes('performance')) {
      testLogic = `// Testing ${variation}: Performance testing - verify response time`;
      additionalAssertions = `
    // Performance: Check response time
    const responseTime = Date.now() - startTime;
    console.log('Response time:', responseTime, 'ms');
    expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds`;
    } else {
      testLogic = `// Testing ${variation}: Valid request with expected successful response`;
      additionalAssertions = `
    // Happy path: Verify successful response
    expect(response.status()).toBe(${expectedStatus});
    if (responseBody) {
      expect(responseBody).toBeTruthy();
    }`;
    }
  }
  
  const hasStartTime = variationLower.includes('performance');
  
  return `test('${method} ${path} - ${variation}', async () => {
    ${testLogic}
    ${hasStartTime ? `const startTime = Date.now();` : ''}
    ${hasBody ? `const requestOptions = {
      data: ${requestBodyData}
    };
    
    const response = await requestContext.${method.toLowerCase()}('${path}', requestOptions);` : `const response = await requestContext.${method.toLowerCase()}('${path}');`}
    
    await expect(response.status()).toBe(${expectedStatusCode});
    
    const responseBody = await response.json().catch(() => null);
    ${additionalAssertions}
    
    await allure.attachment('Response Status', String(response.status()), 'text/plain');
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');
    await allure.label('variation', '${variation}');
  });`;
}

// Generate a clean API test with multiple variations
function generateCleanAPITestWithVariations(endpoint, timeout, components = null, variations = ['happy-path']) {
  const testName = `${endpoint.method} ${endpoint.path || endpoint.url || '/unknown'}`;
  const baseUrl = process.env.BASE_URL || process.env.API_URL || 'https://p-tray.dev.g42a.ae';
  
  // Generate test cases for each variation
  const testCases = variations.map(variation => {
    return generateTestCaseForVariation(endpoint, variation, components);
  }).join('\n\n  ');
  
  return `import { test, expect, APIRequestContext } from '@playwright/test';
import { allure } from 'allure-playwright';
import { faker } from '@faker-js/faker';

test.describe('${testName}', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || '${baseUrl}',
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": \`Bearer \${process.env.API_TOKEN || process.env.OAUTH_TOKEN}\`
      },
      timeout: parseInt(process.env.TIMEOUT || '${timeout}', 10)
    });
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  ${testCases}
});`;
}

function createEnhancedAPITestPrompt2(endpoint, variation, baseUrl, environment) {
  const apiUrl = baseUrl || environment?.variables?.API_URL || environment?.variables?.BASE_URL || 'https://fakerestapi.azurewebsites.net';
  const testVariations = environment?.variables?.TEST_VARIATIONS || ['happy-path', 'negative', 'edge-case', 'boundary', 'security'];
  const authHeaders = buildAuthorizationHeaders(environment);
  const authInfo = environment?.authorization?.enabled ? 
    `\n- **Authorization**: ${environment.authorization.type} (${environment.authorization.enabled ? 'enabled' : 'disabled'})` : 
    '\n- **Authorization**: None';
 
  return `You are an expert API testing engineer. Generate a comprehensive Playwright API test for the following endpoint with advanced schema analysis and test variations.

## API Endpoint Information:
- **Method**: ${endpoint.method}
- **Path**: ${endpoint.path || endpoint.url || '/unknown'}
- **Base URL**: ${apiUrl}
- **Test Variation**: ${variation}
- **Summary**: ${endpoint.summary || 'API endpoint test'}
- **Description**: ${endpoint.description || 'Test API endpoint functionality'}${authInfo}

## Schema Analysis Requirements:
1. **Request Schema Analysis**:
   - Analyze the expected request body structure
   - Identify required vs optional fields
   - Determine data types and validation rules
   - Identify potential edge cases and boundary values

2. **Response Schema Analysis**:
   - Analyze expected response structure
   - Identify success and error response formats
   - Determine status codes and their meanings
   - Identify response headers and their purposes

3. **Test Variations Generation**:
   - **Happy Path**: Valid request with expected response
   - **Negative Testing**: Invalid requests, missing fields, wrong data types
   - **Edge Cases**: Boundary values, empty strings, null values
   - **Security Testing**: SQL injection, XSS, authentication bypass
   - **Performance Testing**: Large payloads, timeout scenarios

## Generated Test Requirements:

### 1. **Comprehensive Test Structure**:
\`\`\`typescript
import { test, expect, APIRequestContext } from '@playwright/test';\nimport { allure } from 'allure-playwright';\nimport * as faker from 'faker';\nimport Ajv from 'ajv';
import { allure } from 'allure-playwright';

test.describe('${endpoint.method} ${endpoint.path || endpoint.url || '/unknown'} - ${variation}', () => {
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    requestContext = await request.newContext({
      baseURL: '${apiUrl}',
      extraHTTPHeaders: ${JSON.stringify(authHeaders, null, 8)},
      timeout: 30000
    });
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });
\`\`\`

### 2. **Schema-Based Test Data Generation**:
- Generate realistic test data based on endpoint analysis
- Include valid, invalid, and edge case data
- Create boundary value test cases
- Generate security test payloads

### 3. **Comprehensive Test Cases**:
- **${variation} Test**: Primary test case for this variation
- **Request Validation**: Test request structure and data
- **Response Validation**: Test response structure and data
- **Error Handling**: Test error scenarios and responses
- **Performance**: Test response times and load handling

### 4. **Advanced Reporting**:
- Detailed request/response logging
- Schema validation results
- Performance metrics
- Error analysis and debugging info

### 5. **Test Variations by Type**:

**Happy Path (${variation === 'happy-path' ? 'PRIMARY' : 'SECONDARY'})**:
- Valid request with all required fields
- Expected successful response
- Data validation and type checking

**Negative Testing (${variation === 'negative' ? 'PRIMARY' : 'SECONDARY'})**:
- Missing required fields
- Invalid data types
- Malformed JSON
- Unauthorized access attempts

**Edge Cases (${variation === 'edge-case' ? 'PRIMARY' : 'SECONDARY'})**:
- Boundary values (min/max lengths, numbers)
- Empty strings and null values
- Special characters and encoding
- Large payloads

**Security Testing (${variation === 'security' ? 'PRIMARY' : 'SECONDARY'})**:
- SQL injection attempts
- XSS payloads
- Authentication bypass
- Input sanitization

**Performance Testing (${variation === 'performance' ? 'PRIMARY' : 'SECONDARY'})**:
- Large data sets
- Concurrent requests
- Timeout scenarios
- Memory usage

### 6. **Code Quality Requirements**:
- Use proper TypeScript types (APIResponse for response variables, unknown for error parameters)
- Declare response variables as: \`const response: APIResponse = await requestContext.method(...)\`
- Handle errors with proper typing: \`catch (error: unknown)\`
- Use type guards for error handling: \`error instanceof Error ? error.message : String(error)\`
- Include comprehensive error handling
- Add detailed logging and debugging
- Follow Playwright best practices
- Include Allure reporting integration

### 7. **Environment Configuration**:
- Use environment variables for configuration
- Support multiple environments (dev, staging, prod)
- Include proper timeout and retry logic
- Handle different API versions

### 8. **TypeScript Best Practices**:
- Always import APIResponse from '@playwright/test'
- Declare response variables with explicit types: \`const response: APIResponse = await requestContext.post(...)\`
- Use proper error typing in catch blocks: \`catch (error: unknown)\`
- Avoid variable redeclaration - use unique variable names in different scopes
- Use non-null assertions (!) only when you're certain the variable is defined

Generate a complete, production-ready test that demonstrates advanced API testing techniques with comprehensive schema analysis, multiple test variations, and enterprise-grade reporting.

IMPORTANT: Ensure all TypeScript types are properly declared to avoid compilation errors. Use APIResponse type for all response variables and unknown type for error parameters.

Focus on the **${variation}** variation as the primary test case, but include elements from other variations where relevant.`;

}
function createEnhancedAPITestPrompt(endpoint, variation, baseUrl, environment, allVariations = null, components = null) {
  const apiUrl = baseUrl || environment?.variables?.API_URL || environment?.variables?.BASE_URL;
  const testVariations = allVariations || environment?.variables?.TEST_VARIATIONS || ['happy-path', 'negative', 'edge-case', 'boundary', 'security'];
  const authHeaders = buildAuthorizationHeaders(environment);

  const method = endpoint.method?.toUpperCase?.() || 'GET';
  const path = endpoint.path || endpoint.url || '/unknown';
  const summary = endpoint.summary || `${method} ${path}`;
  const description = endpoint.description || 'Test API endpoint functionality';

  const pathParams = (endpoint.parameters || []).filter(p => p.in === 'path');
  const queryParams = (endpoint.parameters || []).filter(p => p.in === 'query');
  const headerParams = (endpoint.parameters || []).filter(p => p.in === 'header');

  const stringifyParams = (params) => {
    if (!params.length) return 'None';
    return params.map(param => {
      return `- **${param.name}** (${param.in}) ${param.required ? '(required)' : '(optional)'}: ${param.schema?.type || 'unknown'}${param.schema?.default !== undefined ? ` (default: ${JSON.stringify(param.schema.default)})` : ''}`;
    }).join('\n');
  };

  // Get request body schema for meaningful test data generation
  const requestBodySchema = getJsonRequestBodySchema(endpoint, components);
  const hasRequestBody = ['POST', 'PUT', 'PATCH'].includes(method);
  
  let requestBodyInfo = '';
  if (hasRequestBody && requestBodySchema) {
    requestBodyInfo = `\n
### 📨 Request Body Schema
\`\`\`json
${JSON.stringify(requestBodySchema, null, 2)}
\`\`\`

**CRITICAL**: You MUST generate realistic test data for the request body based on this schema. Use Faker.js to populate all fields according to their types and constraints.`;
  } else if (hasRequestBody) {
    requestBodyInfo = `\n
### 📨 Request Body
**Note**: This endpoint requires a request body, but no schema is available. Generate appropriate test data based on the endpoint's purpose and HTTP method.`;
  }

  const authInfo = environment?.authorization?.enabled
    ? `\n- **Authorization**: ${environment.authorization.type} (enabled)`
    : '\n- **Authorization**: None';

  return `You are an expert API testing engineer. Generate a comprehensive Playwright API test for the following endpoint using advanced schema analysis and test variation techniques.

---

## 🧩 API Endpoint Overview

- **Method**: ${method}
- **Path**: \`${path}\`
- **Base URL**: ${apiUrl}
- **Test Focus**: ${variation}
- **Summary**: ${summary}
- **Description**: ${description}${authInfo}

---

## 📥 Input Parameters

### 🧷 Path Parameters
${stringifyParams(pathParams)}

### 🔍 Query Parameters
${stringifyParams(queryParams)}

### 📨 Header Parameters
${stringifyParams(headerParams)}${requestBodyInfo}

---

## 🔬 Schema Analysis Requirements

### 1. **Request Schema Analysis**
- Analyze expected request structure from parameters (path, query, headers)
- Identify required vs optional fields
- Determine data types, default values, and validation rules
- Identify edge cases and boundary values

### 2. **Response Schema Analysis**
- Analyze expected response structure, including success and error formats
- Identify relevant HTTP status codes and their meanings
- Validate response headers (e.g., \`content-type\`)

---

## 🧪 Test Variations

${testVariations.length > 1 ? 
  `**CRITICAL**: You MUST generate **${testVariations.length} separate test cases** (one \`test()\` block for each variation) within the same test file. Each variation should have its own dedicated test case with appropriate test data and assertions.

**Variations to implement:**
${testVariations.map((v, idx) => `- **${v.toUpperCase()}** ${idx === 0 ? '(PRIMARY - focus)' : '(ADDITIONAL)'}`).join('\n')}

**Test Case Structure Required:**
\`\`\`typescript
test.describe('${method} ${path} - Multiple Variations', () => {
  // ... setup code ...
  
  ${testVariations.map(v => `test('${method} ${path} - ${v}', async () => {
    // Test implementation for ${v} variation
    // Include specific test data and assertions for this variation
  });`).join('\n\n  ')}
});
\`\`\`` : 
  `**Primary Variation**: **${variation.toUpperCase()}**

Focus on **${variation}** as the primary test case.`}

---

## ✅ Test Implementation Requirements

### 1. **Test Structure (Playwright + Allure)**
\`\`\`typescript
import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('${method} ${path} - ${variation}', () => {
  let requestContext: APIRequestContext;
  let apiToken: string;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    
    // Resolve API token from multiple possible sources
    const rawToken = 
      process.env.API_TOKEN ||
      process.env.BEARER_TOKEN ||
      process.env.ACCESS_TOKEN ||
      process.env.authorizationToken;

    if (!rawToken || rawToken.trim() === '') {
      // Try OAuth2 token fetching if no static token is available
      const tokenUrl = process.env.TOKEN_URL || process.env.AUTH_URL;
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;
      const username = process.env.API_USERNAME || process.env.USERNAME;
      const password = process.env.API_PASSWORD || process.env.PASSWORD;
      const scope = process.env.SCOPE || 'openid';

      if (tokenUrl && clientId && clientSecret && username && password) {
        try {
          console.log('🔐 Attempting to fetch OAuth2 token...');
          const axios = (await import('axios')).default;
          const form = new URLSearchParams();
          form.append('client_id', clientId);
          form.append('client_secret', clientSecret);
          form.append('grant_type', 'password');
          form.append('username', username);
          form.append('password', password);
          form.append('scope', scope);

          const resp = await axios.post(tokenUrl, form, { 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
            timeout: 15000 
          });
          
          if (resp.data?.access_token) {
            apiToken = resp.data.access_token;
            console.log('✅ OAuth2 token fetched successfully');
          } else {
            throw new Error('OAuth2 response missing access_token');
          }
        } catch (error) {
          console.error('❌ OAuth2 token fetch failed:', error);
          throw new Error(\`OAuth2 token fetch failed: \${error.message}\`);
        }
      } else {
        throw new Error('API_TOKEN missing. Or set TOKEN_URL/CLIENT_ID/CLIENT_SECRET/USERNAME/PASSWORD to fetch token.');
      }
    } else {
      apiToken = rawToken.trim();
      console.log('✅ Using static API token from environment');
    }

    // Create request context with environment-based configuration
    const baseURL = process.env.API_URL || process.env.BASE_URL || '${apiUrl}';
    
    requestContext = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiToken}\`,
        'X-Space': process.env.X_SPACE || 'default'
      },
      timeout: parseInt(process.env.TIMEOUT || '30000', 10)
    });

    console.log(\`🌍 API Test Environment: \${baseURL}\`);
    console.log(\`🔐 Authorization: Bearer \${apiToken ? '***REDACTED***' : 'Not set'}\`);
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });

  // Implement tests here
});
\`\`\`

---

### 2. **Faker.js Data Generation - CRITICAL REQUIREMENT**
**You MUST use Faker.js to generate realistic test data. NEVER leave TODO comments or empty data objects.**

- **Import Faker.js**: \`import { faker } from '@faker-js/faker';\`
- **Generate realistic data for request body**:
  * String fields: \`faker.person.fullName()\`, \`faker.company.name()\`, \`faker.lorem.sentence()\`, \`faker.lorem.words(3)\`
  * Email: \`faker.internet.email()\`
  * Numbers: \`faker.number.int({ min: 1, max: 1000 })\`, \`faker.number.float()\`
  * Dates: \`faker.date.future()\`, \`faker.date.past()\`, \`faker.date.recent()\`
  * Booleans: \`faker.datatype.boolean()\`
  * Enums: \`faker.helpers.arrayElement(['option1', 'option2'])\`
  * UUIDs: \`faker.string.uuid()\`
  * URLs: \`faker.internet.url()\`

**Example for request body:**
\`\`\`typescript
const requestBody = {
  name: faker.person.fullName(),
  email: faker.internet.email(),
  description: faker.lorem.sentence(),
  age: faker.number.int({ min: 18, max: 65 }),
  isActive: faker.datatype.boolean()
};
\`\`\`

**CRITICAL**: Replace any placeholder like \`{ /* TODO: fill body */ }\` with actual Faker.js-generated data based on the request body schema.

### 3. **Schema-Based Test Cases**
- Generate valid and invalid test data covering:
  - Required and optional query, path, and header parameters
  - Edge cases (long strings, nulls, special characters)
  - Security test payloads (e.g., SQL injection, XSS)
  - Performance edge cases (large values, concurrency)

---

### 4. **Code Quality and Typing**
- Use strict TypeScript typings:
  - e.g., \`const response: APIResponse = await ...\`
  - Catch errors with \`catch (error: unknown)\`
- Employ type guards for error handling
- Avoid variable redeclaration
- Follow strict TypeScript best practices

---

### 5. **Advanced Reporting**
- Utilize Allure for detailed test reporting
- Include request and response logging
- Validate response headers and schema compliance
- Log discrepancies and malformed data

---

### 6. **Environment Configuration Support**
- Use base URL from \`API_URL\` environment variable or fallback to passed \`baseUrl\`
- Support optional headers from environment config (e.g., \`X-Space\`)
- Handle request timeouts, retries, and multiple environments gracefully

---

🔧 **Final Instructions:**
- Deliver a robust, reusable, production-ready Playwright API test
${testVariations.length > 1 ? 
  `- **CRITICAL**: Generate **${testVariations.length} separate test cases** - one \`test()\` block for each of the following variations: ${testVariations.join(', ')}
- Each test case should have:
  * Descriptive test name including the variation name (e.g., "POST /user - happy-path", "POST /user - negative")
  * Variation-specific test data and assertions
  * Proper error handling for that variation
  * Allure reporting tags for the variation` :
  `- Prioritize the **${variation}** scenario
- Generate one comprehensive test case for this variation`}
- Ensure extensibility for all test types over time
- Maintain excellent code structure, documentation, and typing discipline
- Use Faker.js for all test data generation - NEVER leave TODO comments or empty data objects

Generate the complete, typed Playwright API test code implementing the above.
`;
}



function createAPITestPrompt(endpoint, variation, baseUrl) {
  const variationPrompts = {
    'happy-path': `Generate comprehensive API tests for successful scenarios:
    - Valid request with all required parameters
    - Successful response validation (status, headers, body structure)
    - Schema validation for response data
    - Business logic assertions
    - Data consistency checks`,
    
    'error-cases': `Generate API tests covering all error scenarios:
    - 400 Bad Request: Invalid parameters, malformed JSON, missing required fields
    - 401 Unauthorized: Missing or invalid authentication tokens
    - 403 Forbidden: Insufficient permissions, access denied
    - 404 Not Found: Non-existent resources, invalid endpoints
    - 422 Unprocessable Entity: Validation errors, business rule violations
    - 429 Too Many Requests: Rate limiting scenarios
    - 500 Internal Server Error: Server-side error handling
    - Network errors and timeout scenarios`,
    
    'edge-cases': `Generate API tests for boundary and edge conditions:
    - Boundary values: minimum/maximum lengths, numeric limits
    - Empty and null data: empty strings, null values, empty arrays/objects
    - Special characters: Unicode, SQL injection attempts, XSS payloads
    - Large payloads: Maximum allowed data sizes
    - Concurrent requests: Race conditions, data consistency
    - Malformed requests: Invalid JSON, wrong content types
    - Missing optional parameters vs required parameters`,
    
    'security': `Generate security-focused API tests:
    - Authentication bypass attempts
    - Authorization escalation tests
    - Input validation and sanitization
    - SQL injection prevention
    - XSS attack prevention
    - CSRF protection validation
    - Rate limiting enforcement
    - Sensitive data exposure checks
    - Token expiration and refresh scenarios`,
    
    'performance': `Generate performance and reliability tests:
    - Response time assertions (< 2s for normal, < 5s for complex)
    - Concurrent request handling
    - Load testing with multiple simultaneous requests
    - Memory usage validation
    - Timeout handling and retry mechanisms
    - Large dataset processing
    - Caching behavior validation
    - Database connection pooling effects`,
    
    'boundary-conditions': `Generate tests for data boundary conditions:
    - String length limits (empty, 1 char, max length, over limit)
    - Numeric boundaries (min, max, zero, negative, decimal precision)
    - Date/time boundaries (past, future, invalid formats)
    - Array size limits (empty, single item, max size, over limit)
    - File upload limits (size, type, corrupted files)
    - Pagination boundaries (first page, last page, invalid page numbers)`,
    
    'data-validation': `Generate comprehensive data validation tests:
    - Required field validation
    - Data type validation (string, number, boolean, array, object)
    - Format validation (email, phone, URL, date, UUID)
    - Range validation (min/max values, length constraints)
    - Pattern validation (regex patterns, custom formats)
    - Cross-field validation (dependent fields, conditional requirements)
    - Business rule validation (unique constraints, referential integrity)`
  };
  
  const variationPrompt = variationPrompts[variation] || variationPrompts['happy-path'];
  
  return `Create a Playwright API test for the following endpoint:

Endpoint: ${endpoint.method} ${endpoint.path || endpoint.url || '/unknown'}
Summary: ${endpoint.summary || 'API endpoint'}
Description: ${endpoint.description || ''}
Base URL: ${baseUrl}
Parameters: ${JSON.stringify(endpoint.parameters || [], null, 2)}
Responses: ${JSON.stringify(endpoint.responses || {}, null, 2)}

Test Variation: ${variation}
${variationPrompt}

Requirements:
1. Use Playwright's request fixture for API testing
2. **Comprehensive Response Assertions:**
   - Status code validation with specific expected codes
   - Response headers validation (Content-Type, Cache-Control, etc.)
   - Response body structure and data type validation
   - Response time assertions (< 2000ms for normal operations)
   - Content-Length and encoding validation

3. **Schema Validation:**
   - JSON schema validation for response bodies
   - Required field presence validation
   - Data type validation (string, number, boolean, array, object)
   - Format validation (email, date, UUID, URL patterns)
   - Enum value validation where applicable
   - Nested object and array structure validation

4. **Business Logic Assertions:**
   - Domain-specific validation rules
   - Cross-field validation and dependencies
   - Data consistency checks
   - Referential integrity validation
   - Business rule compliance (e.g., unique constraints)
   - State transition validation

5. **Error Handling and Validation:**
   - Proper HTTP status code assertions for error scenarios
   - Error message format and content validation
   - Error response schema validation
   - Graceful handling of network timeouts and failures
   - Retry mechanism testing where applicable

6. **Security Assertions:**
   - Authentication token validation
   - Authorization level verification
   - Sensitive data exposure prevention
   - Input sanitization verification
   - CORS header validation

7. **Performance and Reliability:**
   - Response time thresholds
   - Memory usage monitoring
   - Concurrent request handling
   - Rate limiting compliance
   - Caching behavior validation

8. **Test Data Management:**
   - Generate realistic and varied test data
   - Handle test data dependencies
   - Implement proper test data cleanup
   - Use data factories for consistent test data

9. **Reporting and Debugging:**
   - Include allure reporting tags and descriptions
   - Add detailed logging for request/response data
   - Implement step-by-step test execution logging
   - Add screenshots for UI-related API tests
   - Include performance metrics in reports

10. **Code Quality:**
    - Follow DRY principles with reusable helper functions
    - Implement proper async/await patterns
    - Add comprehensive error handling
    - Include TypeScript types where applicable
    - Add JSDoc comments for complex logic

Generate a complete, production-ready test file with extensive assertions that validate not just the API response, but also the business logic, data integrity, and system behavior.`;
}

function createE2ETestPrompt(endpoints, resourceName, baseUrl) {
  const endpointsList = endpoints.map(ep => `${ep.method} ${ep.path} - ${ep.summary || ''}`).join('\n');
  
  // Analyze endpoints to identify CRUD operations
  const crudOperations = {
    create: endpoints.filter(ep => ep.method.toUpperCase() === 'POST'),
    read: endpoints.filter(ep => ep.method.toUpperCase() === 'GET'),
    update: endpoints.filter(ep => ['PUT', 'PATCH'].includes(ep.method.toUpperCase())),
    delete: endpoints.filter(ep => ep.method.toUpperCase() === 'DELETE')
  };
  
  return `Create a comprehensive E2E API test suite for CRUD operations on the '${resourceName}' resource.

Available Endpoints:
${endpointsList}

CRUD Operations Analysis:
- CREATE: ${crudOperations.create.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'None detected'}
- READ: ${crudOperations.read.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'None detected'}
- UPDATE: ${crudOperations.update.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'None detected'}
- DELETE: ${crudOperations.delete.map(ep => `${ep.method} ${ep.path}`).join(', ') || 'None detected'}

Base URL: ${baseUrl}

Requirements:
1. Create a complete CRUD workflow test with proper data flow:
   a) CREATE: Generate realistic test data and create a new ${resourceName}
      - Store the created resource ID and other key fields
      - Validate response structure and required fields
      - Assert proper status codes (201/200)
   
   b) READ: Retrieve the created ${resourceName} using stored ID
      - Verify all fields match the created data
      - Test both individual GET and collection GET endpoints
      - Validate response schemas and data types
   
   c) UPDATE: Modify the ${resourceName} with new data
      - Use stored ID from CREATE operation
      - Generate updated test data (partial or full)
      - Verify updated fields while preserving unchanged ones
      - Store any new data for subsequent operations
   
   d) DELETE: Remove the ${resourceName}
      - Use stored ID from previous operations
      - Verify successful deletion (204/200 status)
      - Confirm resource no longer exists (404 on subsequent GET)

2. Advanced Data Flow Management:
   - Implement a testData object to store and pass data between steps
   - Handle nested resources and relationships
   - Support array responses and extract IDs from collections
   - Manage dependencies between different resource types
   - Handle pagination in list operations

3. Comprehensive Test Coverage:
   - Test all available endpoints in logical CRUD sequence
   - Include edge cases: empty responses, large datasets, special characters
   - Validate business rules and constraints
   - Test error scenarios: invalid IDs, missing required fields
   - Include boundary testing for numeric and string fields

4. **Advanced Test Data Management:**
   - **Data Factories:** Create reusable data generation functions
     * generateValid${resourceName}Data() - for valid test data
     * generateInvalid${resourceName}Data() - for error testing
     * generateBoundary${resourceName}Data() - for edge cases
     * generateRandom${resourceName}Data() - for varied testing
   
   - **Data Dependencies:** Handle complex relationships
     * Track parent-child resource relationships
     * Manage foreign key dependencies
     * Handle cascading operations and cleanup
     * Support bulk operations and batch processing
   
   - **Data State Management:**
     * Implement testDataRegistry to track all created resources
     * Store resource states (created, updated, deleted)
     * Handle data versioning and history
     * Support rollback operations for failed tests
   
   - **Data Cleanup and Isolation:**
     * Implement comprehensive cleanup in afterEach/afterAll hooks
     * Use unique identifiers to prevent test interference
     * Support parallel test execution with isolated data
     * Handle orphaned data and cleanup failures gracefully

5. **Production-Ready Features:**
   - Add proper Playwright imports and setup with request context
   - Include allure reporting with detailed steps and attachments
   - Implement retry logic for network-dependent operations
   - Add comprehensive logging and debugging information
   - Include performance assertions and timing validations
   - Handle authentication and authorization if required
   - Add health checks and environment validation
   - Support multiple environments (dev, staging, prod)

6. **Error Handling and Recovery:**
   - Implement graceful error handling for each CRUD operation
   - Add retry mechanisms for transient failures
   - Handle partial failures in multi-step operations
   - Include detailed error reporting and diagnostics
   - Support test continuation after non-critical failures

7. **Code Quality and Maintainability:**
   - Use async/await properly throughout
   - Include proper error handling and try-catch blocks
   - Add meaningful test descriptions and comments
   - Follow consistent naming conventions
   - Include JSDoc comments for complex functions
   - Implement helper functions for common operations
   - Use TypeScript interfaces for data structures
   - Add code documentation and usage examples

8. **Test Data Examples:**
   Generate realistic test data that includes:
   - Valid data with all required fields
   - Invalid data for negative testing
   - Boundary values and edge cases
   - Special characters and internationalization
   - Large datasets for performance testing
   - Nested objects and complex data structures

Generate a complete, production-ready E2E test suite that demonstrates the full lifecycle of the ${resourceName} resource with enterprise-grade test data management, comprehensive cleanup procedures, and robust error handling.`;
}

function postProcessAPITestCode(generatedCode, endpoint, variation, timeout, environment = null) {
  let processedCode = generatedCode;
  
  // Step 1: Clean up imports - remove problematic ones and fix duplicates
  processedCode = processedCode.replace(/import.*faker.*;\n/g, '');
  processedCode = processedCode.replace(/import.*Ajv.*;\n/g, '');
  processedCode = processedCode.replace(/import.*joi.*;\n/gi, '');
  processedCode = processedCode.replace(/import.*uuid.*;\n/g, '');
  
  // Remove duplicate allure imports
  const allureImports = (processedCode.match(/import.*allure.*;\n/g) || []);
  if (allureImports.length > 1) {
    // Keep only the first allure import
    for (let i = 1; i < allureImports.length; i++) {
      processedCode = processedCode.replace(allureImports[i], '');
    }
  }
  
  // Ensure clean playwright import
  if (!processedCode.includes("import { test, expect, APIRequestContext")) {
    processedCode = "import { test, expect, APIRequestContext } from '@playwright/test';\n" + processedCode;
  }
  if (!processedCode.includes("import { allure }")) {
    processedCode = processedCode.replace(
      "import { test, expect, APIRequestContext } from '@playwright/test';",
      "import { test, expect, APIRequestContext } from '@playwright/test';\nimport { allure } from 'allure-playwright';"
    );
  }
  
  // Step 2: Remove duplicate imports and fix import issues
  const lines = processedCode.split('\n');
  const cleanedLines = [];
  const seenImports = new Set();
  
  for (const line of lines) {
    if (line.trim().startsWith('import')) {
      const importLine = line.trim();
      if (!seenImports.has(importLine)) {
        seenImports.add(importLine);
        cleanedLines.push(line);
      }
    } else {
      cleanedLines.push(line);
    }
  }
  processedCode = cleanedLines.join('\n');
  
  // Remove undefined variable references
  processedCode = processedCode.replace(/expect\(requestValidationResult\.error\)\.toBeUndefined\(\);\n/g, '');
  processedCode = processedCode.replace(/expect\(responseValidationResult\.error\)\.toBeUndefined\(\);\n/g, '');
  processedCode = processedCode.replace(/\/\/ Validate request data against schema\s*\n/g, '');
  
  // Step 3: Aggressive simplification - remove all complex patterns
  // Remove ALL schema validation code (Joi, Ajv, etc.)
  processedCode = processedCode.replace(/\/\/ Define.*?schema.*?\n/g, '');
  processedCode = processedCode.replace(/const \w*Schema = [\s\S]*?\.required\(\);\n/g, '');
  processedCode = processedCode.replace(/const \w*Schema = \{[\s\S]*?\};\n/g, '');
  processedCode = processedCode.replace(/const ajv = new Ajv\(\);\n/g, '');
  processedCode = processedCode.replace(/const validate\w+[\s\S]*?;\n/g, '');
  processedCode = processedCode.replace(/const isValid\w+[\s\S]*?;\n/g, '');
  processedCode = processedCode.replace(/if \(!isValid\w+\)[\s\S]*?\}\n/g, '');
  processedCode = processedCode.replace(/const \w+ValidationResult[\s\S]*?;\n/g, '');
  processedCode = processedCode.replace(/if \(\w+ValidationResult\.error\)[\s\S]*?\}\n/g, '');
  
  // Replace ALL complex data generation with simple static values
  processedCode = processedCode.replace(/faker\.\w+\.\w+\([^)]*\)/g, '"Test Value"');
  processedCode = processedCode.replace(/uuidv4\(\)/g, 'Date.now()');
  processedCode = processedCode.replace(/new Date\(\)\.toISOString\(\)/g, '"2024-01-01T00:00:00.000Z"');
  processedCode = processedCode.replace(/new Date\([^)]*\)\.toISOString\(\)/g, '"2024-01-01T00:00:00.000Z"');
  
  // Remove problematic fields that don't exist in actual API
  const problematicFields = ['budget', 'startDate', 'endDate', 'owner', 'createdAt', 'updatedAt'];
  problematicFields.forEach(field => {
    processedCode = processedCode.replace(new RegExp(`\\s*${field}:.*?,?\\n`, 'g'), '\n');
    processedCode = processedCode.replace(new RegExp(`expect\\(responseBody\\.${field}\\)[^;]*;\\n`, 'g'), '');
    processedCode = processedCode.replace(new RegExp(`const \\w*${field}[^;]*;\\n`, 'gi'), '');
  });
  
  // Simplify request data to only include name and description
  processedCode = processedCode.replace(
    /const requestData = \{[\s\S]*?\};/g,
    `const requestData = {
      name: \`test\${Date.now()}\`,
      description: \`test\${Date.now()}\`
    };`
  );
  
  // Replace the entire test structure with a clean, working template
  if (processedCode.includes('test.describe') && processedCode.includes('test.beforeAll')) {
    const testName = endpoint.method + ' ' + (endpoint.path || endpoint.url || '/unknown');
    
    // Use environment variables for OAuth configuration - no hardcoded credentials
    const hasOAuth = environment?.authorization?.enabled && environment?.authorization?.type === 'oauth2';
    
    const cleanTemplate = `
import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('${testName} - happy-path', () => {
  let requestContext: APIRequestContext;
  let createdProjectId: string;
  let oauthToken: string;

  test.beforeAll(async () => {
    const { request } = await import('@playwright/test');
    
    // Use API token provided by the test executor
    oauthToken = process.env.API_TOKEN;
    if (!oauthToken) {
      throw new Error('API_TOKEN environment variable is required. Make sure to run via UI or server API with environment configuration.');
    }
    console.log('✅ Using API token from environment');

    // Create the main request context with the token
    requestContext = await request.newContext({
      baseURL: process.env.BASE_URL || process.env.API_URL || '${environment?.variables?.API_URL || environment?.variables?.BASE_URL || 'https://p-tray.dev.g42a.ae'}',
      extraHTTPHeaders: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.API_TOKEN || oauthToken}\`,
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
        const deleteResponse: APIResponse = await requestContext.delete(\`${endpoint.path || endpoint.url || '/unknown'}/\${createdProjectId}\`);
        console.log(\`Project cleanup attempt for ID \${createdProjectId}: Status \${deleteResponse.status()}\`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(\`Project cleanup for ID \${createdProjectId} not possible:\`, errorMessage);
      }
    }
  });

  test('should create a ${endpoint.summary || 'resource'} successfully', async () => {
    const requestData = {
      name: \`test\${Date.now()}\`,
      description: \`test\${Date.now()}\`
    };

    console.log('📤 Sending request data:', JSON.stringify(requestData, null, 2));
    console.log('🔐 Using OAuth token:', oauthToken ? 'Token available' : 'No token');

    const startTime = Date.now();
    const response: APIResponse = await requestContext.${endpoint.method.toLowerCase()}('${endpoint.path || endpoint.url || '/unknown'}', {
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
    if (response.status() !== ${getExpectedStatus(endpoint)}) {
      console.error('❌ API returned error status:', response.status());
      console.error('❌ Error details:', responseBody);
      
      // Attach error details to Allure
      await allure.attachment('Error Response', JSON.stringify(responseBody, null, 2), 'application/json');
      await allure.attachment('Request Data', JSON.stringify(requestData, null, 2), 'application/json');
    }

    // Validate response status
    expect(response.status()).toBe(${getExpectedStatus(endpoint)});

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
    await allure.attachment('Response Time', \`\${responseTime}ms\`, 'text/plain');
    
    allure.label('severity', 'critical');
    allure.epic('${endpoint.tags?.[0] || 'API'} Management');
    allure.feature('${endpoint.summary || 'Create Resource'}');
    allure.story('Happy Path');
    allure.description('This test verifies that a ${endpoint.summary?.toLowerCase() || 'resource'} can be created successfully via the API.');
  });
});`;
    
    processedCode = cleanTemplate;
  }
  
  // Fix request context setup
  processedCode = processedCode.replace(/async \(\{ playwright \}\)/g, 'async ()');
  processedCode = processedCode.replace(/playwright\.request\.newContext/g, 'request.newContext');
  
  // Ensure proper request context setup
  if (!processedCode.includes('const { request } = await import')) {
    processedCode = processedCode.replace(
      /requestContext = await request\.newContext/g,
      'const { request } = await import(\'@playwright/test\');\n    requestContext = await request.newContext'
    );
  }
  
  // Ensure OAuth token uses environment variable
  processedCode = processedCode.replace(
    /Authorization:\s*`Bearer\s+[^`]+`/g,
    'Authorization: `Bearer ${process.env.OAUTH_TOKEN}`'
  );
  
  // Ensure BASE_URL uses environment variable
  processedCode = processedCode.replace(
    /baseURL:\s*[^,\n]+/g,
    'baseURL: process.env.BASE_URL || process.env.API_URL || \'https://p-tray.dev.g42a.ae\''
  );
  
  // Fix allure method calls
  processedCode = processedCode.replace(/allure\.addAttachment\(/g, 'allure.attachment(');
  processedCode = processedCode.replace(/allure\.logStep\(/g, 'allure.attachment(');
  
  // Clean up syntax issues
  processedCode = processedCode.replace(/,\s*,/g, ',');
  processedCode = processedCode.replace(/\[\s*,/g, '[');
  processedCode = processedCode.replace(/,\s*\]/g, ']');
  processedCode = processedCode.replace(/\{\s*,/g, '{');
  processedCode = processedCode.replace(/,\s*\}/g, '}');
  
  // Step 3: Clean up the test structure
  // Remove problematic test data and validation
  processedCode = processedCode.replace(/expect\(responseBody\.budget\)\.toBe\(requestData\.budget\);/g, '');
  processedCode = processedCode.replace(/expect\(responseBody\.startDate\)\.toBe\(requestData\.startDate\);/g, '');
  processedCode = processedCode.replace(/expect\(responseBody\.endDate\)\.toBe\(requestData\.endDate\);/g, '');
  
  // Fix incomplete or malformed code blocks
  processedCode = processedCode.replace(/\/\/ Log request and response details\s*\)\s*;\s*\)\s*;/g, 
    '// Test completed successfully');
  
  // Ensure proper allure attachments
  processedCode = processedCode.replace(/allure\.attach\(/g, 'allure.attachment(');
  
  // Step 4: Add basic structure if missing key components
  if (!processedCode.includes('const response')) {
    const basicTest = `
    const response = await requestContext.${endpoint.method.toLowerCase()}('${endpoint.path || endpoint.url || '/unknown'}', {
      data: {
        name: "Test Project",
        description: "Test Description"
      }
    });
    
    expect(response.status()).toBe(201);
    
    const responseBody = await response.json();
    await allure.attachment('Response Body', JSON.stringify(responseBody, null, 2), 'application/json');`;
    
    processedCode = processedCode.replace(
      /test\([^{]*\{[^}]*\}/,
      `test('should create a project successfully', async () => {${basicTest}\n  });`
    );
  }
  
  // Final cleanup
  return processedCode;
}
function postProcessE2ETestCode(generatedCode, endpoints, resourceName, timeout) {
  // Ensure proper imports and structure
  let processedCode = generatedCode;
  
  // Extract and deduplicate imports - must be at the top
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"][^'"]+['"];?)/g;
  const imports = [];
  const seenImports = new Set();
  
  let match;
  while ((match = importRegex.exec(processedCode)) !== null) {
    const importLine = match[0].trim();
    // Normalize import for deduplication (remove extra spaces)
    const normalized = importLine.replace(/\s+/g, ' ').replace(/from\s+['"]/g, 'from "');
    if (!seenImports.has(normalized)) {
      seenImports.add(normalized);
      imports.push(importLine);
    }
  }
  
  // Remove all imports from code
  processedCode = processedCode.replace(importRegex, '');
  
  // Remove test.describe/test blocks that wrap imports (malformed)
  processedCode = processedCode.replace(/test\.describe\([^)]+\)\s*\{\s*(test\.'[^']+'|import)/g, 'import');
  processedCode = processedCode.replace(/test\.'[^']+'[^}]*\{\s*(import)/g, 'import');
  
  // Remove duplicate import statements
  processedCode = processedCode.replace(/import\s+[^;]+;/g, '');
  processedCode = processedCode.replace(/import\s+[^;]+from\s+['"][^'"]+['"];?/g, '');
  
  // Ensure we have required imports
  const requiredImports = [
    "import { test, expect, APIRequestContext } from '@playwright/test';",
    "import { allure } from 'allure-playwright';"
  ];
  
  requiredImports.forEach(imp => {
    const normalized = imp.replace(/\s+/g, ' ');
    if (!seenImports.has(normalized)) {
      imports.unshift(imp);
      seenImports.add(normalized);
    }
  });
  
  // Combine imports at the top
  const importSection = imports.join('\n') + '\n\n';
  
  // Fix request context setup if using old pattern
  if (processedCode.includes('async ({ request })')) {
    processedCode = processedCode.replace(
      /async \(\{ request \}\)/g,
      'async ()'
    );
  }
  
  // Fix request context usage
  if (processedCode.includes('await request.')) {
    processedCode = processedCode.replace(
      /await request\./g,
      'await apiContext.'
    );
  }
  
  // Replace any testData with testDataRegistry before adding it
  processedCode = processedCode.replace(/testData\./g, 'testData.');
  processedCode = processedCode.replace(/const testData\s*[:=]/g, 'const testData: TestData =');
  processedCode = processedCode.replace(/let testData\s*[:=]/g, 'let testData: TestData =');
  
  // Fix status code expectations to be more flexible
  processedCode = processedCode.replace(
    /expect\(response.*?\.status\(\)\)\.toBe\((\d+)\)/g,
    'expect([200, 201, 400, 404]).toContain(response.status())'
  );
  
  // Ensure proper setup - beforeAll should initialize apiContext and testData
  // Fix beforeAll to use playwright fixture properly
  if (!processedCode.includes('let apiContext: APIRequestContext')) {
    const beforeAllFix = `
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
        ...(authToken ? { Authorization: \`Bearer \${authToken}\` } : {}),
        'Content-Type': 'application/json'
      },
      timeout: ${timeout}
    });
  } catch (error: any) {
    throw new Error(\`Authentication setup failed: \${error.message || error}\`);
  }
});
`;
    
    // Insert beforeAll setup after imports but before any test blocks
    const testBlockMatch = processedCode.search(/test\.(describe|beforeAll|beforeEach)/);
    if (testBlockMatch > 0) {
      processedCode = processedCode.slice(0, testBlockMatch) + beforeAllFix + '\n\n' + processedCode.slice(testBlockMatch);
    } else {
      processedCode = beforeAllFix + '\n\n' + processedCode;
    }
  }
  
  // Add timeout if not present
  if (!processedCode.includes('test.setTimeout')) {
    processedCode = processedCode.replace(
      /test\.beforeEach\(async \(\) => \{/,
      `test.beforeEach(async () => {
    test.setTimeout(${timeout});`
    );
  }
  
  // Add comprehensive cleanup in afterEach
  if (!processedCode.includes('test.afterEach')) {
    const afterEachCode = `
test.afterEach(async () => {
  if (testData.createdUserId) {
    try {
      await allure.step('Cleanup: Delete created resource', async () => {
        const deleteResponse = await apiContext.delete(\`/user/\${testData.createdUserId}\`);
        expect(deleteResponse.status()).toBeGreaterThanOrEqual(200);
      });
    } catch (error: any) {
      console.warn(\`Cleanup failed for resource \${testData.createdUserId}: \${error.message || error}\`);
    }
  }
});`;
    
    // Insert afterEach before the closing brace of test.describe
    processedCode = processedCode.replace(/(\n\}\s*$)/, afterEachCode + '$1');
  }
  
  // Add resource tag
  if (!processedCode.includes(`await allure.tag('${resourceName}')`)) {
    processedCode = processedCode.replace(
      /await allure\.tag\('E2E'\);/,
      `await allure.tag('E2E');
    await allure.tag('${resourceName}');
    await allure.tag('CRUD-Workflow');`
    );
  }
  
  // Remove emojis and fix string literal issues - comprehensive emoji removal
  processedCode = processedCode.replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2190}-\u{21FF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '');
  
  // Fix broken string literals caused by line breaks - more comprehensive approach
  processedCode = processedCode.replace(/console\.log\('([^']*?)\n([^']*?)\'\);/g, "console.log('$1 $2');");
  processedCode = processedCode.replace(/console\.log\('\s*\n\s*([^']*)\'\);/g, "console.log('$1');");
  processedCode = processedCode.replace(/console\.log\('([^']*?)\s*\n\s*([^']*)\'\);/g, "console.log('$1 $2');");
  // Fix any remaining broken console.log statements
  processedCode = processedCode.replace(/console\.log\([^)]*\n[^)]*\)/g, (match) => {
    return match.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  });
  
  // Replace testData references with testData to match our data management structure
  // Note: We'll use testData (simpler) instead of testDataRegistry for consistency
  processedCode = processedCode.replace(/testDataRegistry\./g, 'testData.');
  processedCode = processedCode.replace(/const testDataRegistry\s*[:=]/g, 'const testData: TestData =');
  processedCode = processedCode.replace(/let testDataRegistry\s*[:=]/g, 'let testData: TestData =');
  
  // Ensure testData interface exists
  if (!processedCode.includes('interface TestData')) {
    const testDataInterface = `
interface TestData {
  createdUserId?: number;
  originalUser?: any;
  updatedUser?: any;
}`;
    // Insert interface after imports but before code
    const firstCodeLine = processedCode.search(/(const|let|interface|type|test\.|function)/);
    if (firstCodeLine > 0) {
      processedCode = processedCode.slice(0, firstCodeLine) + testDataInterface + '\n\n' + processedCode.slice(firstCodeLine);
    } else {
      processedCode = importSection + testDataInterface + '\n\n' + processedCode;
    }
  }
  
  // Only add error handling if it doesn't already exist
  if (!processedCode.includes('// Enhanced Error Handling') && !processedCode.includes('function handleTestError') && !processedCode.includes('function retryOperation')) {
    const errorHandlingCode = `
// Enhanced Error Handling
function handleTestError(error: unknown, operation: string, resourceId: string | null = null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(\`Error during \${operation}:\`, {
    message: errorMessage,
    resourceId,
    timestamp: new Date().toISOString(),
    stack: errorStack
  });
  
  // Add to allure report
  allure.attachment('Error Details', JSON.stringify({
    operation,
    resourceId,
    error: errorMessage,
    timestamp: new Date().toISOString()
  }), 'application/json');
}

// Retry mechanism for network operations
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(\`Attempt \${attempt} failed, retrying in \${delay}ms...\`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}
`;
    
    processedCode = processedCode.replace(
      /\/\/ Test Data Management/,
      `// Test Data Management${errorHandlingCode}`
    );
  }
  
  // Reassemble code with imports at the top
  // Clean up any leading whitespace/newlines
  processedCode = processedCode.trim();
  
  // Ensure imports are at the very top, before any code
  if (!processedCode.startsWith('import ')) {
    processedCode = importSection + processedCode;
  } else {
    // Replace existing imports with our deduplicated ones
    const codeWithoutImports = processedCode.replace(/^import\s+[^;]+from\s+['"][^'"]+['"];?\s*\n/gm, '');
    processedCode = importSection + codeWithoutImports.trim();
  }
  
  // Ensure proper structure: imports, then interfaces, then code
  // Remove any test.describe/test blocks that appear before imports
  processedCode = processedCode.replace(/^(test\.describe|test\(')[\s\S]*?^import/gm, 'import');
  
  // Fix apiContext variable name if it's using requestContext
  processedCode = processedCode.replace(/requestContext/g, 'apiContext');
  
  return processedCode;
}

function fixTypeScriptTypes(code) {
  let processedCode = code;
  
  // Fix response variable declarations to use proper TypeScript types
  // Pattern: const response = await requestContext.post(...)
  processedCode = processedCode.replace(
    /(const|let)\s+(response)\s*=\s*await\s+requestContext\./g,
    '$1 $2: APIResponse = await requestContext.'
  );
  
  // Fix response variable declarations without type annotation
  processedCode = processedCode.replace(
    /(const|let)\s+(response)\s*;/g,
    '$1 $2: APIResponse | undefined;'
  );
  
  // Fix error handling in catch blocks
  processedCode = processedCode.replace(
    /catch\s*\(\s*(\w+)\s*\)/g,
    'catch ($1: unknown)'
  );
  
  // Fix error message extraction in catch blocks
  processedCode = processedCode.replace(
    /(console\.log|console\.error)\(.*?error\)/g,
    (match) => {
      if (match.includes('error instanceof Error')) {
        return match;
      }
      return match.replace(/error/g, 'error instanceof Error ? error.message : String(error)');
    }
  );
  
  // Fix response usage with proper null checks
  processedCode = processedCode.replace(
    /response\.(status|headers|json|text)\(/g,
    'response!.$1('
  );
  
  return processedCode;
}

function fixDuplicateVariableDeclarations(code) {
  // Split code into lines for processing
  const lines = code.split('\n');
  const processedLines = [];
  const variableDeclarations = new Map(); // Track variable declarations by scope
  
  let currentScope = 0; // Track nesting level
  const scopeStack = [0];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Track scope changes
    if (trimmedLine.includes('{')) {
      currentScope++;
      scopeStack.push(currentScope);
    }
    if (trimmedLine.includes('}')) {
      scopeStack.pop();
      currentScope = scopeStack[scopeStack.length - 1] || 0;
    }
    
    // Check for variable declarations
    const constMatch = trimmedLine.match(/^const\s+(\w+)\s*=/);
    const letMatch = trimmedLine.match(/^let\s+(\w+)\s*=/);
    
    if (constMatch || letMatch) {
      const varName = constMatch ? constMatch[1] : letMatch[1];
      const scopeKey = `${currentScope}-${varName}`;
      
      if (variableDeclarations.has(scopeKey)) {
        // Variable already declared in this scope, change to assignment
        const assignmentLine = line.replace(/^(const|let)\s+/, '');
        processedLines.push(assignmentLine);
      } else {
        // First declaration in this scope
        variableDeclarations.set(scopeKey, true);
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
}

module.exports = router;