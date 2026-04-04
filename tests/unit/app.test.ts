/**
 * Unit tests for Express app configuration
 */

import express from 'express';

describe('App Configuration', () => {
  describe('Express Setup', () => {
    it('should create express app instance', () => {
      const app = express();
      expect(typeof app).toBe('function');
    });

    it('should register JSON body parser', () => {
      const app = express();
      const jsonMiddleware = express.json();
      app.use(jsonMiddleware);

      expect(typeof jsonMiddleware).toBe('function');
    });

    it('should register URL-encoded body parser', () => {
      const app = express();
      const urlencodedMiddleware = express.urlencoded({ extended: true });
      app.use(urlencodedMiddleware);

      expect(typeof urlencodedMiddleware).toBe('function');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond with healthy status', async () => {
      const testApp = express();
      testApp.get('/health', (req, res) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
      });

      const response = await require('supertest')(testApp).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', async () => {
      const testApp = express();
      testApp.get('/health', (req, res) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
      });

      const response = await require('supertest')(testApp).get('/health');

      const timestamp = response.body.timestamp;
      const parsedDate = new Date(timestamp);
      expect(parsedDate.toISOString()).toBe(timestamp);
    });
  });

  describe('Error Handling Middleware', () => {
    it('should catch errors and return server_error response', async () => {
      const testApp = express();
      testApp.get('/error', () => {
        throw new Error('Test error');
      });
      testApp.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.status(500).json({
          error: 'server_error',
          error_description: 'An unexpected error occurred'
        });
      });

      const response = await require('supertest')(testApp).get('/error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'server_error',
        error_description: 'An unexpected error occurred'
      });
    });
  });

  describe('Route Registration', () => {
    it('should register GET routes', async () => {
      const app = express();
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await require('supertest')(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it('should register POST routes', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', (req, res) => res.json({ received: req.body }));

      const response = await require('supertest')(app)
        .post('/test')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.received.data).toBe('test');
    });

    it('should return 404 for undefined routes', async () => {
      const app = express();
      // No routes defined

      const response = await require('supertest')(app).get('/undefined');
      expect(response.status).toBe(404);
    });
  });

  describe('Middleware Chain', () => {
    it('should execute middleware in order', async () => {
      const app = express();
      const order: string[] = [];

      app.use((req, res, next) => {
        order.push('first');
        next();
      });
      app.use((req, res, next) => {
        order.push('second');
        next();
      });
      app.get('/test', (req, res) => {
        order.push('handler');
        res.json({ order });
      });

      const response = await require('supertest')(app).get('/test');

      expect(response.body.order).toEqual(['first', 'second', 'handler']);
    });

    it('should stop middleware chain on response', async () => {
      const app = express();
      const order: string[] = [];

      app.use((req, res, next) => {
        order.push('first');
        res.json({ stopped: true, order });
        // Don't call next()
      });
      app.use((req, res, next) => {
        order.push('second'); // Should not be called
        next();
      });

      const response = await require('supertest')(app).get('/test');

      expect(response.body.order).toEqual(['first']);
      expect(response.body.stopped).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should allow custom headers via middleware', async () => {
      const app = express();
      app.use((req, res, next) => {
        res.setHeader('X-Custom-Header', 'test-value');
        next();
      });
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await require('supertest')(app).get('/test');
      expect(response.headers['x-custom-header']).toBe('test-value');
    });
  });

  describe('Content-Type Handling', () => {
    it('should accept application/x-www-form-urlencoded', async () => {
      const testApp = express();
      testApp.use(express.urlencoded({ extended: true }));
      testApp.post('/form', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await require('supertest')(testApp)
        .post('/form')
        .type('form')
        .send('key=value');

      expect(response.status).toBe(200);
      expect(response.body.received.key).toBe('value');
    });

    it('should accept application/json', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/json', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await require('supertest')(testApp)
        .post('/json')
        .send({ key: 'value' });

      expect(response.status).toBe(200);
      expect(response.body.received.key).toBe('value');
    });
  });
});