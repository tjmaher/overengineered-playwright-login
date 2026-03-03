/**
 * API Testing Utilities
 * Industry standard: REST API testing and validation
 */

import { APIRequestContext } from '@playwright/test';

export interface APITestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  validateResponse?: boolean;
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
  url: string;
}

export interface APITestResult {
  passed: boolean;
  response: APIResponse;
  assertions: string[];
  errors: string[];
}

interface ResponseData {
  [key: string]: any;
}

interface RequestData {
  [key: string]: any;
}

interface ValidationSchema {
  [key: string]: any;
}

/**
 * API testing and validation utilities
 */
export class APITester {
  private request: APIRequestContext;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(
    request: APIRequestContext,
    baseURL: string = '',
    defaultHeaders: Record<string, string> = {}
  ) {
    this.request = request;
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...defaultHeaders,
    };
  }

  /**
   * Perform GET request with validation
   */
  async get(endpoint: string, options: APITestOptions = {}): Promise<APITestResult> {
    const startTime = Date.now();
    const url = this.buildURL(endpoint);

    try {
      const response = await this.request.get(url, {
        headers: { ...this.defaultHeaders, ...options.headers },
        timeout: options.timeout ?? 30000,
      });

      const responseTime = Date.now() - startTime;
      const apiResponse = await this.parseResponse(response, url, responseTime);

      return this.validateAndReturn(apiResponse, options);
    } catch (error) {
      return this.handleError(error as Error, url);
    }
  }

  /**
   * Perform POST request with validation
   */
  async post(
    endpoint: string,
    data: RequestData,
    options: APITestOptions = {}
  ): Promise<APITestResult> {
    const startTime = Date.now();
    const url = this.buildURL(endpoint);

    try {
      const response = await this.request.post(url, {
        headers: { ...this.defaultHeaders, ...options.headers },
        data: JSON.stringify(data),
        timeout: options.timeout ?? 30000,
      });

      const responseTime = Date.now() - startTime;
      const apiResponse = await this.parseResponse(response, url, responseTime);

      return this.validateAndReturn(apiResponse, options);
    } catch (error) {
      return this.handleError(error as Error, url);
    }
  }

  /**
   * Perform PUT request with validation
   */
  async put(
    endpoint: string,
    data: RequestData,
    options: APITestOptions = {}
  ): Promise<APITestResult> {
    const startTime = Date.now();
    const url = this.buildURL(endpoint);

    try {
      const response = await this.request.put(url, {
        headers: { ...this.defaultHeaders, ...options.headers },
        data: JSON.stringify(data),
        timeout: options.timeout ?? 30000,
      });

      const responseTime = Date.now() - startTime;
      const apiResponse = await this.parseResponse(response, url, responseTime);

      return this.validateAndReturn(apiResponse, options);
    } catch (error) {
      return this.handleError(error as Error, url);
    }
  }

  /**
   * Perform DELETE request with validation
   */
  async delete(endpoint: string, options: APITestOptions = {}): Promise<APITestResult> {
    const startTime = Date.now();
    const url = this.buildURL(endpoint);

    try {
      const response = await this.request.delete(url, {
        headers: { ...this.defaultHeaders, ...options.headers },
        timeout: options.timeout ?? 30000,
      });

      const responseTime = Date.now() - startTime;
      const apiResponse = await this.parseResponse(response, url, responseTime);

      return this.validateAndReturn(apiResponse, options);
    } catch (error) {
      return this.handleError(error as Error, url);
    }
  }

  /**
   * Test API endpoint health
   */
  async healthCheck(endpoint: string = '/health'): Promise<APITestResult> {
    return await this.get(endpoint, { timeout: 10000 });
  }

  /**
   * Test API authentication
   */
  async testAuthentication(credentials: {
    username: string;
    password: string;
  }): Promise<APITestResult> {
    return await this.post('/auth/login', credentials);
  }

  /**
   * Test API rate limiting
   */
  async testRateLimit(
    endpoint: string,
    requestCount: number = 100,
    timeWindow: number = 1000
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    rateLimitedRequests: number;
    averageResponseTime: number;
  }> {
    const results: APITestResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < requestCount; i++) {
      const result = await this.get(endpoint);
      results.push(result);

      // Small delay to avoid overwhelming the server
      if (i < requestCount - 1) {
        await new Promise<void>(resolve => setTimeout(resolve, timeWindow / requestCount));
      }
    }

    const successfulRequests = results.filter(r => r.response.status < 400).length;
    const rateLimitedRequests = results.filter(r => r.response.status === 429).length;
    const totalTime = Date.now() - startTime;
    const averageResponseTime = totalTime / requestCount;

    return {
      totalRequests: requestCount,
      successfulRequests,
      rateLimitedRequests,
      averageResponseTime,
    };
  }

  /**
   * Test API response schema
   */
  async testResponseSchema(
    endpoint: string,
    expectedSchema: ValidationSchema,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: RequestData
  ): Promise<APITestResult> {
    let result: APITestResult;

    switch (method) {
      case 'GET':
        result = await this.get(endpoint);
        break;
      case 'POST':
        result = await this.post(endpoint, data ?? {});
        break;
      case 'PUT':
        result = await this.put(endpoint, data ?? {});
        break;
      case 'DELETE':
        result = await this.delete(endpoint);
        break;
    }

    // Validate schema (simplified validation)
    try {
      this.validateSchema(result.response.body, expectedSchema);
      result.assertions.push('Response schema validation passed');
    } catch (error) {
      result.passed = false;
      result.errors.push(`Schema validation failed: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Load testing simulation
   */
  async loadTest(
    endpoint: string,
    options: {
      concurrentUsers?: number;
      duration?: number;
      requestsPerSecond?: number;
    } = {}
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    requestsPerSecond: number;
  }> {
    const {
      concurrentUsers = 10,
      duration = 30000, // 30 seconds
      requestsPerSecond = 5,
    } = options;

    const results: APITestResult[] = [];
    const startTime = Date.now();
    const endTime = startTime + duration;

    const workers = Array.from({ length: concurrentUsers }, async () => {
      while (Date.now() < endTime) {
        const result = await this.get(endpoint);
        results.push(result);

        // Wait to maintain requests per second
        await new Promise<void>(resolve =>
          setTimeout(resolve, 1000 / requestsPerSecond / concurrentUsers)
        );
      }
    });

    await Promise.all(workers);

    const successfulRequests = results.filter(r => r.response.status < 400).length;
    const failedRequests = results.length - successfulRequests;
    const responseTimes = results.map(r => r.response.responseTime);
    const totalDuration = Date.now() - startTime;

    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      requestsPerSecond: results.length / (totalDuration / 1000),
    };
  }

  /**
   * Private helper methods
   */

  private buildURL(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }

    const base = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${base}${path}`;
  }

  private async parseResponse(
    response: any,
    url: string,
    responseTime: number
  ): Promise<APIResponse> {
    let body: any;

    try {
      const contentType = response.headers['content-type'] ?? '';

      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }
    } catch {
      body = null;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body,
      responseTime,
      url,
    };
  }

  private validateAndReturn(apiResponse: APIResponse, options: APITestOptions): APITestResult {
    const assertions: string[] = [];
    const errors: string[] = [];
    let passed = true;

    // Basic response validation
    if (options.validateResponse !== false) {
      if (apiResponse.status >= 200 && apiResponse.status < 300) {
        assertions.push(`Status code ${apiResponse.status} is successful`);
      } else {
        passed = false;
        errors.push(`Status code ${apiResponse.status} indicates failure`);
      }

      // Response time validation
      if (apiResponse.responseTime > 5000) {
        errors.push(`Response time ${apiResponse.responseTime}ms exceeds 5 seconds`);
      } else {
        assertions.push(`Response time ${apiResponse.responseTime}ms is acceptable`);
      }
    }

    return {
      passed,
      response: apiResponse,
      assertions,
      errors,
    };
  }

  private handleError(error: Error, url: string): APITestResult {
    return {
      passed: false,
      response: {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: null,
        responseTime: 0,
        url,
      },
      assertions: [],
      errors: [error.message],
    };
  }

  private validateSchema(data: any, schema: ValidationSchema): void {
    // Simplified schema validation - in production use a proper schema validator
    if (typeof schema === 'object' && schema !== null) {
      Object.keys(schema).forEach(key => {
        if (!(key in data)) {
          throw new Error(`Missing required property: ${key}`);
        }

        const expectedType = typeof (schema as any)[key];
        const actualType = typeof data[key];

        if (expectedType !== actualType) {
          throw new Error(`Property ${key} expected type ${expectedType}, got ${actualType}`);
        }
      });
    }
  }
}

