/**
 * Helper function to handle errors in middleware.
 * Creates an error object and passes it to the next middleware.
 *
 * @param {string} message - The error message.
 * @param {number} status - The HTTP status code.
 * @param {function} next - The Express `next` function.
 */
export function handleMiddlewareError(message, status, next) {
    const error = new Error(message);
    error.status = status;
    return next(error);
}