const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test Generation endpoint
router.post('/generate', async (req, res) => {
  try {
    const { prompt, testName, testType = 'UI' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    console.log('Starting test generation with prompt:', prompt);
    
    // Create test directory if it doesn't exist
    const testDir = path.join(__dirname, '../../tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Generate unique test file name
    
    const safeTestName = (testName || 'generated-test').replace(/[^a-zA-Z0-9-_]/g, '-');
    const fileName = `${safeTestName}.spec.ts`;
    const filePath = path.join(testDir, fileName);

    // Create basic test template
    const testCode = `import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://staging-shaheen.dev.g42a.ae/';
const USERNAME = process.env.USERNAME || 'piyush.safaya';
const PASSWORD = process.env.PASSWORD || 'piyush1234';

test.describe('Generated Test: ${safeTestName}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('${safeTestName}', async ({ page }) => {
    try {
      // Generated test based on: ${prompt}
      console.log('Executing test: ${prompt}');
      
      // Add your test steps here based on the prompt
      // This is a template - customize based on your requirements
      
      // Example: Login if needed
      await page.getByPlaceholder('Username').fill(USERNAME);
      await page.getByPlaceholder('Password').fill(PASSWORD);
      await page.getByRole('button', { name: 'Log In' }).click();
      
      // Wait for navigation
      await page.waitForURL('**/cases');
      
      // Add more test steps based on the prompt
      console.log('Test completed successfully');
      
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});
`;

    // Write test file
    fs.writeFileSync(filePath, testCode, 'utf8');
    
    console.log('Test file created:', filePath);

    // Run the test with Playwright to verify it works
    const projectRoot = path.join(__dirname, '../..');
    const relativePath = path.relative(projectRoot, filePath);
    
    const playwrightArgs = ['playwright', 'test', relativePath, '--headed', '--project=chromium'];
    const command = `npx ${playwrightArgs.join(' ')}`;
    console.log('Running command:', command);

    // Set environment variables
    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(projectRoot, '.local-browsers');
    const env = { 
      ...process.env, 
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
      BASE_URL: 'https://staging-shaheen.dev.g42a.ae/',
      USERNAME: 'piyush.safaya',
      PASSWORD: 'piyush1234'
    };

    const playwrightProcess = spawn('npx', playwrightArgs, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let testOutput = '';
    let testError = '';

    playwrightProcess.stdout.on('data', (data) => {
      testOutput += data.toString();
      console.log('Test output:', data.toString());
    });

    playwrightProcess.stderr.on('data', (data) => {
      testError += data.toString();
      console.error('Test error:', data.toString());
    });

    playwrightProcess.on('close', (code) => {
      console.log('Test execution completed with code:', code);
      
      res.json({
        success: true,
        message: 'Test generated and executed successfully',
        filePath: filePath,
        fileName: fileName,
        testOutput: testOutput,
        testError: testError,
        exitCode: code,
        command: command
      });
    });

  } catch (error) {
    console.error('Error generating test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test',
      error: error.message
    });
  }
});

// Enhanced Playwright Codegen endpoint with Allure integration
router.post('/codegen', async (req, res) => {
  try {
    const { 
      url = 'https://staging-shaheen.dev.g42a.ae/', 
      testCaseName = 'codegen-test',
      outputFile 
    } = req.body;
    
    console.log('Starting Playwright codegen for URL:', url);
    console.log('Test case name:', testCaseName);
    
    // Create tests directory if it doesn't exist
    const testDir = path.join(__dirname, '../../tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Generate output file name
    
    const safeTestName = testCaseName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const fileName = outputFile || `${safeTestName}.spec.ts`;
    const filePath = path.join(testDir, fileName);

    // Set environment variables
    const projectRoot = path.join(__dirname, '../..');
    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(projectRoot, '.local-browsers');
    const env = { 
      ...process.env, 
      PLAYWRIGHT_BROWSERS_PATH: browsersPath
    };

    // Start Playwright codegen
    const codegenArgs = ['playwright', 'codegen', url, '--output', filePath];
    console.log('Running codegen command:', `npx ${codegenArgs.join(' ')}`);

    const codegenProcess = spawn('npx', codegenArgs, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let codegenOutput = '';
    let codegenError = '';

    codegenProcess.stdout.on('data', (data) => {
      codegenOutput += data.toString();
      console.log('Codegen output:', data.toString());
    });

    codegenProcess.stderr.on('data', (data) => {
      codegenError += data.toString();
      console.error('Codegen error:', data.toString());
    });

    // Handle process completion and post-process the generated file
    codegenProcess.on('close', async (code) => {
      console.log('Codegen process completed with code:', code);
      
      if (code === 0 && fs.existsSync(filePath)) {
        try {
          // Post-process the generated file to add Allure integration
          await enhanceCodegenFileWithAllure(filePath, testCaseName, url);
          console.log('Enhanced codegen file with Allure integration');
        } catch (enhanceError) {
          console.error('Error enhancing codegen file:', enhanceError);
        }
      }
    });

    // Send immediate response to client
    res.json({
      success: true,
      message: 'Playwright codegen started successfully',
      filePath: filePath,
      fileName: fileName,
      testCaseName: testCaseName,
      url: url,
      processId: codegenProcess.pid,
      command: `npx ${codegenArgs.join(' ')}`
    });

  } catch (error) {
    console.error('Error starting codegen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start codegen',
      error: error.message
    });
  }
});

// Function to enhance codegen file with Allure integration
// Helper to add Allure imports and steps
async function enhanceCodegenFileWithAllure(filePath, testCaseName, url) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    console.log('Original content:', content);
    
    // Check if this is already an enhanced file (has allure import)
    if (content.includes("import { allure } from 'allure-playwright'")) {
      console.log('File already enhanced, skipping');
      return;
    }
    
    // Extract the test content from the original file - get the body content only
    // Look for test('test', async ({ page }) => { ... });
    const testMatch = content.match(/test\(['"`]test['"`],\s*async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\);/);
    
    if (testMatch) {
      const originalTestBody = testMatch[1];
      
      // Clean up the test body - remove the test declaration and just keep the actions
      const cleanTestBody = originalTestBody.trim();
      
      // Create enhanced content with proper structure
      const enhancedContent = `import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('${testCaseName}', () => {
  test.beforeEach(async ({ page }) => {
    // Add Allure metadata
    allure.label('testType', 'codegen');
    allure.label('testCase', '${testCaseName}');
    allure.label('url', '${url}');
    allure.label('browser', 'chromium');
    allure.owner('Test Generator');
    allure.severity('normal');
    allure.tag('codegen', 'ui-test');
  });

  test('${testCaseName}', async ({ page }) => {
    await allure.step('${testCaseName}', async () => {
      // Original test actions
      ${cleanTestBody}
    });
  });
});`;

      // Write the enhanced content back to file
      fs.writeFileSync(filePath, enhancedContent, 'utf8');
      console.log('Successfully enhanced codegen file with Allure integration');
    } else {
      console.log('No test structure found, using fallback enhancement');
      // Fallback: wrap the entire content
      const enhancedContent = `import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('${testCaseName}', () => {
  test.beforeEach(async ({ page }) => {
    // Add Allure metadata
    allure.label('testType', 'codegen');
    allure.label('testCase', '${testCaseName}');
    allure.label('url', '${url}');
    allure.label('browser', 'chromium');
    allure.owner('Test Generator');
    allure.severity('normal');
    allure.tag('codegen', 'ui-test');
  });

  test('${testCaseName}', async ({ page }) => {
    await allure.step('${testCaseName}', async () => {
      // Original test content
      ${content.split('\n').slice(2).join('\n      ')}
    });
  });
});`;

      fs.writeFileSync(filePath, enhancedContent, 'utf8');
      console.log('Successfully enhanced codegen file with Allure integration (fallback)');
    }
    
  } catch (error) {
    console.error('Error enhancing codegen file:', error);
    throw error;
  }
}

module.exports = router;