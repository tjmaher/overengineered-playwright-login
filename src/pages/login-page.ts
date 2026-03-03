/**
 * Login Page Object
 * Follows Page Object Model (POM) design pattern with private locators
 * Represents the login page at https://the-internet.herokuapp.com/login
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TestStrings } from '../data/strings';
import { UserCredentials } from '../data/credentials';

export interface LoginOptions {
  submit?: boolean;
  clearFields?: boolean;
  waitForNavigation?: boolean;
}

export interface LoginValidationOptions {
  expectSuccess?: boolean;
  expectedUrl?: string;
  expectedMessage?: string;
}

/**
 * Login Page class encapsulating login functionality
 */
export class LoginPage extends BasePage {
  // Private locators - industry standard approach to encapsulate implementation details
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly pageHeading: Locator;
  private readonly instructionText: Locator;
  private readonly alertMessage: Locator;
  private readonly usernameLabel: Locator;
  private readonly passwordLabel: Locator;
  // Optional elements for future use
  // private readonly poweredByLink: Locator;
  // private readonly githubLink: Locator;

  // Page-specific constants
  private static readonly LOGIN_PATH = '/login';
  private static readonly EXPECTED_TITLE = 'The Internet';

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);

    // Initialize private locators with multiple selector strategies for reliability    
    this.usernameInput = this.page.locator('#username');
    this.passwordInput = this.page.locator('#password');
    this.loginButton = this.page.locator('button[type="submit"], input[type="submit"]');
    this.pageHeading = this.page.locator('h2');
    this.instructionText = this.page.locator('h4');
    this.alertMessage = this.page.locator('#flash');
    this.usernameLabel = this.page.locator('label[for="username"]');
    this.passwordLabel = this.page.locator('label[for="password"]');
    // Optional elements for future use
    // this.poweredByLink = this.page.locator('text=Powered by');
    // this.githubLink = this.page.locator('a[href*="github.com"]');
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await super.goto(LoginPage.LOGIN_PATH);
    await this.waitForPageLoad();
  }

  /**
   * Check if page is fully loaded
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.waitForElement(this.usernameInput);
      await this.waitForElement(this.passwordInput);
      await this.waitForElement(this.loginButton);
      
      const title = await this.getTitle();
      return title === LoginPage.EXPECTED_TITLE;
    } catch {
      return false;
    }
  }

  /**
   * Enter username
   */
  async enterUsername(username: string, options: { clear?: boolean } = {}): Promise<void> {
    await this.fillInput(this.usernameInput, username, options);
  }

  /**
   * Enter password
   */
  async enterPassword(password: string, options: { clear?: boolean } = {}): Promise<void> {
    await this.fillInput(this.passwordInput, password, options);
  }

  /**
   * Click login button
   */
  async clickLoginButton(): Promise<void> {
    await this.clickElement(this.loginButton);
  }

  /**
   * Get current username value
   */
  async getUsername(): Promise<string> {
    return await this.usernameInput.inputValue();
  }

  /**
   * Get current password value (for testing purposes only)
   */
  async getPassword(): Promise<string> {
    return await this.passwordInput.inputValue();
  }

  /**
   * Clear username field
   */
  async clearUsername(): Promise<void> {
    await this.clearInput(this.usernameInput);
  }

  /**
   * Clear password field  
   */
  async clearPassword(): Promise<void> {
    await this.clearInput(this.passwordInput);
  }

  /**
   * Clear all form fields
   */
  async clearAllFields(): Promise<void> {
    await Promise.all([
      this.clearUsername(),
      this.clearPassword(),
    ]);
  }

  /**
   * Comprehensive login method with options
   */
  async login(
    credentials: Partial<UserCredentials>, 
    options: LoginOptions = {}
  ): Promise<void> {
    const {
      submit = true,
      clearFields = true,
      waitForNavigation = true,
    } = options;

    // Clear fields if requested
    if (clearFields) {
      await this.clearAllFields();
    }

    // Enter credentials
    if (credentials.username !== undefined) {
      await this.enterUsername(credentials.username);
    }

    if (credentials.password !== undefined) {
      await this.enterPassword(credentials.password);
    }

    // Submit form if requested
    if (submit) {
      await this.clickLoginButton();

      // Wait for navigation or response if requested
      if (waitForNavigation) {
        await this.page.waitForLoadState('networkidle');
      }
    }
  }

  /**
   * Quick login with valid credentials
   */
  async loginWithValidCredentials(credentials: UserCredentials): Promise<void> {
    await this.login(credentials, { 
      submit: true, 
      clearFields: true, 
      waitForNavigation: true 
    });
  }

  /**
   * Login and validate result
   */
  async loginAndValidate(
    credentials: Partial<UserCredentials>,
    validationOptions: LoginValidationOptions = {}
  ): Promise<void> {
    await this.login(credentials);

    const {
      expectSuccess = false,
      expectedUrl,
      expectedMessage,
    } = validationOptions;

    if (expectedUrl) {
      await this.waitForUrl(expectedUrl);
    }

    if (expectedMessage) {
      await this.validateAlertMessage(expectedMessage);
    }

    if (expectSuccess) {
      await this.validateSuccessfulLogin();
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
   * Get instruction text
   */
  async getInstructionText(): Promise<string> {
    return await this.getElementText(this.instructionText);
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
   * Validate successful login
   */
  async validateSuccessfulLogin(): Promise<void> {
    const expectedMessage = TestStrings.alerts.loginSuccess;
    await this.validateAlertMessage(expectedMessage);
  }

  /**
   * Validate failed login with specific error
   */
  async validateFailedLogin(expectedError: string): Promise<void> {
    await this.validateAlertMessage(expectedError);
  }

  /**
   * Get username label text
   */
  async getUsernameLabel(): Promise<string> {
    return await this.getElementText(this.usernameLabel);
  }

  /**
   * Get password label text
   */
  async getPasswordLabel(): Promise<string> {
    return await this.getElementText(this.passwordLabel);
  }

  /**
   * Get login button text
   */
  async getLoginButtonText(): Promise<string> {
    return await this.getElementText(this.loginButton);
  }

  /**
   * Check if username field is enabled
   */
  async isUsernameEnabled(): Promise<boolean> {
    return await this.usernameInput.isEnabled();
  }

  /**
   * Check if password field is enabled
   */
  async isPasswordEnabled(): Promise<boolean> {
    return await this.passwordInput.isEnabled();
  }

  /**
   * Check if login button is enabled
   */
  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.loginButton.isEnabled();
  }

  /**
   * Focus on username field
   */
  async focusUsernameField(): Promise<void> {
    await this.usernameInput.focus();
  }

  /**
   * Focus on password field  
   */
  async focusPasswordField(): Promise<void> {
    await this.passwordInput.focus();
  }

  /**
   * Submit form via Enter key
   */
  async submitViaEnterKey(): Promise<void> {
    await this.passwordInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check form validation states
   */
  async validateFormState(): Promise<{
    isUsernameRequired: boolean;
    isPasswordRequired: boolean;
    isFormValid: boolean;
  }> {
    const usernameRequired = await this.getElementAttribute(this.usernameInput, 'required') !== null;
    const passwordRequired = await this.getElementAttribute(this.passwordInput, 'required') !== null;
    const usernameValue = await this.getUsername();
    const passwordValue = await this.getPassword();
    
    return {
      isUsernameRequired: usernameRequired,
      isPasswordRequired: passwordRequired,
      isFormValid: usernameValue.length > 0 && passwordValue.length > 0,
    };
  }

  /**
   * Validate page structure and elements
   */
  async validatePageStructure(): Promise<void> {
    await super.validatePageStructure();
    
    // Validate required elements are present
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.pageHeading).toBeVisible();
    
    // Validate page content
    const heading = await this.getPageHeading();
    expect(heading).toBe(TestStrings.loginPage.headingText);
  }

  /**
   * Validate accessibility attributes
   */
  async validateAccessibility(): Promise<void> {
    // Check for proper labels
    const usernameLabelFor = await this.getElementAttribute(this.usernameLabel, 'for');
    const passwordLabelFor = await this.getElementAttribute(this.passwordLabel, 'for');
    
    expect(usernameLabelFor).toBe('username');
    expect(passwordLabelFor).toBe('password');
    
    // Check input types
    const passwordType = await this.getElementAttribute(this.passwordInput, 'type');
    expect(passwordType).toBe('password');
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Tab through form fields
    await this.usernameInput.press('Tab');
    await expect(this.passwordInput).toBeFocused();
    
    await this.passwordInput.press('Tab');
    await expect(this.loginButton).toBeFocused();
  }

  /**
   * Simulate various user interaction patterns
   */
  async simulateUserBehavior(pattern: 'fast' | 'slow' | 'erratic'): Promise<void> {
    switch (pattern) {
      case 'fast':
        // Rapid typing without delays
        await this.enterUsername('tomsmith');
        await this.enterPassword('SuperSecretPassword!');
        break;
        
      case 'slow':
        // Slow typing with delays
        await this.typeText(this.usernameInput, 'tomsmith', 200);
        await this.typeText(this.passwordInput, 'SuperSecretPassword!', 200);
        break;
        
      case 'erratic':
        // Erratic behavior: type, clear, retype
        await this.enterUsername('wrong');
        await this.clearUsername();
        await this.enterUsername('tomsmith');
        
        await this.enterPassword('wrong');
        await this.clearPassword();
        await this.enterPassword('SuperSecretPassword!');
        break;
    }
  }
}