import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';


// Auto-waiting navigation helper with multiple strategies
async function navigateWithAutoWait(page, url) {
  const strategies = [
    { waitUntil: 'domcontentloaded' },
    { waitUntil: 'load' },
    { waitUntil: 'networkidle' }
  ];
  
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const strategy of strategies) {
      try {
        await page.goto(url, strategy);
        await page.waitForLoadState('networkidle').catch(() => console.log('Network idle timeout, continuing...'));
        console.log('Navigation successful with strategy:', strategy.waitUntil);
        return;
      } catch (error) {
        console.log('Navigation attempt failed:', error.message);
        await page.waitForTimeout(500 * (attempt + 1)); // Reduced backoff
      }
    }
  }
  throw new Error('All navigation strategies failed');
}

// Test cleanup helper
async function handleTestCleanup(page, testInfo) {
  try {
    if (testInfo.status !== 'passed') {
      const screenshotPath = `screenshots/failure-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('Screenshot saved:', screenshotPath);
    }
    
    await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"], .modal, .popup');
      dialogs.forEach(dialog => {
        if (dialog.style) dialog.style.display = 'none';
      });
    });
    
    console.log('Test cleanup completed');
  } catch (error) {
    console.error('Error during test cleanup:', error.message);
  }
}
test.describe('Login Test - Fixed Tags', () => {
  // Auto-waiting navigation helper function
  const navigateWithAutoWait = async (page, url) => {
    const navigationStrategies = [
      { waitUntil: 'domcontentloaded', timeout: 30000 },
      { waitUntil: 'load', timeout: 45000 },
      { waitUntil: 'networkidle', timeout: 60000 }
    ];
    
    for (let i = 0; i < navigationStrategies.length; i++) {
      try {
        await page.goto(url, navigationStrategies[i]);
        console.log(`Navigation successful with strategy: ${JSON.stringify(navigationStrategies[i])}`);
        
        // Additional wait for page stability
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        return;
      } catch (error) {
        console.log(`Navigation strategy ${i + 1} failed: ${error.message}`);
        if (i === navigationStrategies.length - 1) {
          throw new Error(`All navigation strategies failed: ${error.message}`);
        }
      }
    }
  };

  test('should execute test steps', async ({ page }) => {
    test.setTimeout(90000);

    allure.description('Automated test generated from AI prompt with 5 steps');
    allure.severity('normal');
    allure.owner('AI Test Generator');

    // Auto-navigate to base URL at test start
    const baseUrl = process.env.BASE_URL || 'http://localhost:5050';
    await navigateWithAutoWait(page, baseUrl);

    try {

    // Step 1: Navigate to button
    await test.step('Step 1: Navigate to button', async () => {
      try {
      await page.goto('http://localhost:5050/button', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => console.log('Network idle timeout, continuing...'));
      } catch (error) {
        console.error('Step 1 failed:', error);
        throw error;
      }
      });

    // Step 2: Fill input with value
    await test.step('Step 2: Fill input with value', async () => {
      try {
      // Auto-waiting and self-healing fill with multiple strategies
      const fillElement = async () => {
        const selectors = [
          'text=input',
          'input[name="input"]',
          '#input',
          'input[placeholder*="input"]',
          'input[type="text"][id*="input"]',
          'input[type="password"][id*="input"]',
          'input[type="email"][id*="input"]',
          'textarea[name="input"]',
          '[data-testid*="input"]'
        ];
        
        for (let i = 0; i < selectors.length; i++) {
          try {
            const element = page.locator(selectors[i]).first();
            await element.waitFor({ state: 'visible' });
            await element.clear();
            await element.fill('test value');
            console.log(`Successfully filled using selector: ${selectors[i]}`);
            return;
          } catch (error) {
            console.log(`Selector ${selectors[i]} failed: ${error.message}`);
            if (i === selectors.length - 1) throw error;
          }
        }
      };
      
      // Retry mechanism with reduced backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await fillElement();
          break;
        } catch (error) {
          console.log(`Fill attempt ${attempt} failed: ${error.message}`);
          if (attempt === 3) throw new Error(`Failed to fill element after 3 attempts: ${error.message}`);
          await page.waitForTimeout(attempt * 500); // Reduced backoff time
        }
      }
      } catch (error) {
        console.error('Step 2 failed:', error);
        throw error;
      }
      });

    // Step 3: Fill input with value
    await test.step('Step 3: Fill input with value', async () => {
      try {
      // Auto-waiting and self-healing fill with multiple strategies
      const fillElement = async () => {
        const selectors = [
          'text=input',
          'input[name="input"]',
          '#input',
          'input[placeholder*="input"]',
          'input[type="text"][id*="input"]',
          'input[type="password"][id*="input"]',
          'input[type="email"][id*="input"]',
          'textarea[name="input"]',
          '[data-testid*="input"]'
        ];
        
        for (let i = 0; i < selectors.length; i++) {
          try {
            const element = page.locator(selectors[i]).first();
            await element.waitFor({ state: 'visible' });
            await element.clear();
            await element.fill('test value');
            console.log(`Successfully filled using selector: ${selectors[i]}`);
            return;
          } catch (error) {
            console.log(`Selector ${selectors[i]} failed: ${error.message}`);
            if (i === selectors.length - 1) throw error;
          }
        }
      };
      
      // Retry mechanism with reduced backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await fillElement();
          break;
        } catch (error) {
          console.log(`Fill attempt ${attempt} failed: ${error.message}`);
          if (attempt === 3) throw new Error(`Failed to fill element after 3 attempts: ${error.message}`);
          await page.waitForTimeout(attempt * 500); // Reduced backoff time
        }
      }
      } catch (error) {
        console.error('Step 3 failed:', error);
        throw error;
      }
      });

    // Step 4: Click on button
    await test.step('Step 4: Click on button', async () => {
      try {
      // Auto-waiting and self-healing click with multiple strategies
      const clickElement = async () => {
        const selectors = [
          'text=button',
          'button[name="button"]',
          '#button',
          'input[type="submit"][value*="button"]',
          '[role="button"]:has-text("button")',
          'a:has-text("button")',
          '*[onclick]:has-text("button")',
          'button:has-text("button")',
          '[data-testid*="button"]'
        ];
        
        for (let i = 0; i < selectors.length; i++) {
          try {
            const element = page.locator(selectors[i]).first();
            await element.waitFor({ state: 'visible' });
            await element.click();
            console.log(`Successfully clicked using selector: ${selectors[i]}`);
            return;
          } catch (error) {
            console.log(`Selector ${selectors[i]} failed: ${error.message}`);
            if (i === selectors.length - 1) throw error;
          }
        }
      };
      
      // Retry mechanism with reduced backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await clickElement();
          break;
        } catch (error) {
          console.log(`Click attempt ${attempt} failed: ${error.message}`);
          if (attempt === 3) throw new Error(`Failed to click element after 3 attempts: ${error.message}`);
          await page.waitForTimeout(attempt * 500); // Reduced backoff time
        }
      }
      } catch (error) {
        console.error('Step 4 failed:', error);
        throw error;
      }
      });

    // Step 5: Assert dashboard is displayed
    await test.step('Step 5: Assert dashboard is displayed', async () => {
      try {
      await page.waitForSelector('text=dashboard displayed', { state: 'visible' });
      await expect(page.locator('text=dashboard displayed')).toBeVisible();
      } catch (error) {
        console.error('Step 5 failed:', error);
        throw error;
      }
      });
      console.log('Test completed successfully');
    } catch (error) {
      console.error('Test failed:', error.message);
      await handleTestCleanup(page, test.info());
      throw error;
    }
  });
  // Auto-cleanup and reporting helper
  const handleTestCleanup = async (page, testInfo) => {
    try {
      if (testInfo.status === 'failed') {
        await page.screenshot({ 
          path: `test-results/screenshots/failure-${Date.now()}.png`,
          fullPage: true 
        });
        console.log('Screenshot captured for failed test');
      }
    } catch (error) {
      console.log('Failed to capture screenshot:', error.message);
    }
  };
});

