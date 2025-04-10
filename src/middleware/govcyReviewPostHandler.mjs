import * as govcyResources from "../resources/govcyResources.mjs";
import { validateFormElements  } from "../utils/govcyValidator.mjs"; // Import your validator
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import {prepareSubmissionData , generateReviewSummary , generateSubmitEmail } from "../utils/govcySubmitData.mjs";

/**
 * Middleware to handle review page form submission
 * This middleware processes the review page, validates form data, and shows validation errors.
 */
export function govcyReviewPostHandler() {
    return (req, res, next) => {
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
                let referenceNo = `12345678`;
                // logger.debug("The site config:", service.site);
                // let siteInputData = dataLayer.getSiteInputData(req.session, siteId);
                // logger.debug("The site's data:", siteInputData);
                logger.info("✅ Data submitted", siteId, referenceNo, req);
                let printFriendlyData = prepareSubmissionData(req, siteId, service);
                logger.debug("Submission print friendly data:", referenceNo, printFriendlyData,  req);
                // handle data layer submission
                dataLayer.storeSiteSubmissionData(
                    req.session, 
                    siteId, 
                    service, 
                    referenceNo, 
                    new Date().toISOString(), 
                    printFriendlyData);
                    
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
            }

            // Proceed to final submission if no errors
            // return next();
            // print the submission data to the page

        } catch (error) {
            return next(error);
        }
    };
    
}
