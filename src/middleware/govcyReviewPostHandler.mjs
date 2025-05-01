import * as govcyResources from "../resources/govcyResources.mjs";
import { validateFormElements  } from "../utils/govcyValidator.mjs"; // Import your validator
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import {prepareSubmissionData } from "../utils/govcySubmitData.mjs";
import { govcyApiRequest } from "../utils/govcyApiRequest.mjs";
import { getEnvVariable } from "../utils/govcyEnvVariables.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";

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
                // get the submission API endpoint URL from the environment variable
                const submissionUrl = getEnvVariable(service?.site?.submissionAPIEndpoint?.url || "", false);
                if (!submissionUrl) {
                    return handleMiddlewareError("🚨 Submission API endpoint URL is missing", 500, next);
                }
                
                // Prepare submission data
                const submissionData = prepareSubmissionData(req, siteId, service);

                // Call the API to submit the data
                const response = await govcyApiRequest("post", submissionUrl, submissionData);
                
                // Check if the response is successful
                if (response.Succeeded) {
                    let referenceNo = response?.Data?.submission_id || "";
                    // Add the reference number to the submission data
                    submissionData.referenceNumber = referenceNo; 
                    logger.info("✅ Data submitted", siteId, referenceNo);
                    // handle data layer submission
                    dataLayer.storeSiteSubmissionData(
                        req.session,
                        siteId, 
                        submissionData);
                        
                    logger.debug("🔄 Redirecting to success page:",  req);
                    // redirect to success
                    return res.redirect(govcyResources.constructPageUrl(siteId, `success`));
                    
                    // logger.debug("The submission data prepared:", printFriendlyData);
                    // let reviewSummary = generateReviewSummary(printFriendlyData,req, siteId, false);
                    // logger.debug("The review summary generated:", reviewSummary);
                    // let emailBody = generateSubmitEmail(service,printFriendlyData,'xxxx xxxx xxxx 1234', req);
                    // logger.debug("Email generated:", emailBody);
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