/**
 * API testing assertions and utilities
 */
export class APIAssertions {
  /**
   * Assert response status code
   */
  static assertStatus(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new Error(`Expected status ${expected}, got ${actual}`);
    }
  }

  /**
   * Assert response time is within limits
   */
  static assertResponseTime(actual: number, maxMs: number): void {
    if (actual > maxMs) {
      throw new Error(`Response time ${actual}ms exceeds maximum ${maxMs}ms`);
    }
  }

  /**
   * Assert response contains expected data
   */
  static assertResponseContains(response: ResponseData, expectedData: RequestData): void {
    const responseStr = JSON.stringify(response);
    const expectedStr = JSON.stringify(expectedData);

    if (!responseStr.includes(expectedStr)) {
      throw new Error(`Response does not contain expected data`);
    }
  }

  /**
   * Assert response headers
   */
  static assertHeaders(actual: Record<string, string>, expected: Record<string, string>): void {
    Object.entries(expected).forEach(([key, value]) => {
      if (actual[key] !== value) {
        throw new Error(`Expected header ${key}: ${value}, got ${actual[key]}`);
      }
    });
  }
}

/**
 * API test data generators
 */
export class APITestDataGenerator {
  /**
   * Generate test user data
   */
  static generateUser(): RequestData {
    const timestamp = Date.now();
    return {
      username: `testuser_${timestamp}`,
      email: `test${timestamp}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      age: Math.floor(Math.random() * 50) + 18,
    };
  }

  /**
   * Generate random strings for boundary testing
   */
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  /**
   * Generate invalid data for negative testing
   */
  static generateInvalidData(): any[] {
    return [
      null,
      undefined,
      '',
      '   ',
      '<script>alert("xss")</script>',
      "'; DROP TABLE users; --",
      '\x00\x01\x02',
      '🎭🎪🎨', // Unicode emojis
      this.generateRandomString(10000), // Very long string
    ];
  }
}
