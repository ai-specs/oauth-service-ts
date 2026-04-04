/**
 * Unit tests for validation utilities
 * Tests Zod schema validation patterns used in OAuth service
 */

import { z } from 'zod';

describe('Validation Utilities', () => {
  describe('OAuth Request Validation', () => {
    // Token request validation schema
    const tokenRequestSchema = z.object({
      grant_type: z.enum(['authorization_code', 'client_credentials', 'refresh_token']),
      code: z.string().optional(),
      redirect_uri: z.string().url().optional(),
      client_id: z.string().min(1),
      client_secret: z.string().optional(),
      refresh_token: z.string().optional(),
      scope: z.string().optional(),
      code_verifier: z.string().optional(),
    });

    it('should validate authorization_code grant type', () => {
      const validRequest = {
        grant_type: 'authorization_code',
        code: 'test_code',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'test_client',
      };

      const result = tokenRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate client_credentials grant type', () => {
      const validRequest = {
        grant_type: 'client_credentials',
        client_id: 'test_client',
        client_secret: 'test_secret',
        scope: 'read write',
      };

      const result = tokenRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate refresh_token grant type', () => {
      const validRequest = {
        grant_type: 'refresh_token',
        refresh_token: 'test_refresh_token',
        client_id: 'test_client',
        client_secret: 'test_secret',
      };

      const result = tokenRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid grant_type', () => {
      const invalidRequest = {
        grant_type: 'invalid_grant',
        client_id: 'test_client',
      };

      const result = tokenRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('grant_type');
      }
    });

    it('should reject invalid redirect_uri format', () => {
      const invalidRequest = {
        grant_type: 'authorization_code',
        code: 'test_code',
        redirect_uri: 'not-a-url',
        client_id: 'test_client',
      };

      const result = tokenRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('redirect_uri');
      }
    });

    it('should require client_id', () => {
      const invalidRequest = {
        grant_type: 'client_credentials',
      };

      const result = tokenRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('client_id'))).toBe(true);
      }
    });
  });

  describe('Client Registration Validation', () => {
    const clientRegistrationSchema = z.object({
      name: z.string().min(1).max(100),
      redirect_uris: z.array(z.string().url()).min(1),
      scopes: z.array(z.string()).min(1),
    });

    it('should validate valid client registration', () => {
      const validClient = {
        name: 'Test Client',
        redirect_uris: ['http://localhost:3000/callback'],
        scopes: ['read', 'write'],
      };

      const result = clientRegistrationSchema.safeParse(validClient);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidClient = {
        name: '',
        redirect_uris: ['http://localhost:3000/callback'],
        scopes: ['read'],
      };

      const result = clientRegistrationSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
    });

    it('should reject empty redirect_uris array', () => {
      const invalidClient = {
        name: 'Test Client',
        redirect_uris: [],
        scopes: ['read'],
      };

      const result = clientRegistrationSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL in redirect_uris', () => {
      const invalidClient = {
        name: 'Test Client',
        redirect_uris: ['not-a-url'],
        scopes: ['read'],
      };

      const result = clientRegistrationSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
    });

    it('should reject empty scopes array', () => {
      const invalidClient = {
        name: 'Test Client',
        redirect_uris: ['http://localhost:3000/callback'],
        scopes: [],
      };

      const result = clientRegistrationSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
    });
  });

  describe('Token Introspection Validation', () => {
    const introspectSchema = z.object({
      token: z.string().min(1),
      token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
    });

    it('should validate introspection request', () => {
      const validRequest = {
        token: 'test_token',
      };

      const result = introspectSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate introspection with token_type_hint', () => {
      const validRequest = {
        token: 'test_token',
        token_type_hint: 'access_token',
      };

      const result = introspectSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const invalidRequest = {
        token: '',
      };

      const result = introspectSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid token_type_hint', () => {
      const invalidRequest = {
        token: 'test_token',
        token_type_hint: 'invalid_type',
      };

      const result = introspectSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('PKCE Code Verifier Validation', () => {
    const pkceSchema = z.object({
      code_verifier: z.string()
        .min(43)
        .max(128)
        .regex(/^[A-Za-z0-9\-._~+/]+$/),
      code_challenge_method: z.enum(['plain', 'S256']).default('S256'),
    });

    it('should validate valid code_verifier', () => {
      // PKCE code_verifier must be 43-128 chars, using only A-Za-z0-9-._~+/
      const validPKCE = {
        code_verifier: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789_-.~+' + 'x'.repeat(3), // 46 chars, valid chars
      };

      const result = pkceSchema.safeParse(validPKCE);
      expect(result.success).toBe(true);
    });

    it('should reject code_verifier shorter than 43 characters', () => {
      const invalidPKCE = {
        code_verifier: 'short_string',
      };

      const result = pkceSchema.safeParse(invalidPKCE);
      expect(result.success).toBe(false);
    });

    it('should reject code_verifier longer than 128 characters', () => {
      const invalidPKCE = {
        code_verifier: 'a'.repeat(129),
      };

      const result = pkceSchema.safeParse(invalidPKCE);
      expect(result.success).toBe(false);
    });

    it('should reject code_verifier with invalid characters', () => {
      const invalidPKCE = {
        code_verifier: 'invalid!characters#here12345678901234',
      };

      const result = pkceSchema.safeParse(invalidPKCE);
      expect(result.success).toBe(false);
    });
  });
});