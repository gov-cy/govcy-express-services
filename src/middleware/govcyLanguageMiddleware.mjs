/**
 * Middleware to set the language for the GovCy application.
 * It checks the query parameter and cookie for the language setting. 
 */
export function govcyLanguageMiddleware(req, res, next) {
    let lang = req.query.lang || req.cookies.lang || 'el'; // Default to 'en' if not set

    // let lang = req.query.lang 
    
    if (req.query.lang) {
        res.cookie('lang', lang, { 
            maxAge: 365 * 24 * 60 * 60 * 1000, 
            httpOnly: true, 
            sameSite: 'lax' });
    }

    req.globalLang = lang; // Store language for request lifecycle
    next();
}
