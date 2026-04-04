import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import oauthRoutes from './routes/oauthRoutes';
import clientRoutes from './routes/clientRoutes';
import { errorHandler } from './utils/errors';
import { connectRedis, disconnectRedis } from './utils/redis';
import prisma from './utils/database';
import { config } from './utils/config';

dotenv.config();

const app = express();

// View engine configuration (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files serving
app.use(express.static(path.join(__dirname, 'public')));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting for token endpoint
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'too_many_requests', error_description: 'Too many requests' }
});

// Rate limiting for introspect endpoint
const introspectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: { error: 'too_many_requests', error_description: 'Too many requests' }
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/oauth', oauthRoutes);
app.use('/clients', clientRoutes);

// Apply rate limiting to specific endpoints
app.use('/oauth/token', tokenLimiter);
app.use('/oauth/introspect', introspectLimiter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource was not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    await connectRedis();
    console.log('Connected to Redis');

    app.listen(config.port, () => {
      console.log(`OAuth service running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  console.log('Received shutdown signal, closing connections...');
  try {
    await disconnectRedis();
    await prisma.$disconnect();
    console.log('Connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();

export default app;