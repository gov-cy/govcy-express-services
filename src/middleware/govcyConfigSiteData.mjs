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
        next();
    } catch (error) {
        return next(error)
    }

}