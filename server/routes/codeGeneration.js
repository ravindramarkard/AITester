const express = require('express');
const router = express.Router();
const PromptParser = require('../services/PromptParser');
const CodeGenerator = require('../services/CodeGenerator');
const FileStorage = require('../services/FileStorage');
const LLMService = require('../services/LLMService');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Helper function to launch browser for real-time interaction
async function launchRealtimeBrowser(environment) {
  try {
    console.log('🚀 Starting launchRealtimeBrowser function...');
    
    const baseUrl = environment.variables?.BASE_URL || 'http://localhost:5050';
    console.log(`🌐 Target URL: ${baseUrl}`);
    
    // No separate browser launch - the test execution will handle the browser
    console.log(`🎯 Ready for real-time LLM interaction...`);
    console.log(`👀 Browser will open when test execution starts`);
    
    return {
      success: true,
      targetUrl: baseUrl,
      message: 'Ready for real-time LLM interaction',
      browserLaunched: false
    };
    
  } catch (error) {
    console.error('Failed to prepare real-time browser:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to perform real-time LLM interaction with open browser
async function performRealtimeLLMInteraction(testCode, baseUrl, promptContent, parsedSteps = []) {
  try {
    console.log('🎭 Starting real-time LLM interaction with open browser...');
    console.log('👀 LLM will now interact with the browser based on your prompt!');
    
    // Import Playwright for direct browser control
    const { chromium } = require('playwright');
    
    // Launch a new browser instance for real-time interaction
    const browser = await chromium.launch({ 
      headless: false, 
      slowMo: 2000,  // Slow down actions for visibility
      devtools: false 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🌐 Browser launched for real-time LLM interaction');
    console.log('📄 Navigating to target URL...');
    
    // Resolve runtime BASE_URL override if provided
    const targetUrl = process.env.BASE_URL || baseUrl;
    // Navigate to the target URL
    await page.goto(targetUrl);
    console.log('✅ Navigated to:', targetUrl);
    
                // Wait for page to load completely
                await page.waitForLoadState('networkidle');
                console.log('⏳ Page loaded successfully');
                
                // Do not assume login form for all pages; conditional waits are inside specific flows
    
    // Perform LLM actions based on the prompt
    console.log('🤖 LLM is now performing actions based on your prompt...');
    console.log('🎯 Prompt:', promptContent);
    if (Array.isArray(parsedSteps) && parsedSteps.length > 0) {
      console.log(`🧭 Parsed steps received: ${parsedSteps.length}`);
    }
    
                // Helper: infer locale code from prompt/url
                function inferLocaleCode(prompt, url) {
                  try {
                    const lower = (prompt || '').toLowerCase();
                    const matchDash = lower.match(/local[a-z]*\s*-\s*([a-z]{2,3})(?:[-_][a-z]{2})?/i);
                    if (matchDash && matchDash[1]) return matchDash[1];
                    const matchWord = lower.match(/local[a-z]*\s+([a-z]{2,3})(?:[-_][a-z]{2})?/i);
                    if (matchWord && matchWord[1]) return matchWord[1];
                    const urlSeg = (url || '').toLowerCase().match(/\/([a-z]{2})(?:-[a-z]{2})?\/?$/);
                    if (urlSeg && urlSeg[1]) return urlSeg[1];
                  } catch {}
                  return null;
                }

    // Basic step interpreter (executes common actions when steps are provided)
    if (Array.isArray(parsedSteps) && parsedSteps.length > 0) {
      const text = (s) => String(s || '');
      for (const raw of parsedSteps) {
        const step = text(raw.originalText || raw).toLowerCase();
        try {
          if (/type\s+username\s+([^\s"']+)/i.test(step)) {
            const match = raw.originalText.match(/type\s+username\s+([^\s"']+)/i);
            const value = match ? match[1] : process.env.UI_USERNAME || '';
            const username = page.getByPlaceholder(/username/i);
            await username.waitFor({ state: 'visible', timeout: 15000 });
            await username.fill(value);
            console.log(`👤 Username typed: ${value}`);
          } else if (/type\s+password\s+([^\s"']+)/i.test(step)) {
            const match = raw.originalText.match(/type\s+password\s+([^\s"']+)/i);
            const value = match ? match[1] : process.env.UI_PASSWORD || '';
            const password = page.getByPlaceholder(/password/i);
            await password.waitFor({ state: 'visible', timeout: 15000 });
            await password.fill(value);
            console.log(`🔒 Password typed: ••••`);
          } else if (/click\s+on\s+log\s*in\s+button|click\s+login/i.test(step)) {
            const loginBtn = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
            await loginBtn.waitFor({ state: 'visible', timeout: 15000 });
            await loginBtn.click();
            console.log('🔘 Login clicked');
          } else if (/click\s+on\s+create\s+new\s+case/i.test(step)) {
            const btn = page.getByRole('button', { name: /create\s*new\s*case/i });
            await btn.waitFor({ state: 'visible', timeout: 15000 });
            await btn.click();
            console.log('🆕 Create New Case clicked');
          } else if (/enter\s+case\s+name|into\s+enter\s+case\s+name/i.test(step)) {
            const m = raw.originalText.match(/(?:type|enter)\s+test\s*case\s+([\s\S]+?)\s+into/i);
            const value = (m && m[1]) || process.env.CASE_NAME || 'Auto Case';
            const nameField = page.getByPlaceholder(/enter\s*case\s*name/i);
            await nameField.waitFor({ state: 'visible', timeout: 15000 });
            await nameField.fill(value);
            console.log(`✍️ Case name entered: ${value}`);
          } else if (/description/i.test(step)) {
            const m = raw.originalText.match(/description\s+"?([\s\S]+?)"?\s+into/i);
            const value = (m && m[1]) || process.env.CASE_DESC || 'Automation Desc';
            const descField = page.getByPlaceholder(/enter\s*description/i);
            await descField.waitFor({ state: 'visible', timeout: 15000 });
            await descField.fill(value);
            console.log(`📝 Description entered: ${value}`);
          } else if (/click\s+on\s+save\s+button|click\s+save/i.test(step)) {
            const saveBtn = page.getByRole('button', { name: /save/i });
            await saveBtn.waitFor({ state: 'visible', timeout: 15000 });
            await saveBtn.click();
            console.log('💾 Save clicked');
          } else if (/verify\s+created\s+case\s+available/i.test(step)) {
            const name = process.env.CASE_NAME || 'Auto Case';
            await page.waitForLoadState('networkidle');
            await page.getByText(new RegExp(name, 'i')).first().waitFor({ state: 'visible', timeout: 20000 });
            console.log('✅ Verified created case appears in list');
          }
        } catch (stepErr) {
          console.log('⚠️ Step execution error (continuing):', stepErr instanceof Error ? stepErr.message : stepErr);
        }
      }
    }

    // Localization testing branch
                if (promptContent.toLowerCase().includes('localazation')) {
                  console.log('🌐 Performing localization checks...');
                  const locale = inferLocaleCode(promptContent, baseUrl) || 'ar';
                  console.log(`🗺️ Inferred locale: ${locale}`);

                  // Ensure page is fully loaded
                  await page.waitForLoadState('networkidle');

                  // Check html lang and dir attributes
                  const htmlAttrs = await page.evaluate(() => ({
                    lang: document.documentElement.getAttribute('lang') || '',
                    dir: document.documentElement.getAttribute('dir') || ''
                  }));
                  console.log(`🔎 html[lang] = ${htmlAttrs.lang}, html[dir] = ${htmlAttrs.dir}`);

                  // For RTL locales, verify direction
                  const rtlLocales = new Set(['ar', 'he', 'fa', 'ur']);
                  if (rtlLocales.has(locale)) {
                    if ((htmlAttrs.dir || '').toLowerCase() !== 'rtl') {
                      console.log('⚠️ Expected RTL direction for locale, but html[dir] is not rtl');
                    } else {
                      console.log('✅ RTL direction is correctly set');
                    }
                  }

                  // Verify script presence (e.g., Arabic letters) when applicable
                  if (locale === 'ar') {
                    const hasArabic = await page.evaluate(() => /[\u0600-\u06FF]/.test(document.body.innerText || ''));
                    console.log(hasArabic ? '✅ Arabic script detected on page' : '⚠️ Arabic script not detected');
                  }

                  // Basic number/date formatting visibility (heuristic)
                  try {
                    await page.waitForSelector('body', { state: 'visible', timeout: 3000 });
                    console.log('✅ Body element visible for localization checks');
                  } catch {
                    console.log('⚠️ Body visibility wait timed out');
                  }

                  // Screenshot for evidence
                  await page.screenshot({ path: `realtime-llm-interaction-${locale}.png`, fullPage: true });
                  console.log('📸 Localization screenshot saved');
                }

                // Check if this is a login prompt
                else if (promptContent.toLowerCase().includes('login')) {
                  console.log('🔐 Performing login actions...');
                  
                  // Try multiple selectors for username field
                  console.log('👤 Looking for username field...');
                  let usernameField = null;
                  try {
                    usernameField = page.getByPlaceholder('Username');
                    await usernameField.waitFor({ state: 'visible', timeout: 5000 });
                    console.log('✅ Found username field by placeholder');
                  } catch (error) {
                    try {
                      usernameField = page.locator('input[name="username"]');
                      await usernameField.waitFor({ state: 'visible', timeout: 5000 });
                      console.log('✅ Found username field by name');
                    } catch (error2) {
                      try {
                        usernameField = page.locator('input[type="text"]').first();
                        await usernameField.waitFor({ state: 'visible', timeout: 5000 });
                        console.log('✅ Found username field by type');
                      } catch (error3) {
                        console.log('❌ Could not find username field');
                        throw new Error('Username field not found');
                      }
                    }
                  }
                  
                  // Fill username field
                  console.log('👤 Filling username field...');
                  await usernameField.fill(promptContent.includes('invalid') ? 'invalidUser' : 'Admin');
                  console.log('✅ Username filled');
                  
                  // Wait for username field to be filled (smart wait)
                  await usernameField.waitFor({ state: 'visible' });
                  console.log('✅ Username field is ready for next action');
                  
                  // Try multiple selectors for password field
                  console.log('🔒 Looking for password field...');
                  let passwordField = null;
                  try {
                    passwordField = page.getByPlaceholder('Password');
                    await passwordField.waitFor({ state: 'visible', timeout: 5000 });
                    console.log('✅ Found password field by placeholder');
                  } catch (error) {
                    try {
                      passwordField = page.locator('input[name="password"]');
                      await passwordField.waitFor({ state: 'visible', timeout: 5000 });
                      console.log('✅ Found password field by name');
                    } catch (error2) {
                      try {
                        passwordField = page.locator('input[type="password"]');
                        await passwordField.waitFor({ state: 'visible', timeout: 5000 });
                        console.log('✅ Found password field by type');
                      } catch (error3) {
                        console.log('❌ Could not find password field');
                        throw new Error('Password field not found');
                      }
                    }
                  }
                  
                  // Fill password field
                  console.log('🔒 Filling password field...');
                  await passwordField.fill(promptContent.includes('invalid') ? 'invalidPassword' : 'admin123');
                  console.log('✅ Password filled');
                  
                  // Wait for password field to be filled (smart wait)
                  await passwordField.waitFor({ state: 'visible' });
                  console.log('✅ Password field is ready for next action');
                  
                  // Try multiple selectors for login button
                  console.log('🔘 Looking for login button...');
                  let loginButton = null;
                  try {
                    loginButton = page.getByRole('button', { name: 'Login' });
                    await loginButton.waitFor({ state: 'visible', timeout: 5000 });
                    console.log('✅ Found login button by role');
                  } catch (error) {
                    try {
                      loginButton = page.locator('button[type="submit"]');
                      await loginButton.waitFor({ state: 'visible', timeout: 5000 });
                      console.log('✅ Found login button by type');
                    } catch (error2) {
                      try {
                        loginButton = page.locator('input[type="submit"]');
                        await loginButton.waitFor({ state: 'visible', timeout: 5000 });
                        console.log('✅ Found login button by input type');
                      } catch (error3) {
                        console.log('❌ Could not find login button');
                        throw new Error('Login button not found');
                      }
                    }
                  }
                  
                  // Click login button
                  console.log('🔘 Clicking login button...');
                  await loginButton.click();
                  console.log('✅ Login button clicked');
                  
                  // Wait for navigation or error message (smart wait)
                  try {
                    // Wait for either dashboard (success) or error message (failure)
                    await Promise.race([
                      page.getByRole('heading', { name: 'Dashboard' }).waitFor({ state: 'visible', timeout: 5000 }),
                      page.locator('.oxd-alert-content-text').waitFor({ state: 'visible', timeout: 5000 })
                    ]);
                    console.log('✅ Login result is visible');
                  } catch (error) {
                    console.log('⚠️ Login result timeout - checking current state');
                  }
                  
                  // Check for success or error
                  try {
                    const dashboard = page.getByRole('heading', { name: 'Dashboard' });
                    await dashboard.waitFor({ state: 'visible', timeout: 5000 });
                    console.log('✅ Login successful - Dashboard found');
                  } catch (error) {
                    console.log('❌ Login failed - Checking for error message');
                    try {
                      const errorMsg = page.locator('.oxd-alert-content-text');
                      if (await errorMsg.isVisible()) {
                        const errorText = await errorMsg.textContent();
                        console.log('⚠️ Error message found:', errorText);
                      }
                    } catch (error2) {
                      console.log('⚠️ No specific error message found');
                    }
                  }
                }
                
                // Check if this is an HR admin workflow
                else if (promptContent.toLowerCase().includes('admin') && promptContent.toLowerCase().includes('add')) {
                  console.log('👥 Performing HR Admin workflow...');
                  
                  // First, we need to login
                  console.log('🔐 Step 1: Login first...');
                  
                  // Username field
                  const usernameField = page.getByPlaceholder('Username');
                  await usernameField.waitFor({ state: 'visible', timeout: 10000 });
                  await usernameField.fill('Admin');
                  console.log('✅ Username filled');
                  
                  // Wait for username field to be ready
                  await usernameField.waitFor({ state: 'visible' });
                  
                  // Password field
                  const passwordField = page.getByPlaceholder('Password');
                  await passwordField.waitFor({ state: 'visible', timeout: 10000 });
                  await passwordField.fill('admin123');
                  console.log('✅ Password filled');
                  
                  // Wait for password field to be ready
                  await passwordField.waitFor({ state: 'visible' });
                  
                  // Login button
                  const loginButton = page.getByRole('button', { name: 'Login' });
                  await loginButton.waitFor({ state: 'visible', timeout: 10000 });
                  await loginButton.click();
                  console.log('✅ Login button clicked');
                  
                  // Wait for dashboard to appear (smart wait)
                  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ state: 'visible', timeout: 10000 });
                  console.log('✅ Logged in successfully');
                  
                  // Step 2: Click Admin from sidebar
                  console.log('👤 Step 2: Clicking Admin from sidebar...');
                  const adminLink = page.locator('text=Admin').first();
                  await adminLink.waitFor({ state: 'visible', timeout: 10000 });
                  await adminLink.click();
                  console.log('✅ Admin link clicked');
                  
                  // Wait for Admin page to load (smart wait)
                  await page.waitForLoadState('networkidle');
                  console.log('✅ Admin page loaded');
                  
                  // Step 3: Click Add button
                  console.log('➕ Step 3: Clicking Add button...');
                  const addButton = page.locator('button:has-text("Add")').first();
                  await addButton.waitFor({ state: 'visible', timeout: 10000 });
                  await addButton.click();
                  console.log('✅ Add button clicked');
                  
                  // Wait for Add User form to load (smart wait)
                  await page.waitForLoadState('networkidle');
                  console.log('✅ Add User form loaded');
                  
                  // Step 4: Select User Role: Admin
                  console.log('👑 Step 4: Selecting User Role as Admin...');
                  const userRoleDropdown = page.locator('.oxd-select-text').first();
                  await userRoleDropdown.waitFor({ state: 'visible', timeout: 10000 });
                  await userRoleDropdown.click();
                  
                  // Wait for dropdown options to appear (smart wait)
                  const adminOption = page.locator('text=Admin').first();
                  await adminOption.waitFor({ state: 'visible', timeout: 5000 });
                  await adminOption.click();
                  console.log('✅ User Role selected as Admin');
                  
                  // Wait for selection to be applied (smart wait)
                  await userRoleDropdown.waitFor({ state: 'visible' });
                  console.log('✅ User Role selection applied');
                  
                  // Step 5: Enter Employee Name
                  console.log('👤 Step 5: Entering Employee Name...');
                  const employeeNameField = page.locator('input[placeholder*="Employee Name"]').first();
                  await employeeNameField.waitFor({ state: 'visible', timeout: 10000 });
                  await employeeNameField.fill('FirstAutomation123');
                  console.log('✅ Employee Name filled');
                  
                  // Wait for employee name field to be ready (smart wait)
                  await employeeNameField.waitFor({ state: 'visible' });
                  console.log('✅ Employee Name field is ready');
                  
                  // Step 6: Select Status: Enabled
                  console.log('✅ Step 6: Selecting Status as Enabled...');
                  const statusDropdown = page.locator('.oxd-select-text').nth(1);
                  await statusDropdown.waitFor({ state: 'visible', timeout: 10000 });
                  await statusDropdown.click();
                  
                  // Wait for status dropdown options to appear (smart wait)
                  const enabledOption = page.locator('text=Enabled').first();
                  await enabledOption.waitFor({ state: 'visible', timeout: 5000 });
                  await enabledOption.click();
                  console.log('✅ Status selected as Enabled');
                  
                  // Wait for status selection to be applied (smart wait)
                  await statusDropdown.waitFor({ state: 'visible' });
                  console.log('✅ Status selection applied');
                  
                  // Step 7: Enter Username
                  console.log('👤 Step 7: Entering Username...');
                  const usernameField2 = page.locator('input[placeholder*="Username"]').first();
                  await usernameField2.waitFor({ state: 'visible', timeout: 10000 });
                  await usernameField2.fill('ravi11');
                  console.log('✅ Username filled');
                  
                  // Wait for username field to be ready (smart wait)
                  await usernameField2.waitFor({ state: 'visible' });
                  console.log('✅ Username field is ready');
                  
                  // Step 8: Enter Password
                  console.log('🔒 Step 8: Entering Password...');
                  const passwordField2 = page.locator('input[type="password"]').first();
                  await passwordField2.waitFor({ state: 'visible', timeout: 10000 });
                  await passwordField2.fill('ravi12311');
                  console.log('✅ Password filled');
                  
                  // Wait for password field to be ready (smart wait)
                  await passwordField2.waitFor({ state: 'visible' });
                  console.log('✅ Password field is ready');
                  
                  // Step 9: Enter Confirm Password
                  console.log('🔒 Step 9: Entering Confirm Password...');
                  const confirmPasswordField = page.locator('input[type="password"]').nth(1);
                  await confirmPasswordField.waitFor({ state: 'visible', timeout: 10000 });
                  await confirmPasswordField.fill('ravi123343');
                  console.log('✅ Confirm Password filled');
                  
                  // Wait for confirm password field to be ready (smart wait)
                  await confirmPasswordField.waitFor({ state: 'visible' });
                  console.log('✅ Confirm Password field is ready');
                  
                  // Step 10: Click Save button
                  console.log('💾 Step 10: Clicking Save button...');
                  const saveButton = page.locator('button[type="submit"]').first();
                  await saveButton.waitFor({ state: 'visible', timeout: 10000 });
                  await saveButton.click();
                  console.log('✅ Save button clicked');
                  
                  // Wait for save result (smart wait)
                  try {
                    // Wait for either success message or error message
                    await Promise.race([
                      page.locator('.oxd-toast-content').waitFor({ state: 'visible', timeout: 10000 }),
                      page.locator('.oxd-alert-content-text').waitFor({ state: 'visible', timeout: 10000 }),
                      page.waitForLoadState('networkidle')
                    ]);
                    console.log('✅ Save operation completed');
                  } catch (error) {
                    console.log('⚠️ Save operation timeout - checking current state');
                  }
                  console.log('✅ HR Admin workflow completed!');
                }
                
                // Default action for other prompts
                else {
                  console.log('🎯 Performing general actions based on prompt...');
                  console.log('📝 Prompt content:', promptContent);
                  
                  // Try to find any interactive elements and perform basic actions
                  try {
                    const buttons = await page.locator('button').count();
                    const inputs = await page.locator('input').count();
                    const links = await page.locator('a').count();
                    
                    console.log(`🔍 Found ${buttons} buttons, ${inputs} inputs, ${links} links`);
                    
                    if (buttons > 0) {
                      console.log('🔘 Clicking first available button...');
                      const firstButton = page.locator('button').first();
                      await firstButton.click();
                      console.log('✅ Button clicked');
                    }
                  } catch (error) {
                    console.log('⚠️ Could not perform general actions:', error.message);
                  }
                }
    
                // Take screenshot
                console.log('📸 Taking screenshot...');
                await page.screenshot({ path: 'realtime-llm-interaction.png' });
                console.log('✅ Screenshot saved');
                
                // Wait for any final UI updates (smart wait)
                console.log('👀 Waiting for final UI updates...');
                try {
                  await page.waitForLoadState('networkidle', { timeout: 3000 });
                  console.log('✅ Final UI state stabilized');
                } catch (error) {
                  console.log('⚠️ Final UI wait timeout - proceeding');
                }
    
    // Close browser
    await browser.close();
    console.log('🔚 Browser closed');
    
  } catch (error) {
    console.error('❌ Error in real-time LLM interaction:', error);
    throw error;
  }
}

// Helper function to execute test code in the open browser
async function executeTestInBrowser(testCode, baseUrl) {
  try {
    console.log('🎭 Executing test code in the open browser...');
    console.log('👀 Watch the browser window for real-time actions!');
    console.log('🔍 Test code length:', testCode.length);
    console.log('🔍 Base URL:', baseUrl);
    
    // Create a temporary test file
    const testFilePath = path.join(__dirname, '../tests/generated/realtime-execution.spec.ts');
    console.log('🔍 Test file path:', testFilePath);
    console.log('🔍 Test code preview:', testCode.substring(0, 200) + '...');
    
    // Ensure the directory exists
    const testDir = path.dirname(testFilePath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      console.log('📁 Created test directory:', testDir);
    }
    
    fs.writeFileSync(testFilePath, testCode);
    console.log('✅ Test file written successfully');
    
    console.log(`📝 Test file created: ${testFilePath}`);
    console.log('🚀 Running Playwright test in headed mode...');
    console.log('🎭 This will open a new browser window and perform the actions...');
    console.log('👀 Watch for the browser to navigate, fill forms, and click buttons!');
    
    // Execute the test using Playwright with more visible options
    const { spawn } = require('child_process');
    const testProcess = spawn('npx', [
      'playwright', 'test', testFilePath, 
      '--headed', 
      '--workers=1',
      '--timeout=120000',
      '--reporter=list',
      '--project=chromium',
      '--debug'
    ], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      env: { 
        ...process.env, 
        PWDEBUG: '1',
        DEBUG: 'pw:api',
        HEADLESS: 'false'
      }
    });
    
    testProcess.stdout.on('data', (data) => {
      console.log(`📊 Test output: ${data.toString()}`);
    });
    
    testProcess.stderr.on('data', (data) => {
      console.log(`⚠️ Test error: ${data.toString()}`);
    });
    
    // Add more detailed logging
    console.log('🎭 Test process started with PID:', testProcess.pid);
    console.log('👀 Watch for browser windows opening and performing actions...');
    console.log('🎬 The test will now execute in a new browser window...');
    console.log('📱 You should see:');
    console.log('   1. A new browser window opening');
    console.log('   2. Navigation to the login page');
    console.log('   3. Form filling with username/password');
    console.log('   4. Login button click');
    console.log('   5. Result verification');
    
    testProcess.on('close', (code) => {
      console.log(`✅ Test execution completed with code: ${code}`);
      // Clean up the temporary test file
      try {
        fs.unlinkSync(testFilePath);
        console.log('🧹 Temporary test file cleaned up');
      } catch (error) {
        console.log('⚠️ Could not clean up temporary test file:', error.message);
      }
    });
    
    // Wait for the test to complete (with timeout)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('⏰ Test execution timeout reached');
        resolve();
      }, 30000); // 30 second timeout
      
      testProcess.on('close', (code) => {
        clearTimeout(timeout);
        resolve();
      });
      
      testProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    console.log('🎯 Real-time browser interaction completed!');
    
  } catch (error) {
    console.error('❌ Error executing test in browser:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    throw error;
  }
}

// Helper function to generate unique file path with incremental postfix if file exists
function generateUniqueSpecFilePath(testName, baseDir) {
  // Sanitize test name for filename
  let sanitizedTestName = (testName || 'test')
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // Ensure we have a valid filename (at least 1 character)
  if (!sanitizedTestName || sanitizedTestName.length === 0) {
    sanitizedTestName = 'test';
  }
  
  // Limit filename length to avoid filesystem issues (max 200 chars)
  if (sanitizedTestName.length > 200) {
    sanitizedTestName = sanitizedTestName.substring(0, 200);
  }
  
  // Base filename without extension
  const baseFileName = sanitizedTestName;
  
  // Check if base file exists
  let filePath = path.join(baseDir, `${baseFileName}.spec.ts`);
  let postfix = 0;
  
  // If file exists, add incremental postfix (.1, .2, .3, etc.)
  while (fs.existsSync(filePath)) {
    postfix++;
    filePath = path.join(baseDir, `${baseFileName}.${postfix}.spec.ts`);
    
    // Safety limit to prevent infinite loop (max 1000 iterations)
    if (postfix > 1000) {
      console.error('⚠️ Too many file conflicts, using timestamp fallback');
      filePath = path.join(baseDir, `${baseFileName}.${Date.now()}.spec.ts`);
      break;
    }
  }
  
  if (postfix > 0) {
    console.log(`📝 File ${baseFileName}.spec.ts exists, using postfix: ${postfix}`);
  }
  
  return filePath;
}

// Fallback function to generate simple test code when LLM fails
function generateFallbackTestCode(promptContent, testName, baseUrl) {
  console.log('⚠️ Using fallback template generation');
  
  return `
    // Fallback test code - LLM generation failed
    // This is a basic template that should be replaced with LLM-generated code
    console.log('⚠️ Using fallback test template');
    console.log('🎯 Prompt was:', ${JSON.stringify(promptContent.substring(0, 100))});
    
    // Basic test structure - will need to be customized based on prompt
    // For now, just navigate and wait
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // TODO: Add test steps based on prompt: ${promptContent.substring(0, 200)}
    `;
}

// Helper function to process LLM with real-time browser
async function processLLMWithRealtimeBrowser(options) {
  const { promptContent, testName, testType, environment, parsedSteps, baseUrl, browserInstance } = options;
  
  try {
    console.log('🚀 REAL-TIME BROWSER INTERACTION MODE WITH LLM');
    console.log('🌐 Using LLM to generate Playwright code from prompt...');
    console.log('🎯 Prompt:', promptContent);
    
    // Perform DOM analysis to discover available elements
    console.log('🔍 Starting DOM analysis using Playwright Crawler...');
    const DOMAnalyzer = require('../services/DOMAnalyzer');
    const domAnalyzer = new DOMAnalyzer();
    
    let domAnalysisResult = null;
    try {
      // Analyze DOM using document.querySelectorAll through Playwright
      domAnalysisResult = await domAnalyzer.analyzePage(baseUrl, {
        timeout: 15000,
        waitUntil: 'domcontentloaded',
        retries: 1
      });
      
      console.log(`✅ DOM analysis completed:`);
      console.log(`   - Found ${domAnalysisResult.elements?.length || 0} interactive elements`);
      console.log(`   - Page title: ${domAnalysisResult.pageTitle || 'Unknown'}`);
      console.log(`   - Form fields: ${domAnalysisResult.formFields?.length || 0}`);
      
      // Log some example elements found
      if (domAnalysisResult.elements && domAnalysisResult.elements.length > 0) {
        console.log('📋 Sample elements discovered:');
        domAnalysisResult.elements.slice(0, 5).forEach((el, idx) => {
          console.log(`   ${idx + 1}. ${el.type}: ${el.text || el.attributes.placeholder || el.attributes.name || 'unnamed'}`);
        });
      }
    } catch (domError) {
      console.warn('⚠️ DOM analysis failed:', domError.message);
      console.log('Continuing without DOM analysis...');
    } finally {
      // Cleanup DOM analyzer
      try {
        await domAnalyzer.cleanup();
      } catch (cleanupError) {
        console.warn('DOM analyzer cleanup warning:', cleanupError.message);
      }
    }
    
    // Use LLM to generate Playwright code based on the actual prompt
    const llmService = new LLMService();
    
    // Create a comprehensive prompt for LLM to generate Playwright code
    // Include timestamp to ensure uniqueness and prevent caching
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(7);
    
    // Build DOM elements section for LLM prompt
    let domElementsSection = '';
    if (domAnalysisResult && domAnalysisResult.elements && domAnalysisResult.elements.length > 0) {
      const buttons = domAnalysisResult.elements.filter(el => el.type === 'button').slice(0, 10);
      const inputs = domAnalysisResult.elements.filter(el => el.type === 'input').slice(0, 10);
      const links = domAnalysisResult.elements.filter(el => el.type === 'link').slice(0, 10);
      const selects = domAnalysisResult.elements.filter(el => el.type === 'select').slice(0, 5);
      
      domElementsSection = `\n## DOM Analysis Results - Discovered Elements:
Page Title: ${domAnalysisResult.pageTitle || 'Unknown'}
Total Elements Found: ${domAnalysisResult.elements.length}

### Available Buttons (${buttons.length} shown):
${buttons.map((btn, idx) => `${idx + 1}. Text: "${btn.text || 'No text'}" | Best Selector: ${btn.selectors[0] || 'No selector'}`).join('\n')}

### Available Input Fields (${inputs.length} shown):
${inputs.map((inp, idx) => `${idx + 1}. Type: ${inp.attributes.type || 'text'} | Placeholder: "${inp.attributes.placeholder || 'No placeholder'}" | Name: "${inp.attributes.name || 'No name'}" | Best Selector: ${inp.selectors[0] || 'No selector'}`).join('\n')}

### Available Links (${links.length} shown):
${links.map((link, idx) => `${idx + 1}. Text: "${link.text || 'No text'}" | Href: "${link.attributes.href || 'No href'}" | Best Selector: ${link.selectors[0] || 'No selector'}`).join('\n')}

${selects.length > 0 ? `### Available Select Dropdowns (${selects.length} shown):
${selects.map((sel, idx) => `${idx + 1}. Name: "${sel.attributes.name || 'No name'}" | Best Selector: ${sel.selectors[0] || 'No selector'}`).join('\n')}` : ''}

**IMPORTANT: Use these discovered elements to generate accurate, working selectors!**
- Prefer getByRole, getByPlaceholder, getByLabel, getByText based on the element information above
- Use the exact text content shown above for button/link selectors
- Use the exact placeholder/name attributes shown above for input selectors
`;
    }
    
    const llmPrompt = `You are an expert Playwright test automation engineer. Generate a complete, unique Playwright test spec file based on the following user prompt.

## IMPORTANT: Generate FRESH code for this specific prompt
- Request ID: ${uniqueId}
- Timestamp: ${timestamp}
- Do NOT reuse previous templates or cached code
- Generate code specifically tailored to the user's prompt below

## User Prompt:
${promptContent}

## Test Details:
- Test Name: ${testName}
- Test Type: ${testType}
- Base URL: ${baseUrl}
${domElementsSection}
## Requirements:
1. Generate a complete, working Playwright test spec file SPECIFIC to this prompt
2. Use the EXACT actions described in the user prompt - do not use generic templates
3. **USE THE DISCOVERED ELEMENTS FROM DOM ANALYSIS ABOVE** - match element text, placeholders, and attributes exactly
4. Include proper waits and error handling
5. Use realistic selectors based on the DOM analysis (prefer getByRole, getByPlaceholder, getByText over CSS selectors)
6. Add console.log statements for each step to track progress
7. Include proper assertions based on the expected outcome
8. Use environment variables for credentials (UI_USERNAME, UI_PASSWORD, etc.)
9. Generate code that matches the specific prompt content, not generic templates

## Base URL Setup:
\`\`\`typescript
const TARGET_URL = process.env.BASE_URL || '${baseUrl}';
await page.goto(TARGET_URL);
await page.waitForLoadState('networkidle');
\`\`\`

## CRITICAL: 
- Generate UNIQUE code for this specific prompt: "${promptContent.substring(0, 200)}"
- Do NOT use cached or template-based code
- Use the EXACT element information from the DOM Analysis section above
- Analyze the prompt carefully and generate code that implements the exact steps described

Generate the complete Playwright test code that implements the user's prompt. The code should be production-ready and executable.`;

    console.log('🤖 Calling LLM to generate Playwright code...');
    
    let generatedCode = '';
    try {
      // Generate code using LLM
      generatedCode = await llmService.generateCode(llmPrompt, environment, {
        testName: testName,
        testType: testType,
        baseUrl: baseUrl
      });
      
      console.log('✅ LLM generated code successfully (length:', generatedCode.length, 'chars)');
      
      // Clean up the generated code (remove markdown fences, etc.)
      generatedCode = cleanGeneratedCode(generatedCode);
      
      // Extract test code from the generated response if needed
      // The LLM might return code wrapped in markdown or explanations
      const codeBlockMatch = generatedCode.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        generatedCode = codeBlockMatch[1];
      }
      
      // Ensure it starts with imports
      if (!generatedCode.includes('import { test')) {
        generatedCode = `import { test, expect } from '@playwright/test';\n\n${generatedCode}`;
      }
      
    } catch (llmError) {
      console.error('❌ LLM generation failed:', llmError);
      console.log('⚠️ Falling back to template-based generation...');
      
      // Fallback to template generation if LLM fails
      generatedCode = generateFallbackTestCode(promptContent, testName, baseUrl);
    }
    
    // Use LLM-generated code directly - no template matching
    let specCode = generatedCode;
    
    // Ensure the spec code has the proper structure
    if (!specCode.includes('test.describe') && !specCode.includes('test(')) {
      // Wrap in test structure if needed
      specCode = `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test('${testName}', async ({ page }) => {
    console.log('🚀 Starting test execution...');
    
    const TARGET_URL = process.env.BASE_URL || '${baseUrl}';
    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');
    
    ${generatedCode}
    
    console.log('✅ Test execution completed!');
  });
});`;
    }
    
    // Ensure spec code ends properly
    if (!specCode.includes('});')) {
      specCode += '\n  });\n});';
    }
    
    console.log('✅ Final spec code generated (length:', specCode.length, 'chars)');
    console.log('📝 Code preview:', specCode.substring(0, 500) + '...');
    
    // Use LLM-generated code directly - no hardcoded templates
    // The specCode variable already contains the LLM-generated code
    // Just ensure it's properly formatted

    const simpleSpecCode = specCode;
    
    // Save the spec file to the proper location
    // Use prompt title only (no timestamp), with incremental postfix if file exists
    const specDir = path.join(__dirname, '../../tests/projects/enhanced-ai/models/llm-generated/LLM-Generated/prompts');
    
    // Ensure the directory exists
    if (!fs.existsSync(specDir)) {
      fs.mkdirSync(specDir, { recursive: true });
      console.log('📁 Created spec directory:', specDir);
    }
    
    // Generate unique file path with incremental postfix if needed
    const specFilePath = generateUniqueSpecFilePath(testName, specDir);
    console.log('📝 Generated spec file path:', specFilePath);
    
    // Save the spec file
    fs.writeFileSync(specFilePath, simpleSpecCode);
    console.log('💾 Spec file saved:', specFilePath);
    
    // IMMEDIATE browser interaction - no LLM processing, no DOM analysis
    console.log('🚀 Starting IMMEDIATE real-time LLM interaction...');
    console.log('👀 Watch the browser window for real-time LLM actions!');
    try {
      await performRealtimeLLMInteraction(simpleSpecCode, baseUrl, promptContent, parsedSteps);
      console.log('✅ IMMEDIATE real-time LLM interaction completed successfully!');
    } catch (error) {
      console.error('❌ IMMEDIATE real-time LLM interaction failed:', error);
      console.error('❌ Error details:', error.message);
    }
    
    return {
      success: true,
      testCode: simpleSpecCode,
      specFilePath: specFilePath,
      message: 'IMMEDIATE real-time browser interaction completed',
      realtimeMode: true
    };
    
  } catch (error) {
    console.error('Error in IMMEDIATE real-time browser interaction:', error);
    throw error;
  }
}

// Helper function to clean generated code
function cleanGeneratedCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') {
    return rawCode;
  }
  
  // Remove markdown code fences of various types
  let cleaned = rawCode
    .replace(/```typescript\n?/gi, '')
    .replace(/```tsx\n?/gi, '')
    .replace(/```javascript\n?/gi, '')
    .replace(/```js\n?/gi, '')
    .replace(/```ts\n?/gi, '')
    .replace(/```\n?/g, '');
  
  cleaned = cleaned.trim();

  // Try to isolate only the code between the first import and the last test closure
  const firstImportIdx = cleaned.search(/\bimport\s+\{/);
  if (firstImportIdx > -1) {
    cleaned = cleaned.substring(firstImportIdx);
  }

  // Hoist any test.use({...}) to top-level (before first describe)
  try {
    const useMatches = [...cleaned.matchAll(/test\.use\(\{[\s\S]*?\}\);/g)];
    if (useMatches.length > 0) {
      const firstUse = useMatches[0][0];
      // Remove all occurrences
      cleaned = cleaned.replace(/test\.use\(\{[\s\S]*?\}\);/g, '');
      // Insert a single top-level test.use right after imports
      const firstDescribeIdx = cleaned.search(/\btest\.describe\s*\(/);
      if (firstDescribeIdx > -1) {
        cleaned = cleaned.slice(0, firstDescribeIdx) + firstUse + '\n' + cleaned.slice(firstDescribeIdx);
      } else {
        cleaned = firstUse + '\n' + cleaned;
      }
    }
  } catch {}

  // Attempt to cut trailing prose after the last matching \n}); or \n}\); typical in Playwright files
  const endings = [
    cleaned.lastIndexOf('\n});'),
    cleaned.lastIndexOf('\n}\);'),
    cleaned.lastIndexOf('\n});\n')
  ].filter(i => i >= 0);
  if (endings.length > 0) {
    const cutAt = Math.max(...endings) + 4; // include '});'
    cleaned = cleaned.substring(0, cutAt);
  }

  // Remove common explanatory prefixes/lines
  cleaned = cleaned
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (/^(Explanation:|Note:|Tips?:)/i.test(t)) return false;
      if (/^[-*]\s/.test(t) && !/^\*\s@/.test(t)) return false; // drop bullet points except JSDoc tags
      if (/^\d+\./.test(t)) return false; // numbered lists
      return true;
    })
    .join('\n');

  // CRITICAL: Fix ambiguous selectors that cause strict mode violations
  cleaned = fixAmbiguousSelectors(cleaned);

  // CRITICAL: Fix invalid .tags() method usage (Playwright doesn't support this)
  cleaned = fixInvalidTagsUsage(cleaned);

  // Fix async/await syntax issues in callback functions
  cleaned = cleaned.replace(
    /(allure\.createStep\([^,]+,\s*)\(\)\s*=>\s*{([^}]*await[^}]*)}/g,
    '$1async () => {$2}'
  );

  // Fix other common callback patterns with await
  cleaned = cleaned.replace(
    /(\w+\.\w+\([^,]*,\s*)\(([^)]*)\)\s*=>\s*{([^}]*await[^}]*)}/g,
    '$1async ($2) => {$3}'
  );

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return cleaned.trim();
}

// Fix ambiguous selectors that cause strict mode violations
function fixAmbiguousSelectors(code) {
  if (!code || typeof code !== 'string') {
    return code;
  }
  
  let fixedCode = code;
  const fixes = [];
  
  // Fix Dashboard text selector - most common issue
  const dashboardRegex = /getByText\(['"]Dashboard['"]\)/g;
  if (dashboardRegex.test(fixedCode)) {
    fixedCode = fixedCode.replace(dashboardRegex, "getByRole('heading', { name: 'Dashboard' })");
    fixes.push('Dashboard text selector');
  }
  
  // Fix other common ambiguous text selectors
  const commonAmbiguousTexts = [
    { pattern: /getByText\(['"]Home['"]\)/g, replacement: "getByRole('link', { name: 'Home' })" },
    { pattern: /getByText\(['"]Login['"]\)/g, replacement: "getByRole('button', { name: 'Login' })" },
    { pattern: /getByText\(['"]Submit['"]\)/g, replacement: "getByRole('button', { name: 'Submit' })" },
    { pattern: /getByText\(['"]Save['"]\)/g, replacement: "getByRole('button', { name: 'Save' })" },
    { pattern: /getByText\(['"]Cancel['"]\)/g, replacement: "getByRole('button', { name: 'Cancel' })" },
    { pattern: /getByText\(['"]Settings['"]\)/g, replacement: "getByRole('link', { name: 'Settings' })" },
    { pattern: /getByText\(['"]Profile['"]\)/g, replacement: "getByRole('link', { name: 'Profile' })" }
  ];
  
  commonAmbiguousTexts.forEach(({ pattern, replacement }) => {
    if (pattern.test(fixedCode)) {
      fixedCode = fixedCode.replace(pattern, replacement);
      fixes.push(pattern.source.match(/getByText\\\(['\"]([^'\"]+)['\"]\\\)/)?.[1] || 'text selector');
    }
  });
  
  if (fixes.length > 0) {
    console.log('Applied selector fixes for:', fixes.join(', '));
  }
  
  return fixedCode;
}

// Helper function to launch browser test
function launchBrowserTest(testFilePath, environment) {
  return new Promise((resolve, reject) => {
    try {
      // Get the relative path from project root
      const projectRoot = path.resolve(__dirname, '../..');
      const relativePath = path.relative(projectRoot, testFilePath);
      
      console.log('Launching browser test:', {
        testFilePath: relativePath,
        projectRoot,
        environment: environment?.name
      });
      
      // Set environment variables for local browsers and test execution
      const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(projectRoot, '.local-browsers');
      const env = { 
        ...process.env, 
        PLAYWRIGHT_BROWSERS_PATH: browsersPath,
        BASE_URL: environment?.variables?.BASE_URL || 'http://localhost:5050',
        BROWSER_TYPE: environment?.variables?.BROWSER || 'chromium',
        HEADLESS_MODE: environment?.variables?.HEADLESS || 'false',
        // API auth/config variables passed through to tests
        API_TOKEN: environment?.variables?.API_TOKEN || process.env.API_TOKEN || '',
        API_KEY: environment?.variables?.API_KEY || process.env.API_KEY || '',
        CLIENT_ID: environment?.variables?.clientId || process.env.CLIENT_ID || '',
        CLIENT_SECRET: environment?.variables?.clientSecret || process.env.CLIENT_SECRET || '',
        SCOPE: environment?.variables?.scope || process.env.SCOPE || '',
        AUTH_URL: environment?.variables?.authUrl || process.env.AUTH_URL || '',
        TOKEN_URL: environment?.variables?.tokenUrl || process.env.TOKEN_URL || ''
      };
      // Set environment variables for the test
     
      
      // Launch Playwright test with headed mode
      // Quote the path to handle spaces in directory names
      const quotedPath = `"${relativePath}"`;
      const playwrightProcess = spawn('npx', [
        'playwright',
        'test',
        quotedPath,
        '--headed'
      ], {
        cwd: projectRoot,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true // Enable shell to handle quoted paths properly
      });
      
      let output = '';
      let errorOutput = '';
      
      playwrightProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log('Playwright stdout:', chunk);
      });
      
      playwrightProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.log('Playwright stderr:', chunk);
      });
      
      playwrightProcess.on('close', (code) => {
        console.log('Playwright process closed with code:', code);
        resolve({
          success: code === 0,
          exitCode: code,
          output,
          errorOutput,
          message: code === 0 ? 'Test launched successfully' : 'Test execution failed'
        });
      });
      
      playwrightProcess.on('error', (error) => {
        console.error('Failed to launch Playwright test:', error);
        reject({
          success: false,
          error: error.message,
          message: 'Failed to launch browser test'
        });
      });
      
      // Don't wait for the process to complete, resolve immediately
      // This allows the browser to launch while returning the response
      setTimeout(() => {
        resolve({
          success: true,
          launched: true,
          message: 'Browser test launched successfully',
          processId: playwrightProcess.pid
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error launching browser test:', error);
      reject({
        success: false,
        error: error.message,
        message: 'Failed to launch browser test'
      });
    }
  });
}

const promptParser = new PromptParser();
const codeGenerator = new CodeGenerator();
const fileStorage = new FileStorage();
const llmService = new LLMService();

// Helper function to add session management code to generated tests
function addSessionManagementCode(testCode) {
  console.log('=== addSessionManagementCode DEBUG ===');
  console.log('addSessionManagementCode called with testCode length:', testCode.length);
  console.log('testCode preview (first 200 chars):', testCode.substring(0, 200));
  
  // Add session management imports if not already present
  if (!testCode.includes('createContextWithSession')) {
    console.log('Adding session management imports...');
    const importMatch = testCode.match(/import\s*{([^}]+)}\s*from\s*['"]@playwright\/test['"];?/);
    if (importMatch) {
      // Add session management import after Playwright imports
      testCode = testCode.replace(
        /import\s*{([^}]+)}\s*from\s*['"]@playwright\/test['"];?/,
        `import { $1 } from '@playwright/test';\nimport { createContextWithSession, shouldSkipLogin, saveSessionAfterLogin } from '../test-utils/session-manager';`
      );
    } else {
      // Add at the beginning if no imports found
      testCode = `import { createContextWithSession, shouldSkipLogin, saveSessionAfterLogin } from '../test-utils/session-manager';\n${testCode}`;
    }
  }

  // Add session management beforeEach if not already present
  if (!testCode.includes('beforeEach')) {
    const describeMatch = testCode.match(/(test\.describe\([^)]+\)\s*{)/);
    if (describeMatch) {
      const beforeEachCode = `
  let page;
  
  test.beforeEach(async ({ browser }) => {
    const context = await createContextWithSession(browser, { viewport: { width: 1920, height: 1080 } });
    page = await context.newPage();
  });`;
      
      testCode = testCode.replace(describeMatch[1], `${describeMatch[1]}${beforeEachCode}`);
    }
  }

  // Add session check at the start of each test
  if (!testCode.includes('shouldSkipLogin')) {
    const testMatch = testCode.match(/(test\([^)]+\)\s*async\s*\([^)]*\)\s*=>\s*{)/);
    if (testMatch) {
      const sessionCheckCode = `
    // Check if already logged in
    const isLoggedIn = await shouldSkipLogin(page);
    if (isLoggedIn) {
      console.log('🚀 Already logged in, skipping login steps');
      return;
    }`;
      
      testCode = testCode.replace(testMatch[1], `${testMatch[1]}${sessionCheckCode}`);
    }
  }

  return testCode;
}

// Parse prompt and return structured steps
router.post('/parse-prompt', async (req, res) => {
  try {
    const { promptContent } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }
    
    const parsedPrompt = promptParser.parsePrompt(promptContent);
    res.json(parsedPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Playwright test code with real-time browser interaction
router.post('/generate-llm-playwright-realtime', async (req, res) => {
  try {
    const {
      promptContent,
      testName = 'Generated Test',
      testType = 'UI Test',
      environment,
      parsedSteps = [],
      baseUrl,
      useExistingSession = false
    } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }

    if (!environment || !environment.llmConfiguration) {
      return res.status(400).json({ error: 'Valid LLM environment is required' });
    }

    console.log('Starting real-time browser interaction mode:', {
      testName,
      testType,
      environment: environment.name,
      stepCount: parsedSteps.length
    });

    // First, launch a browser instance for real-time interaction
    console.log('🔍 About to call launchRealtimeBrowser...');
    const browserInstance = await launchRealtimeBrowser(environment);
    console.log('🔍 Browser instance result:', JSON.stringify(browserInstance, null, 2));
    
    if (!browserInstance.success) {
      return res.status(500).json({ 
        error: 'Failed to launch browser for real-time interaction',
        details: browserInstance.error 
      });
    }

    // Resolve a safe baseUrl for both runtime navigation and the placeholder spec
    const resolvedBaseUrl = (baseUrl && String(baseUrl).trim())
      || (environment?.variables?.BASE_URL && String(environment.variables.BASE_URL).trim())
      || 'http://localhost:5050';

    // Now start LLM processing while browser is running
    const llmResult = await processLLMWithRealtimeBrowser({
      promptContent,
      testName,
      testType,
      environment,
      parsedSteps,
      baseUrl: resolvedBaseUrl,
      browserInstance
    });

    res.json({
      success: true,
      testCode: llmResult.testCode,
      browserInstance: browserInstance,
      realtimeMode: true,
      message: 'Real-time browser interaction started successfully'
    });

  } catch (error) {
    console.error('Error in real-time browser mode:', error);
    res.status(500).json({
      error: 'Failed to start real-time browser interaction',
      details: error.message
    });
  }
});

// Generate Playwright test code directly from LLM
router.post('/generate-llm-playwright', async (req, res) => {
  try {
    const {
      promptContent,
      testName = 'Generated Test',
      testType = 'UI Test',
      environment,
      parsedSteps = [],
      baseUrl,
      useExistingSession = false,
      executionMode = 'spec-first' // 'browser-action' or 'spec-first'
    } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }

    if (!environment || !environment.llmConfiguration) {
      return res.status(400).json({ error: 'Valid LLM environment is required' });
    }

    console.log('Generating Playwright code with LLM:', {
      testName,
      testType,
      environment: environment.name,
      stepCount: parsedSteps.length,
      llmConfig: environment.llmConfiguration,
      promptContentLength: promptContent?.length || 0,
      promptContentPreview: promptContent?.substring(0, 100) + '...'
    });

    // Create a comprehensive prompt for the LLM
    const finalBaseUrl = baseUrl || environment.variables?.BASE_URL || 'http://localhost:5050';
    const browserType = environment.variables?.BROWSER || 'chromium';
    const headlessMode = environment.variables?.HEADLESS || 'true';
    
    console.log('=== BASE URL DEBUG ===');
    console.log('baseUrl from request:', baseUrl);
    console.log('environment.variables?.BASE_URL:', environment.variables?.BASE_URL);
    console.log('finalBaseUrl:', finalBaseUrl);
    console.log('========================');
    
    const llmPrompt = `Generate a complete Playwright test file for: "${promptContent}"

Test Name: ${testName}
Base URL: ${finalBaseUrl}
Browser: ${browserType}
Headless: ${headlessMode}

${parsedSteps.length > 0 ? `Steps to implement:
${parsedSteps.map((step, index) => `${index + 1}. ${step.originalText}`).join('\n')}` : ''}

Create a complete TypeScript Playwright test file with:
- Proper imports: import { test, expect } from '@playwright/test' and import { allure } from 'allure-playwright'
- Environment variables: BASE_URL, BROWSER_TYPE, HEADLESS_MODE
- Test structure: describe block with beforeEach, test, and afterEach
- Error handling: try-catch blocks with screenshot capture on failure
- Allure reporting: tags, attachments, and proper metadata
- Proper selectors: use data-testid when possible, fallback to other selectors
- Wait conditions: use smart waits instead of hard-coded timeouts
  * Use page.waitForSelector() for element visibility
  * Use page.waitForLoadState('networkidle') for page loading
  * Use element.waitFor({ state: 'visible' }) for element states
  * NEVER use page.waitForTimeout() - use conditional waits instead
- Meaningful assertions: verify the test outcome

IMPORTANT SELECTOR RULES - AVOID ELEMENT AMBIGUITY:
- NEVER use getByText() for any text that might appear multiple times on a page
- Common ambiguous texts: Dashboard, Home, Login, Submit, Save, Cancel, Edit, Delete, Search, Filter
- ALWAYS use role-based selectors: getByRole('heading'), getByRole('button'), getByRole('link')
- For form elements: use getByLabel(), getByPlaceholder(), or getByRole('textbox')
- For navigation: use getByRole('navigation').getByText() or specific CSS selectors
- For repeated elements: use nth() selector or combine with parent containers
- For dynamic content: use data-testid attributes or unique CSS class selectors
- Verify selector uniqueness: each selector should match exactly one element
- Use browser dev tools to test selector specificity during development

Return ONLY the complete TypeScript code without explanations or markdown.`;

    // Generate code using LLM
    console.log('Calling LLMService with:', {
      promptLength: llmPrompt.length,
      environment: environment.name,
      llmConfig: environment.llmConfiguration
    });
    
    // Fix baseUrl by removing trailing slash
    const fixedEnvironment = {
      ...environment,
      llmConfiguration: {
        ...environment.llmConfiguration,
        baseUrl: environment.llmConfiguration.baseUrl?.replace(/\/$/, '') || environment.llmConfiguration.baseUrl,
        model: environment.llmConfiguration.model || 'llama3.1:8b' // Use newer model
      }
    };
    
    // Use the proper LLMService approach with system and user prompts - NO FALLBACK
    const systemPrompt = `You are an expert Playwright test automation engineer. Generate high-quality, production-ready Playwright test code based on user requirements.

🚨 CRITICAL OUTPUT REQUIREMENTS 🚨
- Return ONLY the complete TypeScript test file code
- DO NOT add any explanations, comments, or descriptions after the code
- DO NOT include phrases like "This test...", "The code...", "Key features...", etc.
- End your response immediately after the closing brace of the test structure
- The last line should be }); or similar test structure closing

🚨 CRITICAL: NEVER USE .tags() METHOD - IT DOES NOT EXIST IN PLAYWRIGHT 🚨
- .tags() method is INVALID and will cause runtime errors
- Use allure.tag() inside test.beforeEach() hook instead
- Example: test.beforeEach(async () => { await allure.tag('ui-test'); });

REQUIREMENTS:
- Use TypeScript with Playwright
- Include proper imports: import { test, expect } from '@playwright/test'
- Include Allure reporting: import { allure } from 'allure-playwright'
- Use environment variables for configuration (BASE_URL, BROWSER_TYPE, HEADLESS_MODE)
- Add proper test structure with describe and test blocks
- Use data-testid selectors when possible, fallback to other selectors
- Add proper error handling with try-catch blocks
- Include meaningful assertions and validations
- Add screenshot capture on failure
- Use page.waitForSelector() for element visibility
- Add proper test cleanup in afterEach
- Include Allure tags and attachments

CRITICAL PLAYWRIGHT SYNTAX RULES:
- NEVER use .tags() method on test functions (test().tags() is invalid)
- Use allure.tag() inside test.beforeEach() hook for tagging
- Use test.describe() for grouping tests
- Use test() for individual test cases
- Correct tagging pattern:
  test.beforeEach(async () => {
    await allure.tag('ui-test');
    await allure.tag('smoke');
  });

CRITICAL SMART WAIT RULES - NO HARD-CODED TIMEOUTS:
- NEVER use page.waitForTimeout() - it causes flaky tests
- Use smart waits that wait for specific conditions:
  * page.waitForSelector() for element visibility
  * page.waitForLoadState('networkidle') for page loading completion
  * element.waitFor({ state: 'visible' }) for element states
  * page.waitForFunction() for custom conditions
- Wait for navigation: page.waitForURL() or page.waitForLoadState()
- Wait for form submissions: wait for success/error messages to appear
- Use Promise.race() for multiple possible outcomes (success OR error)

CRITICAL SELECTOR RULES - PREVENT ELEMENT AMBIGUITY:
- NEVER use getByText() for common text that appears multiple times (Dashboard, Home, Login, Submit, Save, Cancel, Edit, Delete)
- ALWAYS use role-based selectors to avoid strict mode violations:
  * For headings: page.getByRole('heading', { name: 'Text' })
  * For buttons: page.getByRole('button', { name: 'Text' })
  * For links: page.getByRole('link', { name: 'Text' })
  * For form inputs: page.getByLabel('Label') or page.getByPlaceholder('Placeholder')
- For navigation items: use page.getByRole('navigation').getByText('Item')
- For repeated elements: use nth() selector or combine with parent containers
- Use data-testid when available: page.getByTestId('unique-id')
- Combine selectors for specificity: page.locator('.container').getByRole('button', { name: 'Text' })
- For tables: use page.getByRole('cell', { name: 'Text' }) or page.getByRole('row')
- Test selector uniqueness: ensure each selector matches exactly one element

Return ONLY the complete TypeScript test file code without any explanations or markdown formatting.`;

    const userPrompt = llmPrompt;
    
    console.log('Enforcing direct LLM generation - no fallback to templates');
    
    // Generate code using LLM - throw error if it fails (no fallback)
    const rawCode = await llmService.generateCode(userPrompt, fixedEnvironment, {
      systemPrompt,
      testName,
      testType,
      baseUrl: finalBaseUrl,
      environment: fixedEnvironment,
      parsedSteps: parsedSteps
    });
    
    // Clean the generated code using LLM service post-processing (includes .tags() fix)
    let testCode = llmService.postProcessGeneratedCode(rawCode, testName, testType);
    
    // If prompt has tags, inject them as Allure labels at test start
    try {
      const tags = Array.isArray(prompt.tags) ? prompt.tags : (typeof prompt.tags === 'string' ? prompt.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
      if (tags.length > 0 && typeof testCode === 'string') {
        // Insert after first opening test block
        testCode = testCode.replace(/(test\(['\"][^\n]*['\"],\s*async\s*\(\{?[^)]*\}\)?\s*=>\s*\{)/, (m) => {
          const labels = tags.map(t => `    allure.label('tag', '${t}');`).join('\n');
          return `${m}\n${labels}\n`;
        });
      }
    } catch (_) {}
    
    // Add session management code if useExistingSession is true
    if (useExistingSession) {
      testCode = addSessionManagementCode(testCode);
    }
    
    // Validate that we actually got code from LLM
    if (!testCode || testCode.trim().length === 0) {
      throw new Error('LLM generated empty or invalid code. Please check your LLM configuration and try again.');
    }
    
    console.log(`LLM code generation successful, execution mode: ${executionMode}`);

    // Generate file path for saving - use prompt title only (no UUID folders)
    const specDir = path.join(__dirname, '../../tests/projects/enhanced-ai/models/llm-generated/LLM-Generated/prompts');
    
    // Ensure directory exists
    if (!fs.existsSync(specDir)) {
      fs.mkdirSync(specDir, { recursive: true });
      console.log('📁 Created spec directory:', specDir);
    }
    
    // Generate unique file path with incremental postfix if needed
    const filePath = generateUniqueSpecFilePath(testName, specDir);
    console.log('Generated filePath in route:', filePath);

    // Save the test file
    const savedPath = await codeGenerator.saveTestFile(testCode, filePath);
    console.log('Saved path in route:', savedPath);

    // Handle execution based on mode
    let browserLaunchResult = null;
    
    if (executionMode === 'browser-action') {
      // Browser action mode - launch browser immediately for real-time interaction
      try {
        console.log('Browser Action Mode: Launching browser for real-time interaction');
        
        // For browser action mode, we need to launch the browser BEFORE LLM processing
        // This allows users to see the browser actions in real-time
        browserLaunchResult = await launchBrowserTest(savedPath, environment);
        console.log('Browser launch result:', browserLaunchResult);
        
        // Send real-time updates to frontend about browser actions
        if (browserLaunchResult.success) {
          console.log('Browser launched successfully for real-time interaction');
        }
      } catch (error) {
        console.error('Failed to launch browser test:', error);
        browserLaunchResult = {
          success: false,
          error: error.message || 'Unknown error',
          message: 'Failed to launch browser test'
        };
      }
    } else {
      // Spec-first mode - just save the file, no immediate execution
      console.log('Spec-First Mode: Test file saved, ready for manual execution');
      browserLaunchResult = {
        success: true,
        message: 'Test file saved successfully. Ready for execution.',
        executionMode: 'spec-first'
      };
    }

    res.json({
      testCode,
      filePath: savedPath,
      browserLaunch: browserLaunchResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedWith: 'LLM',
        llmProvider: environment.llmConfiguration.provider,
        llmModel: environment.llmConfiguration.model,
        testName,
        testType,
        stepCount: parsedSteps.length,
        environment: environment.name,
        browserLaunched: browserLaunchResult?.success || false
      }
    });
  } catch (error) {
    console.error('Error generating LLM Playwright code:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: error.message || 'Unknown error occurred',
      details: error.response?.data || 'No additional details'
    });
  }
});

// Generate Playwright test code
router.post('/generate-playwright', async (req, res) => {
  try {
    const {
      promptContent,
      testName,
      testType = 'UI Test',
      environmentId,
      environment, // Direct environment object from frontend
      useLLM = false,
      parsedSteps, // Parsed steps from frontend
      options = {}
    } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }
    
    // Parse the prompt (use provided parsedSteps if available, otherwise parse)
    let parsedPrompt;
    if (parsedSteps && parsedSteps.length > 0) {
      // Use provided parsed steps
      parsedPrompt = {
        parsedSteps,
        hasUI: parsedSteps.some(step => 
          ['navigate', 'click', 'fill', 'hover', 'scroll'].includes(step.action)
        ),
        hasAPI: parsedSteps.some(step => 
          step.originalText && ['api', 'request', 'response'].some(keyword => 
            step.originalText.toLowerCase().includes(keyword)
          )
        ),
        totalSteps: parsedSteps.length
      };
    } else {
      // Parse the prompt normally
      parsedPrompt = promptParser.parsePrompt(promptContent);
    }
    
    // Get environment - prefer direct object, fallback to ID lookup
    let env = environment;
    if (!env && environmentId) {
      env = await fileStorage.getEnvironmentById(environmentId);
    }
    
    // Generate the test code
    const testCode = await codeGenerator.generatePlaywrightSpec(
      parsedPrompt,
      env,
      {
        testName: testName || 'Generated Test',
        testType,
        useLLM,
        parsedSteps: parsedSteps || parsedPrompt.parsedSteps,
        ...options
      }
    );
    
    res.json({
      testCode,
      parsedPrompt,
      metadata: {
        hasUI: parsedPrompt.hasUI,
        hasAPI: parsedPrompt.hasAPI,
        totalSteps: parsedPrompt.totalSteps,
        generatedAt: new Date().toISOString(),
        generatedWith: useLLM && env?.llmConfiguration?.enabled ? 'LLM' : 'Template',
        llmProvider: env?.llmConfiguration?.provider || 'Template',
        stepsProcessed: parsedSteps ? parsedSteps.length : parsedPrompt.totalSteps
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate and save test file
router.post('/generate-and-save', async (req, res) => {
  try {
    const {
      promptContent,
      testName,
      testType = 'UI Test',
      projectId = 'default-project',
      modelId = 'default-model',
      modelName = 'Default Model',
      environmentId,
      options = {}
    } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }
    
    // Parse the prompt
    const parsedPrompt = promptParser.parsePrompt(promptContent);
    
    // Get environment if specified
    let environment = null;
    if (environmentId) {
      environment = await fileStorage.getEnvironmentById(environmentId);
    }
    
    // Generate unique IDs
    const testId = uuidv4();
    
    // Generate the test code
    const testCode = await codeGenerator.generatePlaywrightSpec(
      parsedPrompt,
      environment,
      {
        testName: testName || 'Generated Test',
        testType,
        useLLM: true, // Enable LLM generation
        ...options
      }
    );
    
    // Generate file path - use prompt title only (no UUID folders)
    const specDir = path.join(__dirname, '../../tests/projects', projectId, 'models', modelId, modelName.replace(/[^a-zA-Z0-9-_]/g, '-'), 'prompts');
    
    // Ensure directory exists
    if (!fs.existsSync(specDir)) {
      fs.mkdirSync(specDir, { recursive: true });
      console.log('📁 Created spec directory:', specDir);
    }
    
    // Generate unique file path with incremental postfix if needed
    const filePath = generateUniqueSpecFilePath(testName || 'Generated Test', specDir);
    console.log('Generated filePath:', filePath);
    
    // Save test file
    const savedPath = await codeGenerator.saveTestFile(testCode, filePath);
    
    res.json({
      testCode,
      filePath: savedPath,
      testId,
      promptId: testId, // Use testId as promptId for backward compatibility
      parsedPrompt,
      metadata: {
        hasUI: parsedPrompt.hasUI,
        hasAPI: parsedPrompt.hasAPI,
        totalSteps: parsedPrompt.totalSteps,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate API test code
router.post('/generate-api-test', async (req, res) => {
  try {
    const {
      endpoints,
      testType = 'API Test',
      environmentId,
      options = {}
    } = req.body;
    
    if (!endpoints || !Array.isArray(endpoints)) {
      return res.status(400).json({ error: 'Endpoints array is required' });
    }
    
    // Get environment if specified
    let environment = null;
    if (environmentId) {
      environment = await fileStorage.getEnvironmentById(environmentId);
    }
    
    // Generate API test code
    const testCode = generateAPITestCode(endpoints, environment, options);
    
    res.json({
      testCode,
      metadata: {
        endpointCount: endpoints.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate E2E test suite
router.post('/generate-e2e-suite', async (req, res) => {
  try {
    const {
      prompts,
      suiteName,
      testType = 'E2E Test',
      environmentId,
      options = {}
    } = req.body;
    
    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'Prompts array is required' });
    }
    
    // Get environment if specified
    let environment = null;
    if (environmentId) {
      environment = await fileStorage.getEnvironmentById(environmentId);
    }
    
    // Parse all prompts
    const parsedPrompts = prompts.map(prompt => ({
      ...promptParser.parsePrompt(prompt.content),
      title: prompt.title,
      description: prompt.description
    }));
    
    // Generate E2E test suite
    const testCode = generateE2ETestSuite(parsedPrompts, suiteName, environment, options);
    
    res.json({
      testCode,
      metadata: {
        promptCount: prompts.length,
        totalSteps: parsedPrompts.reduce((sum, p) => sum + p.totalSteps, 0),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate API test code
function generateAPITestCode(endpoints, environment, options) {
  const baseUrl = environment?.variables?.BASE_URL || process.env.BASE_URL || 'http://localhost:5050';
  const timeout = environment?.variables?.TIMEOUT || 30000;
  
  let code = `import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('API Tests', () => {
  test.beforeEach(async ({ request }) => {
    allure.epic('API Testing');
    allure.feature('Automated API Test Generation');
    test.setTimeout(${timeout});
  });

`;

  endpoints.forEach((endpoint, index) => {
    const { method = 'GET', path, expectedStatus = 200, headers = {} } = endpoint;
    
    code += `  test('${method} ${path} - should return ${expectedStatus}', async ({ request }) => {
    allure.story('${method} ${path}');
    
    const response = await request.${method.toLowerCase()}('${baseUrl}${path}', {
      headers: {
        'Content-Type': 'application/json',
        ...${JSON.stringify(headers)}
      }
    });
    
    expect(response.status()).toBe(${expectedStatus});
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });

`;
  });
  
  code += `});`;
  
  return code;
}

// Helper function to generate E2E test suite
function generateE2ETestSuite(parsedPrompts, suiteName, environment, options) {
  const baseUrl = environment?.variables?.BASE_URL || process.env.BASE_URL || 'http://localhost:5050';
  const timeout = environment?.variables?.TIMEOUT || 30000;
  
  let code = `import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('${suiteName || 'E2E Test Suite'}', () => {
  test.beforeEach(async ({ page }) => {
    allure.epic('E2E Testing');
    allure.feature('${suiteName || 'E2E Test Suite'}');
    test.setTimeout(${timeout});
    
    const baseUrl = process.env.BASE_URL || '${baseUrl}';
    await page.goto(baseUrl);
  });

`;

  parsedPrompts.forEach((parsedPrompt, index) => {
    code += `  test('${parsedPrompt.title || `Test ${index + 1}`}', async ({ page }) => {
    allure.story('${parsedPrompt.title || `Test ${index + 1}`}');
    
`;

    parsedPrompt.parsedSteps.forEach((step, stepIndex) => {
      code += `    // Step ${stepIndex + 1}: ${step.originalText}\n`;
      
      switch (step.action) {
        case 'navigate':
          code += `    await page.goto('${step.target}');\n`;
          break;
        case 'click':
          code += `    await page.click('${step.target}');\n`;
          break;
        case 'fill':
          code += `    await page.fill('${step.target}', '${step.value || 'test value'}');\n`;
          break;
        case 'assert':
          code += `    await expect(page.locator('${step.target}')).toBeVisible();\n`;
          break;
        case 'wait':
          code += `    await page.waitForTimeout(${step.waitTime || 1000});\n`;
          break;
        default:
          code += `    // TODO: Implement step: ${step.originalText}\n`;
      }
      
      code += `\n`;
    });
    
    code += `  });

`;
  });
  
  code += `});`;
  
  return code;
}

// Generate and run test immediately
router.post('/generate-and-run', async (req, res) => {
  try {
    const {
      promptContent,
      testName,
      testType = 'UI Test',
      projectId = 'default-project',
      modelId = 'default-model',
      modelName = 'Default Model',
      environmentId,
      options = {}
    } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }
    
    // Parse the prompt
    const parsedPrompt = promptParser.parsePrompt(promptContent);
    
    // Get environment if specified
    let environment = null;
    if (environmentId) {
      environment = await fileStorage.getEnvironmentById(environmentId);
    }
    
    // Generate unique IDs
    const testId = uuidv4();
    
    // Generate the test code
    const testCode = await codeGenerator.generatePlaywrightSpec(
      parsedPrompt,
      environment,
      {
        testName: testName || 'Generated Test',
        testType,
        useLLM: true, // Enable LLM generation
        ...options
      }
    );
    
    // Generate file path - use prompt title only (no UUID folders)
    const specDir = path.join(__dirname, '../../tests/projects', projectId, 'models', modelId, modelName.replace(/[^a-zA-Z0-9-_]/g, '-'), 'prompts');
    
    // Ensure directory exists
    if (!fs.existsSync(specDir)) {
      fs.mkdirSync(specDir, { recursive: true });
      console.log('📁 Created spec directory:', specDir);
    }
    
    // Generate unique file path with incremental postfix if needed
    const filePath = generateUniqueSpecFilePath(testName || 'Generated Test', specDir);
    console.log('Generated filePath:', filePath);
    
    // Save test file
    const savedPath = await codeGenerator.saveTestFile(testCode, filePath);
    
    // Run the test immediately
    const { spawn } = require('child_process');
    const path = require('path');
    
    // Get the relative path for Playwright
    const relativePath = path.relative(process.cwd(), savedPath);
    
    console.log(`Running test: ${relativePath}`);
    
    // Run Playwright test with explicit browsers path
    const projectRoot = path.join(__dirname, '../..');
    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(projectRoot, '.local-browsers');
    const env = { 
      ...process.env, 
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
      // Propagate API auth to single-test runs too
      API_TOKEN: environment?.variables?.API_TOKEN || process.env.API_TOKEN || '',
      API_KEY: environment?.variables?.API_KEY || process.env.API_KEY || '',
      CLIENT_ID: environment?.variables?.clientId || process.env.CLIENT_ID || '',
      CLIENT_SECRET: environment?.variables?.clientSecret || process.env.CLIENT_SECRET || '',
      SCOPE: environment?.variables?.scope || process.env.SCOPE || '',
      AUTH_URL: environment?.variables?.authUrl || process.env.AUTH_URL || '',
      TOKEN_URL: environment?.variables?.tokenUrl || process.env.TOKEN_URL || ''
    };
    const playwrightProcess = spawn('npx', ['playwright', 'test', relativePath, '--headed', '--project=chromium'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });
    
    let testOutput = '';
    let testError = '';
    
    playwrightProcess.stdout.on('data', (data) => {
      testOutput += data.toString();
      console.log(`Test output: ${data}`);
    });
    
    playwrightProcess.stderr.on('data', (data) => {
      testError += data.toString();
      console.error(`Test error: ${data}`);
    });
    
    playwrightProcess.on('close', (code) => {
      console.log(`Test execution completed with code: ${code}`);
    });
    
    // Return immediately with test info, but keep process running
    res.json({
      success: true,
      message: 'Test generated and execution started',
      testCode,
      filePath: savedPath,
      relativePath: relativePath,
      testId,
      promptId,
      parsedPrompt,
      execution: {
        started: true,
        processId: playwrightProcess.pid,
        command: `npx playwright test ${relativePath} --headed --project=chromium`
      },
      metadata: {
        hasUI: parsedPrompt.hasUI,
        hasAPI: parsedPrompt.hasAPI,
        totalSteps: parsedPrompt.totalSteps,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in generate-and-run:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Generate and immediately run a test
router.post('/generate-and-run', async (req, res) => {
  try {
    console.log('=== /generate-and-run endpoint called ===');
    console.log('useExistingSession from request:', req.body.useExistingSession);
    
    const {
      promptContent,
      testName = 'Generated Test',
      testType = 'UI Test',
      environment,
      parsedSteps = [],
      baseUrl,
      promptId,
      useExistingSession = false,
      analysisResult = null
    } = req.body;
    
    if (!promptContent) {
      return res.status(400).json({ error: 'Prompt content is required' });
    }

    if (!environment || !environment.llmConfiguration) {
      return res.status(400).json({ error: 'Valid LLM environment is required' });
    }

    console.log('Generating and running Playwright test with LLM:', {
      testName,
      testType,
      environment: environment.name,
      stepCount: parsedSteps.length,
      baseUrl: baseUrl
    });

    // First, generate the test code
    const generateResponse = await generateLLMPlaywrightTest({
      promptContent,
      testName,
      testType,
      environment,
      parsedSteps,
      baseUrl,
      useExistingSession,
      analysisResult
    });

    if (!generateResponse.success) {
      return res.status(500).json({ error: generateResponse.error });
    }

    // Now run the generated test
    const testId = generateResponse.testId;
    const testFilePath = generateResponse.filePath;
    
    // Use absolute path for Playwright execution
    console.log('Running generated test:', {
      testId,
      testFilePath
    });

    // Execute the test using Playwright
    const { spawn } = require('child_process');
    const path = require('path');
    
    // Convert absolute path to relative path from project root
    const projectRoot = path.join(__dirname, '../..');
    const relativePath = path.relative(projectRoot, testFilePath);
    
    console.log('Playwright execution details:', {
      testFilePath,
      relativePath,
      projectRoot,
      workingDirectory: projectRoot,
      fileExists: require('fs').existsSync(testFilePath)
    });
    
    const playwrightArgs = [
      'test',
      relativePath,
      '--headed',
      '--project=chromium',
      '--timeout=30000'
    ];

    // Ensure Allure results are produced for single-test runs
    playwrightArgs.push('--reporter=list,allure-playwright');

    // Add session management if using existing session
    if (useExistingSession) {
      const fs = require('fs-extra');
      const sessionPath = path.join(__dirname, '../../storageState.json');
      
      if (await fs.pathExists(sessionPath)) {
        console.log('Using existing session for execution:', sessionPath);
        // The test will automatically use storageState.json due to playwright.config.js
      } else {
        console.log('No existing session found, proceeding with normal execution');
      }
    }

    console.log('Executing Playwright command:', `npx playwright ${playwrightArgs.join(' ')}`);

    // Set environment variable for local browsers
    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(projectRoot, '.local-browsers');
    const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath };
    console.log('Setting PLAYWRIGHT_BROWSERS_PATH to:', env.PLAYWRIGHT_BROWSERS_PATH);

    const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], {
      cwd: projectRoot, // Use project root as working directory
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    });

    let stdout = '';
    let stderr = '';

    playwrightProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Playwright stdout:', data.toString());
    });

    playwrightProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('Playwright stderr:', data.toString());
    });

    // Send immediate response
    res.json({
      success: true,
      message: 'Test generated and execution started',
      testCode: generateResponse.testCode,
      filePath: testFilePath,
      testId,
      execution: {
        started: true,
        command: `npx playwright ${playwrightArgs.join(' ')}`,
        pid: playwrightProcess.pid,
        workingDirectory: path.join(__dirname, '../..')
      }
    });

    // Handle process completion
    playwrightProcess.on('close', (code) => {
      console.log(`Playwright process exited with code ${code}`);
      console.log('Final stdout:', stdout);
      console.log('Final stderr:', stderr);
      
      // Update test results in storage
      const testResult = {
        testId,
        testName,
        status: code === 0 ? 'passed' : 'failed',
        executionTime: Date.now(),
        output: stdout,
        error: stderr,
        exitCode: code,
        filePath: testFilePath,
        relativePath: relativePath
      };
      
      // Store the result (you might want to implement this)
      console.log('Test execution completed:', testResult);
      
      if (code !== 0) {
        console.error('Test execution failed:', {
          code,
          stdout,
          stderr,
          filePath: testFilePath,
          relativePath: relativePath,
          workingDirectory: path.join(__dirname, '../..')
        });
      }
    });

  } catch (error) {
    console.error('Error in generate-and-run:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate LLM Playwright test
async function generateLLMPlaywrightTest({ promptContent, testName, testType, environment, parsedSteps, baseUrl, useExistingSession = false, analysisResult = null }) {
  try {
    console.log('=== generateLLMPlaywrightTest DEBUG ===');
    console.log('useExistingSession parameter:', useExistingSession);
    console.log('useExistingSession type:', typeof useExistingSession);
    console.log('baseUrl parameter:', baseUrl);
    console.log('baseUrl type:', typeof baseUrl);
    console.log('baseUrl truthy:', !!baseUrl);
    console.log('environment.variables?.BASE_URL:', environment.variables?.BASE_URL);
    
    // Create a comprehensive prompt for the LLM
    // Use the provided baseUrl (from prompt) instead of environment
    const finalBaseUrl = baseUrl || environment.variables?.BASE_URL || 'http://localhost:5050';
    console.log('finalBaseUrl:', finalBaseUrl);
    console.log('=====================================');
    const browserType = environment.variables?.BROWSER || 'chromium';
    const headlessMode = environment.variables?.HEADLESS || 'true';
    
    const sessionManagementInstructions = useExistingSession ? `

CRITICAL SESSION MANAGEMENT REQUIREMENTS - MUST BE INCLUDED:
1. Add these imports at the top of the file:
   import { createContextWithSession, shouldSkipLogin, saveSessionAfterLogin } from '../test-utils/session-manager';

2. In beforeEach, create context with session:
   test.beforeEach(async ({ browser }) => {
     const context = await createContextWithSession(browser, { viewport: { width: 1920, height: 1080 } });
     page = await context.newPage();
   });

3. At the start of each test, check if already logged in:
   const isLoggedIn = await shouldSkipLogin(page);
   if (isLoggedIn) {
     console.log('🚀 Already logged in, skipping login steps');
     return; // Skip the rest of the test if already logged in
   }

4. After successful login actions, save the session:
   await saveSessionAfterLogin(page);
   console.log('✅ Session saved for subsequent tests');

MANDATORY: The test file MUST include all 4 points above. Do not generate a test without these session management features.` : '';

    const llmPrompt = `Generate a complete Playwright test file for: "${promptContent}"

Test Name: ${testName}
Base URL: ${finalBaseUrl}
Browser: ${browserType}
Headless: ${headlessMode}

${parsedSteps.length > 0 ? `Steps to implement:
${parsedSteps.map((step, index) => `${index + 1}. ${step.originalText}`).join('\n')}` : ''}

${analysisResult && analysisResult.elements && analysisResult.elements.length > 0 ? `DOM Analysis Results:
The following elements were found during DOM analysis and should be used for more accurate selectors:
${analysisResult.elements.map((element, index) => `${index + 1}. ${element.selector} - ${element.text || element.tagName || 'element'}`).join('\n')}

Use these analyzed selectors when possible for more reliable test automation.` : ''}

Create a complete TypeScript Playwright test file with:
- Proper imports: import { test, expect } from '@playwright/test' and import { allure } from 'allure-playwright'
- Use the EXACT Base URL provided above (${finalBaseUrl}) - do NOT use process.env.BASE_URL
- Test structure: describe block with beforeEach, test, and afterEach
- Error handling: try-catch blocks with screenshot capture on failure
- Allure reporting: tags, attachments, and proper metadata
- Proper selectors: use data-testid when possible, fallback to other selectors
- Wait conditions: use page.waitForSelector() for element visibility
- Meaningful assertions: verify the test outcome${sessionManagementInstructions}

CRITICAL REQUIREMENT: Start your test file with this exact line:
const BASE_URL = '${finalBaseUrl}';

DO NOT use process.env.BASE_URL anywhere in the code. Always use the constant BASE_URL = '${finalBaseUrl}' instead.

IMPORTANT: The test should use the exact baseUrl provided (${finalBaseUrl}) and NOT rely on environment variables. This ensures the test uses the prompt's baseUrl regardless of environment settings.

EXAMPLE of what NOT to do:
const BASE_URL = process.env.BASE_URL || '${finalBaseUrl}'; // WRONG

EXAMPLE of what to do:
const BASE_URL = '${finalBaseUrl}'; // CORRECT

Return ONLY the complete TypeScript code without explanations or markdown.`;

    // Generate code using LLM
    const fixedEnvironment = {
      ...environment,
      llmConfiguration: {
        ...environment.llmConfiguration,
        baseUrl: environment.llmConfiguration.baseUrl?.replace(/\/$/, '') || environment.llmConfiguration.baseUrl,
        model: environment.llmConfiguration.model || 'llama3.1:8b'
      }
    };
    
    const systemPrompt = `You are an expert Playwright test automation engineer. Generate high-quality, production-ready Playwright test code based on user requirements.

🚨 CRITICAL OUTPUT REQUIREMENTS 🚨
- Return ONLY the complete TypeScript test file code
- DO NOT add any explanations, comments, or descriptions after the code
- DO NOT include phrases like "This test...", "The code...", "Key features...", etc.
- End your response immediately after the closing brace of the test structure
- The last line should be }); or similar test structure closing

🚨 CRITICAL: NEVER USE .tags() METHOD - IT DOES NOT EXIST IN PLAYWRIGHT 🚨
- .tags() method is INVALID and will cause runtime errors
- Use allure.tag() inside test.beforeEach() hook instead
- Example: test.beforeEach(async () => { await allure.tag('ui-test'); });

REQUIREMENTS:
- Use TypeScript with Playwright
- Include proper imports: import { test, expect } from '@playwright/test'
- Include Allure reporting: import { allure } from 'allure-playwright'
- Use environment variables for configuration (BASE_URL, BROWSER_TYPE, HEADLESS_MODE)
- Add proper test structure with describe and test blocks
- Use data-testid selectors when possible, fallback to other selectors
- Add proper error handling with try-catch blocks
- Include meaningful assertions and validations
- Add screenshot capture on failure
- Use page.waitForSelector() for element visibility
- Add proper test cleanup in afterEach
- Include Allure tags and attachments

CRITICAL PLAYWRIGHT SYNTAX RULES:
- NEVER use .tags() method on test functions (test().tags() is invalid)
- Use allure.tag() inside test.beforeEach() hook for tagging
- Use test.describe() for grouping tests
- Use test() for individual test cases
- Correct tagging pattern:
  test.beforeEach(async () => {
    await allure.tag('ui-test');
    await allure.tag('smoke');
  });

${useExistingSession ? `
CRITICAL SESSION MANAGEMENT - MUST INCLUDE:
- Import session management utilities: import { createContextWithSession, shouldSkipLogin, saveSessionAfterLogin } from '../test-utils/session-manager';
- Use createContextWithSession in beforeEach to create context with existing session
- Check shouldSkipLogin at test start and skip login if already authenticated
- Call saveSessionAfterLogin after successful login actions
- These features are MANDATORY and must be included in the generated code
` : ''}

Return ONLY the complete TypeScript test file code without any explanations or markdown formatting.`;

    const userPrompt = llmPrompt;
    
    console.log('Enforcing direct LLM generation - no fallback to templates');
    
    const rawCode = await llmService.generateCode(userPrompt, fixedEnvironment, {
      systemPrompt,
      testName,
      testType,
      baseUrl: finalBaseUrl,
      environment: fixedEnvironment,
      parsedSteps: parsedSteps
    });
    
    // Clean the generated code using LLM service post-processing (includes .tags() fix)
    let testCode = llmService.postProcessGeneratedCode(rawCode, testName, testType);
    
    // If prompt has tags, inject them as Allure labels at test start
    try {
      const tags = Array.isArray(prompt.tags) ? prompt.tags : (typeof prompt.tags === 'string' ? prompt.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
      if (tags.length > 0 && typeof testCode === 'string') {
        // Insert after first opening test block
        testCode = testCode.replace(/(test\(['\"][^\n]*['\"],\s*async\s*\(\{?[^)]*\}\)?\s*=>\s*\{)/, (m) => {
          const labels = tags.map(t => `    allure.label('tag', '${t}');`).join('\n');
          return `${m}\n${labels}\n`;
        });
      }
    } catch (_) {}
    
    // Add session management code if useExistingSession is true
    if (useExistingSession) {
      testCode = addSessionManagementCode(testCode);
    }
    
    // Validate that we actually got code from LLM
    if (!testCode || testCode.trim().length === 0) {
      throw new Error('LLM generated empty or invalid code. Please check your LLM configuration and try again.');
    }
    
    console.log('LLM code generation successful, proceeding with test execution');

    // Generate file path for saving - use prompt title only (no UUID folders)
    const CodeGenerator = require('../services/CodeGenerator');
    const codeGenerator = new CodeGenerator();
    
    const specDir = path.join(__dirname, '../../tests/projects/enhanced-ai/models/llm-generated/LLM-Generated/prompts');
    
    // Ensure directory exists
    if (!fs.existsSync(specDir)) {
      fs.mkdirSync(specDir, { recursive: true });
      console.log('📁 Created spec directory:', specDir);
    }
    
    // Generate unique file path with incremental postfix if needed
    const filePath = generateUniqueSpecFilePath(testName, specDir);
    console.log('Generated filePath:', filePath);

    // Save the test file
    const savedPath = await codeGenerator.saveTestFile(testCode, filePath);

    // Generate test ID from file path
    const testId = path.basename(savedPath, '.spec.ts').replace(/[^a-zA-Z0-9-_]/g, '-');

    return {
      success: true,
      testCode,
      filePath: savedPath,
      testId,
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedWith: 'LLM',
        llmProvider: environment.llmConfiguration.provider,
        llmModel: environment.llmConfiguration.model,
        testName,
        testType,
        stepCount: parsedSteps.length,
        environment: environment.name
      }
    };
  } catch (error) {
    console.error('Error generating LLM Playwright test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fix invalid .tags() method usage - Playwright doesn't support this method
function fixInvalidTagsUsage(code) {
  let fixedCode = code;
  
  // Pattern to match various .tags() usage patterns - more comprehensive
  const tagsPatterns = [
    /(\}\s*)\)\.tags\([^)]*\);/g,     // }).tags('tag1', 'tag2');
    /(\s*)\)\.tags\([^)]*\);/g,       // ).tags('tag1', 'tag2');
    /test\([^)]*\)\.tags\([^)]*\);/g, // test('name').tags('tag1', 'tag2');
    /\.tags\([^)]*\);/g,              // any .tags() call
    /\.tags\([^)]*\)/g                // any .tags() call without semicolon
  ];
  
  let tagsFound = false;
  let extractedTags = [];
  
  // Process all tag patterns
  tagsPatterns.forEach(pattern => {
    const matches = fixedCode.match(pattern);
    if (matches) {
      tagsFound = true;
      matches.forEach(match => {
        // Extract tags from the match
        const tagsMatch = match.match(/\.tags\(([^)]*)\)/);
        if (tagsMatch && tagsMatch[1]) {
          // Parse the tags (remove quotes and split by comma)
          const tagsString = tagsMatch[1];
          const tags = tagsString.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
          extractedTags.push(...tags);
          
          // Remove the .tags() call
          if (match.includes('}).tags(')) {
            fixedCode = fixedCode.replace(match, match.replace(/\.tags\([^)]*\)/, ''));
          } else if (match.includes(').tags(')) {
            fixedCode = fixedCode.replace(match, match.replace(/\.tags\([^)]*\)/, ''));
          } else {
            fixedCode = fixedCode.replace(match, match.replace(/\.tags\([^)]*\);/, ';'));
          }
        }
      });
    }
  });
  
  // If tags were found, add them to beforeEach
  if (tagsFound && extractedTags.length > 0) {
    // Remove duplicates
    const uniqueTags = [...new Set(extractedTags)];
    const tagCalls = uniqueTags.map(tag => `    await allure.tag('${tag}');`).join('\n');
    
    // Check if there's already a beforeEach hook
    const beforeEachMatch = fixedCode.match(/(test\.beforeEach\(async \([^)]*\) => \{[\s\S]*?)([\s]*\}\);)/);
    
    if (beforeEachMatch) {
      // Add tags to existing beforeEach (before the closing })
      const beforeContent = beforeEachMatch[1];
      const afterContent = beforeEachMatch[2];
      
      // Check if allure tags already exist
      if (!beforeContent.includes('await allure.tag(')) {
        fixedCode = fixedCode.replace(beforeEachMatch[0], `${beforeContent}\n${tagCalls}\n${afterContent}`);
      }
    } else {
      // Add a new beforeEach hook after the describe line
      const describePattern = /(test\.describe\([^{]*\{[\s\n]*)/;
      if (fixedCode.match(describePattern)) {
        fixedCode = fixedCode.replace(describePattern, 
          `$1  test.beforeEach(async ({ page }) => {\n${tagCalls}\n  });\n\n`
        );
      }
    }
    
    console.log('🔧 Fixed invalid .tags() method usage and added allure tagging');
  }
  
  // AGGRESSIVE cleanup of any remaining .tags() calls with multiple patterns
  fixedCode = fixedCode.replace(/\.tags\([^)]*\);?/g, '');
  fixedCode = fixedCode.replace(/\.tags\([^)]*\)\s*;/g, ';');
  fixedCode = fixedCode.replace(/\.tags\([^)]*\)/g, '');
  fixedCode = fixedCode.replace(/\)\s*\.tags\([^)]*\)/g, ')');
  fixedCode = fixedCode.replace(/\}\s*\)\.tags\([^)]*\);/g, '});');
  
  // Clean up any double semicolons or empty lines
  fixedCode = fixedCode.replace(/;;/g, ';');
  fixedCode = fixedCode.replace(/\n\n\n+/g, '\n\n');
  
  // Final safety check - log if any .tags() still remain
  if (fixedCode.includes('.tags(')) {
    console.warn('⚠️ WARNING: .tags() calls still found after cleanup. Manual review needed.');
    console.log('Remaining .tags() calls:', fixedCode.match(/\.tags\([^)]*\)/g));
  }
  
  return fixedCode;
}

module.exports = router;
