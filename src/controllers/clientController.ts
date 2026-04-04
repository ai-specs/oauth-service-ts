import { Request, Response, NextFunction } from 'express';
import { createClient, getClientById, deleteClient, ClientWithSecret } from '../services/clientService';
import { CreateClientSchema } from '../utils/validation';
import { badRequest, HttpError } from '../utils/errors';

export const registerClient = async (
  req: Request,
  res: Response<ClientWithSecret>,
  next: NextFunction
): Promise<void> => {
  try {
    const validationResult = CreateClientSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw badRequest(validationResult.error.message, 'VALIDATION_ERROR');
    }

    const client = await createClient(validationResult.data);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

export const getClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const client = await getClientById(id);

    if (!client) {
      throw new HttpError(404, 'Client not found', 'NOT_FOUND');
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const removeClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteClient(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};