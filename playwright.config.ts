import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Playwright Test Configuration
 * Production-ready configuration with comprehensive settings
 */
export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        suiteTitle: 'Playwright Test Automation Framework',
        detail: true,
        screenshot: true,
        trace: true,
      },
    ],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to automatically prefix all navigation URLs
    baseURL: process.env.BASE_URL || 'https://the-internet.herokuapp.com',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Global test timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Viewport settings
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Accept downloads
    acceptDownloads: true,

    // Locale
    locale: 'en-US',

    // Timezone
    timezoneId: 'America/New_York',

    // Color scheme
    colorScheme: 'light',

    // Geolocation
    geolocation: { longitude: -74.0059, latitude: 40.7128 }, // New York

    // Permissions
    permissions: ['geolocation'],

    // Storage state for authentication
    // storageState: 'auth.json', // Uncomment for persistent auth
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Use Google Chrome instead of Chromium
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Microsoft Edge
    {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },

    // Google Chrome Beta
    {
      name: 'Google Chrome Beta',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome-beta',
      },
    },

    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },

    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // API tests project
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        // Configure API testing
        extraHTTPHeaders: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./src/utils/global-setup.ts'),
  globalTeardown: require.resolve('./src/utils/global-teardown.ts'),

  // Run your local dev server before starting the tests (commented out for external testing)
  // webServer: {
  //   command: 'npm run start:test-server',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  // },

  // Test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      threshold: 0.2,
    },
    toMatchSnapshot: {
      threshold: 0.2,
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Preserve output directory
  preserveOutput: 'always',

  // Metadata
  metadata: {
    'Test Framework': 'Playwright',
    Language: 'TypeScript',
    Environment: process.env.NODE_ENV || 'test',
    Build: process.env.BUILD_NUMBER || '1.0.0',
    'Browser Versions': 'Latest Stable',
  },
});
