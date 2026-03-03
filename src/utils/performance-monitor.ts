/**
 * Performance Monitoring Utilities
 * Industry standard: Performance testing and monitoring
 */

import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
}

export interface LoadTimeMetrics {
  totalLoadTime: number;
  domLoadTime: number;
  resourceLoadTime: number;
}

export interface NetworkMetrics {
  requestCount: number;
  totalBytes: number;
  largestRequest: { url: string; size: number };
  slowestRequest: { url: string; duration: number };
}

/**
 * Performance monitoring and measurement utilities
 */
export class PerformanceMonitor {
  private page: Page;
  private startTime: number = 0;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Start performance measurement
   */
  startMeasurement(): void {
    this.startTime = Date.now();
  }

  /**
   * Get Web Vitals metrics
   */
  async getWebVitals(): Promise<PerformanceMetrics> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        navigationStart: navigation.fetchStart, // Use fetchStart as navigationStart replacement
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstContentfulPaint: 0, // Would need Web Vitals library for accurate FCP
        largestContentfulPaint: 0, // Would need Web Vitals library for accurate LCP
        firstInputDelay: 0, // Measured on user interaction
        cumulativeLayoutShift: 0, // Measured over time
      };
    });
  }

  /**
   * Get load time metrics
   */
  async getLoadTimeMetrics(): Promise<LoadTimeMetrics> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domLoadTime: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        resourceLoadTime: navigation.loadEventEnd - navigation.domContentLoadedEventEnd,
      };
    });
  }

  /**
   * Get network performance metrics
   */
  async getNetworkMetrics(): Promise<NetworkMetrics> {
    return await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let totalBytes = 0;
      let largestRequest = { url: '', size: 0 };
      let slowestRequest = { url: '', duration: 0 };

      resources.forEach(resource => {
        const size = resource.transferSize || 0;
        const duration = resource.responseEnd - resource.requestStart;

        totalBytes += size;

        if (size > largestRequest.size) {
          largestRequest = { url: resource.name, size };
        }

        if (duration > slowestRequest.duration) {
          slowestRequest = { url: resource.name, duration };
        }
      });

      return {
        requestCount: resources.length,
        totalBytes,
        largestRequest,
        slowestRequest,
      };
    });
  }

  /**
   * Measure page load performance
   */
  async measurePageLoad(url: string, options: { timeout?: number } = {}): Promise<{
    loadTime: number;
    metrics: PerformanceMetrics;
    networkMetrics: NetworkMetrics;
  }> {
    this.startMeasurement();
    
    await this.page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: options.timeout || 30000
    });

    const loadTime = Date.now() - this.startTime;
    const metrics = await this.getWebVitals();
    const networkMetrics = await this.getNetworkMetrics();

    return {
      loadTime,
      metrics,
      networkMetrics,
    };
  }

  /**
   * Monitor performance during test execution
   */
  async monitorPerformance<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; performanceData: any }> {
    const startTime = performance.now();
    
    // Start monitoring network
    const requests: any[] = [];
    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        startTime: Date.now(),
      });
    });

    const responses: any[] = [];
    this.page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        timing: response.request().timing(),
      });
    });

    // Execute operation
    const result = await operation();

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    const performanceData = {
      operationName,
      executionTime,
      requestCount: requests.length,
      responseCount: responses.length,
      requests: requests.slice(0, 10), // Limit to first 10 for reporting
      responses: responses.slice(0, 10),
    };

    console.log(`Performance: ${operationName} took ${executionTime.toFixed(2)}ms`);

    return { result, performanceData };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<string> {
    const loadMetrics = await this.getLoadTimeMetrics();
    const webVitals = await this.getWebVitals();
    const networkMetrics = await this.getNetworkMetrics();

    const report = `
# Performance Report

## Load Time Metrics
- Total Load Time: ${loadMetrics.totalLoadTime}ms
- DOM Load Time: ${loadMetrics.domLoadTime}ms  
- Resource Load Time: ${loadMetrics.resourceLoadTime}ms

## Web Vitals
- DOM Content Loaded: ${webVitals.domContentLoaded}ms
- Load Complete: ${webVitals.loadComplete}ms

## Network Metrics
- Total Requests: ${networkMetrics.requestCount}
- Total Bytes: ${(networkMetrics.totalBytes / 1024).toFixed(2)} KB
- Largest Request: ${networkMetrics.largestRequest.url} (${(networkMetrics.largestRequest.size / 1024).toFixed(2)} KB)
- Slowest Request: ${networkMetrics.slowestRequest.url} (${networkMetrics.slowestRequest.duration.toFixed(2)}ms)
`;

    return report;
  }
}

/**
 * Performance assertions and validations
 */
export class PerformanceAssertions {
  /**
   * Assert page load time is within acceptable limits
   */
  static assertLoadTime(actualMs: number, maxMs: number, pageName = 'Page'): void {
    if (actualMs > maxMs) {
      throw new Error(
        `${pageName} load time (${actualMs}ms) exceeds maximum allowed (${maxMs}ms)`
      );
    }
    console.log(`✅ ${pageName} loaded in ${actualMs}ms (under ${maxMs}ms limit)`);
  }

  /**
   * Assert network request count is reasonable
   */
  static assertRequestCount(actualCount: number, maxCount: number): void {
    if (actualCount > maxCount) {
      throw new Error(
        `Request count (${actualCount}) exceeds maximum allowed (${maxCount})`
      );
    }
    console.log(`✅ Request count ${actualCount} is within limit (${maxCount})`);
  }

  /**
   * Assert total page size is reasonable
   */
  static assertPageSize(actualBytes: number, maxBytes: number): void {
    const actualKB = Math.round(actualBytes / 1024);
    const maxKB = Math.round(maxBytes / 1024);
    
    if (actualBytes > maxBytes) {
      throw new Error(
        `Page size (${actualKB}KB) exceeds maximum allowed (${maxKB}KB)`
      );
    }
    console.log(`✅ Page size ${actualKB}KB is within limit (${maxKB}KB)`);
  }
}