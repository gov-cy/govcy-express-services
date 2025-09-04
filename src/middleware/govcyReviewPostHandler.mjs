import * as govcyResources from "../resources/govcyResources.mjs";
import { validateFormElements  } from "../utils/govcyValidator.mjs"; // Import your validator
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import {prepareSubmissionData, prepareSubmissionDataAPI, generateSubmitEmail } from "../utils/govcySubmitData.mjs";
import { govcyApiRequest } from "../utils/govcyApiRequest.mjs";
import { getEnvVariable, getEnvVariableBool } from "../utils/govcyEnvVariables.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { sendEmail } from "../utils/govcyNotification.mjs"
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";

/**
 * Middleware to handle review page form submission
 * This middleware processes the review page, validates form data, and shows validation errors.
 */
export function govcyReviewPostHandler() {
    return async (req, res, next) => {
        try {
            const { siteId } = req.params;
    
            // ✅ Load service and check if it exists
            const service = req.serviceData;
            let validationErrors = {};

            // Loop through all pages in the service
            for (const page of service.pages) {
                //get page url
                const pageUrl = page.pageData.url;
                
                // ----- Conditional logic comes here
                // ✅ Skip validation if page is conditionally excluded
                const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
                if (conditionResult.result === false) {
                    logger.debug(`⏩ Skipping validation for conditionally excluded page '${pageUrl}' → Redirects to '${conditionResult.redirect}'`, req);
                    continue;
                }

                // Find the form definition inside `pageTemplate.sections`
                let formElement = null;
                for (const section of page.pageTemplate.sections) {
                    formElement = section.elements.find(el => el.element === "form");
                    if (formElement) break;
                }

                if (!formElement) continue; // Skip pages without forms

                // Get stored form data for this page (or default to empty)
                const formData = dataLayer.getPageData(req.session, siteId, pageUrl) || {};
                
                // Run validations
                const errors = validateFormElements(formElement.params.elements, formData, pageUrl);

                // Add errors to the validationErrors object
                validationErrors = { ...validationErrors, ...errors };
            }

            // ❌ Return validation errors if any exist
            if (Object.keys(validationErrors).length > 0) {
                logger.debug("🚨 Validation errors:", validationErrors, req);
                logger.info("🚨 Validation errors:", req.originalUrl);
                dataLayer.storeSiteValidationErrors(req.session, siteId, validationErrors);
                //redirect to the same page with error summary
                return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
            } else {
                // ------------ DO SUBMISSION ---------------------
                // get the submission API endpoint URL, clientKey, serviceId from the environment variable (handle edge cases)
                const submissionUrl = getEnvVariable(service?.site?.submissionAPIEndpoint?.url || "", false);
                const clientKey = getEnvVariable(service?.site?.submissionAPIEndpoint?.clientKey || "", false);
                const serviceId = getEnvVariable(service?.site?.submissionAPIEndpoint?.serviceId || "", false);
                const dsfGtwApiKey = getEnvVariable(service?.site?.submissionAPIEndpoint?.dsfgtwApiKey || "", "");
                const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES",false) ; // Default to false if not set
                if (!submissionUrl) {
                    return handleMiddlewareError("🚨 Submission API endpoint URL is missing", 500, next);
                }
                if (!clientKey) {
                    return handleMiddlewareError("🚨 Submission API clientKey is missing", 500, next);
                }
                if (!serviceId) {
                    return handleMiddlewareError("🚨 Submission API serviceId is missing", 500, next);
                }
                
                // Prepare submission data
                const submissionData = prepareSubmissionData(req, siteId, service);

                // Prepare submission data for API
                const submissionDataAPI = prepareSubmissionDataAPI(submissionData);
                
                logger.debug("Prepared submission data for API:", submissionDataAPI);

                // Call the API to submit the data
                const response = await govcyApiRequest(
                    "post",                         // Use POST method
                    submissionUrl,                  // Use the submission URL from the environment variable
                    submissionDataAPI,                 // Pass the prepared submission data
                    true,                           // Use access token authentication
                    dataLayer.getUser(req.session), // Get the user from the session
                    { 
                        accept: "text/plain",       // Set Accept header to text/plain
                        "client-key": clientKey,    // Set the client key header
                        "service-id": serviceId,    // Set the service ID header
                        ...(dsfGtwApiKey !== '' && { "dsfgtw-api-key": dsfGtwApiKey }) // Use the DSF API GTW secret from environment variables
                    },
                    3,
                    allowSelfSignedCerts
                );
                
                // Check if the response is successful
                if (response.Succeeded) {
                    let referenceNo = response?.Data?.referenceValue || "";
                    // Add the reference number to the submission data
                    submissionData.referenceNumber = referenceNo; 
                    logger.info("✅ Data submitted", siteId, referenceNo);
                    // handle data layer submission
                    dataLayer.storeSiteSubmissionData(
                        req.session,
                        siteId, 
                        submissionData);
                        
                    //-- Send email to user
                    // Generate the email body
                    let emailBody = generateSubmitEmail(service, submissionData.printFriendlyData, referenceNo, req);
                    logger.debug("Email generated:", emailBody);
                    // Send the email
                    sendEmail(service.site.title[service.site.lang],emailBody,[dataLayer.getUser(req.session).email], "eMail").catch(err => {
                        logger.error("Email sending failed (async):", err);
                    });
                    // --- End of email sending
                    
                    logger.debug("🔄 Redirecting to success page:",  req);
                    // redirect to success
                    return res.redirect(govcyResources.constructPageUrl(siteId, `success`));
                    
                    // logger.debug("The submission data prepared:", printFriendlyData);
                    // let reviewSummary = generateReviewSummary(printFriendlyData,req, siteId, false);
                    // res.send(emailBody);
                    
                    // // Clear any existing submission errors from the session
                    // dataLayer.clearSiteSubmissionErrors(req.session, siteId);
                } else {
                    // Handle submission failure
                    const errorCode = response.ErrorCode;
                    const errorPage = service.site?.submissionAPIEndpoint?.response?.errorResponse?.[errorCode]?.page;
                    
                    if (errorPage) {
                        logger.info("🚨 Submission returned failed:", response.ErrorCode);
                        return res.redirect(errorPage);
                    } else {
                        return handleMiddlewareError("🚨 Unknown error code received from API.", 500, next);
                    }
                }
                
            }

            // Proceed to final submission if no errors
            // return next();
            // print the submission data to the page

        } catch (error) {
            return next(error);
        }
    };
    
}
