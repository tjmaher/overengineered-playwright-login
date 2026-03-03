/**
 * Base Page Object
 * Industry standard: Common functionality shared across all page objects
 * Follows Page Object Model (POM) design pattern
 */

import { Page, Locator, expect } from '@playwright/test';

export interface PageLoadOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
}

export interface WaitForOptions {
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  quality?: number;
  type?: 'png' | 'jpeg';
}

/**
 * Base page class with common functionality
 */
export abstract class BasePage {
  public page: Page;
  public readonly baseUrl: string;
  
  // Common locators that exist on most pages
  protected readonly pageTitle: Locator;
  protected readonly loadingSpinner: Locator;
  protected readonly errorMessage: Locator;
  protected readonly successMessage: Locator;

  constructor(page: Page, baseUrl = '') {
    this.page = page;
    this.baseUrl = baseUrl || process.env.BASE_URL || '';
    
    // Initialize common locators
    this.pageTitle = this.page.locator('title');
    this.loadingSpinner = this.page.locator('[data-testid="loading"], .loading, .spinner');
    this.errorMessage = this.page.locator('[data-testid="error"], .error, .alert-danger');
    this.successMessage = this.page.locator('[data-testid="success"], .success, .alert-success');
  }

  /**
   * Navigate to a specific path
   */
  async goto(path = '', options: PageLoadOptions = {}): Promise<void> {
    const url = this.baseUrl + path;
    await this.page.goto(url, {
      waitUntil: options.waitUntil || 'domcontentloaded',
      timeout: options.timeout || 30000,
    });
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(timeout = 30000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(locator: Locator, options: WaitForOptions = {}): Promise<void> {
    await locator.waitFor({
      state: options.state || 'visible',
      timeout: options.timeout || 10000,
    });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementToHide(locator: Locator, timeout = 10000): Promise<void> {
    await locator.waitFor({
      state: 'hidden',
      timeout,
    });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element exists in DOM
   */
  async isElementPresent(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'attached', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get element text content
   */
  async getElementText(locator: Locator): Promise<string> {
    await this.waitForElement(locator);
    return await locator.textContent() || '';
  }

  /**
   * Get element attribute value
   */
  async getElementAttribute(locator: Locator, attributeName: string): Promise<string | null> {
    await this.waitForElement(locator);
    return await locator.getAttribute(attributeName);
  }

  /**
   * Click element with enhanced error handling
   */
  async clickElement(locator: Locator, options: { timeout?: number; force?: boolean } = {}): Promise<void> {
    await this.waitForElement(locator);
    await locator.click({
      timeout: options.timeout || 10000,
      force: options.force || false,
    });
  }

  /**
   * Double click element
   */
  async doubleClickElement(locator: Locator): Promise<void> {
    await this.waitForElement(locator);
    await locator.dblclick();
  }

  /**
   * Right click element
   */
  async rightClickElement(locator: Locator): Promise<void> {
    await this.waitForElement(locator);
    await locator.click({ button: 'right' });
  }

  /**
   * Fill input field with enhanced validation
   */
  async fillInput(locator: Locator, value: string, options: { clear?: boolean } = {}): Promise<void> {
    await this.waitForElement(locator);
    
    if (options.clear !== false) {
      await locator.fill(''); // Clear existing value
    }
    
    await locator.fill(value);
    
    // Verify the value was entered correctly
    const actualValue = await locator.inputValue();
    if (actualValue !== value) {
      throw new Error(`Failed to fill input. Expected: "${value}", Actual: "${actualValue}"`);
    }
  }

  /**
   * Type text with delay
   */
  async typeText(locator: Locator, text: string, delay = 100): Promise<void> {
    await this.waitForElement(locator);
    await locator.type(text, { delay });
  }

  /**
   * Clear input field
   */
  async clearInput(locator: Locator): Promise<void> {
    await this.waitForElement(locator);
    await locator.fill('');
  }

  /**
   * Select dropdown option by value
   */
  async selectOption(locator: Locator, value: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.selectOption({ value });
  }

  /**
   * Select dropdown option by text
   */
  async selectOptionByText(locator: Locator, text: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.selectOption({ label: text });
  }

  /**
   * Hover over element
   */
  async hoverElement(locator: Locator): Promise<void> {
    await this.waitForElement(locator);
    await locator.hover();
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(options: ScreenshotOptions = {}): Promise<Buffer> {
    const screenshotOptions: any = {
      fullPage: options.fullPage || false,
      type: options.type || 'png',
    };
    
    if (options.quality !== undefined) {
      screenshotOptions.quality = options.quality;
    }
    
    if (options.clip !== undefined) {
      screenshotOptions.clip = options.clip;
    }
    
    if (options.path !== undefined) {
      screenshotOptions.path = options.path;
    }
    
    return await this.page.screenshot(screenshotOptions);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete(timeout = 30000): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // Loading spinner might not be present, which is fine
    }
  }

  /**
   * Refresh page
   */
  async refresh(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /**
   * Navigate back
   */
  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'networkidle' });
  }

  /**
   * Navigate forward
   */
  async goForward(): Promise<void> {
    await this.page.goForward({ waitUntil: 'networkidle' });
  }

  /**
   * Check if current page matches expected URL pattern
   */
  async isOnPage(urlPattern: string | RegExp): Promise<boolean> {
    const currentUrl = this.getCurrentUrl();
    
    if (typeof urlPattern === 'string') {
      return currentUrl.includes(urlPattern);
    }
    
    return urlPattern.test(currentUrl);
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForUrl(urlPattern: string | RegExp, timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      (pattern) => {
        const url = window.location.href;
        if (typeof pattern === 'string') {
          return url.includes(pattern);
        }
        return new RegExp(pattern).test(url);
      },
      urlPattern,
      { timeout }
    );
  }

  /**
   * Execute JavaScript in browser context
   */
  async executeScript<T>(script: string | Function, ...args: any[]): Promise<T> {
    return await this.page.evaluate(script as any, ...args);
  }

  /**
   * Handle alerts/dialogs
   */
  async acceptAlert(): Promise<void> {
    this.page.on('dialog', dialog => dialog.accept());
  }

  async dismissAlert(): Promise<void> {
    this.page.on('dialog', dialog => dialog.dismiss());
  }

  /**
   * Get alert text
   */
  async getAlertText(): Promise<string> {
    return new Promise((resolve) => {
      this.page.once('dialog', (dialog) => {
        resolve(dialog.message());
        dialog.accept();
      });
    });
  }

  /**
   * Validate page structure and common elements
   */
  async validatePageStructure(): Promise<void> {
    // This can be overridden by child classes for specific validations
    await expect(this.page).toHaveTitle(/.+/); // Page should have a title
  }

  /**
   * Log page information for debugging
   */
  async logPageInfo(): Promise<void> {
    const title = await this.getTitle();
    const url = this.getCurrentUrl();
    
    console.log(`Page Info - Title: "${title}", URL: "${url}"`);
  }

  /**
   * Abstract method to be implemented by child classes
   * for page-specific validations
   */
  abstract isLoaded(): Promise<boolean>;
}