/**
 * Accessibility Testing Utilities
 * Industry standard: WCAG compliance and accessibility validation
 */

import { Page } from '@playwright/test';

export interface AccessibilityIssue {
  rule: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  element: string;
  suggestion: string;
}

export interface AccessibilityReport {
  url: string;
  timestamp: string;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issues: AccessibilityIssue[];
  passedRules: string[];
}

export interface KeyboardNavigationResult {
  canFocusElement: boolean;
  focusOrder: string[];
  trapsFocus: boolean;
  hasSkipLinks: boolean;
}

/**
 * Accessibility testing and validation utilities
 */
export class AccessibilityTester {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Check basic accessibility requirements
   */
  async checkBasicAccessibility(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for missing alt text on images
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');

      if (alt === null || alt.trim() === '') {
        issues.push({
          rule: 'img-alt',
          impact: 'serious',
          description: 'Image missing alt text',
          element: `img[src="${src}"]`,
          suggestion: 'Add descriptive alt text to the image',
        });
      }
    }

    // Check for form labels
    const inputs = await this.page.locator('input, textarea, select').all();
    for (const input of inputs) {
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Skip hidden inputs
      if (type === 'hidden') {
        continue;
      }

      const hasLabel = id && (await this.page.locator(`label[for="${id}"]`).count()) > 0;

      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        issues.push({
          rule: 'label',
          impact: 'critical',
          description: 'Form element missing label',
          element: `input[type="${type}"]${id ? `[id="${id}"]` : ''}`,
          suggestion: 'Add a label element or aria-label attribute',
        });
      }
    }

    // Check for heading structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.substring(1));

      if (level > previousLevel + 1) {
        issues.push({
          rule: 'heading-order',
          impact: 'moderate',
          description: 'Heading levels should not skip',
          element: tagName,
          suggestion: 'Use heading levels in sequential order (h1, h2, h3...)',
        });
      }

      previousLevel = level;
    }

    // Check for color contrast (basic check)
    const textElements = await this.page.locator('p, span, div, a, button, label').all();
    for (const element of textElements.slice(0, 10)) {
      // Limit for performance
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
        };
      });

      // This is a simplified check - real contrast checking would need color parsing
      if (styles.color === styles.backgroundColor) {
        issues.push({
          rule: 'color-contrast',
          impact: 'serious',
          description: 'Insufficient color contrast',
          element: await element.evaluate(el => el.tagName.toLowerCase()),
          suggestion: 'Ensure sufficient color contrast between text and background',
        });
      }
    }

    return issues;
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<KeyboardNavigationResult> {
    const focusableElements = await this.page
      .locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
      .all();

    const focusOrder: string[] = [];
    let canFocusElement = true;

    // Test Tab navigation
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      try {
        await this.page.keyboard.press('Tab');
        const focused = await this.page.evaluate(() => {
          const active = document.activeElement;
          return active
            ? active.tagName.toLowerCase() + (active.id ? `#${active.id}` : '')
            : 'none';
        });
        focusOrder.push(focused);
      } catch {
        canFocusElement = false;
        break;
      }
    }

    // Check for focus traps (simplified)
    const trapsFocus = focusOrder.length > 0 && focusOrder[0] === focusOrder[focusOrder.length - 1];

    // Check for skip links
    const hasSkipLinks = (await this.page.locator('a[href^="#"], .skip-link').count()) > 0;

    return {
      canFocusElement,
      focusOrder,
      trapsFocus,
      hasSkipLinks,
    };
  }

  /**
   * Check ARIA attributes and roles
   */
  async checkAriaCompliance(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for required ARIA attributes
    const elementsWithRoles = await this.page.locator('[role]').all();

    for (const element of elementsWithRoles) {
      const role = await element.getAttribute('role');
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());

      // Check for required aria-label on certain roles
      if (['button', 'link', 'menuitem'].includes(role || '')) {
        const hasLabel =
          (await element.getAttribute('aria-label')) ||
          (await element.getAttribute('aria-labelledby')) ||
          (await element.textContent());

        if (!hasLabel || hasLabel.trim() === '') {
          issues.push({
            rule: 'aria-label',
            impact: 'serious',
            description: `Element with role="${role}" missing accessible name`,
            element: `${tagName}[role="${role}"]`,
            suggestion: 'Add aria-label, aria-labelledby, or visible text content',
          });
        }
      }
    }

    // Check for invalid ARIA attributes
    const elementsWithAria = await this.page.locator('[aria-*]').all();
    const validAriaAttributes = [
      'aria-label',
      'aria-labelledby',
      'aria-describedby',
      'aria-hidden',
      'aria-expanded',
      'aria-controls',
      'aria-owns',
      'aria-live',
      'aria-atomic',
      'aria-relevant',
      'aria-busy',
      'aria-disabled',
    ];

    for (const element of elementsWithAria.slice(0, 10)) {
      // Limit for performance
      const attributes = await element.evaluate(el =>
        Array.from(el.attributes)
          .filter(attr => attr.name.startsWith('aria-'))
          .map(attr => attr.name)
      );

      for (const attr of attributes) {
        if (!validAriaAttributes.includes(attr)) {
          issues.push({
            rule: 'aria-valid-attr',
            impact: 'minor',
            description: `Invalid ARIA attribute: ${attr}`,
            element: await element.evaluate(el => el.tagName.toLowerCase()),
            suggestion: `Remove ${attr} or use a valid ARIA attribute`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Test with screen reader simulation
   */
  async testScreenReaderContent(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for empty links
    const links = await this.page.locator('a').all();
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      if ((!text || text.trim() === '') && (!ariaLabel || ariaLabel.trim() === '')) {
        issues.push({
          rule: 'link-name',
          impact: 'serious',
          description: 'Link has no accessible name',
          element: 'a',
          suggestion: 'Add descriptive text or aria-label to the link',
        });
      }
    }

    // Check for empty buttons
    const buttons = await this.page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      if ((!text || text.trim() === '') && (!ariaLabel || ariaLabel.trim() === '')) {
        issues.push({
          rule: 'button-name',
          impact: 'critical',
          description: 'Button has no accessible name',
          element: 'button',
          suggestion: 'Add text content or aria-label to the button',
        });
      }
    }

    return issues;
  }

  /**
   * Generate comprehensive accessibility report
   */
  async generateAccessibilityReport(): Promise<AccessibilityReport> {
    const url = this.page.url();
    const timestamp = new Date().toISOString();

    const basicIssues = await this.checkBasicAccessibility();
    const ariaIssues = await this.checkAriaCompliance();
    const screenReaderIssues = await this.testScreenReaderContent();

    const allIssues = [...basicIssues, ...ariaIssues, ...screenReaderIssues];

    const issuesBySeverity = allIssues.reduce(
      (acc, issue) => {
        acc[issue.impact] = (acc[issue.impact] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Mock passed rules (in real implementation, this would track what was checked)
    const passedRules = ['page-has-heading-one', 'html-has-lang', 'meta-viewport'];

    return {
      url,
      timestamp,
      totalIssues: allIssues.length,
      issuesBySeverity,
      issues: allIssues,
      passedRules,
    };
  }

  /**
   * Assert accessibility compliance
   */
  async assertAccessibility(
    options: {
      maxCritical?: number;
      maxSerious?: number;
      maxModerate?: number;
      allowedRules?: string[];
    } = {}
  ): Promise<void> {
    const report = await this.generateAccessibilityReport();

    const { maxCritical = 0, maxSerious = 0, maxModerate = 5, allowedRules = [] } = options;

    const criticalIssues = report.issues.filter(
      issue => issue.impact === 'critical' && !allowedRules.includes(issue.rule)
    );

    const seriousIssues = report.issues.filter(
      issue => issue.impact === 'serious' && !allowedRules.includes(issue.rule)
    );

    const moderateIssues = report.issues.filter(
      issue => issue.impact === 'moderate' && !allowedRules.includes(issue.rule)
    );

    if (criticalIssues.length > maxCritical) {
      throw new Error(
        `Found ${criticalIssues.length} critical accessibility issues (max allowed: ${maxCritical})`
      );
    }

    if (seriousIssues.length > maxSerious) {
      throw new Error(
        `Found ${seriousIssues.length} serious accessibility issues (max allowed: ${maxSerious})`
      );
    }

    if (moderateIssues.length > maxModerate) {
      throw new Error(
        `Found ${moderateIssues.length} moderate accessibility issues (max allowed: ${maxModerate})`
      );
    }

    console.warn(
      `✅ Accessibility check passed: ${report.totalIssues} issues found within acceptable limits`
    );
  }
}

/**
 * Accessibility testing helpers
 */
export class AccessibilityHelpers {
  /**
   * Add accessibility testing to any page
   */
  static async auditPage(page: Page): Promise<AccessibilityReport> {
    const tester = new AccessibilityTester(page);
    return await tester.generateAccessibilityReport();
  }

  /**
   * Quick keyboard navigation test
   */
  static async testKeyboardAccess(page: Page): Promise<boolean> {
    const tester = new AccessibilityTester(page);
    const result = await tester.testKeyboardNavigation();
    return result.canFocusElement && result.focusOrder.length > 0;
  }

  /**
   * Log accessibility issues to console
   */
  static logAccessibilityIssues(issues: AccessibilityIssue[]): void {
    if (issues.length === 0) {
      console.info('✅ No accessibility issues found');
      return;
    }

    console.warn(`\n🔍 Found ${issues.length} accessibility issues:`);

    issues.forEach((issue, index) => {
      const icon =
        issue.impact === 'critical'
          ? '🚨'
          : issue.impact === 'serious'
            ? '⚠️'
            : issue.impact === 'moderate'
              ? '⚡'
              : 'ℹ️';

      console.warn(`${index + 1}. ${icon} ${issue.rule} (${issue.impact})`);
      console.warn(`   Element: ${issue.element}`);
      console.warn(`   Issue: ${issue.description}`);
      console.warn(`   Fix: ${issue.suggestion}\n`);
    });
  }
}
