const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const FileStorage = require('./FileStorage');

class ApiTestExecutor {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.resultsDir = path.join(this.projectRoot, 'test-results');
    this.allureResultsDir = path.join(this.projectRoot, 'allure-results');
    this.fileStorage = new FileStorage();
  }

  async executeApiTest(testFile, executionConfig, environmentConfig = null) {
    const {
      environment = 'test',
      timeout = 30000,
      retries = 1,
      tags = []
    } = executionConfig;

    console.log(`🚀 Starting API test execution: ${testFile}`);
    console.log(`📋 Environment: ${environment}`);
    console.log(`⏱️ Timeout: ${timeout}ms`);
    console.log(`🔄 Retries: ${retries}`);

    try {
      // Ensure results directory exists
      await fs.ensureDir(this.resultsDir);
      await fs.ensureDir(this.allureResultsDir);

      // Create execution-specific directory
      const executionId = `api_execution_${Date.now()}`;
      const executionDir = path.join(this.resultsDir, executionId);
      await fs.ensureDir(executionDir);

      // Write initial status
      await this.writeExecutionStatus(executionId, {
        status: 'running',
        startedAt: new Date().toISOString(),
        testFile: path.basename(testFile),
        environment: environment,
        currentStep: 'Preparing API test execution...'
      });

      // Prepare environment variables
      const env = this.prepareEnvironment(environmentConfig, environment);

      // Execute API test
      const result = await this.runApiTest(testFile, env, executionDir, {
        timeout,
        retries,
        tags,
        environment
      });

      // Update final status
      await this.writeExecutionStatus(executionId, {
        status: result.success ? 'completed' : 'failed',
        completedAt: new Date().toISOString(),
        testFile: path.basename(testFile),
        environment: environment,
        result: result
      });

      return {
        executionId,
        success: result.success,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        executionDir
      };

    } catch (error) {
      console.error('❌ API test execution error:', error);
      throw error;
    }
  }

  async runApiTest(testFile, env, executionDir, config) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🎭 Starting API test execution with Playwright`);
        console.log(`📁 Test file: ${testFile}`);
        
        // Run API test using Playwright
        const args = [
          'test',
          testFile,
          '--output=' + executionDir,
          '--workers=1', // Force single worker for sequential execution
          `--timeout=${config.timeout}`,
          `--retries=${config.retries}`,
          '--project=api', // Use API project configuration
          '--reporter=html' // Generate default Playwright HTML report only
        ];

        // Add tag filtering
        if (config.tags && config.tags.length > 0) {
          args.push('--grep=' + config.tags.join('|'));
          console.log(`🎭 Using tag filter: ${config.tags.join('|')}`);
        }

        console.log(`🎭 Executing Playwright API test command: npx playwright ${args.join(' ')}`);

        const playwrightProcess = spawn('npx', ['playwright', ...args], {
          cwd: this.projectRoot,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { 
            ...process.env, 
            ...env,
            PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(this.projectRoot, '.local-browsers'),
            // Write API HTML report under server/reports/api
            PLAYWRIGHT_HTML_REPORT: path.join(this.projectRoot, 'server', 'reports', 'api'),
            // Ensure we use the root project's Playwright
            NODE_PATH: path.join(this.projectRoot, 'node_modules')
          }
        });

        let stdout = '';
        let stderr = '';

        playwrightProcess.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          console.log(`[API STDOUT] ${output}`);
        });

        playwrightProcess.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          console.error(`[API STDERR] ${output}`);
        });

        playwrightProcess.on('close', (code) => {
          console.log(`🎭 API test execution completed with exit code: ${code}`);
          // Persist a summarized API test result for reporting
          (async () => {
            try {
              const duration = Date.now() - startedAt;
              const testName = path.basename(testFile).replace(/\.spec\.[tj]s$/, '').replace(/[-_]/g, ' ');
              await this.fileStorage.createTestResult({
                testName: testName,
                testType: 'API',
                browser: 'api',
                headless: true,
                environment: env.TEST_ENVIRONMENT || 'test',
                status: code === 0 ? 'passed' : 'failed',
                results: { duration }
              });
              const ReportGenerator = require('./ReportGenerator');
              const rg = new ReportGenerator();
              await rg.generateApiReport();
              console.log('✅ API HTML report regenerated after API test');
            } catch (persistErr) {
              console.log('⚠️ Failed to persist API test result or generate report:', persistErr.message);
            }
          })();

          resolve({
            exitCode: code,
            stdout: stdout,
            stderr: stderr,
            success: code === 0
          });
        });

        playwrightProcess.on('error', (error) => {
          console.error(`❌ Playwright API test process error:`, error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ API test execution error:', error);
        reject(error);
      }
    });
  }

  prepareEnvironment(environmentConfig, environment) {
    const env = { ...process.env };

    // Set API-specific environment variables
    if (environmentConfig) {
      env.API_URL = environmentConfig.apiUrl || environmentConfig.baseUrl || 'https://fakerestapi.azurewebsites.net';
      env.API_TIMEOUT = environmentConfig.timeout || '30000';
      env.API_RETRIES = environmentConfig.retries || '1';
      
      // Add authentication if provided
      if (environmentConfig.apiKey) {
        env.API_KEY = environmentConfig.apiKey;
      }
      if (environmentConfig.bearerToken) {
        env.BEARER_TOKEN = environmentConfig.bearerToken;
      }
      if (environmentConfig.username && environmentConfig.password) {
        env.API_USERNAME = environmentConfig.username;
        env.API_PASSWORD = environmentConfig.password;
      }
    } else {
      // Default API environment
      env.API_URL = 'https://fakerestapi.azurewebsites.net';
      env.API_TIMEOUT = '30000';
      env.API_RETRIES = '1';
    }

    // Set environment name
    env.TEST_ENVIRONMENT = environment;

    console.log(`🌍 API Environment configured:`, {
      API_URL: env.API_URL,
      API_TIMEOUT: env.API_TIMEOUT,
      TEST_ENVIRONMENT: env.TEST_ENVIRONMENT
    });

    return env;
  }

  async writeExecutionStatus(executionId, status) {
    const statusFile = path.join(this.resultsDir, 'status.json');
    let statusData = {};

    try {
      if (await fs.pathExists(statusFile)) {
        statusData = await fs.readJson(statusFile);
      }
    } catch (error) {
      console.warn('Could not read existing status file:', error.message);
    }

    statusData[executionId] = {
      ...status,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeJson(statusFile, statusData, { spaces: 2 });
  }

  async getExecutionStatus(executionId) {
    const statusFile = path.join(this.resultsDir, 'status.json');
    
    try {
      if (await fs.pathExists(statusFile)) {
        const statusData = await fs.readJson(statusFile);
        return statusData[executionId] || null;
      }
    } catch (error) {
      console.warn('Could not read status file:', error.message);
    }
    
    return null;
  }

  async getAllExecutionStatuses() {
    const statusFile = path.join(this.resultsDir, 'status.json');
    
    try {
      if (await fs.pathExists(statusFile)) {
        return await fs.readJson(statusFile);
      }
    } catch (error) {
      console.warn('Could not read status file:', error.message);
    }
    
    return {};
  }
}

module.exports = ApiTestExecutor;
