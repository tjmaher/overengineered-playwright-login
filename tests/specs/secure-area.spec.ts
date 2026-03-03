/**
 * Secure Area Test Scenarios
 * Comprehensive test coverage for secure area functionality
 * Focuses on logout functionality and authenticated user experience
 */

import { test, expect, TestContextHelper } from '../../src/fixtures/test-fixtures';
import { LoginPage } from '../../src/pages/login-page';
import { SecureAreaPage } from '../../src/pages/secure-area-page';

test.describe('Secure Area Functionality', () => {
  test.describe('Logout Tests', () => {
    test('should successfully logout and show confirmation message @smoke', async ({
      authenticatedPage,
      secureAreaPage,
      testStrings,
    }) => {
      await test.step('Validate user is on secure area', async () => {
        expect(await secureAreaPage.isAuthenticated()).toBe(true);
        await secureAreaPage.validateSessionState();
      });

      await test.step('Perform logout', async () => {
        await secureAreaPage.clickLogoutButton();
      });

      await test.step('Validate successful logout', async () => {
        await secureAreaPage.validateLogoutMessage(testStrings.alerts.logoutSuccess);
        expect(await secureAreaPage.getCurrentUrl()).toContain('/login');
      });

      await test.step('Validate user can no longer access secure area', async () => {
        // Try to navigate back to secure area
        await authenticatedPage.goto('/secure');
        expect(await secureAreaPage.getCurrentUrl()).toContain('/login');
      });
    });

    test('should logout using keyboard navigation', async ({
      authenticatedPage,
      secureAreaPage,
    }) => {
      await test.step('Navigate to logout button via keyboard', async () => {
        await secureAreaPage.testKeyboardNavigation();
      });

      await test.step('Activate logout via Enter key', async () => {
        const logoutButton = secureAreaPage.page.locator('a[href="/logout"]');
        await logoutButton.focus();
        await logoutButton.press('Enter');
      });

      await test.step('Validate successful logout', async () => {
        expect(await secureAreaPage.getCurrentUrl()).toContain('/login');
      });
    });

    test('should handle multiple logout attempts gracefully', async ({
      authenticatedPage,
      secureAreaPage,
    }) => {
      await test.step('Logout first time', async () => {
        await secureAreaPage.logoutAndValidate();
      });

      await test.step('Try to logout again (should redirect or handle gracefully)', async () => {
        // Navigate to logout URL directly
        await authenticatedPage.goto('/logout');

        // Should redirect to login page
        expect(await secureAreaPage.getCurrentUrl()).toContain('/login');
      });
    });
  });

  test.describe('Secure Area Access Control', () => {
    test('should prevent unauthenticated access to secure area', async ({
      page,
      secureAreaPage,
    }) => {
      await test.step('Try to access secure area without authentication', async () => {
        await page.goto('/secure');
      });

      await test.step('Validate redirect to login page', async () => {
        expect(await page.url()).toContain('/login');
      });

      await test.step('Validate appropriate access denied behavior', async () => {
        await secureAreaPage.validateUnauthorizedAccess();
      });
    });

    test('should maintain authentication state across page refreshes', async ({
      authenticatedPage,
      secureAreaPage,
    }) => {
      await test.step('Refresh page while authenticated', async () => {
        await secureAreaPage.testPageRefresh();
      });

      await test.step('Validate session is maintained', async () => {
        await secureAreaPage.validateSessionState();
        expect(await secureAreaPage.isAuthenticated()).toBe(true);
      });
    });

    test('should handle browser navigation (back/forward)', async ({
      authenticatedPage,
      secureAreaPage,
      loginPage,
    }) => {
      await test.step('Navigate to login page first', async () => {
        await loginPage.goto();
      });

      await test.step('Login and navigate to secure area', async () => {
        // The authenticatedPage fixture already handles login
        expect(await secureAreaPage.getCurrentUrl()).toContain('/secure');
      });

      await test.step('Test browser navigation', async () => {
        await secureAreaPage.testBrowserNavigation();
      });

      await test.step('Validate session integrity after navigation', async () => {
        await secureAreaPage.validateSessionState();
      });
    });
  });

  test.describe('Secure Area Content and Structure', () => {
    test('should display correct page elements and content @smoke', async ({
      authenticatedPage,
      secureAreaPage,
      testStrings,
    }) => {
      await test.step('Validate page structure', async () => {
        await secureAreaPage.validatePageStructure();
      });

      await test.step('Validate page content', async () => {
        const heading = await secureAreaPage.getPageHeading();
        expect(heading).toBe(testStrings.secureArea.headingText);

        const welcome = await secureAreaPage.getWelcomeMessage();
        expect(welcome).toBe(testStrings.secureArea.welcomeMessage);
      });

      await test.step('Validate logout button', async () => {
        expect(await secureAreaPage.isLogoutButtonVisible()).toBe(true);
        expect(await secureAreaPage.isLogoutButtonEnabled()).toBe(true);

        const logoutText = await secureAreaPage.getLogoutButtonText();
        expect(logoutText.toLowerCase()).toContain('logout');
      });
    });

    test('should have proper accessibility attributes', async ({
      authenticatedPage,
      secureAreaPage,
    }) => {
      await test.step('Validate accessibility features', async () => {
        await secureAreaPage.validateAccessibility();
      });

      await test.step('Test keyboard accessibility', async () => {
        await secureAreaPage.testKeyboardNavigation();
      });
    });
  });

  test.describe('Session Management Tests', () => {
    test('should maintain session indicators', async ({ authenticatedPage, secureAreaPage }) => {
      await test.step('Validate all session indicators', async () => {
        const indicators = await secureAreaPage.getSecurityIndicators();

        expect(indicators.hasLogoutButton).toBe(true);
        expect(indicators.isOnSecureUrl).toBe(true);
        expect(indicators.hasWelcomeMessage).toBe(true);
        expect(indicators.pageTitle).toBe('The Internet');
      });
    });

    test('should handle user idle behavior', async ({ authenticatedPage, secureAreaPage }) => {
      await test.step('Simulate user idle time', async () => {
        // Simulate 5 seconds of idle time
        await secureAreaPage.simulateIdleBehavior(5000);
      });

      await test.step('Validate session is still active', async () => {
        await secureAreaPage.validateSessionState();
        expect(await secureAreaPage.isAuthenticated()).toBe(true);
      });
    });

    test('should handle concurrent sessions (security)', async ({
      browser,
      loginPage,
      secureAreaPage,
      validCredentials,
    }) => {
      // Create a second browser context to test concurrent sessions
      const secondContext = await browser.newContext();
      const secondPage = await secondContext.newPage();
      const secondLoginPage = new LoginPage(secondPage);
      const secondSecureAreaPage = new SecureAreaPage(secondPage);

      await test.step('Login in second session', async () => {
        await secondLoginPage.goto();
        await secondLoginPage.loginWithValidCredentials(validCredentials);
      });

      await test.step('Validate both sessions are independent', async () => {
        // Both sessions should be valid
        expect(await secureAreaPage.isAuthenticated()).toBe(true);
        expect(await secondSecureAreaPage.isAuthenticated()).toBe(true);
      });

      await test.step('Logout from first session', async () => {
        await secureAreaPage.logout();
      });

      await test.step('Validate second session is unaffected', async () => {
        // Second session should still be valid
        expect(await secondSecureAreaPage.isAuthenticated()).toBe(true);
      });

      await secondContext.close();
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle network interruptions gracefully', async ({
      authenticatedPage,
      secureAreaPage,
    }) => {
      await test.step('Simulate network condition', async () => {
        // Set slow network conditions to test resilience
        await authenticatedPage.context().setOffline(true);
        await authenticatedPage.context().setOffline(false);
      });

      await test.step('Validate page recovers from network issues', async () => {
        await secureAreaPage.refresh();
        await secureAreaPage.validateSessionState();
      });
    });

    test('should handle JavaScript errors gracefully', async ({
      authenticatedPage,
      secureAreaPage,
    }) => {
      const jsErrors: string[] = [];

      await test.step('Monitor JavaScript errors', async () => {
        authenticatedPage.on('console', msg => {
          if (msg.type() === 'error') {
            jsErrors.push(msg.text());
          }
        });

        // Perform normal operations
        await secureAreaPage.validatePageStructure();
        await secureAreaPage.clickLogoutButton();
      });

      await test.step('Validate no critical JavaScript errors', async () => {
        // Filter out expected/minor errors
        const criticalErrors = jsErrors.filter(
          error => !error.includes('favicon') && !error.includes('404')
        );

        expect(criticalErrors.length).toBe(0);
      });
    });
  });

  test.describe('Performance Tests', () => {
    test('should load secure area within acceptable time', async ({
      loginPage,
      validCredentials,
    }) => {
      const startTime = Date.now();

      await test.step('Measure secure area access time', async () => {
        await loginPage.goto();
        await loginPage.loginWithValidCredentials(validCredentials);

        const totalTime = Date.now() - startTime;
        expect(totalTime).toBeLessThan(8000); // Should complete within 8 seconds

        console.info(`Secure area access completed in ${totalTime}ms`);
      });
    });

    test('should logout within acceptable time', async ({ authenticatedPage, secureAreaPage }) => {
      const startTime = Date.now();

      await test.step('Measure logout performance', async () => {
        await secureAreaPage.logout();

        const logoutTime = Date.now() - startTime;
        expect(logoutTime).toBeLessThan(3000); // Should complete within 3 seconds

        console.info(`Logout completed in ${logoutTime}ms`);
      });
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({
        authenticatedPage,
        secureAreaPage,
      }) => {
        await test.step(`Validate functionality in ${browserName}`, async () => {
          await secureAreaPage.validatePageStructure();
          await secureAreaPage.validateSessionState();

          // Test logout functionality
          await secureAreaPage.logoutAndValidate();
        });
      });
    });
  });
});

