import { test as base, expect, Page } from '@playwright/test';
const SelfHealingService = require('../../server/services/SelfHealingService');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Helper to wrap page actions with self-healing
const createSelfHealingPage = (page: Page, testInfo: any) => {
  const selfHealingService = new SelfHealingService();

  return new Proxy(page, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      
      // Intercept action methods
      if (typeof value === 'function' && ['click', 'fill', 'check', 'selectOption', 'goto'].includes(prop as string)) {
        return async (...args: any[]) => {
          try {
             // Visual feedback: Highlight the element if possible (only for selector-based actions)
             if (['click', 'fill', 'check', 'selectOption'].includes(prop as string) && typeof args[0] === 'string') {
                 try {
                     console.log(`✨ Highlighting element for page action '${String(prop)}'...`);
                     const selector = args[0];
                     // Attempt to highlight using page.eval
                     const elementHandle = await target.$(selector).catch(() => null);
                     if (elementHandle) {
                         await elementHandle.evaluate((el: any) => {
                            el.style.border = '3px solid #FF00FF';
                            el.style.boxShadow = '0 0 10px #FF00FF';
                            el.style.transition = 'all 0.3s ease';
                         });
                         await page.waitForTimeout(500);
                     }
                 } catch (ignore) {
                     // Proceed if highlighting fails
                 }
             }

            // Try original action
            return await value.apply(target, args);
          } catch (error: any) {
            console.log(`❌ Action '${String(prop)}' failed: ${error.message}`);
            
            // Prepare environment for LLM
            const environment = {
                llmConfiguration: {
                    provider: process.env.LLM_PROVIDER || 'openrouter',
                    apiKey: process.env.LLM_API_KEY,
                    model: process.env.LLM_MODEL || 'xiaomi/mimo-v2-flash:free',
                    baseUrl: process.env.LLM_BASE_URL
                }
            };

            // Attempt self-healing
            const stepCode = `await page.${String(prop)}(${args.map(a => JSON.stringify(a)).join(', ')})`;
            
            const healedCode = await selfHealingService.healStep(page, error, stepCode, environment);
            
            if (healedCode) {
                console.log('🚑 Applying self-healing fix...');
                try {
                    const func = new Function('page', `return (async () => { ${healedCode} })();`);
                    await func(page);
                    console.log('✅ Self-healing successful!');
                    
                    // Save the healed step and attempt to patch the file
                    await selfHealingService.saveHealedStep(stepCode, healedCode, error.message, page.url());
                    
                    // Attempt to patch the file using stack trace to find line number
                    if (testInfo && testInfo.file) {
                        await selfHealingService.patchTestFile(testInfo.file, error, healedCode);
                    }

                    return;
                } catch (healExecError: any) {
                    console.error('❌ Healed code execution failed:', healExecError.message);
                    throw error; // Throw original error if healing failed
                }
            } else {
                throw error;
            }
          }
        };
      }
      
      if (prop === 'locator' || prop === 'getByRole' || prop === 'getByText' || prop === 'getByPlaceholder' || prop === 'getByLabel') {
          return (...args: any[]) => {
              const locator = value.apply(target, args);
              return createSelfHealingLocator(locator, page, selfHealingService, testInfo);
          }
      }

      return value;
    },
  });
};

const createSelfHealingLocator = (locator: any, page: Page, selfHealingService: any, testInfo: any) => {
    return new Proxy(locator, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);

            // Handle chaining methods that return a Locator
            if (typeof value === 'function' && ['first', 'last', 'nth', 'filter', 'locator', 'getByRole', 'getByText', 'getByPlaceholder', 'getByLabel', 'getByTestId', 'parent'].includes(prop as string)) {
                 return (...args: any[]) => {
                     const result = value.apply(target, args);
                     // If result is a locator-like object (has click/fill methods), wrap it
                     if (result && typeof result.click === 'function') {
                         return createSelfHealingLocator(result, page, selfHealingService, testInfo);
                     }
                     return result;
                 }
            }

            if (typeof value === 'function' && ['click', 'fill', 'check', 'selectOption', 'hover'].includes(prop as string)) {
                return async (...args: any[]) => {
                    try {
                        // Visual feedback: Highlight the element before interaction
                        try {
                             console.log(`✨ Highlighting element for action '${String(prop)}'...`);
                             await value.call(target, { timeout: 1000 }).catch(() => {}); 
                             await target.evaluate((el: any) => {
                                el.style.border = '3px solid #FF00FF'; 
                                el.style.boxShadow = '0 0 10px #FF00FF';
                                el.style.transition = 'all 0.3s ease';
                             }).catch(() => {}); 
                             await page.waitForTimeout(500); 
                        } catch (ignore) {
                        }

                        return await value.apply(target, args);
                    } catch (error: any) {
                        console.log(`❌ Locator Action '${String(prop)}' failed: ${error.message}`);
                         // Prepare environment for LLM
                        const environment = {
                            llmConfiguration: {
                                provider: process.env.LLM_PROVIDER || 'openrouter',
                                apiKey: process.env.LLM_API_KEY,
                                model: process.env.LLM_MODEL || 'xiaomi/mimo-v2-flash:free',
                                baseUrl: process.env.LLM_BASE_URL
                            }
                        };
                        
                        const selector = target.toString(); 
                        const stepCode = `await ${selector}.${String(prop)}(${args.map(a => JSON.stringify(a)).join(', ')})`;

                        const healedCode = await selfHealingService.healStep(page, error, stepCode, environment);
                        
                        if (healedCode) {
                            console.log('🚑 Applying self-healing fix...');
                            try {
                                const func = new Function('page', `return (async () => { ${healedCode} })();`);
                                await func(page);
                                console.log('✅ Self-healing successful!');
                                await selfHealingService.saveHealedStep(stepCode, healedCode, error.message, page.url());
                                
                                // Attempt to patch the file
                                if (testInfo && testInfo.file) {
                                    await selfHealingService.patchTestFile(testInfo.file, error, healedCode);
                                }
                                return;
                            } catch (healExecError: any) {
                                console.error('❌ Healed code execution failed:', healExecError.message);
                                throw error;
                            }
                        }
                        throw error;
                    }
                }
            }
            return value;
        }
    });
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const selfHealingPage = createSelfHealingPage(page, testInfo);
    await use(selfHealingPage);
  },
});

export { expect } from '@playwright/test';
