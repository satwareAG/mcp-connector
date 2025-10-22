import crypto from 'crypto';
import { AUTH, HTTP_STATUS } from './constants.js';

/**
 * Authenticates a request using bearer token authentication
 * @param {string} expectedToken - The expected authentication token
 * @returns {Function} Express middleware function
 */
export function authMiddleware(expectedToken) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ error: 'Authorization header is required' });
    }

    // Check if authorization type is Bearer (case-sensitive)
    if (!authHeader.startsWith('Bearer ')) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ error: 'Authorization type must be Bearer' });
    }

    // Extract token (everything after "Bearer ")
    const token = authHeader.substring(AUTH.BEARER_PREFIX_LENGTH);

    // Validate token is not empty
    if (!token || token.trim() === '') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid authentication token' });
    }

    // Use constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedToken, 'utf8');
    const providedBuffer = Buffer.from(token, 'utf8');

    // Ensure buffers are same length before comparison
    if (expectedBuffer.length !== providedBuffer.length) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid authentication token' });
    }

    // Constant-time comparison
    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);

    if (!isValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid authentication token' });
    }

    next();
  };
}
