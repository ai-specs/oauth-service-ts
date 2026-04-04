import prisma from '../utils/database';
import bcrypt from 'bcrypt';
import { generateClientId, generateClientSecret } from '../utils/crypto';
import { badRequest, notFound, conflict } from '../utils/errors';
import { CreateClientRequest } from '../utils/validation';

const SALT_ROUNDS = 12;

export interface ClientData {
  id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientWithSecret extends ClientData {
  clientSecret: string;
}

export const createClient = async (data: CreateClientRequest): Promise<ClientWithSecret> => {
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const clientSecretHash = await bcrypt.hash(clientSecret, SALT_ROUNDS);

  const client = await prisma.client.create({
    data: {
      name: data.name,
      clientId,
      clientSecretHash,
      redirectUris: data.redirect_uris,
      scopes: data.scopes,
    },
  });

  return {
    id: client.id,
    name: client.name,
    clientId: client.clientId,
    clientSecret,
    redirectUris: client.redirectUris as string[],
    scopes: client.scopes as string[],
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
};

export const getClient = async (clientId: string): Promise<ClientData | null> => {
  const client = await prisma.client.findFirst({
    where: { clientId },
  });

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    name: client.name,
    clientId: client.clientId,
    redirectUris: client.redirectUris as string[],
    scopes: client.scopes as string[],
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
};

export const getClientById = async (id: string): Promise<ClientData | null> {
  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    name: client.name,
    clientId: client.clientId,
    redirectUris: client.redirectUris as string[],
    scopes: client.scopes as string[],
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
};

export const validateClient = async (clientId: string, clientSecret: string): Promise<ClientData | null> => {
  const client = await prisma.client.findFirst({
    where: { clientId },
  });

  if (!client) {
    return null;
  }

  const isValid = await bcrypt.compare(clientSecret, client.clientSecretHash);
  if (!isValid) {
    return null;
  }

  return {
    id: client.id,
    name: client.name,
    clientId: client.clientId,
    redirectUris: client.redirectUris as string[],
    scopes: client.scopes as string[],
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
};

export const validateRedirectUri = (client: ClientData, redirectUri: string): boolean => {
  return client.redirectUris.includes(redirectUri);
};

export const validateScopes = (client: ClientData, requestedScopes: string[]): boolean => {
  const clientScopes = client.scopes;
  return requestedScopes.every(scope => clientScopes.includes(scope));
};

export const deleteClient = async (id: string): Promise<void> => {
  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    throw notFound('Client not found');
  }

  await prisma.client.delete({
    where: { id },
  });
};