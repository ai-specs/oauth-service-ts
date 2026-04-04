import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { badRequest } from '../utils/errors';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(badRequest(result.error.message, 'VALIDATION_ERROR'));
      return;
    }
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(badRequest(result.error.message, 'VALIDATION_ERROR'));
      return;
    }
    next();
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(badRequest(result.error.message, 'VALIDATION_ERROR'));
      return;
    }
    next();
  };
};