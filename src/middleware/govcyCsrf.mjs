
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { errorResponse } from '../utils/govcyApiResponse.mjs';
import { isApiRequest } from '../utils/govcyApiDetection.mjs';

/**
 * Middleware to handle CSRF token generation and validation.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
 */
export function govcyCsrfMiddleware(req, res, next) {
  // Generate token on first request per session
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateRandonToken();
  }

  req.csrfToken = () => req.session.csrfToken;
  
  if (
    req.method === 'POST' &&
    req.headers['content-type']?.includes('multipart/form-data') &&
    isApiRequest(req)) {
    const tokenFromHeader = req.get('X-CSRF-Token');
    // UNCOMMENT
    if (!tokenFromHeader || tokenFromHeader !== req.session.csrfToken) {
      return res.status(400).json(errorResponse(403, 'Invalid CSRF token'));
    }
    return next();
  } 
  // Check token on POST requests
  if (req.method === 'POST') {
    const tokenFromBody = req.body._csrf;
    if (!tokenFromBody || tokenFromBody !== req.session.csrfToken) {
      return handleMiddlewareError("🚨 Invalid CSRF token", 403, next); // Pass error to govcyHttpErrorHandler
    }
  }

  next();
}

/**
 * Generate a random token string.
 * 
 * @returns {string} A random token string
 */
export function generateRandonToken() {
  return [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
}
