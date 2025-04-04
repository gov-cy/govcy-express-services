import * as govcyResources from "../resources/govcyResources.mjs";
import { validateFormElements  } from "../utils/govcyValidator.mjs"; // Import your validator
import * as dataLayer from "../utils/govcyDataLayer.mjs";


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
                console.log("🚨 Validation errors:", validationErrors);
                dataLayer.storeSiteValidationErrors(req.session, siteId, validationErrors);
                //redirect to the same page with error summary
                return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
            } else {
                console.log('No Errors');
            }

            // Proceed to final submission if no errors
            return next();
        } catch (error) {
            return next(error);
        }
    };
    
}
