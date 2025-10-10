const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

// Load environment variables
dotenv.config();
// Also try loading root .env if present
try {
  const rootEnvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath });
  }
} catch (_) {}

// Ensure browsers path is set for all Playwright usages
const projectRoot = path.join(__dirname, '..');
let browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
if (!browsersPath) {
  browsersPath = path.join(projectRoot, '.local-browsers');
} else if (!path.isAbsolute(browsersPath)) {
  browsersPath = path.resolve(projectRoot, browsersPath);
}
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
console.log('PLAYWRIGHT_BROWSERS_PATH:', process.env.PLAYWRIGHT_BROWSERS_PATH);

// Import routes
const promptRoutes = require('./routes/prompts');
const testSuiteRoutes = require('./routes/testSuites');
const environmentRoutes = require('./routes/environments');
const testResultRoutes = require('./routes/testResults');
const enhancedTestResultRoutes = require('./routes/enhancedTestResults');
const enhancedReportRoutes = require('./routes/enhancedReports');
const codeGenerationRoutes = require('./routes/codeGeneration');
const testExecutionRoutes = require('./routes/testExecution');
const apiTestGeneratorRoutes = require('./routes/apiTestGenerator');
const domAnalyzerRoutes = require('./routes/domAnalyzer');
const apiTestExecutionRoutes = require('./routes/apiTestExecution');
const dashboardRoutes = require('./routes/dashboard');
const testGenRoutes = require('./routes/testGen');
const app = express();
const PORT = process.env.PORT || 5051;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build
// app.use(express.static(path.join(__dirname, '../client/build')));

// Serve report files
app.use('/reports', express.static(path.join(__dirname, 'reports')));

console.log('Using File-Based Storage (No Database Required)');

