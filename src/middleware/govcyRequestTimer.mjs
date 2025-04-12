import { logger } from '../utils/govcyLogger.mjs';

/**
 * Middleware to log the duration of each request.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {function} next The next middleware function
 */
export function requestTimer(req, res, next) {
    // Record the start time of the request
    req.startTime = Date.now();

    // Listen for the 'finish' event on the response
    res.on('finish', () => {
        const duration = Date.now() - req.startTime; // Calculate duration
        logger.debug('Request completed', {
            method: req.method,
            url: req.originalUrl,
            duration: `${duration}ms`,
            status: res.statusCode
        });
        if (duration > 500) {
            logger.debug('[WARNING] - Slow request detected',  duration );
        }
    });

    next(); // Pass control to the next middleware
}