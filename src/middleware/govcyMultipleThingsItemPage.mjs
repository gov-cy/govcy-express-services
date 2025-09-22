import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { populateFormData } from "../utils/govcyFormHandling.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";

/**
 * Shared builder for add/edit item pages
 * @param {Object} req 
 * @param {Object} res 
 * @param {Object} next 
 * @param {Object} initialData - prefilled form data ({} for add, object for edit)
 * @param {String} actionUrl - form action URL
 */
function multiplePageBuilder(req, res, next, initialData, actionUrl) {

    // Extract siteId and pageUrl from request
    let { siteId, pageUrl } = req.params;

    // get service data
    let serviceCopy = req.serviceData;

    // 🔍 Find the page by pageUrl
    const page = getPageConfigData(serviceCopy, pageUrl);

    // --- MultipleThings sanity checks ---
    const mtConfig = page.multipleThings;
    if (!mtConfig) {
        logger.debug(`🚨 multipleThings config not found in page config for ${siteId}/${pageUrl}`, req);
        return handleMiddlewareError(`🚨 multipleThings config not found in page config for ${siteId}/${pageUrl}`, 404, next);
        // return next(new Error(`🚨 multipleThings config not found in page config for ${siteId}/${pageUrl}`));
    }
    if (!mtConfig.listPage || !mtConfig.listPage.title) {
        logger.debug(`🚨 multipleThings.listPage.title is required for ${siteId}/${pageUrl}`, req);
        return handleMiddlewareError(`🚨 multipleThings.listPage.title is required for ${siteId}/${pageUrl}`, 404, next);
    }
    if (!mtConfig.itemTitleTemplate || !mtConfig.min || !mtConfig.max) {
        logger.debug(`🚨 multipleThings.itemTitleTemplate, .min and .max are required for ${siteId}/${pageUrl}`, req);
        return handleMiddlewareError(`🚨 multipleThings.itemTitleTemplate, .min and .max are required for ${siteId}/${pageUrl}`, 404, next);
    }

    // Deep copy pageTemplate to avoid modifying the original
    const pageTemplateCopy = JSON.parse(JSON.stringify(page.pageTemplate));

    // ----- Conditional logic comes here
    // Check if the page has conditions and apply logic
    const result = evaluatePageConditions(page, req.session, req.params.siteId, req);
    if (result.result === false) {
        return res.redirect(`/${req.params.siteId}/${result.redirect}`);
    }


    //⚙️ Process forms before rendering
    pageTemplateCopy.sections.forEach(section => {
        section.elements.forEach(element => {
            if (element.element === "form") {
                logger.debug("Processing form element for multipleThings item:", element, req);
                // set form action 
                element.params.action = actionUrl;
                // Set form method to POST
                element.params.method = "POST";
                // ➕ Add CSRF token
                element.params.elements.push(govcyResources.csrfTokenInput(req.csrfToken()));
                // 🔍 Find the first button with `prototypeNavigate`
                const button = element.params.elements.find(subElement =>
                    // subElement.element === "button" && subElement.params.prototypeNavigate
                    subElement.element === "button"
                );

                // ⚙️ Modify the button if it exists
                if (button) {
                    // Remove `prototypeNavigate`
                    if (button.params.prototypeNavigate) {
                        delete button.params.prototypeNavigate;
                    }
                    // Set `type` to "submit"
                    button.params.type = "submit";
                }

                // Handle form data
                let theData = {};

                //--------- Handle Validation Errors ---------
                let validationErrors = null;

                // Get all validation errors for this page (could be plain object or keyed map)
                let validationErrorsAll = dataLayer.getPageValidationErrors(req.session, siteId, pageUrl);

                if (validationErrorsAll) {
                    // Determine whether this is add/edit
                    const { index } = req.params;
                    const isAdd = req.originalUrl.includes("/multiple/add");
                    const key = isAdd ? "add" : (index !== undefined ? index : null);

                    if (key) {
                        // If not keyed yet, wrap them under this key
                        if (!validationErrorsAll[key] 
                            && (validationErrorsAll.errors || validationErrorsAll.errorSummary)) {
                            validationErrorsAll = { [key]: validationErrorsAll };
                        }
                        validationErrors = validationErrorsAll[key] || null;
                    } else {
                        // Normal single-page case
                        validationErrors = validationErrorsAll;
                    }
                }

                // Populate form data
                if (validationErrors) {
                    theData = validationErrors.formData || {};
                } else {
                    theData = initialData || {};
                }
                //--------- End of Handle Validation Errors ---------


                populateFormData(
                    element.params.elements,
                    theData,
                    validationErrors,
                    req.session,
                    siteId, 
                    pageUrl, 
                    req.globalLang,
                    null,
                    req.query.route
                );
                // if there are validation errors, add an error summary
                if (validationErrors?.errorSummary?.length > 0) {
                    element.params.elements.unshift(
                        govcyResources.errorSummary(validationErrors.errorSummary)
                    );
                }

                logger.debug("Processed multipleThings item form element:", element, req);
            }
        });
    });

    // Attach processed page
    req.processedPage = {
        pageData: {
            "site": serviceCopy.site,
            "pageData": {
                "title": page.pageData.title,
                "layout": page.pageData.layout,
                "mainLayout": page.pageData.mainLayout
            }
        },
        pageTemplate: pageTemplateCopy
    };

    logger.debug("Processed multipleThings item page:", req.processedPage, req);
    next();
}

/**
 * GET handler for add new item
 */
export function govcyMultipleThingsAddHandler() {
    return (req, res, next) => {
        try {

            const { siteId, pageUrl } = req.params;
            const route = req.query?.route;
            const actionUrl = `/${siteId}/${pageUrl}/multiple/add${route === "review" ? `?route=review` : ""}`;
            // Use draft if it exists, otherwise seed an empty one
            let draft = dataLayer.getMultipleDraft(req.session, siteId, pageUrl);
            if (!draft) {
                draft = {};
                dataLayer.setMultipleDraft(req.session, siteId, pageUrl, draft);
            }            
            multiplePageBuilder(req, res, next, draft, actionUrl);
        } catch (error) {
            return next(error);
        }
    };
}

/**
 * GET handler for edit existing item
 */
export function govcyMultipleThingsEditHandler() {
    return (req, res, next) => {
        try {

            const { siteId, pageUrl, index } = req.params;
            const route = req.query?.route;

            // load the item at index from formData
            let items = dataLayer.getPageData(req.session, siteId, pageUrl);
            if (!Array.isArray(items)) items = [];
            const initialData = items[parseInt(index, 10)] || {};

            const actionUrl = `/${siteId}/${pageUrl}/multiple/edit/${index}${route === "review" ? `?route=review` : ""}`;
            multiplePageBuilder(req, res, next, initialData, actionUrl);

        } catch (error) {
            return next(error);
        }
    };
}
