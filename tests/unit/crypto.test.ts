import { generateToken, generateClientId, generateClientSecret, hashToken, verifyPKCE, generateCodeChallenge } from '../../src/utils/crypto';

describe('Crypto Utilities', () => {
  describe('generateToken', () => {
    it('should generate a random token of specified length', () => {
      const token = generateToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateClientId', () => {
    it('should generate a client ID with prefix', () => {
      const clientId = generateClientId();
      expect(clientId).toMatch(/^client_[a-f0-9]+$/);
    });
  });

  describe('generateClientSecret', () => {
    it('should generate a client secret', () => {
      const clientSecret = generateClientSecret();
      expect(clientSecret).toHaveLength(64);
      expect(clientSecret).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('hashToken', () => {
    it('should hash a token using SHA-256', () => {
      const token = 'test-token';
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce the same hash for the same input', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate S256 code challenge', () => {
      const codeVerifier = 'test-verifier-string';
      const challenge = generateCodeChallenge(codeVerifier, 'S256');
      expect(challenge).toBeDefined();
      expect(challenge).not.toBe(codeVerifier);
    });

    it('should return plain code verifier for plain method', () => {
      const codeVerifier = 'test-verifier-string';
      const challenge = generateCodeChallenge(codeVerifier, 'plain');
      expect(challenge).toBe(codeVerifier);
    });
  });

  describe('verifyPKCE', () => {
    it('should verify correct S256 challenge', () => {
      const codeVerifier = 'test-verifier-string';
      const challenge = generateCodeChallenge(codeVerifier, 'S256');
      const result = verifyPKCE(codeVerifier, challenge, 'S256');
      expect(result).toBe(true);
    });

    it('should verify correct plain challenge', () => {
      const codeVerifier = 'test-verifier-string';
      const result = verifyPKCE(codeVerifier, codeVerifier, 'plain');
      expect(result).toBe(true);
    });

    it('should reject incorrect challenge', () => {
      const codeVerifier = 'test-verifier-string';
      const wrongChallenge = 'wrong-challenge';
      const result = verifyPKCE(codeVerifier, wrongChallenge, 'S256');
      expect(result).toBe(false);
    });
  });
});