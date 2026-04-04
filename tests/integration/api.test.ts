import request from 'supertest';
import app from '../../src/app';

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });
});

describe('Client Management', () => {
  describe('POST /clients', () => {
    it('should create a new OAuth client', async () => {
      const response = await request(app)
        .post('/clients')
        .send({
          name: 'Test Client',
          redirect_uris: ['http://localhost:3000/callback'],
          scopes: ['read', 'write'],
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('clientId');
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body.name).toBe('Test Client');
    });

    it('should reject invalid redirect_uri', async () => {
      const response = await request(app)
        .post('/clients')
        .send({
          name: 'Test Client',
          redirect_uris: ['invalid-url'],
          scopes: ['read'],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/clients')
        .send({
          name: 'Test Client',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /clients/:id', () => {
    it('should return 404 for non-existent client', async () => {
      const response = await request(app)
        .get('/clients/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NOT_FOUND');
    });
  });

  describe('DELETE /clients/:id', () => {
    it('should return 404 for non-existent client', async () => {
      const response = await request(app)
        .delete('/clients/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NOT_FOUND');
    });
  });
});

describe('OAuth Endpoints', () => {
  describe('GET /oauth/authorize', () => {
    it('should redirect with authorization code', async () => {
      // First create a client
      const clientResponse = await request(app)
        .post('/clients')
        .send({
          name: 'Test App',
          redirect_uris: ['http://localhost:3000/callback'],
          scopes: ['read', 'write'],
        });

      const clientId = clientResponse.body.clientId;

      const response = await request(app)
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: 'http://localhost:3000/callback',
          scope: 'read',
          state: 'random-state',
        })
        .expect(302);

      expect(response.headers.location).toContain('http://localhost:3000/callback');
      expect(response.headers.location).toContain('code=');
      expect(response.headers.location).toContain('state=random-state');
    });

    it('should reject invalid client_id', async () => {
      const response = await request(app)
        .get('/oauth/authorize')
        .query({
          response_type: 'code',
          client_id: 'invalid-client',
          redirect_uri: 'http://localhost:3000/callback',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /oauth/token', () => {
    it('should reject missing grant_type', async () => {
      const response = await request(app)
        .post('/oauth/token')
        .send({
          client_id: 'test-client',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /oauth/introspect', () => {
    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/oauth/introspect')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /oauth/revoke', () => {
    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/oauth/revoke')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});