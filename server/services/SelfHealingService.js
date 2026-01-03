const fs = require('fs');
const path = require('path');
const DOMAnalyzer = require('./DOMAnalyzer');
const LLMService = require('./LLMService');

class SelfHealingService {
  constructor() {
    this.domAnalyzer = new DOMAnalyzer();
    this.llmService = new LLMService();
  }

  /**
   * Attempts to heal a failed Playwright step.
   * @param {Page} page - The Playwright Page object.
   * @param {Error} error - The error that occurred.
   * @param {string} failedStepCode - The code of the step that failed.
   * @param {Object} environment - The environment configuration (for LLM).
   * @returns {Promise<string|null>} - The healed code or null if failed.
   */
  async healStep(page, error, failedStepCode, environment) {
    console.log('🩹 Self-healing initiated for step:', failedStepCode);
    console.log('❌ Error:', error.message);

    try {
      // 1. Analyze DOM
      console.log('🔍 Analyzing DOM...');
      const domContext = await this.domAnalyzer.analyzeCurrentPage(page);
      
      // 2. Ask LLM for fix
      const systemPrompt = `You are an expert Playwright automation engineer. 
A test step failed. Your task is to provide ONLY the corrected Playwright JavaScript code to perform the intended action.
Assume 'page' object is available.
Do not include markdown blocks, comments, or explanations. Just the code.
Example: await page.getByRole('button', { name: 'Submit' }).click();`;

      const userPrompt = `
Step failed: "${failedStepCode}"
Error: "${error.message}"
Current URL: ${domContext.url}

DOM Context (Interactive Elements):
${JSON.stringify(domContext.elements ? domContext.elements.slice(0, 50) : [], null, 2)}

Provide the corrected Playwright code to execute this step.`;

      console.log('🤔 Asking LLM for repair...');
      const repairedCode = await this.llmService.generateText(userPrompt, systemPrompt, environment);
      console.log('💡 LLM suggested fix:', repairedCode);

      // Clean code
      const cleanCode = repairedCode.replace(/```(?:javascript|js|typescript|ts)?/g, '').replace(/```/g, '').trim();

      if (!cleanCode) {
        console.log('⚠️ LLM returned empty code.');
        return null;
      }

      return cleanCode;
    } catch (healErr) {
      console.error('❌ Self-healing failed:', healErr.message);
      return null;
    }
  }

  /**
   * Patches the test file with the healed code.
   * @param {string} filePath 
   * @param {Error} error 
   * @param {string} healedCode 
   */
  async patchTestFile(filePath, error, healedCode) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found for patching: ${filePath}`);
            return;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');

        // Parse stack trace to find line number
        // Stack trace format: "at /path/to/file.spec.ts:10:25"
        const stackLines = error.stack.split('\n');
        const match = stackLines.find(line => line.includes(filePath));
        
        if (!match) {
            console.error(`❌ Could not find file path in stack trace: ${filePath}`);
            return;
        }

        // Extract line number
        // Regex to capture :line:column
        const lineMatch = match.match(/:(\d+):\d+/);
        if (!lineMatch) {
             console.error(`❌ Could not extract line number from stack trace: ${match}`);
             return;
        }

        const lineNumber = parseInt(lineMatch[1], 10);
        const lineIndex = lineNumber - 1; // 0-based index

        if (lineIndex < 0 || lineIndex >= lines.length) {
            console.error(`❌ Line number out of bounds: ${lineNumber}`);
            return;
        }

        const originalLine = lines[lineIndex];
        
        // Determine indentation
        const indentationMatch = originalLine.match(/^(\s*)/);
        const indentation = indentationMatch ? indentationMatch[1] : '';

        // Prepare new line
        // Use the indentation of the original line
        const indentedHealedCode = healedCode.split('\n').map((line, index) => {
             return index === 0 ? indentation + line.trim() : indentation + line.trim();
        }).join('\n');

        console.log(`🔧 Patching file ${filePath} at line ${lineNumber}`);
        console.log(`   Original: ${originalLine.trim()}`);
        console.log(`   New:      ${indentedHealedCode.trim()}`);

        // Simple single-line replacement strategy
        // This assumes the failed step is on a single line or the error points to the main line
        lines[lineIndex] = indentedHealedCode;

        fs.writeFileSync(filePath, lines.join('\n'));
        console.log('✅ File patched successfully!');

    } catch (err) {
        console.error('❌ Failed to patch test file:', err.message);
    }
  }

  /**
   * Saves the healed step to a file.
   * @param {string} originalStep 
   * @param {string} healedCode 
   * @param {string} error 
   * @param {string} url 
   */
  async saveHealedStep(originalStep, healedCode, error, url) {
    try {
        // Save to project root to avoid nodemon restarts
        const healedFilePath = path.join(__dirname, '../../healed_steps.json');
        
        let healedSteps = [];
        if (fs.existsSync(healedFilePath)) {
             try {
                 const fileContent = fs.readFileSync(healedFilePath, 'utf8');
                 if (fileContent.trim()) {
                    healedSteps = JSON.parse(fileContent);
                 }
             } catch (parseErr) {
                 // Ignore parse error, start fresh
             }
        }
        healedSteps.push({
            originalStep: originalStep,
            error: error,
            healedCode: healedCode,
            timestamp: new Date().toISOString(),
            url: url
        });
        fs.writeFileSync(healedFilePath, JSON.stringify(healedSteps, null, 2));
        console.log('💾 Healed step saved to healed_steps.json');
    } catch (saveErr) {
        console.error('⚠️ Failed to save healed step:', saveErr.message);
    }
  }
}

module.exports = SelfHealingService;
