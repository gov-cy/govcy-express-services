import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { populateFormData } from "../utils/govcyFormHandling.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { getFormData } from "../utils/govcyFormHandling.mjs";
import { validateFormElements } from "../utils/govcyValidator.mjs";
import { tempSaveIfConfigured } from "../utils/govcyTempSave.mjs";
import nunjucks from "nunjucks";

/**
 * Shared builder for add/edit item pages
 * @param {Object} req 
 * @param {Object} res 
 * @param {Object} next 
 * @param {Object} initialData - prefilled form data ({} for add, object for edit)
 * @param {String} actionUrl - form action URL
 * @param {String} mode - add or edit
 * @param {Number|null} index - index of the item being edited (null for add)
 */
function multiplePageBuilder(req, res, next, initialData, actionUrl, mode, index = null) {

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
    if (!mtConfig.itemTitleTemplate || !mtConfig.min === undefined || !mtConfig.min === null || !mtConfig.max) {
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

    // Change the title and H1 to append "Add" or "Change" suffix
    const suffix =
        mode === "add"
            ? govcyResources.staticResources.text.multipleThingsAddSuffix
            : govcyResources.staticResources.text.multipleThingsEditSuffix;

    // Append suffix to page title
    if (typeof page?.pageData?.title === "object") {
        for (const lang of Object.keys(page.pageData.title)) {
            page.pageData.title[lang] += ` ${suffix[lang] || ""}`;
        }
    }

    const mainSection = pageTemplateCopy.sections.find(sec => sec.name === "main");
    if (mainSection && Array.isArray(mainSection.elements)) {
        // Find the form element inside main
        const formEl = mainSection.elements.find(el => el.element === "form");

        if (formEl && Array.isArray(formEl.params?.elements)) {
            // Find the H1 textElement inside the form
            const h1Element = formEl.params.elements.find(
                el => el.element === "textElement" && el.params?.type === "h1"
            );

            if (h1Element && h1Element.params?.text) {
                // Append the suffix based on mode
                if (typeof h1Element.params.text === "object") {
                    for (const lang of Object.keys(h1Element.params.text)) {
                        h1Element.params.text[lang] += ` ${suffix[lang] || ""}`;
                    }
                }
            }
        }
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
                    req.query.route,
                    mode,
                    index
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
            multiplePageBuilder(req, res, next, draft, actionUrl, "add", null);
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

            // Validate index
            const idx = parseInt(index, 10);
            let items = dataLayer.getPageData(req.session, siteId, pageUrl);
            if (!Array.isArray(items)) items = [];

            if (Number.isNaN(idx) || idx < 0 || idx >= items.length) {
                return handleMiddlewareError(
                    `🚨 multipleThings edit index not found for ${siteId}/${pageUrl} (index=${index})`,
                    404,
                    next
                );
            }

            const initialData = items[idx];
            const actionUrl = `/${siteId}/${pageUrl}/multiple/edit/${idx}${route === "review" ? `?route=review` : ""}`;
            multiplePageBuilder(req, res, next, initialData, actionUrl, "edit", idx);

        } catch (error) {
            return next(error);
        }
    };
}
/**
 * 
 * POST handler for adding a new item
 */
