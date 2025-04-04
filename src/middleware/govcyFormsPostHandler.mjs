import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import { validateFormElements  } from "../utils/govcyValidator.mjs"; // Import your validator
import * as dataLayer from "../utils/govcyDataLayer.mjs";

/**
 * Middleware to handle page form submission
 */
export function govcyFormsPostHandler() {
    return (req, res, next) => {
        try {
            const { siteId, pageUrl } = req.params;
    
            // ⤵️ Load service and check if it exists
            const service = req.serviceData;
    
            // ⤵️ Find the current page based on the URL
            const page = getPageConfigData(service, pageUrl);
    
            // 🔍 Find the form definition inside `pageTemplate.sections`
            let formElement = null;
            for (const section of page.pageTemplate.sections) {
                formElement = section.elements.find(el => el.element === "form");
                if (formElement) break;
            }
    
            if (!formElement) {
                const error = new Error('Form definition not found');
                error.status = 500;
                return next(error);  // Pass error to govcyHttpErrorHandler
            }
    
            const formData = req.body; // Submitted data
    
            // ☑️ Start validation from top-level form elements
            const validationErrors = validateFormElements(formElement.params.elements, formData);
    
            // ❌ Return validation errors if any exist
            if (Object.keys(validationErrors).length > 0) {
                console.log("🚨 Validation errors:", validationErrors);
                // store the validation errors
                dataLayer.storePageValidationErrors(req.session, siteId, pageUrl, validationErrors, formData);
                //redirect to the same page with error summary
                return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
            }
    
            //⤴️ Store validated form data in session
            dataLayer.storePageData(req.session, siteId, pageUrl, formData);

            console.log("✅ Form submitted successfully:", dataLayer.getPageData(req.session, siteId, pageUrl));
    
            // 🔍 Determine next page (if applicable)
            let nextPage = null;
            for (const section of page.pageTemplate.sections) {
                const form = section.elements.find(el => el.element === "form");
                if (form) {
                    //handle review route
                    if (req.query.route === "review") {
                        nextPage = govcyResources.constructPageUrl(siteId, "review");
                    } else {
                        nextPage = form.params.elements.find(el => el.element === "button" && el.params?.prototypeNavigate)?.params.prototypeNavigate;
                    }
                }
            }
    
            // ➡️ Redirect to the next page if defined, otherwise return success
            if (nextPage) {
                console.log(`🔄 Redirecting to next page: ${nextPage}`);
                // 🛠 Fix relative paths
                return res.redirect(govcyResources.constructPageUrl(siteId, `${nextPage.split('/').pop()}`));
            }
            res.json({ success: true, message: "Form submitted successfully" });
        } catch (error) {
            return next(error); // Pass error to govcyHttpErrorHandler
        }
    };
}
