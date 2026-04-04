import { Request, Response, NextFunction } from 'express';

// Type for async request handlers that works with Express's default Request type
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Wrapper to safely handle async routes - converts async handler to standard express handler
export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};