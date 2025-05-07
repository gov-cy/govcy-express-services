import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import { validateFormElements  } from "../utils/govcyValidator.mjs"; // Import your validator
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { ALLOWED_FORM_ELEMENTS } from "../utils/govcyConstants.mjs";

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
                return handleMiddlewareError("🚨 Form definition not found.", 500, next);
            }
    
            // const formData = req.body; // Submitted data
            const formData = getFormData(formElement.params.elements, req.body); // Submitted data

            // ☑️ Start validation from top-level form elements
            const validationErrors = validateFormElements(formElement.params.elements, formData);
    
            // ❌ Return validation errors if any exist
            if (Object.keys(validationErrors).length > 0) {
                logger.debug("🚨 Validation errors:", validationErrors, req);
                logger.info("🚨 Validation errors on:", req.originalUrl);
                // store the validation errors
                dataLayer.storePageValidationErrors(req.session, siteId, pageUrl, validationErrors, formData);
                //redirect to the same page with error summary
                return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
            }
    
            //⤴️ Store validated form data in session
            dataLayer.storePageData(req.session, siteId, pageUrl, formData);

            
            logger.debug("✅ Form submitted successfully:", dataLayer.getPageData(req.session, siteId, pageUrl), req);
            logger.info("✅ Form submitted successfully:", req.originalUrl);
            
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
                logger.debug("🔄 Redirecting to next page:", nextPage, req);
                // 🛠 Fix relative paths
                return res.redirect(govcyResources.constructPageUrl(siteId, `${nextPage.split('/').pop()}`));
            }
            res.json({ success: true, message: "Form submitted successfully" });
        } catch (error) {
            return next(error); // Pass error to govcyHttpErrorHandler
        }
    };
}

/**
 * Filters form data based on the form definition, including conditionals.
 * 
 * @param {Array} elements - The form elements (including conditional ones).
 * @param {Object} formData - The submitted form data.
 * @returns {Object} filteredData - The filtered form data.
 */
function getFormData(elements, formData) {
    const filteredData = {};
    elements.forEach(element => {
        const { name } = element.params || {};

        // Check if the element is allowed and has a name
        if (ALLOWED_FORM_ELEMENTS.includes(element.element) && name) {
            // Handle conditional elements (e.g., checkboxes, radios, select)
            if (["checkboxes", "radios", "select"].includes(element.element)) {
                const value = formData[name];
                filteredData[name] = value !== undefined && value !== null ? value : "";
                // Process conditional elements inside items
                if (element.element === "radios" && element.params.items) {
                    element.params.items.forEach(item => {
                        if (item.conditionalElements) {
                            Object.assign(
                                filteredData,
                                getFormData(item.conditionalElements, formData)
                            );
                        }
                    });
                }
                
            }
            // Handle dateInput
            else if (element.element === "dateInput") {
                const day = formData[`${name}_day`];
                const month = formData[`${name}_month`];
                const year = formData[`${name}_year`];
                filteredData[`${name}_day`] = day !== undefined && day !== null ? day : "";
                filteredData[`${name}_month`] = month !== undefined && month !== null ? month : "";
                filteredData[`${name}_year`] = year !== undefined && year !== null ? year : "";
            // Handle other elements (e.g., textInput, textArea, datePicker)
            } else {
                filteredData[name] = formData[name] !== undefined && formData[name] !== null ? formData[name] : "";
            }

            // Always process conditional elements directly attached to the current element
            // if (element.conditionalElements) {
            //     Object.assign(filteredData, getFormData(element.conditionalElements, formData));
            // }
        }
    
    });
    

    return filteredData;
}