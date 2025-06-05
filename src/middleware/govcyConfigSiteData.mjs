import { getServiceConfigData } from "../utils/govcyLoadConfigData.mjs";

/**
 * Middleware to load service configuration data based on siteId and language.
 * This middleware fetches the service data and attaches it to the request object.
 *  
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
 */
export async function serviceConfigDataMiddleware(req, res, next) {
    try {
        const { siteId } = req.params;
        req.serviceData = await getServiceConfigData(siteId, req.globalLang);

        // Store current service 
        if (siteId) {
            //create a cookie for current service
            res.cookie('cs', siteId, {
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                httpOnly: true,
                sameSite: 'lax'
            });
            // req.session.homeRedirectPage = req.serviceData.site.homeRedirectPage;
        } else {
            // delete the cookie if id is not available
            res.clearCookie('cs', {
                httpOnly: true,
                sameSite: 'lax'
            });
        }

        next();
    } catch (error) {
        return next(error)
    }

}