// API Routes
app.use('/api/prompts', promptRoutes);
app.use('/api/test-suites', testSuiteRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/test-results', testResultRoutes);
app.use('/api/analytics', enhancedTestResultRoutes);
app.use('/api/reports', enhancedReportRoutes);
app.use('/api/code-generation', codeGenerationRoutes);
app.use('/api/test-execution', testExecutionRoutes);
app.use('/api/api-test-generator', apiTestGeneratorRoutes);
app.use('/api/dom-analyzer', domAnalyzerRoutes);
app.use('/api/api-test-execution', apiTestExecutionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/test-gen', testGenRoutes);
// API endpoint to fetch test files
app.get('/api/test-files', (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const testsDir = path.join(__dirname, 'tests/generated');
    let testFiles = [];
    
    if (type === 'api' || type === 'all') {
      const apiTestsPattern = path.join(testsDir, 'api-tests', '**/*.spec.ts');
      const apiFiles = glob.sync(apiTestsPattern);
      
      apiFiles.forEach(filePath => {
        const relativePath = path.relative(testsDir, filePath);
        const fileName = path.basename(filePath, '.spec.ts');
        const stats = fs.statSync(filePath);
        
        // Extract test name and tags from filename
        const testName = fileName.replace(/--/g, ' ').replace(/-/g, ' ');
        const tags = ['api'];
        
        // Add specific tags based on filename patterns
        if (fileName.includes('happy-path')) {
          tags.push('happy-path');
        } else if (fileName.includes('error-cases')) {
          tags.push('error-handling');
        } else if (fileName.includes('data-validation')) {
          tags.push('validation');
        }
        
        testFiles.push({
          id: `api-${fileName}`,
          name: testName,
          tags: tags,
          type: 'API',
          filePath: relativePath,
          created: stats.birthtime,
          modified: stats.mtime
        });
      });
    }
    
    if (type === 'ui' || type === 'all') {
      // Look for UI tests in generated, root tests directory, and projects directories
      const uiTestsPattern = path.join(testsDir, '**/*.spec.ts');
      const rootTestsPattern = path.join(__dirname, '../tests/*.spec.ts');
      const projectsTestsPattern = path.join(__dirname, '../tests/projects/**/*.spec.ts');
      
      const uiFiles = [
        ...glob.sync(uiTestsPattern).filter(file => 
          !file.includes('api-tests') && file.endsWith('.spec.ts')
        ),
        ...glob.sync(rootTestsPattern),
        ...glob.sync(projectsTestsPattern)
      ];
      
      uiFiles.forEach(filePath => {
        const relativePath = path.relative(path.join(__dirname, '../tests'), filePath);
        const fileName = path.basename(filePath, '.spec.ts');
        const stats = fs.statSync(filePath);
        
        const testName = fileName.replace(/--/g, ' ').replace(/-/g, ' ');
        const tags = ['ui'];
        
        // Add specific tags based on filename patterns
        if (fileName.includes('login')) {
          tags.push('login');
        } else if (fileName.includes('search')) {
          tags.push('search');
        } else if (fileName.includes('generated')) {
          tags.push('generated');
        }
        
        testFiles.push({
          id: `ui-${fileName}`,
          name: testName,
          tags: tags,
          type: 'UI',
          filePath: relativePath,
          created: stats.birthtime,
          modified: stats.mtime
        });
      });
    }
    
    res.json({
      success: true,
      tests: testFiles,
      total: testFiles.length
    });
  } catch (error) {
    console.error('Error fetching test files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test files',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API endpoint to get test file content
app.get('/api/test-files/:id/content', (req, res) => {
  try {
    const { id } = req.params;
    const testsDir = path.join(__dirname, 'tests/generated');
    
    // Find the test file by ID
    const apiTestsPattern = path.join(testsDir, 'api-tests', '**/*.spec.ts');
    const uiTestsPattern = path.join(testsDir, '**/*.spec.ts');
    const rootTestsPattern = path.join(__dirname, '../tests/*.spec.ts');
    const projectsTestsPattern = path.join(__dirname, '../tests/projects/**/*.spec.ts');

    const allFiles = [
      ...glob.sync(apiTestsPattern),
      ...glob.sync(uiTestsPattern).filter(file => !file.includes('api-tests')),
      ...glob.sync(rootTestsPattern),
      ...glob.sync(projectsTestsPattern)
    ];

    let testFile = null;
    for (const filePath of allFiles) {
      const fileName = path.basename(filePath, '.spec.ts');
      const testId = filePath.includes('api-tests') ? `api-${fileName}` : `ui-${fileName}`;
      
      if (testId === id) {
        testFile = filePath;
        break;
      }
    }

    if (!testFile) {
      return res.status(404).json({ error: 'Test file not found' });
    }

    // Read the file content
    const content = fs.readFileSync(testFile, 'utf8');
    
    res.json({
      success: true,
      content: content,
      filePath: testFile,
      fileName: path.basename(testFile)
    });
  } catch (error) {
    console.error('Error reading test file content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read test file content',
      message: error.message
    });
  }
});

// API endpoint to save test file content
app.put('/api/test-files/:id/content', (req, res) => {
  try {
    const { id } = req.params;
    const { content, testName } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const testsDir = path.join(__dirname, 'tests/generated');
    
    // Find the test file by ID
    const apiTestsPattern = path.join(testsDir, 'api-tests', '**/*.spec.ts');
    const uiTestsPattern = path.join(testsDir, '**/*.spec.ts');
    const projectsTestsPattern = path.join(__dirname, '../tests/projects/**/*.spec.ts');
    const rootTestsPattern = path.join(__dirname, '../tests/*.spec.ts');

    const allFiles = [
      ...glob.sync(apiTestsPattern),
      ...glob.sync(uiTestsPattern).filter(file => !file.includes('api-tests')),
      ...glob.sync(projectsTestsPattern),
      ...glob.sync(rootTestsPattern)
    ];

    let testFile = null;
    for (const filePath of allFiles) {
      const fileName = path.basename(filePath, '.spec.ts');
      const testId = filePath.includes('api-tests') ? `api-${fileName}` : `ui-${fileName}`;
      
      if (testId === id) {
        testFile = filePath;
        break;
      }
    }

    if (!testFile) {
      return res.status(404).json({ error: 'Test file not found' });
    }

    // Write the new content directly without backup
    fs.writeFileSync(testFile, content, 'utf8');
    console.log(`Updated test file: ${testFile}`);
    
    res.json({
      success: true,
      message: 'Test file updated successfully',
      filePath: testFile
    });
  } catch (error) {
    console.error('Error saving test file content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save test file content',
      message: error.message
    });
  }
});

// API endpoint to delete test file
app.delete('/api/test-files/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const testsDir = path.join(__dirname, 'tests/generated');
    
    // Find the test file by ID
    const apiTestsPattern = path.join(testsDir, 'api-tests', '**/*.spec.ts');
    const uiTestsPattern = path.join(testsDir, '**/*.spec.ts');
    const projectsTestsPattern = path.join(__dirname, '../tests/projects/**/*.spec.ts');
    const rootTestsPattern = path.join(__dirname, '../tests/*.spec.ts');

    const allFiles = [
      ...glob.sync(apiTestsPattern),
      ...glob.sync(uiTestsPattern).filter(file => !file.includes('api-tests')),
      ...glob.sync(projectsTestsPattern),
      ...glob.sync(rootTestsPattern)
    ];

    let testFile = null;
    for (const filePath of allFiles) {
      const fileName = path.basename(filePath, '.spec.ts');
      const testId = filePath.includes('api-tests') ? `api-${fileName}` : `ui-${fileName}`;
      
      if (testId === id) {
        testFile = filePath;
        break;
      }
    }

    // If physical file exists, delete it
    if (testFile) {
      // Check if this is a test file in a prompt directory structure BEFORE deleting
      // Path structure: /tests/projects/{project}/{model}/{modelName}/{promptId}/{testName}.spec.ts
      const pathParts = testFile.split(path.sep);
      const testsIndex = pathParts.indexOf('tests');
      let shouldDeletePromptDir = false;
      let promptDir = null;
      
      if (testsIndex !== -1) {
        const relativePath = pathParts.slice(testsIndex + 1);
        
        // Check if this follows the prompt directory structure
        // Path: projects/enhanced-ai/models/llm-generated/LLM-Generated/prompts/{promptId}/{testFile}
        if (relativePath.length >= 7 && relativePath[0] === 'projects' && relativePath[5] === 'prompts') {
          const project = relativePath[1];
          const model = relativePath[2];
          const modelName = relativePath[3];
          const promptId = relativePath[6]; // promptId is at index 6
          
          // Construct the prompt directory path
          promptDir = path.join(__dirname, '../tests/projects', project, model, modelName, 'LLM-Generated', 'prompts', promptId);
          
          // Check if prompt directory exists and contains only this test file
          if (fs.existsSync(promptDir)) {
            const filesInPromptDir = fs.readdirSync(promptDir);
            const specFiles = filesInPromptDir.filter(file => file.endsWith('.spec.ts'));
            
            // If this is the only spec file in the prompt directory, mark for deletion
            if (specFiles.length === 1 && specFiles[0] === path.basename(testFile)) {
              shouldDeletePromptDir = true;
              console.log(`Will delete prompt directory after file deletion: ${promptDir}`);
            }
          }
        }
      }
      
      // Delete the test file
      fs.unlinkSync(testFile);
      console.log(`Deleted test file: ${testFile}`);
      
      // Delete the prompt directory if it was the only test file
      if (shouldDeletePromptDir && promptDir) {
        console.log(`Deleting prompt directory: ${promptDir}`);
        fs.rmSync(promptDir, { recursive: true, force: true });
        console.log(`Deleted prompt directory: ${promptDir}`);
      }
      
      return res.json({
        success: true,
        message: 'Test file deleted successfully',
        filePath: testFile
      });
    }

    // If no physical file found, check if it's a data-only test
    // Load test results to check if test exists in data
    const testResultsPath = path.join(__dirname, '../data/testResults.json');
    const promptsPath = path.join(__dirname, '../data/prompts.json');
    
    let testExistsInData = false;
    let deletedFromData = false;

    // Check and remove from testResults.json
    if (fs.existsSync(testResultsPath)) {
      const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
      const filteredResults = testResults.filter(result => result.testId !== id);
      
      if (filteredResults.length < testResults.length) {
        fs.writeFileSync(testResultsPath, JSON.stringify(filteredResults, null, 2));
        testExistsInData = true;
        deletedFromData = true;
        console.log(`Removed test ${id} from testResults.json`);
      }
    }

    // Check and remove from prompts.json if it's a generated test
    if (fs.existsSync(promptsPath)) {
      const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
      let promptsUpdated = false;
      
      for (let prompt of prompts) {
        if (prompt.generatedTests && Array.isArray(prompt.generatedTests)) {
          const originalLength = prompt.generatedTests.length;
          prompt.generatedTests = prompt.generatedTests.filter(test => test.testId !== id);
          
          if (prompt.generatedTests.length < originalLength) {
            promptsUpdated = true;
            testExistsInData = true;
            deletedFromData = true;
            console.log(`Removed test ${id} from prompt ${prompt._id}`);
          }
        }
      }
      
      if (promptsUpdated) {
        fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
        console.log(`Updated prompts.json to remove test ${id}`);
      }
    }

    if (testExistsInData) {
      return res.json({
        success: true,
        message: 'Test deleted successfully from data',
        deletedFromData: true
      });
    }

    return res.status(404).json({ error: 'Test file not found' });
  } catch (error) {
    console.error('Error deleting test file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete test file',
      message: error.message
    });
  }
});

