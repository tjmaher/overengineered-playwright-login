/**
 * Login Test Scenarios
 * Comprehensive test coverage for login functionality
 * Includes positive, negative, and edge case scenarios
 */

import { test, expect, TestDataHelper, TestContextHelper } from '../../src/fixtures/test-fixtures';
import { INVALID_USERS, EDGE_CASE_DATA } from '../../src/data/credentials';

test.describe('Login Functionality', () => {
  test.beforeEach(async ({ navigateToLogin }) => {
    await navigateToLogin();
  });

  test.describe('Positive Login Tests', () => {
    test('should successfully login with valid credentials @smoke', async ({
      loginPage,
      validCredentials,
      testStrings,
    }) => {
      await test.step('Enter valid credentials', async () => {
        await loginPage.enterUsername(validCredentials.username);
        await loginPage.enterPassword(validCredentials.password);
      });

      await test.step('Submit login form', async () => {
        await loginPage.clickLoginButton();
      });

      await test.step('Validate successful login', async () => {
        await loginPage.validateSuccessfulLogin();
        expect(await loginPage.getCurrentUrl()).toContain('/secure');
      });
    });

    test('should login successfully using Enter key submission', async ({
      loginPage,
      validCredentials,
    }) => {
      await test.step('Fill credentials and submit via Enter', async () => {
        await loginPage.enterUsername(validCredentials.username);
        await loginPage.enterPassword(validCredentials.password);
        await loginPage.submitViaEnterKey();
      });

      await test.step('Validate successful login', async () => {
        await loginPage.validateSuccessfulLogin();
      });
    });

    test('should maintain login state after page refresh', async ({
      loginPage,
      validCredentials,
      page,
    }) => {
      await test.step('Login successfully', async () => {
        await loginPage.loginWithValidCredentials(validCredentials);
      });

      await test.step('Refresh page and validate session', async () => {
        await page.reload();
        expect(await page.url()).toContain('/secure');
      });
    });
  });

  test.describe('Negative Login Tests', () => {
    test('should show error for invalid username', async ({ loginPage, testStrings }) => {
      const invalidCreds = TestDataHelper.getInvalidUser('invalidUsername');

      await test.step('Enter invalid username with valid password', async () => {
        await loginPage.login(invalidCreds);
      });

      await test.step('Validate error message', async () => {
        await loginPage.validateFailedLogin(testStrings.alerts.invalidUsername);
        expect(await loginPage.getCurrentUrl()).toContain('/login');
      });
    });

    test('should show error for invalid password', async ({ loginPage, testStrings }) => {
      const invalidCreds = TestDataHelper.getInvalidUser('invalidPassword');

      await test.step('Enter valid username with invalid password', async () => {
        await loginPage.login(invalidCreds);
      });

      await test.step('Validate error message', async () => {
        await loginPage.validateFailedLogin(testStrings.alerts.invalidPassword);
      });
    });

    test('should show error for empty username', async ({ loginPage, testStrings }) => {
      const invalidCreds = TestDataHelper.getInvalidUser('emptyUsername');

      await test.step('Submit with empty username', async () => {
        await loginPage.login(invalidCreds);
      });

      await test.step('Validate error message', async () => {
        await loginPage.validateFailedLogin(testStrings.alerts.emptyUsername);
      });
    });

    test('should show error for empty password', async ({ loginPage, testStrings }) => {
      const invalidCreds = TestDataHelper.getInvalidUser('emptyPassword');

      await test.step('Submit with empty password', async () => {
        await loginPage.login(invalidCreds);
      });

      await test.step('Validate error message', async () => {
        await loginPage.validateFailedLogin(testStrings.alerts.emptyPassword);
      });
    });

    test('should show error for both empty fields', async ({ loginPage, testStrings }) => {
      const invalidCreds = TestDataHelper.getInvalidUser('bothEmpty');

      await test.step('Submit with both fields empty', async () => {
        await loginPage.login(invalidCreds);
      });

      await test.step('Validate error message', async () => {
        await loginPage.validateFailedLogin(testStrings.alerts.blankCredentials);
      });
    });

    test('should handle whitespace-only credentials', async ({ loginPage, testStrings }) => {
      const whitespaceCreds = TestDataHelper.getInvalidUser('whitespaceUsername');

      await test.step('Submit with whitespace username', async () => {
        await loginPage.login(whitespaceCreds);
      });

      await test.step('Validate error message', async () => {
        await loginPage.validateFailedLogin(testStrings.alerts.invalidUsername);
      });
    });
  });

  test.describe('Edge Case Tests', () => {
    test('should handle very long username', async ({ loginPage }) => {
      await test.step('Enter extremely long username', async () => {
        await loginPage.enterUsername(EDGE_CASE_DATA.longUsername);
        await loginPage.enterPassword('validPassword123!');
        await loginPage.clickLoginButton();
      });

      await test.step('Validate system handles gracefully', async () => {
        await loginPage.isAlertDisplayed();
        // System should not crash
        expect(await loginPage.getCurrentUrl()).toContain('/login');
      });
    });

    test('should handle special characters in credentials', async ({ loginPage }) => {
      await test.step('Enter special characters', async () => {
        await loginPage.enterUsername(EDGE_CASE_DATA.specialCharsUsername);
        await loginPage.enterPassword(EDGE_CASE_DATA.specialCharsPassword);
        await loginPage.clickLoginButton();
      });

      await test.step('Validate graceful handling', async () => {
        // Should show login error, not crash
        await loginPage.isAlertDisplayed();
      });
    });

    test('should handle SQL injection attempts', async ({ loginPage }) => {
      const sqlInjectionCreds = EDGE_CASE_DATA.sqlInjection;

      await test.step('Attempt SQL injection', async () => {
        await loginPage.enterUsername(sqlInjectionCreds.username);
        await loginPage.enterPassword(sqlInjectionCreds.password);
        await loginPage.clickLoginButton();
      });

      await test.step('Validate security - no unauthorized access', async () => {
        // Should not grant access with SQL injection
        expect(await loginPage.getCurrentUrl()).not.toContain('/secure');
        await loginPage.isAlertDisplayed();
      });
    });

    test('should handle XSS attempts', async ({ loginPage, page }) => {
      const xssCreds = EDGE_CASE_DATA.xssPayload;

      await test.step('Attempt XSS injection', async () => {
        await loginPage.enterUsername(xssCreds.username);
        await loginPage.enterPassword(xssCreds.password);
        await loginPage.clickLoginButton();
      });

      await test.step('Validate XSS prevention', async () => {
        // Check no alert dialog appeared (XSS was blocked)
        const dialogPromise = page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
        const dialog = await dialogPromise;
        expect(dialog).toBeNull();
      });
    });

    test('should handle unicode characters', async ({ loginPage }) => {
      const unicodeCreds = EDGE_CASE_DATA.unicodeChars;

      await test.step('Enter unicode characters', async () => {
        await loginPage.enterUsername(unicodeCreds.username);
        await loginPage.enterPassword(unicodeCreds.password);
        await loginPage.clickLoginButton();
      });

      await test.step('Validate unicode handling', async () => {
        // System should handle unicode gracefully without crashing
        expect(await loginPage.getCurrentUrl()).toContain('/login');
      });
    });
  });

  test.describe('User Experience Tests', () => {
    test('should support keyboard navigation', async ({ loginPage }) => {
      await test.step('Test Tab navigation', async () => {
        await loginPage.testKeyboardNavigation();
      });

      await test.step('Validate form accessibility', async () => {
        await loginPage.validateAccessibility();
      });
    });

    test('should validate form field states', async ({ loginPage }) => {
      const formState = await loginPage.validateFormState();

      expect(formState.isUsernameRequired).toBeDefined();
      expect(formState.isPasswordRequired).toBeDefined();
      expect(formState.isFormValid).toBe(false); // Empty form should be invalid
    });

    test('should support different typing patterns', async ({ loginPage, validCredentials }) => {
      await test.step('Test fast typing', async () => {
        await loginPage.simulateUserBehavior('fast');
        await loginPage.clickLoginButton();
        await loginPage.validateSuccessfulLogin();
      });
    });

    test('should handle erratic user behavior', async ({ loginPage, validCredentials }) => {
      await test.step('Test erratic typing with corrections', async () => {
        await loginPage.simulateUserBehavior('erratic');
        await loginPage.clickLoginButton();
        await loginPage.validateSuccessfulLogin();
      });
    });
  });

  test.describe('Security Tests', () => {
    test('should not expose password in DOM', async ({ loginPage, validCredentials }) => {
      await test.step('Enter password', async () => {
        await loginPage.enterPassword(validCredentials.password);
      });

      await test.step('Validate password is masked', async () => {
        const passwordElement = loginPage.page.locator('#password');
        const inputType = await passwordElement.getAttribute('type');
        expect(inputType).toBe('password');
      });
    });

    test('should not store sensitive data in browser history', async ({
      page,
      loginPage,
      validCredentials,
    }) => {
      await test.step('Login and check history', async () => {
        await loginPage.loginWithValidCredentials(validCredentials);

        // Navigate back to check if password is retained (it shouldn't be)
        await page.goBack();

        const retainedPassword = await loginPage.getPassword();
        expect(retainedPassword).toBe(''); // Password should not be retained
      });
    });
  });

  test.describe('Performance Tests', () => {
    test('should login within acceptable time limits', async ({ loginPage, validCredentials }) => {
      const startTime = Date.now();

      await test.step('Measure login performance', async () => {
        await loginPage.loginWithValidCredentials(validCredentials);

        const loginTime = Date.now() - startTime;
        expect(loginTime).toBeLessThan(5000); // Should complete within 5 seconds

        console.info(`Login completed in ${loginTime}ms`);
      });
    });
  });
});

test.describe('Login Page Structure and Content', () => {
  test('should display correct page elements and text @smoke', async ({
    loginPage,
    testStrings,
  }) => {
    await loginPage.goto();

    await test.step('Validate page structure', async () => {
      await loginPage.validatePageStructure();
    });

    await test.step('Validate page content', async () => {
      const heading = await loginPage.getPageHeading();
      expect(heading).toBe(testStrings.loginPage.headingText);

      const instruction = await loginPage.getInstructionText();
      expect(instruction).toBe(testStrings.loginPage.instructionText);
    });

    await test.step('Validate form labels', async () => {
      const usernameLabel = await loginPage.getUsernameLabel();
      expect(usernameLabel).toBe(testStrings.loginPage.usernameLabel);

      const passwordLabel = await loginPage.getPasswordLabel();
      expect(passwordLabel).toBe(testStrings.loginPage.passwordLabel);
    });
  });
});
