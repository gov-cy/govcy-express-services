import { logger } from "../utils/govcyLogger.mjs";
import { govcyLoadSubmissionDataAPIs } from "../utils/govcyLoadSubmissionDataAPIs.mjs";
/**
 * Middleware to load submission data from APIs.
 * This middleware fetches submission data from configured APIs and stores it in the session. 
 * @returns {function} Middleware function to load submission data from APIs
 */
export function govcyLoadSubmissionData() {
    return async (req, res, next) => {
        try {
            const service = req.serviceData;
            // Extract siteId from request
            const { siteId } = req.params;

            return await govcyLoadSubmissionDataAPIs(req.session, service, siteId, next);
            
        } catch (error) {
            logger.error("Error in govcyLoadSubmissionData middleware:", error.message);
            return next(error); // Pass the error to the next middleware
        }
    }
}