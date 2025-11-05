const express = require('express');
const router = express.Router();
const ApiTestExecutor = require('../services/ApiTestExecutor');
const path = require('path');

const apiTestExecutor = new ApiTestExecutor();

// Execute single API test with environment configuration
router.post('/execute', async (req, res) => {
  try {
    const { testFile, environment, environmentConfig, timeout = 30000, retries = 1 } = req.body;

    if (!testFile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test file path is required' 
      });
    }

    console.log(`🚀 API Test Execution Request:`, {
      testFile,
      environment,
      environmentConfig: environmentConfig ? {
        name: environmentConfig.name,
        variables: Object.keys(environmentConfig.variables || {}),
        authorization: environmentConfig.authorization ? 'configured' : 'none'
      } : 'none',
      timeout,
      retries
    });

    // Default execution config
    const executionConfig = {
      environment: environment || 'test',
      timeout: parseInt(timeout),
      retries: parseInt(retries),
      tags: []
    };

    // Execute the API test with environment configuration
    const result = await apiTestExecutor.executeApiTest(
      testFile, 
      executionConfig, 
      environmentConfig
    );

    res.json({
      success: result.success,
      executionId: result.executionId,
      exitCode: result.exitCode,
      message: result.success ? 'API test executed successfully' : 'API test execution failed',
      executionDir: result.executionDir,
      stdout: result.stdout,
      stderr: result.stderr
    });

  } catch (error) {
    console.error('❌ API test execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute API test',
      error: error.message
    });
  }
});

// Execute API test with environment selection (new endpoint)
router.post('/execute-with-environment', async (req, res) => {
  try {
    const { 
      testFile, 
      environmentId, 
      environmentName,
      timeout = 30000, 
      retries = 1 
    } = req.body;

    if (!testFile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test file path is required' 
      });
    }

    console.log(`🚀 API Test Execution with Environment:`, {
      testFile,
      environmentId,
      environmentName
    });

    // Load environment configuration
    let environmentConfig = null;
    
    if (environmentId) {
      try {
        const FileStorage = require('../services/FileStorage');
        const fileStorage = new FileStorage();
        const environments = await fileStorage.getEnvironments();
        environmentConfig = environments.find(env => env._id === environmentId);
        
        if (!environmentConfig) {
          return res.status(400).json({
            success: false,
            message: `Environment with ID ${environmentId} not found`
          });
        }
        
        console.log(`✅ Loaded environment configuration: ${environmentConfig.name}`);
      } catch (error) {
        console.error('❌ Error loading environment:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to load environment configuration',
          error: error.message
        });
      }
    }

    // Default execution config
    const executionConfig = {
      environment: environmentName || environmentConfig?.name || 'test',
      timeout: parseInt(timeout),
      retries: parseInt(retries),
      tags: []
    };

    // Execute the API test with environment configuration
    const result = await apiTestExecutor.executeApiTest(
      testFile, 
      executionConfig, 
      environmentConfig
    );

    res.json({
      success: result.success,
      executionId: result.executionId,
      exitCode: result.exitCode,
      message: result.success ? 'API test executed successfully' : 'API test execution failed',
      executionDir: result.executionDir,
      stdout: result.stdout,
      stderr: result.stderr,
      environment: {
        name: environmentConfig?.name || 'default',
        id: environmentConfig?._id
      }
    });

  } catch (error) {
    console.error('❌ API test execution with environment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute API test with environment',
      error: error.message
    });
  }
});

// Get execution status
router.get('/status/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const status = await apiTestExecutor.getExecutionStatus(executionId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found'
      });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('❌ Error getting execution status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get execution status',
      error: error.message
    });
  }
});

// Get all execution statuses
router.get('/status', async (req, res) => {
  try {
    const statuses = await apiTestExecutor.getAllExecutionStatuses();
    
    res.json({
      success: true,
      statuses
    });

  } catch (error) {
    console.error('❌ Error getting all execution statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get execution statuses',
      error: error.message
    });
  }
});

