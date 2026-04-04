import { HttpError, badRequest, unauthorized, forbidden, notFound, conflict } from '../../src/utils/errors';

describe('Error Utilities', () => {
  describe('HttpError', () => {
    it('should create an HTTP error with status code and message', () => {
      const error = new HttpError(400, 'Bad Request', 'BAD_REQUEST');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  describe('badRequest', () => {
    it('should create a 400 error', () => {
      const error = badRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  describe('unauthorized', () => {
    it('should create a 401 error with default message', () => {
      const error = unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('should create a 401 error with custom message', () => {
      const error = unauthorized('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('forbidden', () => {
    it('should create a 403 error', () => {
      const error = forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('notFound', () => {
    it('should create a 404 error', () => {
      const error = notFound('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('conflict', () => {
    it('should create a 409 error', () => {
      const error = conflict('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
    });
  });
});