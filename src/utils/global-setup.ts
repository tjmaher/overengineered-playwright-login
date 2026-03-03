/**
 * Global Setup - Runs once before all tests
 * Industry standard: Prepare environment, install browsers, setup test data
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

async function globalSetup(_config: FullConfig): Promise<void> {
  console.warn('🚀 Starting Global Setup...');

  try {
    // Ensure required directories exist
    await ensureDirectories();

    // Clear previous test artifacts
    await clearArtifacts();

    // Validate environment configuration
    await validateEnvironment();

    // Optionally warm up the application
    await warmupApplication();

    console.warn('✅ Global Setup completed successfully');
  } catch (error) {
    console.error('❌ Global Setup failed:', error);
    throw error;
  }
}

/**
 * Ensure all required directories exist
 */
async function ensureDirectories(): Promise<void> {
  const directories = [
    'test-results',
    'allure-results',
    'allure-report',
    'playwright-report',
    'screenshots',
    'videos',
    'traces',
  ];

  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.warn(`📁 Created directory: ${dir}`);
    }
  }
}

/**
 * Clear previous test artifacts
 */
async function clearArtifacts(): Promise<void> {
  const artifactDirs = ['test-results', 'allure-results', 'playwright-report/data'];

  for (const dir of artifactDirs) {
    try {
      const files = await fs.readdir(dir).catch(() => []);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath).catch(() => null);

        if (stat?.isFile()) {
          await fs.unlink(filePath);
        }
      }

      if (files.length > 0) {
        console.warn(`🧹 Cleaned artifacts from: ${dir}`);
      }
    } catch {
      // Ignore errors - directory might not exist yet
    }
  }
}

/**
 * Validate environment configuration
 */
async function validateEnvironment(): Promise<void> {
  const requiredEnvVars = ['BASE_URL'];
  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Using default values...');
  }

  // Set defaults
  process.env.BASE_URL = process.env.BASE_URL || 'https://the-internet.herokuapp.com';
  process.env.TIMEOUT = process.env.TIMEOUT || '30000';
  process.env.RETRIES = process.env.RETRIES || '0';

  console.warn(`🌐 Base URL: ${process.env.BASE_URL}`);
  console.warn(`⏱️  Timeout: ${process.env.TIMEOUT}ms`);
  console.warn(`🔄 Retries: ${process.env.RETRIES}`);
}

/**
 * Warm up the application by making a simple request
 */
async function warmupApplication(): Promise<void> {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    return;
  }

  console.warn(`🔥 Warming up application at: ${baseUrl}`);

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the base URL to warm up the application
    await page.goto(baseUrl, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    await page.waitForLoadState('networkidle');

    await browser.close();
    console.warn('✅ Application warmed up successfully');
  } catch (error) {
    console.warn('⚠️  Application warmup failed (this may be expected):', error);
    // Don't throw - warmup failure shouldn't stop tests
  }
}

export default globalSetup;
