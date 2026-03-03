/**
 * Global Teardown - Runs once after all tests
 * Industry standard: Cleanup resources, generate final reports, upload artifacts
 */

import { FullConfig } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('🧹 Starting Global Teardown...');

  try {
    // Generate test summary
    await generateTestSummary();

    // Archive test artifacts
    await archiveArtifacts();

    // Cleanup temporary files
    await cleanupTempFiles();

    // Log final statistics
    await logFinalStatistics();

    console.log('✅ Global Teardown completed successfully');
  } catch (error) {
    console.error('❌ Global Teardown failed:', error);
    // Don't throw - teardown failures shouldn't affect test results
  }
}

/**
 * Generate test summary
 */
async function generateTestSummary(): Promise<void> {
  try {
    const summaryPath = 'test-results/test-summary.json';
    
    // Check if test results exist
    const testResultsDir = 'test-results';
    const files = await fs.readdir(testResultsDir).catch(() => []);
    
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        baseUrl: process.env.BASE_URL,
        nodeVersion: process.version,
        platform: process.platform,
        ci: process.env.CI === 'true',
      },
      artifacts: {
        testResults: files.filter(f => f.endsWith('.xml') || f.endsWith('.json')).length,
        screenshots: files.filter(f => f.endsWith('.png') || f.endsWith('.jpg')).length,
        videos: files.filter(f => f.endsWith('.webm') || f.endsWith('.mp4')).length,
        traces: files.filter(f => f.endsWith('.zip')).length,
      },
      directories: {
        allureResults: await getDirectorySize('allure-results'),
        playwrightReport: await getDirectorySize('playwright-report'),
        testResults: await getDirectorySize('test-results'),
      },
    };

    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log('📋 Test summary generated');
  } catch (error) {
    console.warn('⚠️  Failed to generate test summary:', error);
  }
}

/**
 * Archive test artifacts for CI/CD
 */
async function archiveArtifacts(): Promise<void> {
  if (!process.env.CI) {
    return; // Only archive in CI environment
  }

  try {
    // Create artifacts directory structure for CI
    const artifactDirs = [
      'allure-results',
      'playwright-report', 
      'test-results',
    ];

    const archivePath = 'artifacts';
    await fs.mkdir(archivePath, { recursive: true });

    for (const dir of artifactDirs) {
      try {
        const targetPath = path.join(archivePath, dir);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        
        // Copy directory contents
        await copyDirectory(dir, targetPath);
        console.log(`📦 Archived: ${dir} -> ${targetPath}`);
      } catch (error) {
        console.warn(`⚠️  Failed to archive ${dir}:`, error);
      }
    }
  } catch (error) {
    console.warn('⚠️  Failed to archive artifacts:', error);
  }
}

/**
 * Cleanup temporary files
 */
async function cleanupTempFiles(): Promise<void> {
  try {
    // Examples of temporary patterns to clean
    // const tempPatterns = [
    //   'node_modules/.cache',
    //   '.tmp',
    //   '*.tmp',
    //   'temp-*',
    // ];

    // Clean up .env.test files if they exist
    const testEnvFiles = ['.env.test', '.env.local'];
    
    for (const file of testEnvFiles) {
      try {
        await fs.access(file);
        await fs.unlink(file);
        console.log(`🗑️  Removed temporary file: ${file}`);
      } catch {
        // File doesn't exist, skip
      }
    }

    console.log('🧹 Temporary files cleaned up');
  } catch (error) {
    console.warn('⚠️  Failed to cleanup temporary files:', error);
  }
}

/**
 * Log final statistics
 */
async function logFinalStatistics(): Promise<void> {
  try {
    console.log('\n📊 Test Execution Statistics:');
    console.log('================================');
    
    // Log artifact counts
    const allureFiles = await fs.readdir('allure-results').catch(() => []);
    const testFiles = await fs.readdir('test-results').catch(() => []);
    
    console.log(`📁 Allure results: ${allureFiles.length} files`);
    console.log(`📁 Test results: ${testFiles.length} files`);
    
    // Log directory sizes
    const allureSize = await getDirectorySize('allure-results');
    const testSize = await getDirectorySize('test-results');
    
    console.log(`💾 Allure results size: ${formatBytes(allureSize)}`);
    console.log(`💾 Test results size: ${formatBytes(testSize)}`);
    
    // Log environment info
    console.log(`🌍 Base URL: ${process.env.BASE_URL}`);
    console.log(`🏗️  Platform: ${process.platform}`);
    console.log(`🔧 Node.js: ${process.version}`);
    console.log(`🤖 CI Mode: ${process.env.CI === 'true' ? 'Yes' : 'No'}`);
    
    console.log('================================\n');
  } catch (error) {
    console.warn('⚠️  Failed to log final statistics:', error);
  }
}

/**
 * Helper: Get directory size in bytes
 */
async function getDirectorySize(directoryPath: string): Promise<number> {
  try {
    const files = await fs.readdir(directoryPath);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      }
    }

    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * Helper: Copy directory recursively
 */
async function copyDirectory(source: string, target: string): Promise<void> {
  try {
    await fs.mkdir(target, { recursive: true });
    const files = await fs.readdir(source);

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      const stats = await fs.stat(sourcePath);

      if (stats.isFile()) {
        await fs.copyFile(sourcePath, targetPath);
      } else if (stats.isDirectory()) {
        await copyDirectory(sourcePath, targetPath);
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Helper: Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default globalTeardown;