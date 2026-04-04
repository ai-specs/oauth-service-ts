/**
 * Test utilities and helpers for OAuth service tests
 */

import { Express } from 'express';
import request from 'supertest';

/**
 * Creates a test agent for making HTTP requests to the Express app
 */
export function createTestAgent(app: Express) {
  return request(app);
}

/**
 * Mock clock for testing time-dependent functionality
 */
export class MockClock {
  private currentTime: Date;

  constructor(time: Date = new Date()) {
    this.currentTime = time;
  }

  now(): Date {
    return this.currentTime;
  }

  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  setTime(time: Date): void {
    this.currentTime = time;
  }
}

/**
 * Generates a random string for test data
 */
export function randomString(length: number = 16): string {
  return Array.from({ length }, () =>
    Math.random().toString(36).substring(2, 3)
  ).join('');
}

/**
 * Generates a test UUID
 */
export function testUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates mock client data for testing
 */
export function createMockClient(overrides: Partial<{
  id: string;
  name: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
  scopes: string[];
}> = {}) {
  return {
    id: testUuid(),
    name: 'Test Client',
    clientId: `client_${randomString(8)}`,
    clientSecretHash: '$2b$10$abcdefghijklmnopqrstuvwxABCDEFGHIJ', // Mock hash
    redirectUris: ['http://localhost:3000/callback'],
    scopes: ['read', 'write'],
    ...overrides,
  };
}

/**
 * Creates mock authorization code for testing
 */
export function createMockAuthCode(overrides: Partial<{
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  expiresAt: Date;
  used: boolean;
}> = {}) {
  return {
    code: randomString(32),
    clientId: 'test_client_id',
    userId: testUuid(),
    redirectUri: 'http://localhost:3000/callback',
    scope: 'read write',
    codeChallenge: null,
    codeChallengeMethod: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    used: false,
    ...overrides,
  };
}

/**
 * Creates mock token data for testing
 */
export function createMockToken(overrides: Partial<{
  accessToken: string;
  refreshToken: string | null;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: Date;
  revoked: boolean;
}> = {}) {
  return {
    accessToken: randomString(32),
    refreshToken: randomString(32),
    clientId: 'test_client_id',
    userId: testUuid(),
    scope: 'read write',
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    revoked: false,
    ...overrides,
  };
}

/**
 * Waits for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert helper that improves error messages
 */
export function assertValidJsonResponse(response: request.Response): void {
  expect(response.headers['content-type']).toMatch(/application\/json/);
}

/**
 * OAuth 2.0 Error Response validator
 */
export function assertOAuthError(
  response: request.Response,
  expectedError: string,
  statusCode: number = 400
): void {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toBe(expectedError);
}

/**
 * JWT token validator for testing
 * Basic structure validation without cryptographic verification
 */
export function parseJwtStructure(token: string): { header: object; payload: object; signature: string } {
  const parts = token.split('.');
  expect(parts.length).toBe(3);

  return {
    header: JSON.parse(Buffer.from(parts[0], 'base64url').toString()),
    payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString()),
    signature: parts[2],
  };
}