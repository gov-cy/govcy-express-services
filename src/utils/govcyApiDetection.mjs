/**
 * Determines if a request is targeting an API endpoint.
 * Currently matches:
 * - Accept header with application/json
 * - URLs ending with /upload or /download under a site/page structure
 *
 * @param {object} req - Express request object
 * @returns {boolean}
 */
export function isApiRequest(req) {
  const acceptJson = (req.headers?.accept || "").toLowerCase().includes("application/json");

  const apiUrlPattern = /^\/[^/]+\/[^/]+\/(upload|download)$/;
  const isStructuredApiUrl = apiUrlPattern.test(req.originalUrl || req.url);

  return acceptJson || isStructuredApiUrl;
}
