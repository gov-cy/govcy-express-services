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
import { computeTaskListStatus } from "../utils/govcyTaskList.mjs";


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

/**
 * Handles POST submissions for task-list pages. These pages do not carry form
 * data; instead we recompute each task's status and decide whether the user can
 * continue. When outstanding tasks exist we persist a tailored error summary so
 * the renderer can surface actionable guidance.
 *
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Express next callback
 * @param {object} ctx Convenience bundle with page, service, siteId, pageUrl
 * @returns {object|void}
 */
function handleTaskListPost(req, res, next, { page, service, siteId, pageUrl }) {
    // Task list pages do not have form data, but we still need to validate the current state of the world to see if they can continue.
    const taskPages = Array.isArray(page?.taskList?.taskPages) ? page.taskList.taskPages : [];
    const summary = computeTaskListStatus(req, siteId, service, taskPages);
    const nextPageHref = resolveTaskListNextPage(page, siteId, req);

    if (summary.status === "COMPLETED") {
        if (!nextPageHref) {
            return handleMiddlewareError("Task list page missing nextPage destination", 500, next);
        }
        return res.redirect(nextPageHref);
    }

    // Build one error-summary row per incomplete task to highlight next steps.
    const summaryItems = buildTaskListErrorSummary(
        summary.tasks,
        siteId,
        typeof req.query.route === "string" ? req.query.route : undefined
    );
    summaryItems.unshift(govcyResources.staticResources.text.taskListCompleteAll);

    const allowContinue = Boolean(page?.taskList?.linkToContinue) &&
        nextPageHref &&
        req.query.route !== "review";

    const options = {};
    if (allowContinue) {
        options.body = govcyResources.staticResources.text.taskListAllowContinueBody;
        options.linkToContinue = {
            text: govcyResources.staticResources.text.taskListContinueLink,
            visuallyHiddenText: govcyResources.staticResources.text.taskListContinueHiddenText,
            link: nextPageHref
        };
    }

    storeTaskListValidationSummary(req.session, siteId, pageUrl, summaryItems, options);
    return res.redirect(govcyResources.constructErrorSummaryUrl(req.originalUrl));
}

/**
 * Resolves the destination URL for a task-list continue action. Mirrors the
 * logic used for regular pages (respect review route overrides).
 *
 * @param {object} page Current page configuration
 * @param {string} siteId Service identifier
 * @param {object} req Express request
 * @returns {string|null}
 */
function resolveTaskListNextPage(page, siteId, req) {
    if (req.query.route === "review") {
        return govcyResources.constructPageUrl(siteId, "review");
    }
    const nextPage = page?.pageData?.nextPage;
    if (!nextPage) return null;
    return govcyResources.constructPageUrl(siteId, nextPage);
}

/**
 * Creates an error-summary list for every task that still needs attention.
 *
 * @param {Array} tasks Task descriptor array from computeTaskListStatus
 * @param {string} siteId Service identifier for building hrefs
 * @param {string} [route] Optional route query (e.g. \"review\") to preserve context
 * @returns {Array<{text:string, link?:string}>}
 */
function buildTaskListErrorSummary(tasks = [], siteId, route) {
    return tasks
        .filter(task => task && task.status !== "COMPLETED" && task.status !== "SKIPPED")
        .map(task => {
            const item = {
                text: buildTaskListErrorText(task.title)
            };
            if (task.pageUrl) {
                item.link = govcyResources.constructPageUrl(siteId, task.pageUrl, route);
            }
            return item;
        });
}

/**
 * Produces a multilingual message like \"Complete the section {Title}\" for each task.
 *
 * @param {object} title Multilingual task title object
 * @returns {object} Multilingual error summary text
 */
function buildTaskListErrorText(title) {
    const normalizedTitle = hasLocalizedContent(title)
        ? title
        : govcyResources.staticResources.text.untitled;
    return combineLocalizedStrings(
        govcyResources.staticResources.text.task?.title,
        normalizedTitle
    );
}

/**
 * Concatenates two multilingual objects (prefix + value) while preserving fallbacks.
 *
 * @param {object|string} prefix Multilingual/string prefix
 * @param {object|string} value Multilingual/string value
 * @returns {object} Combined multilingual object
 */
function combineLocalizedStrings(prefix, value) {
    const languages = new Set(["el", "en", "tr"]);
    if (hasLocalizedContent(prefix)) {
        Object.keys(prefix).forEach(lang => languages.add(lang));
    }
    if (hasLocalizedContent(value)) {
        Object.keys(value).forEach(lang => languages.add(lang));
    }

    const result = {};
    languages.forEach(lang => {
        const prefixText = resolveLocalizedText(prefix, lang);
        const valueText = resolveLocalizedText(value, lang);
        const combined = `${prefixText} ${valueText}`.trim();
        result[lang] = combined || valueText || prefixText;
    });
    return result;
}

/**
 * Returns true when a value looks like a multilingual object with keys.
 *
 * @param {any} value Potential multilingual object
 * @returns {boolean}
 */
function hasLocalizedContent(value) {
    return value && typeof value === "object" && Object.keys(value).length > 0;
}

/**
 * Safely resolves text for a single language, falling back to common locales.
 *
 * @param {object|string} source Multilingual/string source
 * @param {string} lang Desired language key
 * @returns {string}
 */
function resolveLocalizedText(source, lang) {
    if (!source) return "";
    if (typeof source === "string") return source;
    return source[lang] ?? source.el ?? source.en ?? source.tr ?? "";
}

/**
 * Persists the synthesized error summary back in the session so the renderer
 * can present GOV.CY error summary content without having to understand task
 * logic.
 *
 * @param {object} store Session object (req.session)
 * @param {string} siteId Service identifier
 * @param {string} pageUrl Page identifier
 * @param {Array} summaryItems Error summary entries
 * @param {object} options Optional body / linkToContinue overrides
 */
function storeTaskListValidationSummary(store, siteId, pageUrl, summaryItems, options = {}) {
    dataLayer.storePageValidationErrors(store, siteId, pageUrl, {}, null);
    const container = store?.siteData?.[siteId]?.inputData?.[pageUrl]?.validationErrors;
    if (!container) return;
    // Attach extra renderer-friendly metadata when provided.
    container.errorSummary = summaryItems;
    if (options.body) container.body = options.body;
    if (options.linkToContinue) container.linkToContinue = options.linkToContinue;
}
