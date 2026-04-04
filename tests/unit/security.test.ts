/**
 * Unit tests for security middleware and utilities
 */

import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

describe('Security Middleware', () => {
  describe('Helmet Security Headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const app = express();
      app.use(helmet());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const app = express();
      app.use(helmet());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test');

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should set X-XSS-Protection header', async () => {
      const app = express();
      app.use(helmet());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test');

      // Note: helmet may not set this in newer versions as it's deprecated
      // Check for presence or absence depending on helmet version
      const xssHeader = response.headers['x-xss-protection'];
      expect(xssHeader === undefined || xssHeader === '0').toBeTruthy();
    });

    it('should set Strict-Transport-Security header when configured', async () => {
      const app = express();
      app.use(helmet({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
        }
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test');

      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should allow specified origins', async () => {
      const app = express();
      app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true,
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow credentials', async () => {
      const app = express();
      app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true,
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should block unspecified origins', async () => {
      const app = express();
      app.use(cors({
        origin: ['http://localhost:3000'], // Array format for proper blocking
        credentials: true,
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://evil.com');

      // When origin is an array, unmatched origins don't get the header
      const allowOrigin = response.headers['access-control-allow-origin'];
      expect(allowOrigin === undefined || allowOrigin !== 'http://evil.com').toBeTruthy();
    });

    it('should handle OPTIONS preflight requests', async () => {
      const app = express();
      app.use(cors({
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});

describe('Input Validation', () => {
  describe('Request Body Size Limits', () => {
    it('should reject large JSON payloads', async () => {
      const app = express();
      app.use(express.json({ limit: '1kb' }));
      app.post('/test', (req, res) => res.json({ received: true }));

      const largePayload = { data: 'x'.repeat(2000) };
      const response = await request(app)
        .post('/test')
        .send(largePayload);

      expect(response.status).toBe(413); // Payload Too Large
    });

    it('should accept payloads within limit', async () => {
      const app = express();
      app.use(express.json({ limit: '10kb' }));
      app.post('/test', (req, res) => res.json({ received: true }));

      const smallPayload = { data: 'test' };
      const response = await request(app)
        .post('/test')
        .send(smallPayload);

      expect(response.status).toBe(200);
    });
  });

  describe('URL-encoded Body Parsing', () => {
    it('should parse URL-encoded bodies correctly', async () => {
      const app = express();
      app.use(express.urlencoded({ extended: true }));
      app.post('/test', (req, res) => res.json(req.body));

      const response = await request(app)
        .post('/test')
        .type('form')
        .send('grant_type=authorization_code&client_id=test');

      expect(response.body.grant_type).toBe('authorization_code');
      expect(response.body.client_id).toBe('test');
    });

    it('should handle nested objects in URL-encoded bodies', async () => {
      const app = express();
      app.use(express.urlencoded({ extended: true }));
      app.post('/test', (req, res) => res.json(req.body));

      const response = await request(app)
        .post('/test')
        .type('form')
        .send('redirect_uris[0]=http://localhost/callback');

      expect(response.body.redirect_uris[0]).toBe('http://localhost/callback');
    });
  });
});

describe('Error Response Format', () => {
  it('should use OAuth 2.0 standard error format', async () => {
    // OAuth 2.0 requires error responses to have 'error' and optionally 'error_description'
    const errorTypes = [
      'invalid_request',
      'invalid_client',
      'invalid_grant',
      'unauthorized_client',
      'unsupported_grant_type',
      'invalid_scope',
      'server_error',
      'temporarily_unavailable',
    ];

    for (const errorType of errorTypes) {
      const app = express();
      app.get('/test', (req, res) => {
        res.status(400).json({
          error: errorType,
          error_description: `Test error for ${errorType}`,
        });
      });

      const response = await request(app).get('/test');

      expect(response.body).toHaveProperty('error', errorType);
      expect(response.body).toHaveProperty('error_description');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.error_description).toBe('string');
    }
  });

  it('should not expose internal error details', async () => {
    const app = express();
    app.get('/test', () => {
      throw new Error('Internal database connection failed at xyz');
    });
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Production error handler - hide internal details
      res.status(500).json({
        error: 'server_error',
        error_description: 'An unexpected error occurred',
      });
    });

    const response = await request(app).get('/test');

    expect(response.body.error_description).not.toContain('database');
    expect(response.body.error_description).not.toContain('xyz');
  });
});

describe('Authentication Header Validation', () => {
  it('should parse Basic auth header correctly', async () => {
    const app = express();
    app.use(express.json());
    app.get('/test', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'invalid_client' });
      }

      const [type, credentials] = authHeader.split(' ');
      if (type !== 'Basic') {
        return res.status(401).json({ error: 'invalid_client' });
      }

      const decoded = Buffer.from(credentials, 'base64').toString();
      const [clientId, clientSecret] = decoded.split(':');

      res.json({ clientId, clientSecret });
    });

    const credentials = Buffer.from('test_client:test_secret').toString('base64');
    const response = await request(app)
      .get('/test')
      .set('Authorization', `Basic ${credentials}`);

    expect(response.body.clientId).toBe('test_client');
    expect(response.body.clientSecret).toBe('test_secret');
  });

  it('should parse Bearer auth header correctly', async () => {
    const app = express();
    app.use(express.json());
    app.get('/test', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'invalid_token' });
      }

      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer') {
        return res.status(401).json({ error: 'invalid_token' });
      }

      res.json({ token });
    });

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer test_access_token');

    expect(response.body.token).toBe('test_access_token');
  });

  it('should reject invalid Authorization header format', async () => {
    const app = express();
    app.use(express.json());
    app.get('/test', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'invalid_token' });
      }

      res.json({ ok: true });
    });

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'InvalidFormat token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_token');
  });
});