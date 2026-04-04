/**
 * Unit tests for utility functions
 */

import { randomString, testUuid, createMockClient, createMockAuthCode, createMockToken, parseJwtStructure } from '../helpers/testUtils';

describe('Utility Functions', () => {
  describe('randomString', () => {
    it('should generate string of specified length', () => {
      const result = randomString(16);
      expect(result.length).toBe(16);
    });

    it('should generate different strings on each call', () => {
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        results.add(randomString(8));
      }
      expect(results.size).toBeGreaterThan(90); // Allow some collisions
    });

    it('should default to 16 characters', () => {
      const result = randomString();
      expect(result.length).toBe(16);
    });

    it('should contain only alphanumeric characters', () => {
      const result = randomString(50);
      expect(result).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('testUuid', () => {
    it('should generate valid UUID format', () => {
      const result = testUuid();
      expect(result).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    });

    it('should generate different UUIDs on each call', () => {
      const uuid1 = testUuid();
      const uuid2 = testUuid();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('createMockClient', () => {
    it('should create client with default values', () => {
      const client = createMockClient();

      expect(client).toHaveProperty('id');
      expect(client).toHaveProperty('name');
      expect(client).toHaveProperty('clientId');
      expect(client).toHaveProperty('clientSecretHash');
      expect(client).toHaveProperty('redirectUris');
      expect(client).toHaveProperty('scopes');
    });

    it('should allow overriding specific fields', () => {
      const client = createMockClient({
        name: 'Custom Client',
        scopes: ['admin'],
      });

      expect(client.name).toBe('Custom Client');
      expect(client.scopes).toEqual(['admin']);
      // Other defaults should remain
      expect(client.redirectUris).toBeDefined();
    });

    it('should generate unique clientId for each client', () => {
      const client1 = createMockClient();
      const client2 = createMockClient();

      expect(client1.clientId).not.toBe(client2.clientId);
    });
  });

  describe('createMockAuthCode', () => {
    it('should create auth code with default values', () => {
      const authCode = createMockAuthCode();

      expect(authCode).toHaveProperty('code');
      expect(authCode).toHaveProperty('clientId');
      expect(authCode).toHaveProperty('userId');
      expect(authCode).toHaveProperty('redirectUri');
      expect(authCode).toHaveProperty('scope');
      expect(authCode).toHaveProperty('expiresAt');
      expect(authCode).toHaveProperty('used');
      expect(authCode.used).toBe(false);
    });

    it('should set default expiration to 10 minutes', () => {
      const authCode = createMockAuthCode();
      const expectedExpiry = new Date(Date.now() + 10 * 60 * 1000);

      // Allow 1 second tolerance
      const diff = Math.abs(authCode.expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should allow PKCE parameters', () => {
      const authCode = createMockAuthCode({
        codeChallenge: 'test_challenge',
        codeChallengeMethod: 'S256',
      });

      expect(authCode.codeChallenge).toBe('test_challenge');
      expect(authCode.codeChallengeMethod).toBe('S256');
    });
  });

  describe('createMockToken', () => {
    it('should create token with default values', () => {
      const token = createMockToken();

      expect(token).toHaveProperty('accessToken');
      expect(token).toHaveProperty('refreshToken');
      expect(token).toHaveProperty('clientId');
      expect(token).toHaveProperty('userId');
      expect(token).toHaveProperty('scope');
      expect(token).toHaveProperty('expiresAt');
      expect(token).toHaveProperty('revoked');
      expect(token.revoked).toBe(false);
    });

    it('should set default expiration to 1 hour', () => {
      const token = createMockToken();
      const expectedExpiry = new Date(Date.now() + 3600 * 1000);

      const diff = Math.abs(token.expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should allow null refresh token', () => {
      const token = createMockToken({
        refreshToken: null,
      });

      expect(token.refreshToken).toBeNull();
    });

    it('should allow setting revoked status', () => {
      const token = createMockToken({
        revoked: true,
      });

      expect(token.revoked).toBe(true);
    });
  });

  describe('parseJwtStructure', () => {
    it('should parse valid JWT structure', () => {
      // Create a simple JWT-like structure for testing
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'user123', exp: 1234567890 })).toString('base64url');
      const signature = Buffer.from('test_signature').toString('base64url');
      const token = `${header}.${payload}.${signature}`;

      const result = parseJwtStructure(token);

      expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' });
      expect(result.payload).toEqual({ sub: 'user123', exp: 1234567890 });
      expect(result.signature).toBe(signature);
    });

    it('should throw error for invalid JWT format', () => {
      const invalidToken = 'invalid.token';

      expect(() => parseJwtStructure(invalidToken)).toThrow();
    });

    it('should throw error for token with wrong number of parts', () => {
      const invalidToken = 'part1.part2.part3.part4';

      expect(() => parseJwtStructure(invalidToken)).toThrow();
    });
  });
});