import { Request } from 'express';
import * as crypto from 'crypto';

export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateClientId = (): string => {
  return `client_${generateToken(16)}`;
};

export const generateClientSecret = (): string => {
  return generateToken(32);
};

export const generateAuthorizationCode = (): string => {
  return generateToken(24);
};

export const generateAccessToken = (): string => {
  return generateToken(32);
};

export const generateRefreshToken = (): string => {
  return generateToken(32);
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const verifyPKCE = (codeVerifier: string, codeChallenge: string, method: 'plain' | 'S256'): boolean => {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }

  const hashed = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return hashed === codeChallenge;
};

export const generateCodeChallenge = (codeVerifier: string, method: 'plain' | 'S256' = 'S256'): string => {
  if (method === 'plain') {
    return codeVerifier;
  }
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
};

export const getBasicAuthCredentials = (req: Request): { clientId: string; clientSecret: string } | null => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    return null;
  }

  const credentials = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  const [clientId, clientSecret] = credentials.split(':');

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
};