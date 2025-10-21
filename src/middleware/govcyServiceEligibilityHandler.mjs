import { govcyApiRequest } from "../utils/govcyApiRequest.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { getEnvVariable, getEnvVariableBool } from "../utils/govcyEnvVariables.mjs";
import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";

// Helper to show error page or redirect (reuse your review handler logic)
function handleEligibilityError(res, errorPage,next) {
    if (errorPage) {
        return res.redirect(errorPage);
    }
    // fallback: show generic error
    return handleMiddlewareError("Eligibility check failed", 403, next);
}

export function govcyServiceEligibilityHandler(checkForForm = false) {
    return async (req, res, next) => {
        try {
            const service = req.serviceData;
            // Extract siteId and pageUrl from request
            let { siteId, pageUrl } = req.params; 
            // If `checkForForm` is set, check if page has no form and skip the eligibility check 
            if (checkForForm) {
                // 🏠 Handle index page: If pageUrl is undefined (meaning the user accessed `/:siteId`), set a default value or handle accordingly
                if (!pageUrl) pageUrl = "index";
                // 🔍 Find the page by pageUrl
                const page = getPageConfigData(service, pageUrl);
                // ----- `updateMyDetails` handling. always run eligibility for updateMyDetails
                if (!page.updateMyDetails) {
                    if (!page || !page.pageTemplate) return next(); // Defensive: skip if no template
                    // Deep copy pageTemplate to avoid modifying the original
                    const pageTemplateCopy = JSON.parse(JSON.stringify(page.pageTemplate));
    
                    // Check if any section contains a form element
                    const hasForm = pageTemplateCopy.sections?.some(section =>
                        section.elements?.some(el => el.element === "form")
                    );
                    if (!hasForm) {
                        // No form found, skip eligibility check
                        return next();
                    }
                    // else: continue with eligibility check
                }
            }
            const eligibilityEndpoints = service?.site?.eligibilityAPIEndpoints || [];
            const user = dataLayer.getUser(req.session); // Get the user from the session;

            for (const endpoint of eligibilityEndpoints) {
                // get the API endpoint URL, clientKey, serviceId from the environment variable (handle edge cases)
                const url = getEnvVariable(endpoint?.url || "", false);
                const clientKey = getEnvVariable(endpoint?.clientKey || "", false);
                const serviceId = getEnvVariable(endpoint?.serviceId || "", false);
                const dsfGtwApiKey = getEnvVariable(endpoint?.dsfgtwApiKey || "", "");
                const cashingTimeoutMinutes = endpoint?.cashingTimeoutMinutes ||  0; // Default to 0 if not set
                const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES",false) ; // Default to false if not set
                if (!url) {
                    return handleMiddlewareError("🚨 Service eligibility API endpoint URL is missing", 500, next);
                }
                if (!clientKey) {
                    return handleMiddlewareError("🚨 Service eligibility API clientKey is missing", 500, next);
                }
                if (!serviceId) {
                    return handleMiddlewareError("🚨 Service eligibility API serviceId is missing", 500, next);
                }

                const endpointKey = endpoint?.url || "defaultEndpoint"; 
                const maxAgeMs = cashingTimeoutMinutes * 60 * 1000; // convert minutes to milliseconds
                const params = endpoint?.params || {};
                const method = (endpoint?.method || "GET").toLowerCase();
                // Check if eligibility result is cached
                let response = dataLayer.getSiteEligibilityResult(req.session, siteId, endpointKey, maxAgeMs);
                if (!response) {
                    // Call the eligibility API
                    response = await govcyApiRequest(
                        method,
                        url,
                        params, 
                        true,
                        user,
                        { 
                            accept: "text/plain",       // Set Accept header to text/plain
                            "client-key": clientKey,    // Set the client key header
                            "service-id": serviceId,    // Set the service ID header
                            ...(dsfGtwApiKey !== '' && { "dsfgtw-api-key": dsfGtwApiKey }) // Use the DSF API GTW secret from environment variables
                        },
                        3,
                        allowSelfSignedCerts
                    );
                    // Cache the result
                    dataLayer.storeSiteEligibilityResult(req.session, siteId, endpointKey, response);
                }

                // If not eligible, handle error
                if (!response.Succeeded) {
                    // Try to find a custom error page for this error code
                    const errorPage = endpoint.response?.errorResponse?.[String(response.ErrorCode)]?.page;
                    logger.info(`Eligibility check failed: ${response.ErrorMessage || response.ErrorCode}`);
                    return handleEligibilityError(res, errorPage, next);
                }
            }

            // All checks passed
            next();
        } catch (err) {
            return next(err); // Pass error to govcyHttpErrorHandler
        }
    };
}