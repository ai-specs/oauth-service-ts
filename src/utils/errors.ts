import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode: number;
  code?: string;
}

export class HttpError extends Error implements AppError {
  statusCode: number;
  code: string;

  constructor(statusCode: number, message: string, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, code: string = 'BAD_REQUEST'): HttpError => {
  return new HttpError(400, message, code);
};

export const unauthorized = (message: string = 'Unauthorized', code: string = 'UNAUTHORIZED'): HttpError => {
  return new HttpError(401, message, code);
};

export const forbidden = (message: string = 'Forbidden', code: string = 'FORBIDDEN'): HttpError => {
  return new HttpError(403, message, code);
};

export const notFound = (message: string = 'Not Found', code: string = 'NOT_FOUND'): HttpError => {
  return new HttpError(404, message, code);
};

export const conflict = (message: string, code: string = 'CONFLICT'): HttpError => {
  return new HttpError(409, message, code);
};

export const internalError = (message: string = 'Internal Server Error', code: string = 'INTERNAL_ERROR'): HttpError => {
  return new HttpError(500, message, code);
};

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  if ('statusCode' in err) {
    res.status(err.statusCode).json({
      error: err.code || 'ERROR',
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
};