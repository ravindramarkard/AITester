const cron = require('node-cron');
const TestSuiteExecutor = require('./TestSuiteExecutor');
const FileStorage = require('./FileStorage');
const fileStorage = new FileStorage();

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.testSuiteExecutor = new TestSuiteExecutor();
  }

  async loadSchedules() {
    try {
      const testSuites = await fileStorage.getTestSuites();
      console.log(`📅 Loading schedules for ${testSuites.length} test suites...`);
      
      for (const testSuite of testSuites) {
        if (testSuite.schedule && testSuite.schedule.enabled) {
          await this.scheduleTestSuite(testSuite._id, testSuite.schedule);
        }
      }
      
      console.log(`✅ Loaded ${this.jobs.size} active schedules`);
    } catch (error) {
      console.error('❌ Error loading schedules:', error);
    }
  }

  async scheduleTestSuite(testSuiteId, scheduleConfig) {
    try {
      // Stop existing job if it exists
      if (this.jobs.has(testSuiteId)) {
        this.jobs.get(testSuiteId).stop();
        this.jobs.delete(testSuiteId);
      }

      // Validate cron expression
      if (!cron.validate(scheduleConfig.cron)) {
        throw new Error(`Invalid cron expression: ${scheduleConfig.cron}`);
      }

      // Create new scheduled job
      const job = cron.schedule(scheduleConfig.cron, async () => {
        console.log(`🕐 Running scheduled test suite: ${testSuiteId}`);
        await this.executeScheduledTestSuite(testSuiteId, scheduleConfig);
      }, {
        scheduled: scheduleConfig.enabled,
        timezone: 'UTC'
      });

      this.jobs.set(testSuiteId, job);
      
      console.log(`✅ Scheduled test suite ${testSuiteId} with cron: ${scheduleConfig.cron}`);
      return true;
    } catch (error) {
      console.error(`❌ Error scheduling test suite ${testSuiteId}:`, error);
      throw error;
    }
  }

  async unscheduleTestSuite(testSuiteId) {
    try {
      if (this.jobs.has(testSuiteId)) {
        this.jobs.get(testSuiteId).stop();
        this.jobs.delete(testSuiteId);
        console.log(`✅ Unscheduled test suite: ${testSuiteId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error unscheduling test suite ${testSuiteId}:`, error);
      throw error;
    }
  }

  async executeScheduledTestSuite(testSuiteId, scheduleConfig) {
    try {
      const testSuites = await fileStorage.getTestSuites();
      const testSuite = testSuites.find(ts => ts._id === testSuiteId || ts.id === testSuiteId);
      
      if (!testSuite) {
        console.error(`❌ Test suite not found: ${testSuiteId}`);
        return;
      }

      // Load environment config similar to manual Run Test Suite
      let environmentConfig = null;
      try {
        const environments = await fileStorage.getEnvironments();
        environmentConfig = environments.find(env => 
          env._id === scheduleConfig.environmentId ||
          env.id === scheduleConfig.environmentId ||
          env.name === scheduleConfig.environmentId
        ) || null;
      } catch (envErr) {
        console.log('⚠️ Failed to load environment for scheduled run:', envErr.message);
      }

      // Build execution config aligned with manual execution
      const executionConfig = {
        executionMode: 'sequential',
        workers: scheduleConfig.workers || 1,
        useGlobalLogin: false,
        environment: (environmentConfig && (environmentConfig.name || environmentConfig.key)) || 'test',
        browser: 'chromium',
        headless: scheduleConfig.headless !== false,
        tags: [],
        parallel: false
      };

      console.log(`🚀 Executing scheduled test suite: ${testSuite.name}`);
      
      // Execute the test suite with schedule configuration and environment
      const executionResult = await this.testSuiteExecutor.executeTestSuite(
        testSuite,
        executionConfig,
        environmentConfig,
        null
      );

      console.log(`✅ Scheduled execution completed for: ${testSuite.name}`, {
        status: executionResult.status,
        executionId: executionResult.executionId
      });

    } catch (error) {
      console.error(`❌ Error executing scheduled test suite ${testSuiteId}:`, error);
    }
  }

  getActiveSchedules() {
    const schedules = [];
    for (const [testSuiteId, job] of this.jobs.entries()) {
      schedules.push({
        testSuiteId,
        isRunning: job.running,
        nextRun: job.nextDate ? job.nextDate().toISOString() : null
      });
    }
    return schedules;
  }

  async updateSchedule(testSuiteId, scheduleConfig) {
    try {
      // Update the test suite with new schedule
      const testSuites = await fileStorage.getTestSuites();
      const testSuiteIndex = testSuites.findIndex(ts => ts._id === testSuiteId || ts.id === testSuiteId);
      
      if (testSuiteIndex === -1) {
        throw new Error('Test suite not found');
      }

      testSuites[testSuiteIndex].schedule = scheduleConfig;
      await fileStorage.saveTestSuites(testSuites);

      // Reschedule the job
      if (scheduleConfig.enabled) {
        await this.scheduleTestSuite(testSuiteId, scheduleConfig);
      } else {
        await this.unscheduleTestSuite(testSuiteId);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error updating schedule for test suite ${testSuiteId}:`, error);
      throw error;
    }
  }

  async deleteSchedule(testSuiteId) {
    try {
      // Remove schedule from test suite
      const testSuites = await fileStorage.getTestSuites();
      const testSuiteIndex = testSuites.findIndex(ts => ts._id === testSuiteId || ts.id === testSuiteId);
      
      if (testSuiteIndex !== -1) {
        delete testSuites[testSuiteIndex].schedule;
        await fileStorage.saveTestSuites(testSuites);
      }

      // Stop and remove the job
      await this.unscheduleTestSuite(testSuiteId);
      
      return true;
    } catch (error) {
      console.error(`❌ Error deleting schedule for test suite ${testSuiteId}:`, error);
      throw error;
    }
  }
}

module.exports = new SchedulerService();