export function govcyMultipleThingsAddPostHandler() {
    return (req, res, next) => {
        try {
            const { siteId, pageUrl } = req.params;
            const service = req.serviceData;
            const page = getPageConfigData(service, pageUrl);

            // 1. Check page conditions
            const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            if (conditionResult.result === false) {
                return res.redirect(govcyResources.constructPageUrl(siteId, conditionResult.redirect, (req.query?.route === "review" ? "review" : "")));
            }

            // 2. Find form element
            let formElement = null;
            for (const section of page.pageTemplate.sections) {
                formElement = section.elements.find(el => el.element === "form");
                if (formElement) break;
            }
            if (!formElement) {
                return handleMiddlewareError("🚨 Form definition not found.", 500, next);
            }

            // 3. Get form data
            const formData = getFormData(formElement.params.elements, req.body, req.session, siteId, pageUrl);

            // 4. Validate
            const validationErrors = validateFormElements(formElement.params.elements, formData);
            if (Object.keys(validationErrors).length > 0) {
                // store validation errors under the "add" key
                dataLayer.storePageValidationErrors(req.session, siteId, pageUrl, validationErrors, formData, "add");
                return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
            }

            // 5. Commit new item into array
            let items = dataLayer.getPageData(req.session, siteId, pageUrl);
            if (!Array.isArray(items)) items = [];

            const mtConfig = page.multipleThings;
            // Check max limit
            // Sanity check
            if (!mtConfig || !mtConfig.max) {
                return handleMiddlewareError("🚨 multipleThings.max not configured.", 500, next);
            }

            if (!mtConfig.listPage || !mtConfig.listPage.title) {
                return handleMiddlewareError(`🚨 multipleThings.listPage.title is required for ${siteId}/${pageUrl}`, 404, next);
            }

            // 6. Enforce max limit
            if (items.length >= mtConfig.max) {
                // process message
                // Deep copy page title (so we don’t mutate template)
                let maxMsg = JSON.parse(JSON.stringify(govcyResources.staticResources.text.multipleThingsMaxMessage));
                // Replace label placeholders on page title
                for (const lang of Object.keys(maxMsg)) {
                    maxMsg[lang] = maxMsg[lang].replace("{{max}}", mtConfig.max);
                }

                dataLayer.storePageValidationErrors(req.session, siteId, pageUrl,
                    {
                        _global:
                        {
                            message: maxMsg,
                            pageUrl: govcyResources.constructPageUrl(siteId, pageUrl, (req.query?.route === "review" ? "review" : ""))
                        }
                    },
                    formData,
                    "add"
                );
                return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
            }

            // 7. Check dedupe
            if (mtConfig.dedupe) {
                const env = new nunjucks.Environment(null, { autoescape: false });
                const newTitle = env.renderString(mtConfig.itemTitleTemplate, formData);
                const duplicate = items.some(it => env.renderString(mtConfig.itemTitleTemplate, it) === newTitle);
                if (duplicate) {
                    dataLayer.storePageValidationErrors(req.session, siteId, pageUrl,
                        {
                            _global:
                            {
                                message: govcyResources.staticResources.text.multipleThingsDedupeMessage
                            }
                        },
                        formData,
                        "add"
                    );
                    return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
                }
            }

            // 8. Save item + clear draft
            items.push(formData);
            dataLayer.storePageData(req.session, siteId, pageUrl, items);
            dataLayer.clearMultipleDraft(req.session, siteId, pageUrl);

            // 9. Temp save
            (async () => { try { await tempSaveIfConfigured(req.session, service, siteId); } catch (e) { } })();

            // 10. Redirect back to the hub
            return res.redirect(govcyResources.constructPageUrl(siteId, pageUrl, (req.query?.route === "review" ? "review" : "")));
        } catch (error) { return next(error); }
    };
}

/**
 * POST handler for editing an existing item
 */
export function govcyMultipleThingsEditPostHandler() {
    return (req, res, next) => {
        try {
            const { siteId, pageUrl, index } = req.params;
            const service = req.serviceData;
            const page = getPageConfigData(service, pageUrl);

            // 1. Check page conditions
            const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            if (conditionResult.result === false) {
                return res.redirect(govcyResources.constructPageUrl(siteId, conditionResult.redirect, (req.query?.route === "review" ? "review" : "")));
            }

            // 2. Find form element
            let formElement = null;
            for (const section of page.pageTemplate.sections) {
                formElement = section.elements.find(el => el.element === "form");
                if (formElement) break;
            }
            if (!formElement) {
                return handleMiddlewareError("🚨 Form definition not found.", 500, next);
            }

            // 3. Get form data
            const formData = getFormData(formElement.params.elements, req.body, req.session, siteId, pageUrl, index);

            // 4. Get current items array
            let items = dataLayer.getPageData(req.session, siteId, pageUrl);
            if (!Array.isArray(items)) items = [];

            const idx = parseInt(index, 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= items.length) {
                return handleMiddlewareError(
                    `🚨 multipleThings edit index not found for ${siteId}/${pageUrl} (index=${index})`,
                    404,
                    next
                );
            }

            // 5. Validate
            const validationErrors = validateFormElements(formElement.params.elements, formData);
            if (Object.keys(validationErrors).length > 0) {
                dataLayer.storePageValidationErrors(req.session, siteId, pageUrl, validationErrors, formData, index);
                return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
            }

            // 6. Dedupe check (skip current index)
            const mtConfig = page.multipleThings;

            // Sanity check
            if (!mtConfig) {
                return handleMiddlewareError("🚨 multipleThings not configured.", 500, next);
            }

            if (!mtConfig.listPage || !mtConfig.listPage.title) {
                return handleMiddlewareError(`🚨 multipleThings.listPage.title is required for ${siteId}/${pageUrl}`, 404, next);
            }

            if (mtConfig?.dedupe) {
                const env = new nunjucks.Environment(null, { autoescape: false });
                const newTitle = env.renderString(mtConfig.itemTitleTemplate, formData);
                const duplicate = items.some((it, i) =>
                    i !== idx && env.renderString(mtConfig.itemTitleTemplate, it) === newTitle
                );
                if (duplicate) {
                    dataLayer.storePageValidationErrors(req.session, siteId, pageUrl,
                        { _global: { message: govcyResources.staticResources.text.multipleThingsDedupeMessage } },
                        formData,
                        index
                    );
                    return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
                }
            }

            // 7. Save back into array
            items[idx] = formData;
            dataLayer.storePageData(req.session, siteId, pageUrl, items);

            // 8. Temp save
            (async () => {
                try { await tempSaveIfConfigured(req.session, service, siteId); }
                catch (e) { /* already logged */ }
            })();

            // 9. Redirect back to the hub
            return res.redirect(govcyResources.constructPageUrl(siteId, pageUrl, (req.query?.route === "review" ? "review" : "")));
        } catch (error) {
            return next(error);
        }
    };
}
