import { z } from 'zod';

// OAuth Grant Types
export const GrantTypeSchema = z.enum(['authorization_code', 'client_credentials', 'refresh_token']);

// PKCE Code Challenge Methods
export const CodeChallengeMethodSchema = z.enum(['plain', 'S256']);

// Authorization Code Flow
export const AuthorizationRequestSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: CodeChallengeMethodSchema.optional(),
});

export const TokenRequestSchema = z.object({
  grant_type: GrantTypeSchema,
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  code_verifier: z.string().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export const RefreshTokenRequestSchema = z.object({
  grant_type: z.literal('refresh_token'),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
  refresh_token: z.string().min(1),
  scope: z.string().optional(),
});

export const ClientCredentialsRequestSchema = z.object({
  grant_type: z.literal('client_credentials'),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  scope: z.string().optional(),
});

export const AuthorizationCodeTokenRequestSchema = z.object({
  grant_type: z.literal('authorization_code'),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
  code: z.string().min(1),
  redirect_uri: z.string().url(),
  code_verifier: z.string().optional(),
});

// Token Introspection
export const TokenIntrospectRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
});

// Token Revocation
export const TokenRevokeRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
});

// Client Management
export const CreateClientSchema = z.object({
  name: z.string().min(1).max(100),
  redirect_uris: z.array(z.string().url()).min(1),
  scopes: z.array(z.string()).min(1),
});

export const UpdateClientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  redirect_uris: z.array(z.string().url()).min(1).optional(),
  scopes: z.array(z.string()).min(1).optional(),
});

// Types
export type AuthorizationRequest = z.infer<typeof AuthorizationRequestSchema>;
export type TokenRequest = z.infer<typeof TokenRequestSchema>;
export type TokenIntrospectRequest = z.infer<typeof TokenIntrospectRequestSchema>;
export type TokenRevokeRequest = z.infer<typeof TokenRevokeRequestSchema>;
export type CreateClientRequest = z.infer<typeof CreateClientSchema>;
export type UpdateClientRequest = z.infer<typeof UpdateClientSchema>;