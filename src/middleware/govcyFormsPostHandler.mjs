import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import { validateFormElements } from "../utils/govcyValidator.mjs"; // Import your validator
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { getFormData } from "../utils/govcyFormHandling.mjs"
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";
import { tempSaveIfConfigured } from "../utils/govcyTempSave.mjs";
import { validateMultipleThings } from "../utils/govcyMultipleThingsValidation.mjs";
import { handleTaskListPost } from "./govcyTaskListHandler.mjs";


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

            // ----- Conditional logic comes here
            // ✅ Skip this POST handler if the page's conditions evaluate to true (redirect away)
            const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            if (conditionResult.result === false) {
                logger.debug("⛔️ Page condition evaluated to true on POST — skipping form save and redirecting:", conditionResult);
                return res.redirect(govcyResources.constructPageUrl(siteId, conditionResult.redirect));
            }

            // ----- Task list handling (no <form> block)
            if (page.taskList) {
                return handleTaskListPost(req, res, next, { page, service, siteId, pageUrl });
            }

            // 🔍 Find the form definition inside `pageTemplate.sections`
            let formElement = null;
            for (const section of page.pageTemplate.sections) {
                formElement = section.elements.find(el => el.element === "form");
                if (formElement) break;
            }

            if (!formElement) {
                return handleMiddlewareError("🚨 Form definition not found.", 500, next);
            }

            let nextPage = null;

            // ----- MultipleThings hub handling -----
            if (page.multipleThings) {
                // Get current items from session
                let items = dataLayer.getPageData(req.session, siteId, pageUrl) || [];
                if (!Array.isArray(items)) {
                    items = [];
                }
                // Validate the items array against multipleThings config (min, max, per-item validation)
                const errors = validateMultipleThings(page, items, service.site.lang);

                // If there are validation errors, store them in session and redirect back to the hub with error summary
                if (Object.keys(errors).length > 0) {
                    dataLayer.storePageValidationErrors(req.session, siteId, pageUrl, errors, null, "hub");
                    return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
                }

                // Mark hub as posted so task lists can treat optional hubs as complete
                dataLayer.setPagePosted(req.session, siteId, pageUrl, true);

                // No validation errors, proceed to next page
                logger.debug("✅ multipleThings hub validated successfully:", items, req);
                logger.info("✅ multipleThings hub validated successfully:", req.originalUrl);
                nextPage = req.query.route === "review"
                    ? govcyResources.constructPageUrl(siteId, "review")
                    : page.pageData.nextPage;

            } else { // Regular form page

                // const formData = req.body; // Submitted data
                const formData = getFormData(formElement.params.elements, req.body, req.session, siteId, pageUrl); // Submitted data

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

                // 🔄 Fire-and-forget temporary save (non-blocking)
                (async () => {
                    try { await tempSaveIfConfigured(req.session, service, siteId); }
                    catch (e) { /* already logged internally */ }
                })();

                logger.debug("✅ Form submitted successfully:", dataLayer.getPageData(req.session, siteId, pageUrl), req);
                logger.info("✅ Form submitted successfully:", req.originalUrl);

                // 🔍 Determine next page (if applicable)
                for (const section of page.pageTemplate.sections) {
                    const form = section.elements.find(el => el.element === "form");
                    if (form) {
                        //handle review route
                        if (req.query.route === "review") {
                            nextPage = govcyResources.constructPageUrl(siteId, "review");
                        } else {
                            nextPage = page.pageData.nextPage;
                            //nextPage = form.params.elements.find(el => el.element === "button" && el.params?.prototypeNavigate)?.params.prototypeNavigate;
                        }
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

