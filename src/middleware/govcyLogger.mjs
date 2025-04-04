import { logger } from '../utils/govcyLogger.mjs';

/**
 * Middleware to log incoming requests. 
 */
export function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}]`, req.method, req.url);

  if (req.session) {
    logger.info(`Session ID: ${req.sessionID}`);
  }

  next(); // Pass control to the next middleware
}
