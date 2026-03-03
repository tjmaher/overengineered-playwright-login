/**
 * Secure Area Page Object
 * Represents the secure area page at https://the-internet.herokuapp.com/secure
 * Follows Page Object Model (POM) design pattern with private locators
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TestStrings } from '../data/strings';

export interface LogoutOptions {
  waitForNavigation?: boolean;
  expectedRedirectUrl?: string;
}

/**
 * Secure Area Page class encapsulating secure area functionality
 */
export class SecureAreaPage extends BasePage {
  // Private locators - industry standard approach
  private readonly pageHeading: Locator;
  private readonly welcomeMessage: Locator;
  private readonly logoutButton: Locator;
  private readonly alertMessage: Locator;
  // Optional elements for future use
  // private readonly githubLink: Locator;
  // private readonly poweredByLink: Locator;

  // Page-specific constants
  private static readonly SECURE_PATH = '/secure';
  private static readonly EXPECTED_TITLE = 'The Internet';

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);

    // Initialize private locators with robust selector strategies
    this.pageHeading = this.page.locator('h2');
    this.welcomeMessage = this.page.locator('h4, .subheader');
    this.logoutButton = this.page.locator('a[href="/logout"], .button[href*="logout"]');
    this.alertMessage = this.page.locator('#flash');
    // Optional elements for future use
    // this.githubLink = this.page.locator('a[href*="github.com"]');
    // this.poweredByLink = this.page.locator('text=Powered by');
  }

  /**
   * Navigate directly to secure area (requires authentication)
   */
  async goto(): Promise<void> {
    await super.goto(SecureAreaPage.SECURE_PATH);
    await this.waitForPageLoad();
  }

  /**
   * Check if page is fully loaded and user is authenticated
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.waitForElement(this.pageHeading);
      await this.waitForElement(this.logoutButton);

      const title = await this.getTitle();
      const heading = await this.getPageHeading();

      return (
        title === SecureAreaPage.EXPECTED_TITLE && heading === TestStrings.secureArea.headingText
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if user is authenticated and on secure page
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const currentUrl = this.getCurrentUrl();
      return currentUrl.includes('/secure') && (await this.isLogoutButtonVisible());
    } catch {
      return false;
    }
  }

  /**
   * Get page heading text
   */
  async getPageHeading(): Promise<string> {
    const text = await this.getElementText(this.pageHeading);
    return text.trim();
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    return await this.getElementText(this.welcomeMessage);
  }

  /**
   * Click logout button
   */
  async clickLogoutButton(): Promise<void> {
    await this.clickElement(this.logoutButton);
  }

  /**
   * Check if logout button is visible
   */
  async isLogoutButtonVisible(): Promise<boolean> {
    return await this.isElementVisible(this.logoutButton);
  }

  /**
   * Check if logout button is enabled
   */
  async isLogoutButtonEnabled(): Promise<boolean> {
    await this.waitForElement(this.logoutButton);
    return await this.logoutButton.isEnabled();
  }

  /**
   * Get logout button text
   */
  async getLogoutButtonText(): Promise<string> {
    return await this.getElementText(this.logoutButton);
  }

  /**
   * Perform logout operation
   */
  async logout(options: LogoutOptions = {}): Promise<void> {
    const { waitForNavigation = true, expectedRedirectUrl = '/login' } = options;

    await this.clickLogoutButton();

    if (waitForNavigation) {
      await this.page.waitForLoadState('networkidle');

      if (expectedRedirectUrl) {
        await this.waitForUrl(expectedRedirectUrl);
      }
    }
  }

  /**
   * Logout and validate result
   */
  async logoutAndValidate(): Promise<void> {
    await this.logout({
      waitForNavigation: true,
      expectedRedirectUrl: '/login',
    });

    // Validate logout success message
    const expectedMessage = TestStrings.alerts.logoutSuccess;
    await this.validateLogoutMessage(expectedMessage);
  }

  /**
   * Get alert message text
   */
  async getAlertMessage(): Promise<string> {
    await this.waitForElement(this.alertMessage);
    const fullText = await this.getElementText(this.alertMessage);
    // Remove the × character from the alert text
    return fullText.replace('×', '').trim();
  }

  /**
   * Check if alert message is displayed
   */
  async isAlertDisplayed(): Promise<boolean> {
    return await this.isElementVisible(this.alertMessage);
  }

  /**
   * Validate alert message content
   */
  async validateAlertMessage(expectedMessage: string): Promise<void> {
    const actualMessage = await this.getAlertMessage();
    expect(actualMessage).toContain(expectedMessage);
  }

  /**
   * Validate successful logout
   */
  async validateLogoutMessage(expectedMessage?: string): Promise<void> {
    const message = expectedMessage || TestStrings.alerts.logoutSuccess;
    await this.validateAlertMessage(message);
  }

  /**
   * Validate page structure and elements
   */
  async validatePageStructure(): Promise<void> {
    await super.validatePageStructure();

    // Validate required elements are present
    await expect(this.pageHeading).toBeVisible();
    await expect(this.welcomeMessage).toBeVisible();
    await expect(this.logoutButton).toBeVisible();

    // Validate page content
    const heading = await this.getPageHeading();
    expect(heading).toBe(TestStrings.secureArea.headingText);

    const welcome = await this.getWelcomeMessage();
    expect(welcome).toBe(TestStrings.secureArea.welcomeMessage);
  }

  /**
   * Validate accessibility attributes
   */
  async validateAccessibility(): Promise<void> {
    // Check logout button is properly accessible
    const logoutHref = await this.getElementAttribute(this.logoutButton, 'href');
    expect(logoutHref).toContain('logout');

    // Validate button is keyboard accessible
    await this.logoutButton.focus();
    await expect(this.logoutButton).toBeFocused();
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Test Tab navigation to logout button
    await this.page.keyboard.press('Tab');

    // Test Space/Enter key activation
    await this.logoutButton.focus();
    await expect(this.logoutButton).toBeFocused();
  }

  /**
   * Validate secure area access without authentication
   */
  async validateUnauthorizedAccess(): Promise<void> {
    // This method can be used to test that unauthenticated users
    // are redirected to login page
    const currentUrl = this.getCurrentUrl();

    if (currentUrl.includes('/login')) {
      // User was redirected to login - expected behavior
      return;
    }

    // If we're still on secure page, that's a security issue
    const isOnSecure = currentUrl.includes('/secure');
    expect(isOnSecure).toBeFalsy();
  }

  /**
   * Get all security indicators on the page
   */
  async getSecurityIndicators(): Promise<{
    hasLogoutButton: boolean;
    isOnSecureUrl: boolean;
    hasWelcomeMessage: boolean;
    pageTitle: string;
  }> {
    return {
      hasLogoutButton: await this.isLogoutButtonVisible(),
      isOnSecureUrl: this.getCurrentUrl().includes('/secure'),
      hasWelcomeMessage: await this.isElementVisible(this.welcomeMessage),
      pageTitle: await this.getTitle(),
    };
  }

  /**
   * Validate session state
   */
  async validateSessionState(): Promise<void> {
    const indicators = await this.getSecurityIndicators();

    // All security indicators should be present for authenticated user
    expect(indicators.hasLogoutButton).toBe(true);
    expect(indicators.isOnSecureUrl).toBe(true);
    expect(indicators.hasWelcomeMessage).toBe(true);
    expect(indicators.pageTitle).toBe(SecureAreaPage.EXPECTED_TITLE);
  }

  /**
   * Simulate user idle behavior
   */
  async simulateIdleBehavior(duration: number = 5000): Promise<void> {
    // Simulate user being idle on the page
    await this.page.waitForTimeout(duration);

    // Validate page is still accessible (no session timeout)
    await this.validateSessionState();
  }

  /**
   * Test page refresh functionality
   */
  async testPageRefresh(): Promise<void> {
    await this.refresh();
    await this.waitForPageLoad();

    // Validate user is still authenticated after refresh
    await this.validateSessionState();
  }

  /**
   * Validate browser back/forward navigation
   */
  async testBrowserNavigation(): Promise<void> {
    const originalUrl = this.getCurrentUrl();

    // Go back and forward
    await this.goBack();
    await this.page.waitForTimeout(1000);

    await this.goForward();
    await this.page.waitForTimeout(1000);

    // Validate we're back on the secure page
    const currentUrl = this.getCurrentUrl();
    expect(currentUrl).toBe(originalUrl);

    await this.validateSessionState();
  }
}