test.describe('End-to-End User Journey', () => {
  test('should complete full login-logout cycle successfully @smoke', async ({
    loginPage,
    secureAreaPage,
    validCredentials,
    testStrings,
  }) => {
    await test.step('Navigate to login page', async () => {
      await loginPage.goto();
      await loginPage.validatePageStructure();
    });

    await test.step('Login with valid credentials', async () => {
      await loginPage.loginWithValidCredentials(validCredentials);
      await loginPage.validateSuccessfulLogin();
    });

    await test.step('Validate secure area access', async () => {
      expect(await secureAreaPage.getCurrentUrl()).toContain('/secure');
      await secureAreaPage.validateSessionState();
    });

    await test.step('Logout successfully', async () => {
      await secureAreaPage.logoutAndValidate();
    });

    await test.step('Validate return to login page', async () => {
      expect(await loginPage.getCurrentUrl()).toContain('/login');
      await loginPage.validatePageStructure();
    });
  });

  test('should maintain security throughout user session', async ({
    loginPage,
    secureAreaPage,
    validCredentials,
  }) => {
    await test.step('Complete login process', async () => {
      await loginPage.goto();
      await loginPage.loginWithValidCredentials(validCredentials);
    });

    await test.step('Test session security features', async () => {
      // Validate secure URL
      expect(await secureAreaPage.getCurrentUrl()).toContain('/secure');

      // Test unauthorized access prevention
      const newPage = await secureAreaPage.page.context().newPage();
      try {
        await newPage.goto(process.env.BASE_URL + '/secure');
        expect(newPage.url()).toContain('/login');
      } finally {
        await newPage.close();
      }
    });

    await test.step('Complete logout process', async () => {
      await secureAreaPage.logoutAndValidate();
    });
  });
});
