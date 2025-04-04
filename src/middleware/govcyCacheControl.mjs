
/**
 * Middleware to set cache control headers for GovCy API responses.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
 */
export function noCache(req, res, next) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
}
