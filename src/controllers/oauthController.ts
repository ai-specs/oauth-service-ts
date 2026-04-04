import { Request, Response, NextFunction } from 'express';
import {
  createAuthorizationCode,
  exchangeAuthorizationCode,
  exchangeClientCredentials,
  refreshAccessToken,
  introspectToken,
  revokeToken,
  TokenResponse,
  IntrospectionResponse,
} from '../services/oauthService';
import { validateClient, ClientData } from '../services/clientService';
import {
  AuthorizationRequestSchema,
  TokenRequestSchema,
  TokenIntrospectRequestSchema,
  TokenRevokeRequestSchema,
} from '../utils/validation';
import { badRequest, unauthorized, HttpError } from '../utils/errors';
import { getBasicAuthCredentials } from '../utils/crypto';

interface AuthorizeQuery {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: 'plain' | 'S256';
}

interface TokenRequestBody {
  grant_type: 'authorization_code' | 'client_credentials' | 'refresh_token';
  client_id?: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
}

interface IntrospectRequestBody {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}

interface RevokeRequestBody {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}

// Extended request with authenticated client
interface AuthenticatedRequest extends Request {
  client?: ClientData;
}

export const authorize = async (
  req: Request<object, object, object, AuthorizeQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validationResult = AuthorizationRequestSchema.safeParse(req.query);
    if (!validationResult.success) {
      throw badRequest(validationResult.error.message, 'VALIDATION_ERROR');
    }

    const { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method } = validationResult.data;

    const client = await validateClient(client_id, '');
    if (!client) {
      // For public clients, we don't validate client_secret
      const publicClient = await getClient(client_id);
      if (!publicClient) {
        throw unauthorized('Invalid client', 'INVALID_CLIENT');
      }
    }

    // In a real implementation, this would redirect to a login page
    // For now, we simulate with a mock user_id
    const userId = 'mock_user_123';

    const code = await createAuthorizationCode(
      client || (await getClient(client_id))!,
      userId,
      redirect_uri,
      scope || '',
      code_challenge,
      code_challenge_method
    );

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
};

// Helper to get client (public clients don't need secret)
const getClient = async (clientId: string): Promise<ClientData | null> => {
  const { getClient } = await import('../services/clientService');
  return getClient(clientId);
};

export const token = async (
  req: Request<object, TokenResponse, TokenRequestBody>,
  res: Response<TokenResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // Get client credentials from basic auth or body
    const basicAuth = getBasicAuthCredentials(req);
    const clientId = basicAuth?.clientId || req.body.client_id;
    const clientSecret = basicAuth?.clientSecret || req.body.client_secret;

    if (!clientId) {
      throw unauthorized('Missing client_id', 'INVALID_CLIENT');
    }

    // Validate client (for confidential clients)
    let client: ClientData | null = null;
    if (clientSecret) {
      client = await validateClient(clientId, clientSecret);
      if (!client) {
        throw unauthorized('Invalid client credentials', 'INVALID_CLIENT');
      }
    } else {
      // Public client - just verify it exists
      client = await getClient(clientId);
      if (!client) {
        throw unauthorized('Invalid client', 'INVALID_CLIENT');
      }
    }

    const validationResult = TokenRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw badRequest(validationResult.error.message, 'VALIDATION_ERROR');
    }

    const { grant_type } = validationResult.data;

    let tokenResponse: TokenResponse;

    switch (grant_type) {
      case 'authorization_code': {
        const { code, redirect_uri, code_verifier } = validationResult.data;
        if (!code || !redirect_uri) {
          throw badRequest('Missing required parameters', 'INVALID_REQUEST');
        }
        tokenResponse = await exchangeAuthorizationCode(
          code,
          clientId,
          redirect_uri,
          code_verifier,
          clientSecret
        );
        break;
      }

      case 'client_credentials': {
        if (!clientSecret) {
          throw unauthorized('Client credentials flow requires client_secret', 'INVALID_CLIENT');
        }
        tokenResponse = await exchangeClientCredentials(clientId, validationResult.data.scope);
        break;
      }

      case 'refresh_token': {
        const { refresh_token, scope } = validationResult.data;
        if (!refresh_token) {
          throw badRequest('Missing refresh_token', 'INVALID_REQUEST');
        }
        tokenResponse = await refreshAccessToken(refresh_token, clientId, scope);
        break;
      }

      default:
        throw badRequest('Unsupported grant_type', 'UNSUPPORTED_GRANT_TYPE');
    }

    res.json(tokenResponse);
  } catch (error) {
    next(error);
  }
};

export const introspect = async (
  req: Request<object, IntrospectionResponse, IntrospectRequestBody>,
  res: Response<IntrospectionResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    // Get client credentials
    const basicAuth = getBasicAuthCredentials(req);
    const clientId = basicAuth?.clientId || req.body.client_id;
    const clientSecret = basicAuth?.clientSecret;

    if (!clientId) {
      throw unauthorized('Missing client_id', 'INVALID_CLIENT');
    }

    // Validate client
    if (clientSecret) {
      const client = await validateClient(clientId, clientSecret);
      if (!client) {
        throw unauthorized('Invalid client credentials', 'INVALID_CLIENT');
      }
    } else {
      const client = await getClient(clientId);
      if (!client) {
        throw unauthorized('Invalid client', 'INVALID_CLIENT');
      }
    }

    const validationResult = TokenIntrospectRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw badRequest(validationResult.error.message, 'VALIDATION_ERROR');
    }

    const introspectionResponse = await introspectToken(validationResult.data.token);
    res.json(introspectionResponse);
  } catch (error) {
    next(error);
  }
};

export const revoke = async (
  req: Request<object, void, RevokeRequestBody>,
  res: Response<void>,
  next: NextFunction
): Promise<void> => {
  try {
    // Get client credentials
    const basicAuth = getBasicAuthCredentials(req);
    const clientId = basicAuth?.clientId || req.body.client_id;
    const clientSecret = basicAuth?.clientSecret;

    if (!clientId) {
      throw unauthorized('Missing client_id', 'INVALID_CLIENT');
    }

    // Validate client
    if (clientSecret) {
      const client = await validateClient(clientId, clientSecret);
      if (!client) {
        throw unauthorized('Invalid client credentials', 'INVALID_CLIENT');
      }
    } else {
      const client = await getClient(clientId);
      if (!client) {
        throw unauthorized('Invalid client', 'INVALID_CLIENT');
      }
    }

    const validationResult = TokenRevokeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw badRequest(validationResult.error.message, 'VALIDATION_ERROR');
    }

    await revokeToken(validationResult.data.token);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
};