// Execute multiple API tests
router.post('/execute-batch', async (req, res) => {
  try {
    const { testFiles, environment, environmentConfig } = req.body;

    if (!testFiles || !Array.isArray(testFiles) || testFiles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test files array is required' 
      });
    }

    console.log(`🚀 Batch API Test Execution Request:`, {
      testFiles,
      environment,
      environmentConfig
    });

    const results = [];
    const executionConfig = {
      environment: environment || 'test',
      timeout: 30000,
      retries: 1,
      tags: []
    };

    // Execute tests sequentially to avoid conflicts
    for (const testFile of testFiles) {
      try {
        const result = await apiTestExecutor.executeApiTest(
          testFile, 
          executionConfig, 
          environmentConfig
        );
        results.push({
          testFile,
          success: result.success,
          executionId: result.executionId,
          exitCode: result.exitCode
        });
      } catch (error) {
        console.error(`❌ Error executing ${testFile}:`, error);
        results.push({
          testFile,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.json({
      success: successCount > 0,
      message: `Executed ${successCount}/${totalCount} API tests successfully`,
      results
    });

  } catch (error) {
    console.error('❌ Batch API test execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute batch API tests',
      error: error.message
    });
  }
});

// Execute API test suite with environment selection
router.post('/execute-suite', async (req, res) => {
  try {
    const { 
      testFiles, 
      environmentId, 
      environmentName,
      timeout = 30000, 
      retries = 1,
      parallel = false 
    } = req.body;

    if (!testFiles || !Array.isArray(testFiles) || testFiles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test files array is required' 
      });
    }

    console.log(`🚀 API Test Suite Execution with Environment:`, {
      testFiles: testFiles.length,
      environmentId,
      environmentName,
      parallel
    });

    // Load environment configuration
    let environmentConfig = null;
    
    if (environmentId) {
      try {
        const FileStorage = require('../services/FileStorage');
        const fileStorage = new FileStorage();
        const environments = await fileStorage.getEnvironments();
        environmentConfig = environments.find(env => env._id === environmentId);
        
        if (!environmentConfig) {
          return res.status(400).json({
            success: false,
            message: `Environment with ID ${environmentId} not found`
          });
        }
        
        console.log(`✅ Loaded environment configuration: ${environmentConfig.name}`);
      } catch (error) {
        console.error('❌ Error loading environment:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to load environment configuration',
          error: error.message
        });
      }
    }

    const results = [];
    const executionConfig = {
      environment: environmentName || environmentConfig?.name || 'test',
      timeout: parseInt(timeout),
      retries: parseInt(retries),
      tags: []
    };

    // Execute tests (sequential or parallel based on configuration)
    if (parallel) {
      // Execute tests in parallel
      const promises = testFiles.map(async (testFile) => {
        try {
          const result = await apiTestExecutor.executeApiTest(
            testFile, 
            executionConfig, 
            environmentConfig
          );
          return {
            testFile,
            success: result.success,
            executionId: result.executionId,
            exitCode: result.exitCode
          };
        } catch (error) {
          console.error(`❌ Error executing ${testFile}:`, error);
          return {
            testFile,
            success: false,
            error: error.message
          };
        }
      });
      
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      // Execute tests sequentially to avoid conflicts
      for (const testFile of testFiles) {
        try {
          const result = await apiTestExecutor.executeApiTest(
            testFile, 
            executionConfig, 
            environmentConfig
          );
          results.push({
            testFile,
            success: result.success,
            executionId: result.executionId,
            exitCode: result.exitCode
          });
        } catch (error) {
          console.error(`❌ Error executing ${testFile}:`, error);
          results.push({
            testFile,
            success: false,
            error: error.message
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.json({
      success: successCount > 0,
      message: `Executed ${successCount}/${totalCount} API tests successfully`,
      results,
      environment: {
        name: environmentConfig?.name || 'default',
        id: environmentConfig?._id
      },
      executionMode: parallel ? 'parallel' : 'sequential'
    });

  } catch (error) {
    console.error('❌ API test suite execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute API test suite',
      error: error.message
    });
  }
});

module.exports = router;
