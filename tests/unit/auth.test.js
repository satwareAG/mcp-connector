/**
 * Unit tests for lib/auth.js - Bearer token authentication middleware
 * Following TDD methodology: Write tests first, verify they fail, then implement
 */

import { describe, it, expect, jest } from '@jest/globals';
import { authMiddleware } from '../../lib/auth.js';

describe('authMiddleware', () => {
  describe('valid authentication', () => {
    it('should call next() when valid Bearer token provided', () => {
      const authToken = 'test-secret-token-123';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Bearer test-secret-token-123',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should be case-sensitive for token comparison', () => {
      const authToken = 'SecretToken123';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Bearer SecretToken123',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('authentication failures', () => {
    it('should return 401 when Authorization header is missing', () => {
      const authToken = 'test-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authorization header is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization type is not Bearer', () => {
      const authToken = 'test-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Basic test-token',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authorization type must be Bearer',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token does not match', () => {
      const authToken = 'correct-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Bearer wrong-token',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid authentication token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has wrong case (bearer vs Bearer)', () => {
      const authToken = 'test-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'bearer test-token',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authorization type must be Bearer',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is empty string', () => {
      const authToken = 'test-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Bearer ',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid authentication token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle authorization header with extra whitespace', () => {
      const authToken = 'test-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Bearer   test-token',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      // Should fail because token includes whitespace
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle malformed authorization header without space', () => {
      const authToken = 'test-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Bearertest-token',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle authorization header with only Bearer keyword', () => {
      const authToken = 'test-token';
      const middleware = authMiddleware(authToken);

      const req = {
        headers: {
          authorization: 'Bearer',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
