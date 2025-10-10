const express = require('express');
const router = express.Router();
const FileStorage = require('../services/FileStorage');
const LLMService = require('../services/LLMService');

const fileStorage = new FileStorage();
const llmService = new LLMService();

// Get all environments
router.get('/', async (req, res) => {
  try {
    const environments = await fileStorage.getEnvironments();
    res.json(environments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single environment
router.get('/:id', async (req, res) => {
  try {
    const environment = await fileStorage.getEnvironmentById(req.params.id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    res.json(environment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new environment
router.post('/', async (req, res) => {
  try {
    const {
      name,
      key,
      description,
      variables,
      jiraIntegration,
      llmConfiguration,
      authorization
    } = req.body;
    
    // Validate required fields
    if (!name || !key) {
      return res.status(400).json({ error: 'Name and key are required' });
    }
    
    // Check if key already exists
    const existingEnv = await fileStorage.getEnvironmentByKey(key);
    if (existingEnv) {
      return res.status(400).json({ error: 'Environment key already exists' });
    }
    
    const environmentData = {
      name,
      key,
      description,
      variables: {
        BASE_URL: variables?.BASE_URL || process.env.BASE_URL || 'http://localhost:5050',
        API_URL: variables?.API_URL || '',
        USERNAME: variables?.USERNAME || '',
        PASSWORD: variables?.PASSWORD || '',
        TIMEOUT: variables?.TIMEOUT || 30000,
        BROWSER: variables?.BROWSER || 'chromium',
        HEADLESS: variables?.HEADLESS !== false,
        RETRIES: variables?.RETRIES || 2,
        ...variables
      },
      jiraIntegration: {
        enabled: jiraIntegration?.enabled || false,
        url: jiraIntegration?.url || '',
        username: jiraIntegration?.username || '',
        password: jiraIntegration?.password || '',
        projectKey: jiraIntegration?.projectKey || '',
        ...jiraIntegration
      },
      llmConfiguration: {
        enabled: llmConfiguration?.enabled || false,
        provider: llmConfiguration?.provider || 'openai',
        apiKey: llmConfiguration?.apiKey || '',
        model: llmConfiguration?.model || '',
        baseUrl: llmConfiguration?.baseUrl || '',
        ...llmConfiguration
      },
      authorization: {
        enabled: authorization?.enabled || false,
        type: authorization?.type || 'bearer',
        token: authorization?.token || '',
        username: authorization?.username || '',
        password: authorization?.password || '',
        apiKey: authorization?.apiKey || '',
        clientId: authorization?.clientId || '',
        clientSecret: authorization?.clientSecret || '',
        scope: authorization?.scope || '',
        authUrl: authorization?.authUrl || '',
        tokenUrl: authorization?.tokenUrl || '',
        redirectUri: authorization?.redirectUri || '',
        customHeaders: authorization?.customHeaders || {},
        ...authorization
      }
    };
    
    const environment = await fileStorage.createEnvironment(environmentData);
    res.status(201).json(environment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update environment
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      key,
      description,
      variables,
      jiraIntegration,
      llmConfiguration,
      authorization,
      status
    } = req.body;
    
    const environment = await fileStorage.getEnvironmentById(req.params.id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    
    // Check if key is being changed and if it already exists
    if (key && key !== environment.key) {
      const existingEnv = await fileStorage.getEnvironmentByKey(key);
      if (existingEnv) {
        return res.status(400).json({ error: 'Environment key already exists' });
      }
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (key) updateData.key = key;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    
    if (variables) {
      updateData.variables = {
        ...environment.variables,
        ...variables
      };
    }
    
    if (jiraIntegration) {
      updateData.jiraIntegration = {
        ...environment.jiraIntegration,
        ...jiraIntegration
      };
    }
    
    if (llmConfiguration) {
      updateData.llmConfiguration = {
        ...environment.llmConfiguration,
        ...llmConfiguration
      };
    }
    
    if (authorization) {
      updateData.authorization = {
        ...environment.authorization,
        ...authorization
      };
    }
    
    const updatedEnvironment = await fileStorage.updateEnvironment(req.params.id, updateData);
    res.json(updatedEnvironment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete environment
router.delete('/:id', async (req, res) => {
  try {
    const environment = await fileStorage.getEnvironmentById(req.params.id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    
    await fileStorage.deleteEnvironment(req.params.id);
    res.json({ message: 'Environment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test environment connection
router.post('/:id/test-connection', async (req, res) => {
  try {
    const environment = await fileStorage.getEnvironmentById(req.params.id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    
    const { BASE_URL } = environment.variables;
    
    if (!BASE_URL) {
      return res.status(400).json({ error: 'BASE_URL not configured' });
    }
    
    // Test basic connectivity
    const axios = require('axios');
    try {
      const response = await axios.get(BASE_URL, { timeout: 5000 });
      res.json({
        success: true,
        status: response.status,
        message: 'Connection successful'
      });
    } catch (error) {
      res.json({
        success: false,
        error: error.message,
        message: 'Connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get environment variables for test execution
router.get('/:id/variables', async (req, res) => {
  try {
    const environment = await fileStorage.getEnvironmentById(req.params.id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    
    res.json(environment.variables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test LLM connection
router.post('/test-llm-connection', async (req, res) => {
  try {
    const { provider, llmType, apiKey, baseUrl, model } = req.body;

    // For local models, provider is "local" and llmType is the actual provider name (e.g., "Ollama")
    // For non-local models, provider is the service name (e.g., "openai")
    const isLocal = provider === 'local';

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required'
      });
    }

    // For non-local models, API key is required
    if (!isLocal && !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key is required for non-local models'
      });
    }

    // Use real LLM connection testing
    console.log(`Testing LLM connection: ${provider} (${llmType})`);
    
    const isConnected = await llmService.testConnection(
      provider,
      llmType,
      apiKey || '',
      model || llmService.getDefaultModel(provider),
      baseUrl || llmService.getDefaultBaseUrl(provider)
    );

    const message = isConnected 
      ? `${provider} connection successful`
      : `${provider} connection failed - please check your configuration`;

    res.json({
      success: isConnected,
      message,
      details: {
        provider,
        llmType: isLocal ? 'local' : 'cloud',
        model: model || llmService.getDefaultModel(provider),
        baseUrl: baseUrl || llmService.getDefaultBaseUrl(provider),
        apiKeyRequired: !isLocal,
        timestamp: new Date().toISOString(),
        testType: 'real_connection'
      }
    });
  } catch (error) {
    console.error('Error testing LLM connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test LLM connection',
      error: error.message
    });
  }
});

// Test OAuth token retrieval (supports password and client_credentials grants)
router.post('/test-oauth-token', async (req, res) => {
  try {
    const axios = require('axios');
    const FileStorage = require('../services/FileStorage');
    const fileStorage = new FileStorage();
    
    // Allow either direct auth payload or environmentId
    let clientId, clientSecret, tokenUrl, scope, grantType = 'password', username, password;
    if (req.body && req.body.environmentId) {
      console.log('🔍 Looking for environment with ID:', req.body.environmentId);
      const env = await fileStorage.getEnvironmentById(req.body.environmentId);
      console.log('🔍 Found environment:', env ? env.name : 'null');
      if (!env) {
        return res.status(404).json({ success: false, message: 'Environment not found' });
      }
      const auth = env.authorization || {};
      console.log('🔍 Auth config:', { 
        enabled: auth.enabled, 
        type: auth.type, 
        clientId: auth.clientId, 
        tokenUrl: auth.tokenUrl 
      });
      clientId = auth.clientId;
      clientSecret = auth.clientSecret;
      tokenUrl = auth.tokenUrl;
      scope = auth.scope;
      grantType = auth.grantType || 'password';
      username = auth.username;
      password = auth.password;
    } else {
      ({ clientId, clientSecret, tokenUrl, scope, grantType = 'password', username, password } = req.body || {});
    }

    console.log('🔍 Final auth params:', { clientId, tokenUrl, grantType, username: username ? '***' : 'none' });
    
    if (!clientId || !tokenUrl) {
      return res.status(400).json({
        success: false,
        message: 'clientId and tokenUrl are required'
      });
    }

    if (grantType === 'password' && (!username || !password)) {
      return res.status(400).json({
        success: false,
        message: 'username and password are required for password grant'
      });
    }

    const form = new URLSearchParams();
    form.append('client_id', clientId);
    form.append('grant_type', grantType);
    if (scope) form.append('scope', scope);
    if (grantType === 'password') {
      form.append('username', username);
      form.append('password', password);
    }

    try {
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      // Prefer HTTP Basic when clientSecret is present (commonly required by Keycloak confidential clients)
      if (clientSecret) {
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${basic}`;
      } else {
        // Public client: include client_secret only if provided; otherwise none
        // Keep client_id in body only (already appended)
      }

      const body = new URLSearchParams(form);
      if (!clientSecret && req.body.clientSecret) {
        body.append('client_secret', req.body.clientSecret);
      }

      let response;
      try {
        response = await axios.post(tokenUrl, body.toString(), { headers, timeout: 15000 });
      } catch (e) {
        // Retry with Accept header for servers requiring it
        if (e.response && (e.response.status === 406 || e.response.status === 415)) {
          const retryHeaders = { ...headers, 'Accept': 'application/json' };
          response = await axios.post(tokenUrl, body.toString(), { headers: retryHeaders, timeout: 15000 });
        } else {
          throw e;
        }
      }

      const data = response.data || {};
      if (data.access_token) {
        return res.json({
          success: true,
          message: 'OAuth token retrieved successfully',
          token: data.access_token,
          tokenType: data.token_type || 'Bearer',
          expiresIn: data.expires_in,
          scope: data.scope
        });
      }

      return res.json({
        success: false,
        message: 'Token retrieval failed - no access_token in response',
        details: data
      });
    } catch (err) {
      const status = err.response?.status;
      const details = err.response?.data || err.message;
      console.error('OAuth token fetch error:', details);
      return res.status(status || 500).json({
        success: false,
        message: 'Failed to retrieve OAuth token',
        error: details
      });
    }
  } catch (error) {
    console.error('Error in /test-oauth-token:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

module.exports = router;