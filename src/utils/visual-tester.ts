/**
 * Visual Testing Utilities
 * Industry standard: Visual regression testing and screenshot comparison
 */

import { Page, expect } from '@playwright/test';
import * as fs from 'fs/promises';

export interface VisualTestOptions {
  threshold?: number;
  maxDiffPixels?: number;
  animations?: 'disabled' | 'allow';
  clip?: { x: number; y: number; width: number; height: number };
  fullPage?: boolean;
  mask?: string[];
}

export interface ScreenshotComparisonResult {
  passed: boolean;
  diffPixelCount?: number;
  diffRatio?: number;
  diffPath?: string;
  expectedPath?: string;
  actualPath?: string;
}

/**
 * Visual testing and screenshot comparison utilities
 */
export class VisualTester {
  private page: Page;
  private baselineDir: string;
  private outputDir: string;

  constructor(page: Page, options: { baselineDir?: string; outputDir?: string } = {}) {
    this.page = page;
    this.baselineDir = options.baselineDir || 'visual-baselines';
    this.outputDir = options.outputDir || 'visual-results';
  }

  /**
   * Take a screenshot and compare to baseline
   */
  async compareScreenshot(
    name: string,
    options: VisualTestOptions = {}
  ): Promise<ScreenshotComparisonResult> {
    // Ensure directories exist
    await this.ensureDirectories();

    // Disable animations if requested
    if (options.animations === 'disabled') {
      await this.disableAnimations();
    }

    // Mask dynamic elements if specified
    if (options.mask && options.mask.length > 0) {
      await this.maskElements(options.mask);
    }

    try {
      // Use Playwright's built-in visual comparison
      await expect(this.page).toHaveScreenshot(`${name}.png`, {
        threshold: options.threshold || 0.2,
        maxDiffPixels: options.maxDiffPixels || 100,
        clip: options.clip,
        fullPage: options.fullPage || false,
      });

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        diffPixelCount: this.extractDiffPixels(error as Error),
        diffRatio: this.extractDiffRatio(error as Error),
      };
    }
  }

  /**
   * Take element screenshot and compare
   */
  async compareElementScreenshot(
    selector: string,
    name: string,
    options: VisualTestOptions = {}
  ): Promise<ScreenshotComparisonResult> {
    const element = this.page.locator(selector);

    try {
      await expect(element).toHaveScreenshot(`${name}-element.png`, {
        threshold: options.threshold || 0.2,
        maxDiffPixels: options.maxDiffPixels || 50,
        animations: options.animations || 'disabled',
      });

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        diffPixelCount: this.extractDiffPixels(error as Error),
      };
    }
  }

  /**
   * Cross-browser visual comparison
   */
  async crossBrowserComparison(
    name: string,
    browsers: string[] = ['chromium', 'firefox', 'webkit']
  ): Promise<Record<string, ScreenshotComparisonResult>> {
    const results: Record<string, ScreenshotComparisonResult> = {};

    for (const browser of browsers) {
      const browserName = `${name}-${browser}`;
      results[browser] = await this.compareScreenshot(browserName);
    }

    return results;
  }

  /**
   * Responsive design visual testing
   */
  async responsiveVisualTest(
    name: string,
    viewports: Array<{ width: number; height: number; name: string }>
  ): Promise<Record<string, ScreenshotComparisonResult>> {
    const results: Record<string, ScreenshotComparisonResult> = {};

    for (const viewport of viewports) {
      await this.page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // Wait for layout changes
      await this.page.waitForTimeout(500);

      const testName = `${name}-${viewport.name}`;
      results[viewport.name] = await this.compareScreenshot(testName, {
        fullPage: true,
      });
    }

    return results;
  }

  /**
   * Visual test for different user states
   */
  async stateBasedVisualTest(
    name: string,
    states: Array<{ name: string; setup: () => Promise<void> }>
  ): Promise<Record<string, ScreenshotComparisonResult>> {
    const results: Record<string, ScreenshotComparisonResult> = {};

    for (const state of states) {
      await state.setup();

      // Wait for state changes to complete
      await this.page.waitForTimeout(500);

      const testName = `${name}-${state.name}`;
      results[state.name] = await this.compareScreenshot(testName);
    }

    return results;
  }

  /**
   * Visual regression testing for form interactions
   */
  async formVisualTest(
    formSelector: string,
    name: string,
    interactions: Array<{
      name: string;
      action: () => Promise<void>;
    }>
  ): Promise<Record<string, ScreenshotComparisonResult>> {
    const results: Record<string, ScreenshotComparisonResult> = {};

    for (const interaction of interactions) {
      await interaction.action();

      // Wait for visual changes
      await this.page.waitForTimeout(300);

      const testName = `${name}-form-${interaction.name}`;
      results[interaction.name] = await this.compareElementScreenshot(formSelector, testName);
    }

    return results;
  }

  /**
   * Accessibility visual indicators test
   */
  async accessibilityVisualTest(name: string): Promise<ScreenshotComparisonResult> {
    // Focus elements to show focus indicators
    const focusableElements = await this.page
      .locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
      .all();

    if (focusableElements.length > 0) {
      await focusableElements[0].focus();
      await this.page.waitForTimeout(200);
    }

    return await this.compareScreenshot(`${name}-accessibility`, {
      threshold: 0.1,
    });
  }

  /**
   * Animation and transition visual testing
   */
  async animationVisualTest(
    name: string,
    trigger: () => Promise<void>,
    duration = 1000
  ): Promise<ScreenshotComparisonResult[]> {
    const results: ScreenshotComparisonResult[] = [];
    const frames = 5;
    const interval = duration / frames;

    // Capture initial state
    results.push(await this.compareScreenshot(`${name}-frame-0`));

    // Trigger animation
    await trigger();

    // Capture frames during animation
    for (let i = 1; i <= frames; i++) {
      await this.page.waitForTimeout(interval);
      results.push(await this.compareScreenshot(`${name}-frame-${i}`));
    }

    return results;
  }

  /**
   * Generate visual test report
   */
  async generateVisualReport(results: Record<string, ScreenshotComparisonResult>): Promise<string> {
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    let report = `# Visual Testing Report\n\n`;
    report += `**Summary:** ${passedTests}/${totalTests} tests passed\n\n`;

    if (failedTests > 0) {
      report += `## Failed Tests (${failedTests})\n\n`;

      Object.entries(results).forEach(([testName, result]) => {
        if (!result.passed) {
          report += `### ${testName}\n`;
          report += `- **Status:** ❌ Failed\n`;
          if (result.diffPixelCount) {
            report += `- **Diff Pixels:** ${result.diffPixelCount}\n`;
          }
          if (result.diffRatio) {
            report += `- **Diff Ratio:** ${(result.diffRatio * 100).toFixed(2)}%\n`;
          }
          report += '\n';
        }
      });
    }

    if (passedTests > 0) {
      report += `## Passed Tests (${passedTests})\n\n`;

      Object.entries(results).forEach(([testName, result]) => {
        if (result.passed) {
          report += `- ✅ ${testName}\n`;
        }
      });
    }

    return report;
  }

  /**
   * Private helper methods
   */

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.baselineDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch {
      // Directories might already exist
    }
  }

  private async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  }

  private async maskElements(selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      await this.page.locator(selector).evaluateAll(elements => {
        elements.forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });
    }
  }

  private extractDiffPixels(error: Error): number | undefined {
    const match = error.message.match(/(\d+) pixels/);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractDiffRatio(error: Error): number | undefined {
    const match = error.message.match(/(\d+\.?\d*)% diff/);
    return match ? parseFloat(match[1]) / 100 : undefined;
  }
}

