/**
 * Middleware to ensure session storage exists for GovCy data. 
 */
export function govcySessionData(req, res, next) {
    if (!req.session.siteData) {
        req.session.siteData = {}; // Ensure session storage exists
    }
    next();
}
