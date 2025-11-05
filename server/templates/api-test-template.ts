import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('{{TEST_NAME}}', () => {
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
          throw new Error(`OAuth2 token fetch failed: ${error.message}`);
        }
      } else {
        throw new Error('API_TOKEN missing. Or set TOKEN_URL/CLIENT_ID/CLIENT_SECRET/USERNAME/PASSWORD to fetch token.');
      }
    } else {
      apiToken = rawToken.trim();
      console.log('✅ Using static API token from environment');
    }

    // Create request context with environment-based configuration
    const baseURL = process.env.API_URL || process.env.BASE_URL || '{{BASE_URL}}';
    
    requestContext = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'X-Space': process.env.X_SPACE || 'default'
      },
      timeout: parseInt(process.env.TIMEOUT || '30000', 10)
    });

    console.log(`🌍 API Test Environment: ${baseURL}`);
    console.log(`🔐 Authorization: Bearer ${apiToken ? '***REDACTED***' : 'Not set'}`);
  });

  test.afterAll(async () => {
    if (requestContext) {
      await requestContext.dispose();
    }
  });

  {{TEST_CASES}}
});
