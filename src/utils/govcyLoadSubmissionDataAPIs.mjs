import { govcyApiRequest } from "./govcyApiRequest.mjs";
import { logger } from "./govcyLogger.mjs";
import { getEnvVariable, getEnvVariableBool } from "./govcyEnvVariables.mjs";
import { handleMiddlewareError } from "./govcyUtils.mjs";
import * as dataLayer from "./govcyDataLayer.mjs";

/**
 * Load submission data from configured APIs and store it in the session.
 * @param {object} store The session store
 * @param {object} service The service configuration
 * @param {string} siteId The site id
 * @param {function} next The next middleware function
 */
export async function govcyLoadSubmissionDataAPIs(store, service, siteId, next) {
    try {

        // Get the API endpoints 
        const getCfg = service?.site?.submissionGetAPIEndpoint;
        const putCfg = service?.site?.submissionPutAPIEndpoint;

        //If siteLoadData already exists, skip the API call
        const siteLoadData = dataLayer.getSiteLoadData(store, siteId);
        if (siteLoadData && Object.keys(siteLoadData).length > 0) {
            // Data exists, skip API call
            logger.debug("Load data already exists for site:", siteId);
            return next();
        }
        
        // Only continue if both endpoints and required fields are defined
        if (
            getCfg && putCfg &&
            getCfg.clientKey && getCfg.serviceId &&
            putCfg.clientKey && putCfg.serviceId 
        ){
            const user = dataLayer.getUser(store); // Get the user from the session;

            // get the API endpoint URL, clientKey, serviceId from the environment variable (handle edge cases)
            const getCfgUrl = getEnvVariable(getCfg?.url || "", false);
            const getCfgClientKey = getEnvVariable(getCfg?.clientKey || "", false);
            const getCfgServiceId = getEnvVariable(getCfg?.serviceId || "", false);
            const getCfgDsfGtwApiKey = getEnvVariable(getCfg?.dsfgtwApiKey || "", "");
            const getCfgParams = getCfg?.params || {};
            const getCfgMethod = (getCfg?.method || "GET").toLowerCase();
            const putCfgUrl = getEnvVariable(putCfg?.url || "", false);
            const putCfgClientKey = getEnvVariable(putCfg?.clientKey || "", false);
            const putCfgServiceId = getEnvVariable(putCfg?.serviceId || "", false);
            const putCfgDsfGtwApiKey = getEnvVariable(putCfg?.dsfgtwApiKey || "", "");
            const putCfgParams = putCfg?.params || {};
            const putCfgMethod = (putCfg?.method || "PUT").toLowerCase();

            const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES",false) ; // Default to false if not set
            
            // check necessary values exist
            if (!getCfgUrl || !getCfgClientKey 
                || !putCfgUrl || !putCfgClientKey ) {
                
                return handleMiddlewareError(`🚨 Get submission environment variable missing: 
                        getURl : ${getCfgUrl}, getClientKey : ${getCfgClientKey}
                        putURl : ${putCfgUrl}, putClientKey : ${putCfgClientKey}`
                    , 500, next)
            }
            // get response form GET submission API
            const getResponse = await govcyApiRequest(
                getCfgMethod,
                getCfgUrl,
                getCfgParams,
                true, // use access token auth
                user,
                { 
                    accept: "text/plain",       // Set Accept header to text/plain
                    "client-key": getCfgClientKey,    // Set the client key header
                    "service-id": getCfgServiceId,    // Set the service ID header
                    ...(getCfgDsfGtwApiKey !== '' && { "dsfgtw-api-key": getCfgDsfGtwApiKey }) // Use the DSF API GTW secret from environment variables
                },
                3,
                allowSelfSignedCerts
            );

            // If not succeeded, handle error
            if (!getResponse.Succeeded) {
                logger.debug("govcyLoadSubmissionData returned succeeded false",getResponse)
                return handleMiddlewareError(`🚨 govcyLoadSubmissionData returned succeeded false`, 500, next)
            }
            
            //  check if getResponse.Data is defined
            if (getResponse.Data) {
                // Store the response in the request for later use
                dataLayer.storeSiteLoadData(store, siteId, getResponse.Data);

                try {
                    const parsed = JSON.parse(getResponse.Data.submissionData || "{}");
                    if (parsed && typeof parsed === "object") {
                        dataLayer.storeSiteInputData(store, siteId, parsed);
                        logger.debug(`💾 Input data restored from saved submission for siteId: ${siteId}`);
                    }
                } catch (err) {
                    logger.warn(`⚠️ Failed to parse saved submissionData for siteId: ${siteId}`, err);
                }

            // if not call the PUT submission API
            } else {
                // If no data, call the PUT submission API to create it
                const putResponse = await govcyApiRequest(
                    putCfgMethod,
                    putCfgUrl,
                    putCfgParams,
                    true, // use access token auth
                    user,
                    { 
                        accept: "text/plain",       // Set Accept header to text/plain
                        "client-key": putCfgClientKey,    // Set the client key header
                        "service-id": putCfgServiceId,    // Set the service ID header
                        ...(putCfgDsfGtwApiKey !== '' && { "dsfgtw-api-key": putCfgDsfGtwApiKey }) // Use the DSF API GTW secret from environment variables
                    },
                    3,
                    allowSelfSignedCerts
                );
                // If not succeeded, handle error
                if (!putResponse.Succeeded) {
                    logger.debug("govcyLoadSubmissionData returned succeeded false",putResponse)
                    return handleMiddlewareError(`🚨 govcyLoadSubmissionData returned succeeded false`, 500, next)
                }
                // Store the response in the request for later use
                dataLayer.storeSiteLoadData(store, siteId, putResponse.Data);

            }
            
        }
        
    next();
    } catch (error) {
        logger.error("Error in govcyLoadSubmissionData middleware:", error.message);
        return next(error); // Pass the error to the next middleware
    }
}