// API endpoint to create test suite
app.post('/api/test-suites', (req, res) => {
  try {
    const { suiteName, description, testType, selectedTestCases } = req.body;
    
    if (!suiteName || !selectedTestCases || selectedTestCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Suite name and test cases are required'
      });
    }

    // Generate unique ID for the test suite
    const testSuiteId = `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const testSuite = {
      id: testSuiteId,
      name: suiteName,
      description: description || '',
      testType: testType || 'UI',
      testCases: selectedTestCases,
      createdAt: new Date().toISOString(),
      status: 'ready',
      totalTests: selectedTestCases.length,
      lastRun: null,
      results: {
        passed: 0,
        failed: 0,
        skipped: 0,
        total: selectedTestCases.length
      }
    };

    // Save to file storage (using the existing FileStorage service)
    const FileStorage = require('./services/FileStorage');
    const fileStorage = new FileStorage();
    
    // Get existing test suites
    const existingSuites = fileStorage.getTestSuites();
    
    // Add new test suite
    existingSuites.push(testSuite);
    
    // Save back to file
    const saveResult = fileStorage.saveTestSuites(existingSuites);
    
    if (saveResult) {
      console.log('Test suite created:', testSuite);
      
      res.json({
        success: true,
        message: 'Test suite created successfully',
        testSuite: testSuite
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save test suite to file',
        message: 'Could not save test suite data'
      });
    }
  } catch (error) {
    console.error('Error creating test suite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test suite',
      message: error.message
    });
  }
});

// Serve favicon in dev to avoid proxy errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Serve React app for all non-API and non-report routes (only when build exists)
const buildIndexPath = path.join(__dirname, '../client/build', 'index.html');
if (process.env.NODE_ENV === 'production' || require('fs').existsSync(buildIndexPath)) {
  app.get('*', (req, res) => {
    // Don't serve React app for /reports/* paths - let static middleware handle them
    if (req.path.startsWith('/reports/')) {
      return res.status(404).send('Report not found');
    }
    res.sendFile(buildIndexPath);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Storage: File-Based (No Database Required)`);
});

module.exports = app;
