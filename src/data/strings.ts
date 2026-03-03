/**
 * Test data helper for loading and managing strings and localization
 * Industry standard approach: centralized string management
 */

import * as stringsData from './strings.json';

export type StringCategory = keyof typeof stringsData;
export type StringKey<T extends StringCategory> = keyof (typeof stringsData)[T];

/**
 * String manager for accessing localized strings
 */
export class StringManager {
  private static instance: StringManager;
  private strings: typeof stringsData;

  private constructor() {
    this.strings = stringsData;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): StringManager {
    if (!StringManager.instance) {
      StringManager.instance = new StringManager();
    }
    return StringManager.instance;
  }

  /**
   * Get a string by category and key
   */
  getString<T extends StringCategory>(category: T, key: StringKey<T>): string {
    const categoryStrings = this.strings[category];
    if (!categoryStrings) {
      throw new Error(`String category '${category}' not found`);
    }

    const value = categoryStrings[key];
    if (typeof value !== 'string') {
      throw new Error(`String key '${String(key)}' not found in category '${category}'`);
    }

    return value;
  }

  /**
   * Get all strings for a category
   */
  getCategory<T extends StringCategory>(category: T): (typeof stringsData)[T] {
    const categoryStrings = this.strings[category];
    if (!categoryStrings) {
      throw new Error(`String category '${category}' not found`);
    }
    return categoryStrings;
  }

  /**
   * Check if a string exists
   */
  hasString<T extends StringCategory>(category: T, key: StringKey<T>): boolean {
    try {
      this.getString(category, key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get formatted string with replacements
   */
  getFormattedString<T extends StringCategory>(
    category: T,
    key: StringKey<T>,
    replacements: Record<string, string> = {}
  ): string {
    let text = this.getString(category, key);

    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(`{${placeholder}}`, 'g'), value);
    });

    return text;
  }
}

/**
 * Convenience functions for common string access patterns
 */
export class TestStrings {
  private static stringManager = StringManager.getInstance();

  // Login page strings
  static get loginPage() {
    return this.stringManager.getCategory('login');
  }

  static get secureArea() {
    return this.stringManager.getCategory('secureArea');
  }

  static get alerts() {
    return this.stringManager.getCategory('alerts');
  }

  static get errorMessages() {
    return this.stringManager.getCategory('errorMessages');
  }

  static get validation() {
    return this.stringManager.getCategory('validation');
  }

  static get navigation() {
    return this.stringManager.getCategory('navigation');
  }

  static get accessibility() {
    return this.stringManager.getCategory('accessibility');
  }

  static get testData() {
    return this.stringManager.getCategory('testData');
  }

  /**
   * Get string with error handling
   */
  static getSafe<T extends StringCategory>(
    category: T,
    key: StringKey<T>,
    fallback = 'String not found'
  ): string {
    try {
      return this.stringManager.getString(category, key);
    } catch (error) {
      console.warn(`String not found: ${category}.${String(key)}`, error);
      return fallback;
    }
  }

  /**
   * Get formatted string with replacements
   */
  static getFormatted<T extends StringCategory>(
    category: T,
    key: StringKey<T>,
    replacements: Record<string, string>
  ): string {
    return this.stringManager.getFormattedString(category, key, replacements);
  }
}

// Default exports for convenience
export const strings = TestStrings;
export const stringManager = StringManager.getInstance();
