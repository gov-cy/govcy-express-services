/**
 * Middleware to set security and cache control headers for GovCy API responses.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
*/
export function noCacheAndSecurityHeaders(req, res, next) {
    //set security headers
    res.set({
        'X-Content-Type-Options': 'nosniff', //Prevents browsers from MIME-sniffing a response away from the declared Content-Type
        'X-Frame-Options': 'SAMEORIGIN', //Prevents clickjacking by disallowing the site from being embedded in an <iframe>, unless from the same origin
        'X-XSS-Protection': '1; mode=block', // Optional - only if you really want to support old IE versions
        'Content-Security-Policy': "frame-ancestors 'self'", // Modern approach to control what domains are allowed to embed your site in an iframe.
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', // Forces browsers to use HTTPS only, even for future visits.
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
}
