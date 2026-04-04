import prisma from '../utils/database';
import redisClient from '../utils/redis';
import { generateAuthorizationCode, generateAccessToken, generateRefreshToken } from '../utils/crypto';
import { config } from '../utils/config';
import { badRequest, unauthorized } from '../utils/errors';
import { ClientData, validateRedirectUri, validateScopes } from './clientService';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

interface AuthorizationCodeData {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'plain' | 'S256';
  expiresAt: Date;
}

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: Date;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface IntrospectionResponse {
  active: boolean;
  client_id?: string;
  scope?: string;
  sub?: string;
  exp?: number;
  token_type?: string;
}

const AUTHORIZATION_CODE_EXPIRATION_MINUTES = 10;
const ACCESS_TOKEN_EXPIRATION_SECONDS = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

const TOKEN_BLACKLIST_PREFIX = 'blacklisted_token:';

export const createAuthorizationCode = async (
  client: ClientData,
  userId: string,
  redirectUri: string,
  scope: string,
  codeChallenge?: string,
  codeChallengeMethod?: 'plain' | 'S256'
): Promise<string> => {
  if (!validateRedirectUri(client, redirectUri)) {
    throw badRequest('Invalid redirect_uri', 'INVALID_REDIRECT_URI');
  }

  const requestedScopes = scope.split(' ').filter(s => s);
  if (!validateScopes(client, requestedScopes)) {
    throw badRequest('Invalid scope', 'INVALID_SCOPE');
  }

  const code = generateAuthorizationCode();
  const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_EXPIRATION_MINUTES * 60 * 1000);

  await prisma.authorizationCode.create({
    data: {
      code,
      clientId: client.clientId,
      userId,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
      expiresAt,
    },
  });

  return code;
};

export const exchangeAuthorizationCode = async (
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string,
  clientSecret?: string
): Promise<TokenResponse> => {
  const authCode = await prisma.authorizationCode.findUnique({
    where: { code },
    include: { client: true },
  });

  if (!authCode) {
    throw badRequest('Invalid authorization code', 'INVALID_GRANT');
  }

  if (authCode.used) {
    throw badRequest('Authorization code already used', 'INVALID_GRANT');
  }

  if (authCode.clientId !== clientId) {
    throw badRequest('Authorization code does not belong to this client', 'INVALID_GRANT');
  }

  if (authCode.redirectUri !== redirectUri) {
    throw badRequest('Redirect URI mismatch', 'INVALID_GRANT');
  }

  if (authCode.expiresAt < new Date()) {
    throw badRequest('Authorization code expired', 'INVALID_GRANT');
  }

  // PKCE verification
  if (authCode.codeChallenge) {
    if (!codeVerifier) {
      throw badRequest('code_verifier required for PKCE', 'INVALID_GRANT');
    }
    const method = authCode.codeChallengeMethod || 'S256';
    const expectedChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    if (expectedChallenge !== authCode.codeChallenge) {
      throw badRequest('Invalid code_verifier', 'INVALID_GRANT');
    }
  } else if (!clientSecret) {
    throw badRequest('client_secret required for confidential clients', 'INVALID_CLIENT');
  }

  // Mark code as used
  await prisma.authorizationCode.update({
    where: { code },
    data: { used: true },
  });

  // Generate tokens
  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRATION_SECONDS * 1000);

  await prisma.token.create({
    data: {
      accessToken,
      refreshToken,
      clientId: authCode.clientId,
      userId: authCode.userId,
      scope: authCode.scope,
      expiresAt,
    },
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRATION_SECONDS,
    refresh_token: refreshToken,
    scope: authCode.scope,
  };
};

export const exchangeClientCredentials = async (
  clientId: string,
  scope?: string
): Promise<TokenResponse> => {
  const accessToken = generateAccessToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRATION_SECONDS * 1000);
  const tokenScope = scope || '';

  await prisma.token.create({
    data: {
      accessToken,
      clientId,
      userId: clientId, // For client credentials, user_id is the client_id
      scope: tokenScope,
      expiresAt,
    },
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRATION_SECONDS,
    scope: tokenScope,
  };
};

export const refreshAccessToken = async (
  refreshToken: string,
  clientId: string,
  scope?: string
): Promise<TokenResponse> => {
  const existingToken = await prisma.token.findUnique({
    where: { refreshToken },
  });

  if (!existingToken) {
    throw badRequest('Invalid refresh token', 'INVALID_GRANT');
  }

  if (existingToken.clientId !== clientId) {
    throw badRequest('Refresh token does not belong to this client', 'INVALID_GRANT');
  }

  if (existingToken.revoked) {
    throw badRequest('Refresh token has been revoked', 'INVALID_GRANT');
  }

  if (existingToken.expiresAt < new Date()) {
    throw badRequest('Refresh token expired', 'INVALID_GRANT');
  }

  // Revoke old token
  await prisma.token.update({
    where: { accessToken: existingToken.accessToken },
    data: { revoked: true },
  });

  // Generate new tokens
  const newAccessToken = generateAccessToken();
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRATION_SECONDS * 1000);
  const tokenScope = scope || existingToken.scope;

  await prisma.token.create({
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      clientId: existingToken.clientId,
      userId: existingToken.userId,
      scope: tokenScope,
      expiresAt,
    },
  });

  return {
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRATION_SECONDS,
    refresh_token: newRefreshToken,
    scope: tokenScope,
  };
};

export const introspectToken = async (token: string): Promise<IntrospectionResponse> => {
  // Check if token is blacklisted
  const isBlacklisted = await redisClient.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
  if (isBlacklisted) {
    return { active: false };
  }

  const tokenRecord = await prisma.token.findUnique({
    where: { accessToken: token },
  });

  if (!tokenRecord) {
    // Check refresh token
    const refreshTokenRecord = await prisma.token.findFirst({
      where: { refreshToken: token },
    });

    if (!refreshTokenRecord) {
      return { active: false };
    }

    if (refreshTokenRecord.revoked || refreshTokenRecord.expiresAt < new Date()) {
      return { active: false };
    }

    return {
      active: true,
      client_id: refreshTokenRecord.clientId,
      scope: refreshTokenRecord.scope,
      sub: refreshTokenRecord.userId,
      exp: Math.floor(refreshTokenRecord.expiresAt.getTime() / 1000),
      token_type: 'refresh_token',
    };
  }

  if (tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
    return { active: false };
  }

  return {
    active: true,
    client_id: tokenRecord.clientId,
    scope: tokenRecord.scope,
    sub: tokenRecord.userId,
    exp: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
    token_type: 'access_token',
  };
};

export const revokeToken = async (token: string): Promise<void> => {
  const tokenRecord = await prisma.token.findUnique({
    where: { accessToken: token },
  });

  if (tokenRecord) {
    await prisma.token.update({
      where: { accessToken: token },
      data: { revoked: true },
    });

    // Add to blacklist in Redis
    await redisClient.setEx(
      `${TOKEN_BLACKLIST_PREFIX}${token}`,
      ACCESS_TOKEN_EXPIRATION_SECONDS,
      'revoked'
    );
    return;
  }

  // Check refresh token
  const refreshTokenRecord = await prisma.token.findFirst({
    where: { refreshToken: token },
  });

  if (refreshTokenRecord) {
    await prisma.token.update({
      where: { accessToken: refreshTokenRecord.accessToken },
      data: { revoked: true },
    });
  }
};