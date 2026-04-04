/**
 * Mock implementations for external services
 */

import { Client, AuthorizationCode, Token } from '@prisma/client';

/**
 * Mock Prisma Client
 * Provides in-memory storage and Prisma-like interface for testing
 */
export class MockPrismaClient {
  private clients: Map<string, Client> = new Map();
  private authCodes: Map<string, AuthorizationCode> = new Map();
  private tokens: Map<string, Token> = new Map();

  // Client operations
  client = {
    create: jest.fn(async ({ data }: { data: Omit<Client, 'createdAt' | 'updatedAt'> }) => {
      const client = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Client;
      this.clients.set(client.id, client);
      return client;
    }),

    findUnique: jest.fn(async ({ where }: { where: { id?: string; clientId?: string } }) => {
      if (where.id) {
        return this.clients.get(where.id) || null;
      }
      if (where.clientId) {
        for (const client of this.clients.values()) {
          if (client.clientId === where.clientId) {
            return client;
          }
        }
      }
      return null;
    }),

    findMany: jest.fn(async () => Array.from(this.clients.values())),

    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<Client> }) => {
      const client = this.clients.get(where.id);
      if (!client) throw new Error('Client not found');
      const updated = { ...client, ...data, updatedAt: new Date() };
      this.clients.set(where.id, updated);
      return updated;
    }),

    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const client = this.clients.get(where.id);
      if (!client) throw new Error('Client not found');
      this.clients.delete(where.id);
      return client;
    }),
  };

  // Authorization Code operations
  authorizationCode = {
    create: jest.fn(async ({ data }: { data: Omit<AuthorizationCode, 'createdAt'> }) => {
      const authCode = {
        ...data,
        createdAt: new Date(),
      } as AuthorizationCode;
      this.authCodes.set(authCode.code, authCode);
      return authCode;
    }),

    findUnique: jest.fn(async ({ where }: { where: { code: string } }) => {
      return this.authCodes.get(where.code) || null;
    }),

    update: jest.fn(async ({ where, data }: { where: { code: string }; data: Partial<AuthorizationCode> }) => {
      const authCode = this.authCodes.get(where.code);
      if (!authCode) throw new Error('Authorization code not found');
      const updated = { ...authCode, ...data };
      this.authCodes.set(where.code, updated);
      return updated;
    }),

    delete: jest.fn(async ({ where }: { where: { code: string } }) => {
      const authCode = this.authCodes.get(where.code);
      if (!authCode) throw new Error('Authorization code not found');
      this.authCodes.delete(where.code);
      return authCode;
    }),

    deleteMany: jest.fn(async ({ where }: { where: { clientId?: string; userId?: string } }) => {
      let count = 0;
      for (const [code, authCode] of this.authCodes) {
        if ((!where.clientId || authCode.clientId === where.clientId) &&
            (!where.userId || authCode.userId === where.userId)) {
          this.authCodes.delete(code);
          count++;
        }
      }
      return { count };
    }),
  };

  // Token operations
  token = {
    create: jest.fn(async ({ data }: { data: Omit<Token, 'createdAt'> }) => {
      const token = {
        ...data,
        createdAt: new Date(),
      } as Token;
      this.tokens.set(token.accessToken, token);
      return token;
    }),

    findUnique: jest.fn(async ({ where }: { where: { accessToken?: string; refreshToken?: string } }) => {
      if (where.accessToken) {
        return this.tokens.get(where.accessToken) || null;
      }
      if (where.refreshToken) {
        for (const token of this.tokens.values()) {
          if (token.refreshToken === where.refreshToken) {
            return token;
          }
        }
      }
      return null;
    }),

    findMany: jest.fn(async ({ where }: { where?: { userId?: string; clientId?: string } } = {}) => {
      let tokens = Array.from(this.tokens.values());
      if (where?.userId) {
        tokens = tokens.filter(t => t.userId === where.userId);
      }
      if (where?.clientId) {
        tokens = tokens.filter(t => t.clientId === where.clientId);
      }
      return tokens;
    }),

    update: jest.fn(async ({ where, data }: { where: { accessToken: string }; data: Partial<Token> }) => {
      const token = this.tokens.get(where.accessToken);
      if (!token) throw new Error('Token not found');
      const updated = { ...token, ...data };
      this.tokens.set(where.accessToken, updated);
      return updated;
    }),

    delete: jest.fn(async ({ where }: { where: { accessToken: string } }) => {
      const token = this.tokens.get(where.accessToken);
      if (!token) throw new Error('Token not found');
      this.tokens.delete(where.accessToken);
      return token;
    }),

    deleteMany: jest.fn(async ({ where }: { where: { userId?: string; clientId?: string } }) => {
      let count = 0;
      for (const [accessToken, token] of this.tokens) {
        if ((!where.userId || token.userId === where.userId) &&
            (!where.clientId || token.clientId === where.clientId)) {
          this.tokens.delete(accessToken);
          count++;
        }
      }
      return { count };
    }),
  };

  // Utility methods for test setup
  reset(): void {
    this.clients.clear();
    this.authCodes.clear();
    this.tokens.clear();
    jest.clearAllMocks();
  }

  seedClient(client: Client): void {
    this.clients.set(client.id, client);
  }

  seedAuthCode(authCode: AuthorizationCode): void {
    this.authCodes.set(authCode.code, authCode);
  }

  seedToken(token: Token): void {
    this.tokens.set(token.accessToken, token);
  }
}

/**
 * Mock Redis Client for token blacklisting and caching
 */
export class MockRedisClient {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  get = jest.fn(async (key: string): Promise<string | null> => {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  });

  set = jest.fn(async (key: string, value: string, options?: { EX?: number; PX?: number }): Promise<'OK'> => {
    let expiresAt: number | undefined;
    if (options?.EX) {
      expiresAt = Date.now() + options.EX * 1000;
    } else if (options?.PX) {
      expiresAt = Date.now() + options.PX;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  });

  del = jest.fn(async (...keys: string[]): Promise<number> => {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  });

  exists = jest.fn(async (...keys: string[]): Promise<number> => {
    let count = 0;
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry) {
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.store.delete(key);
        } else {
          count++;
        }
      }
    }
    return count;
  });

  expire = jest.fn(async (key: string, seconds: number): Promise<number> => {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  });

  ttl = jest.fn(async (key: string): Promise<number> => {
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    const ttl = Math.floor((entry.expiresAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  });

  // Utility methods
  reset(): void {
    this.store.clear();
    jest.clearAllMocks();
  }

  size(): number {
    return this.store.size;
  }
}

/**
 * Creates a mock bcrypt module
 */
export function createMockBcrypt() {
  return {
    hash: jest.fn(async (password: string, rounds: number = 10): Promise<string> => {
      return `$2b$${rounds}$mockhash${password.substring(0, 22)}`;
    }),

    compare: jest.fn(async (password: string, hash: string): Promise<boolean> => {
      return hash.includes(password.substring(0, 10));
    }),

    genSalt: jest.fn(async (rounds: number = 10): Promise<string> => {
      return `$2b$${rounds}$mocksalt`;
    }),
  };
}

/**
 * Creates a mock JWT module
 */
export function createMockJwt() {
  const secret = 'test-secret-key';

  return {
    sign: jest.fn((payload: object, secretOrPrivateKey: string, options?: object): string => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
      const signature = Buffer.from('mock-signature').toString('base64url');
      return `${header}.${body}.${signature}`;
    }),

    verify: jest.fn((token: string, secretOrPublicKey: string): object => {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('invalid token');
      }
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    }),

    decode: jest.fn((token: string): object | null => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      } catch {
        return null;
      }
    }),
  };
}