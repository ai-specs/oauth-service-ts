import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

// Rate limiting for token endpoint
export const tokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for introspect endpoint
export const introspectRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
export const securityMiddleware = [
  helmet(),
  cors({
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
];

// Request logging middleware
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
};

// JSON body parser middleware (should be applied in app.ts)
export const jsonBodyParser = {
  limit: '1mb',
};