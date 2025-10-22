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

/**
 * Helper function to format a date in the format D/M/YYYY.
 * 
 * @param {string} dateString - The date string in the format YYYY-MM-DD.
 * @returns {string} The formatted date in the format D/M/YYYY.
 */
export function dateStringISOtoDMY(dateString) {
  if (typeof dateString !== "string" || !dateString.trim()) return "";
  const [year, month, day] = dateString.trim().split("-");
  return `${parseInt(day)}/${parseInt(month)}/${year}`;
}