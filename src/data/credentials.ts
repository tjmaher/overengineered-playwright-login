/**
 * User credentials and test data
 * Industry standard approach: separate credentials from test code
 */

export interface UserCredentials {
  username: string;
  password: string;
  displayName?: string;
  role?: string;
  isActive?: boolean;
}

export interface TestUser extends UserCredentials {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  description: string;
}

/**
 * Valid user credentials for testing
 */
export const VALID_USERS: Record<string, UserCredentials> = {
  standardUser: {
    username: 'tomsmith',
    password: 'SuperSecretPassword!',
    displayName: 'Tom Smith',
    role: 'standard',
    isActive: true,
  },
} as const;

/**
 * Invalid credentials for negative testing
 */
export const INVALID_USERS: Record<string, Partial<UserCredentials>> = {
  invalidUsername: {
    username: 'invaliduser',
    password: 'SuperSecretPassword!',
  },
  invalidPassword: {
    username: 'tomsmith', 
    password: 'wrongpassword',
  },
  emptyUsername: {
    username: '',
    password: 'SuperSecretPassword!',
  },
  emptyPassword: {
    username: 'tomsmith',
    password: '',
  },
  bothEmpty: {
    username: '',
    password: '',
  },
  whitespaceUsername: {
    username: '   ',
    password: 'SuperSecretPassword!',
  },
  whitespacePassword: {
    username: 'tomsmith',
    password: '   ',
  },
  nullUsername: {
    username: undefined as any,
    password: 'SuperSecretPassword!', 
  },
  nullPassword: {
    username: 'tomsmith',
    password: undefined as any,
  },
} as const;

/**
 * Test users for comprehensive testing scenarios
 */
export const TEST_USERS: TestUser[] = [
  {
    id: 1,
    username: 'tomsmith',
    password: 'SuperSecretPassword!',
    email: 'tom.smith@example.com',
    firstName: 'Tom',
    lastName: 'Smith',
    displayName: 'Tom Smith',
    role: 'standard',
    isActive: true,
    description: 'Standard test user with valid credentials',
  },
];

/**
 * Edge case test data
 */
export const EDGE_CASE_DATA = {
  longUsername: 'a'.repeat(256),
  longPassword: 'P@ssw0rd!' + 'x'.repeat(247),
  specialCharsUsername: '!@#$%^&*()_+-=[]{}|;\':",./<>?',
  specialCharsPassword: '!@#$%^&*()_+-=[]{}|;\':",./<>?P@ss1',
  sqlInjection: {
    username: "admin' OR '1'='1",
    password: "password' OR '1'='1",
  },
  xssPayload: {
    username: '<script>alert("XSS")</script>',
    password: '<script>alert("XSS")</script>',
  },
  unicodeChars: {
    username: '测试用户',
    password: 'пароль123',  
  },
} as const;

/**
 * Helper functions for working with credentials
 */
export class CredentialsHelper {
  /**
   * Get a valid user by key
   */
  static getValidUser(key: keyof typeof VALID_USERS): UserCredentials {
    const user = VALID_USERS[key];
    if (!user) {
      throw new Error(`Valid user '${key}' not found`);
    }
    return { ...user };
  }

  /**
   * Get an invalid user by key  
   */
  static getInvalidUser(key: keyof typeof INVALID_USERS): Partial<UserCredentials> {
    const user = INVALID_USERS[key];
    if (!user) {
      throw new Error(`Invalid user '${key}' not found`);
    }
    return { ...user };
  }

  /**
   * Get a test user by ID
   */
  static getTestUser(id: number): TestUser {
    const user = TEST_USERS.find(u => u.id === id);
    if (!user) {
      throw new Error(`Test user with ID ${id} not found`);
    }
    return { ...user };
  }

  /**
   * Generate random credentials for testing
   */
  static generateRandomCredentials(): UserCredentials {
    const timestamp = Date.now();
    return {
      username: `testuser_${timestamp}`,
      password: `TestPass_${timestamp}!`,
      displayName: `Test User ${timestamp}`,
      role: 'test',
      isActive: true,
    };
  }

  /**
   * Validate credential format
   */
  static validateCredentials(credentials: Partial<UserCredentials>): boolean {
    return Boolean(
      credentials.username && 
      credentials.password &&
      credentials.username.trim().length > 0 &&
      credentials.password.trim().length > 0
    );
  }
}

// Default export for convenience
export default {
  VALID_USERS,
  INVALID_USERS,
  TEST_USERS,
  EDGE_CASE_DATA,
  CredentialsHelper,
};