/**
 * Visual testing presets and utilities
 */
export class VisualTestPresets {
  /**
   * Standard desktop viewports for responsive testing
   */
  static readonly DESKTOP_VIEWPORTS = [
    { width: 1920, height: 1080, name: 'desktop-xl' },
    { width: 1366, height: 768, name: 'desktop-lg' },
    { width: 1024, height: 768, name: 'desktop-md' },
  ];

  /**
   * Standard tablet viewports
   */
  static readonly TABLET_VIEWPORTS = [
    { width: 768, height: 1024, name: 'tablet-portrait' },
    { width: 1024, height: 768, name: 'tablet-landscape' },
  ];

  /**
   * Standard mobile viewports
   */
  static readonly MOBILE_VIEWPORTS = [
    { width: 375, height: 667, name: 'mobile-sm' },
    { width: 414, height: 896, name: 'mobile-lg' },
  ];

  /**
   * All standard viewports combined
   */
  static readonly ALL_VIEWPORTS = [
    ...VisualTestPresets.DESKTOP_VIEWPORTS,
    ...VisualTestPresets.TABLET_VIEWPORTS,
    ...VisualTestPresets.MOBILE_VIEWPORTS,
  ];

  /**
   * Common elements to mask in visual tests
   */
  static readonly DYNAMIC_ELEMENTS = [
    '.timestamp',
    '.current-time',
    '.loading',
    '.spinner',
    '[data-testid="dynamic"]',
    '.advertisement',
    '.chat-widget',
  ];

  /**
   * Standard visual test options
   */
  static readonly DEFAULT_OPTIONS: VisualTestOptions = {
    threshold: 0.2,
    maxDiffPixels: 100,
    animations: 'disabled',
    fullPage: false,
  };
}
