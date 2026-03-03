/**
 * Playwright Test Fixtures
 * Industry standard: Centralized test setup and dependency injection
 * Provides reusable page objects and test utilities
 */

import { test as baseTest, Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { SecureAreaPage } from '../pages/secure-area-page';
import {
  VALID_USERS,
  INVALID_USERS,
  CredentialsHelper,
  UserCredentials,
} from '../data/credentials';
import { TestStrings } from '../data/strings';

// Extend base test with custom fixtures
export interface TestFixtures {
  // Page Objects
  loginPage: LoginPage;
  secureAreaPage: SecureAreaPage;

  // Authentication Helpers
  authenticatedPage: Page; // Page that's already logged in
  validCredentials: UserCredentials;

  // Test Data
  testStrings: typeof TestStrings;
  credentialsHelper: typeof CredentialsHelper;

  // Utility Functions
  loginAsValidUser: () => Promise<void>;
  navigateToLogin: () => Promise<void>;
  takeScreenshotOnFailure: () => Promise<void>;
}

/**
 * Extended test with custom fixtures
 */
export const test = baseTest.extend<TestFixtures>({
  /**
   * Login Page fixture - provides fresh instance for each test
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * Secure Area Page fixture - provides fresh instance for each test
   */
  secureAreaPage: async ({ page }, use) => {
    const secureAreaPage = new SecureAreaPage(page);
    await use(secureAreaPage);
  },

  /**
   * Valid credentials fixture - provides standard valid user
   */
  validCredentials: async ({}, use) => {
    await use(VALID_USERS.standardUser);
  },

  /**
   * Test strings fixture - provides access to localized strings
   */
  testStrings: async ({}, use) => {
    await use(TestStrings);
  },

  /**
   * Credentials helper fixture - provides credential utilities
   */
  credentialsHelper: async ({}, use) => {
    await use(CredentialsHelper);
  },

  /**
   * Pre-authenticated page fixture - provides page already logged in
   */
  authenticatedPage: async ({ page, loginPage, validCredentials }, use) => {
    // Navigate to login page
    await loginPage.goto();

    // Validate page loaded
    await loginPage.isLoaded();

    // Login with valid credentials
    await loginPage.loginWithValidCredentials(validCredentials);

    // Validate successful login
    await loginPage.validateSuccessfulLogin();

    // Provide the authenticated page
    await use(page);
  },

  /**
   * Login helper fixture - provides function to login as valid user
   */
  loginAsValidUser: async ({ loginPage, validCredentials }, use) => {
    const loginAsValidUser = async (): Promise<void> => {
      await loginPage.goto();
      await loginPage.loginWithValidCredentials(validCredentials);
      await loginPage.validateSuccessfulLogin();
    };

    await use(loginAsValidUser);
  },

  /**
   * Navigation helper fixture - provides function to navigate to login
   */
  navigateToLogin: async ({ loginPage }, use) => {
    const navigateToLogin = async (): Promise<void> => {
      await loginPage.goto();
      await loginPage.validatePageStructure();
    };

    await use(navigateToLogin);
  },

  /**
   * Screenshot on failure fixture - automatically takes screenshot on test failure
   */
  takeScreenshotOnFailure: async ({ page }, use, testInfo) => {
    const takeScreenshot = async (): Promise<void> => {
      if (testInfo.status !== 'passed') {
        const screenshotPath = `screenshots/failure-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });

        // Attach screenshot to test report
        testInfo.attachments.push({
          name: 'failure-screenshot',
          path: screenshotPath,
          contentType: 'image/png',
        });
      }
    };

    await use(takeScreenshot);

    // Execute after test completion
    await takeScreenshot();
  },
});

/**
 * Specialized test variants for different scenarios
 */

/**
 * Test for smoke/critical path scenarios
 */
export const smokeTest = test.extend({
  // Add smoke test specific setup if needed
});

/**
 * Test for regression scenarios
 */
export const regressionTest = test.extend({
  // Add regression test specific setup if needed
});

/**
 * Test for API scenarios (if needed)
 */
export const apiTest = test.extend({
  // Add API test specific setup if needed
});

/**
 * Test for mobile scenarios
 */
export const mobileTest = test.extend({
  // Add mobile-specific setup
});

/**
 * Test for accessibility scenarios
 */
export const a11yTest = test.extend({
  // Add accessibility testing setup if needed
});

/**
 * Helper functions for test data management
 */
export class TestDataHelper {
  /**
   * Get test user by type
   */
  static getValidUser(userType: keyof typeof VALID_USERS = 'standardUser'): UserCredentials {
    return CredentialsHelper.getValidUser(userType);
  }

  /**
   * Get invalid credentials for negative testing
   */
  static getInvalidUser(userType: keyof typeof INVALID_USERS): Partial<UserCredentials> {
    return CredentialsHelper.getInvalidUser(userType);
  }

  /**
   * Generate random test data
   */
  static generateRandomCredentials(): UserCredentials {
    return CredentialsHelper.generateRandomCredentials();
  }
}

/**
 * Test context helper for debugging and reporting
 */
export class TestContextHelper {
  /**
   * Log test information
   */
  static logTestInfo(testInfo: any): void {
    console.info(`🧪 Running test: ${testInfo.title}`);
    console.info(`📝 Test file: ${testInfo.file}`);
    console.info(`🏷️  Project: ${testInfo.project?.name ?? 'default'}`);
  }

  /**
   * Create test step
   */
  static async step<T>(name: string, body: () => Promise<T>): Promise<T> {
    console.info(`📍 Step: ${name}`);
    const startTime = Date.now();

    try {
      const result = await body();
      const duration = Date.now() - startTime;
      console.info(`✅ Step completed: ${name} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Step failed: ${name} (${duration}ms)`, error);
      throw error;
    }
  }
}

// Export expect from Playwright for convenience
export { expect } from '@playwright/test';
