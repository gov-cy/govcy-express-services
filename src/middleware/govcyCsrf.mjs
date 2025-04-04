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

  // Check token on POST requests
  if (req.method === 'POST') {
    const tokenFromBody = req.body._csrf;
    if (!tokenFromBody || tokenFromBody !== req.session.csrfToken) {
      const error = new Error('Invalid CSRF token');
      error.status = 403;
      return next(error);  // Pass error to govcyHttpErrorHandler
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
