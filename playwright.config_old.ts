import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

interface Environment {
  _id: string;
  name: string;
  key: string;
  variables: {
    BASE_URL: string;
    API_URL: string;
    USERNAME: string;
    PASSWORD: string;
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    API_USERNAME: string;
    API_PASSWORD: string;
    [key: string]: string;
  };
  jiraIntegration: any;
  llmConfiguration: any;
}

// Load environment configuration from environments.json
function loadEnvironmentConfig(envKey: string): Environment | null {
  try {
    const environmentsPath = path.resolve(__dirname, 'data/environments.json');
    if (!fs.existsSync(environmentsPath)) {
      console.log('⚠️ environments.json file not found');
      return null;
    }

    const environmentsData = JSON.parse(fs.readFileSync(environmentsPath, 'utf8'));
    const environment = environmentsData.find((env: Environment) => 
      env.key.toLowerCase() === envKey.toLowerCase() || 
      env.name.toLowerCase() === envKey.toLowerCase()
    );

    if (!environment) {
      console.log(`⚠️ Environment '${envKey}' not found in environments.json`);
      return null;
    }

    console.log(`📋 Loaded environment configuration for: ${environment.name}`);
    return environment;
  } catch (error) {
    console.error('❌ Error loading environment configuration:', error);
    return null;
  }
}

// Load environment-specific configuration
const env = process.env.ENV || 'test';
const environment = loadEnvironmentConfig(env);

// Set environment variables from the loaded configuration
if (environment) {
  Object.entries(environment.variables).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Global setup for OAuth2 authentication and session management */
  globalSetup: process.env.SKIP_GLOBAL_SETUP ? undefined : require.resolve('./global-setup.ts'),

  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'server/reports/playwright' }],
    ['allure-playwright', { 
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: false
    }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* UI base URL for page.goto */
    baseURL: process.env.BASE_URL,

    /* Storage state for session reuse based on environment - only if file exists */
    storageState: fs.existsSync(`storageState.${env}.json`) ? `storageState.${env}.json` : undefined,
    
    /* Extra HTTP headers including OAuth2 authorization */
    extraHTTPHeaders: {
      // API token header (used for request fixtures)
      'Authorization': `Bearer ${process.env.ACCESS_TOKEN || ''}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Add custom headers from environment
      ...(process.env.CUSTOM_HEADERS ? JSON.parse(process.env.CUSTOM_HEADERS) : {})
    },
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Browser launch options for better performance */
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu-sandbox',
        '--disable-software-rasterizer',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    },
    
    /* Viewport settings for consistent rendering */
    viewport: { width: 1280, height: 720 },
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Reduce action timeout for faster feedback */
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || '10000'),
    
    /* Navigation timeout */
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '15000'),
    
    /* Headless mode configuration */
    headless: process.env.HEADLESS !== 'false',
  },

  /* Configure projects for different environments and browsers */
  projects: [
    {
      name: `${env}-chromium`,
      use: { 
        ...devices['Desktop Chrome'],
        // Use system Chrome for better performance
        channel: 'chrome',
        // Additional performance optimizations
        launchOptions: {
          args: [
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ],
          ignoreDefaultArgs: ['--enable-automation'],
        }
      },
    },

    /* API Testing Project */
    {
      name: `${env}-api`,
      testDir: './server/tests',
      use: {
        // API base URL for request fixtures
        baseURL: process.env.API_URL || 'https://fakerestapi.azurewebsites.net',
        // Longer timeouts for API tests
        actionTimeout: parseInt(process.env.API_ACTION_TIMEOUT || '30000'),
        navigationTimeout: parseInt(process.env.API_NAVIGATION_TIMEOUT || '30000'),
        // No browser needed for API tests
        launchOptions: undefined,
        // No viewport needed for API tests
        viewport: undefined,
        // No storage state needed for API tests (using OAuth2 headers instead)
        storageState: undefined,
        // Disable trace for API tests
        trace: 'off',
        // Disable screenshot for API tests
        screenshot: 'off',
        // Disable video for API tests
        video: 'off',
        // Enhanced headers for API testing
        extraHTTPHeaders: {
          'Authorization': `${process.env.TOKEN_TYPE || 'Bearer'} ${process.env.ACCESS_TOKEN || ''}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Playwright-API-Tests',
          // Add API-specific headers
          ...(process.env.API_HEADERS ? JSON.parse(process.env.API_HEADERS) : {})
        },
      },
    },

    /* Mobile Testing Projects (optional) */
    ...(process.env.ENABLE_MOBILE_TESTING === 'true' ? [
      {
        name: `${env}-mobile-chrome`,
        use: { ...devices['Pixel 5'] },
      },
      {
        name: `${env}-mobile-safari`,
        use: { ...devices['iPhone 12'] },
      },
    ] : []),

    /* Firefox and Safari (optional) */
    ...(process.env.ENABLE_MULTI_BROWSER === 'true' ? [
      {
        name: `${env}-firefox`,
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: `${env}-webkit`,
        use: { ...devices['Desktop Safari'] },
      },
    ] : []),
  ],

  /* Environment-specific test timeout */
  timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),

  /* Environment-specific expect timeout */
  expect: {
    timeout: parseInt(process.env.EXPECT_TIMEOUT || '5000'),
  },

  /* Output directory for test artifacts */
  outputDir: `test-results-${env}/`,
});