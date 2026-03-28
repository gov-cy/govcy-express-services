import { getPageConfigData } from "./govcyLoadConfigData.mjs";
import { evaluatePageConditions } from "./govcyExpressions.mjs";
import { validateFormElements } from "./govcyValidator.mjs";
import { validateMultipleThings } from "./govcyMultipleThingsValidation.mjs";
import { createUmdManualPageTemplate } from "../middleware/govcyUpdateMyDetails.mjs";
import * as dataLayer from "./govcyDataLayer.mjs";
import { logger } from "./govcyLogger.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import { getCustomPageTaskStatus } from "./govcyCustomPages.mjs";

/**
 * Computes the completion status for a single page.
 * Mirrors review-stage validation so task lists use the same rules.
 */
export function computePageTaskStatus(req, siteId, service, pageUrl, visitedPages = new Set()) {
    if (!req || !req.session) {
        logger.error("computePageTaskStatus called without session", { siteId, pageUrl });
        throw new Error("computePageTaskStatus: request with session is required");
    }
    if (!service || !Array.isArray(service.pages)) {
        logger.error("computePageTaskStatus service missing pages array", { siteId, pageUrl });
        throw new Error("computePageTaskStatus: service.pages is required");
    }
    if (!pageUrl) {
        logger.error("computePageTaskStatus missing pageUrl", { siteId });
        throw new Error("computePageTaskStatus: pageUrl is required");
    }

    // Handle custom pages first
    const customPage = dataLayer.getSiteCustomPages(req.session, siteId)?.[pageUrl];
    if (customPage) {
        return {
            pageUrl,
            title: customPage?.pageTitle || {},
            type: "custom",
            status: getCustomPageTaskStatus(req.session, siteId, pageUrl),
            hasData: Boolean(customPage?.data),
            custom: true
        };
    }

    const page = getPageConfigData(service, pageUrl);
    if (!page) {
        logger.error("computePageTaskStatus page not found", { siteId, pageUrl });
        throw new Error("computePageTaskStatus: page '" + pageUrl + "' not found in service configuration");
    }

    // Use a composite key so nested task-list evaluation can detect circular references.
    const cycleKey = siteId + ":" + pageUrl;
    if (visitedPages.has(cycleKey)) {
        const cyclePath = [...visitedPages, cycleKey].map(key => key.split(":")[1]);
        logger.error("computePageTaskStatus circular task list reference detected", {
            siteId,
            cycle: cyclePath
        });
        throw new Error("Task list configuration contains a circular reference: " + cyclePath.join(" -> "));
    }

    visitedPages.add(cycleKey);

    try {
        // Reuse the same condition logic as page rendering – if a page would redirect,
        // we treat it as skipped so task lists never block on hidden sections.
        const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
        if (conditionResult?.result === false) {
            return buildStatusResult(page, determinePageType(page), pageUrl, false, "SKIPPED", conditionResult);
        }

        const pageType = determinePageType(page);
        if (pageType === "taskList") {
            // For task list pages, recurse into each configured children and aggregate their status.
            const taskPages = Array.isArray(page?.taskList?.taskPages) ? page.taskList.taskPages : [];
            const summary = computeTaskListStatus(req, siteId, service, taskPages, visitedPages);
            const result = buildStatusResult(page, pageType, pageUrl, summary.status !== "NOT_STARTED", summary.status);
            result.taskList = summary;
            return result;
        }

        // Below covers all data-entry pages (normal, multipleThings, updateMyDetails)
        // For form-based pages, inspect the session data and validation results.
        let storedData = dataLayer.getPageData(req.session, siteId, pageUrl);
        const postedFlag = dataLayer.isPagePosted(req.session, siteId, pageUrl);

        // Multiple things hubs always expect an array, so normalize bad shapes.
        if (pageType === "multipleThings" && !Array.isArray(storedData)) {
            storedData = [];
        }
        // All other page types expect an object. When nothing is stored yet, fall back to {}.
        if (!storedData || typeof storedData !== "object") {
            storedData = Array.isArray(storedData) ? storedData : {};
        }

        const hasData = determineHasData(storedData, pageType, postedFlag);
        if (!hasData) {
            return buildStatusResult(page, pageType, pageUrl, false, "NOT_STARTED");
        }

        // For form-based pages, inspect the session data and validation results.
        const hasErrors = hasValidationErrors({
            page,
            pageType,
            storedData,
            req,
            service,
            siteId
        });

        return buildStatusResult(
            page,
            pageType,
            pageUrl,
            true,
            hasErrors ? "IN_PROGRESS" : "COMPLETED"
        );
    } finally {
        visitedPages.delete(cycleKey);
    }
}

/**
 * Computes statuses for all pages listed in taskPages and derives overall status.
 */
export function computeTaskListStatus(req, siteId, service, taskPages = [], visitedPages = new Set()) {
    if (!Array.isArray(taskPages)) {
        logger.error("computeTaskListStatus expects taskPages array", { siteId });
        throw new Error("taskPages must be an array");
    }

    const tasks = taskPages.map(pageUrl => computePageTaskStatus(req, siteId, service, pageUrl, visitedPages));
    const status = deriveTaskListStatus(tasks);
    return { status, tasks };
}

/**
 * Returns a normalized type string so callers can branch per page category.
 *
 * @param {object} page Page configuration object
 * @returns {"taskList"|"updateMyDetails"|"multipleThings"|"normal"}
 */
function determinePageType(page) {
    if (page?.taskList) return "taskList";
    if (page?.updateMyDetails) return "updateMyDetails";
    if (page?.multipleThings) return "multipleThings";
    return "normal";
}

/**
 * Determines whether the stored data should count as "started".
 *
 * @param {object|Array} storedData Data retrieved from the session
 * @param {string} pageType Derived page type
 * @param {boolean} postedFlag For multipleThings pages, whether user pressed continue at least once
 * @returns {boolean}
 */
function determineHasData(storedData, pageType, postedFlag = false) {
    
    if (Array.isArray(storedData)) {
        if (storedData.length > 0) return true;
        return pageType === "multipleThings" && postedFlag;
    }
    if (storedData && typeof storedData === "object") {
        const hasKeys = Object.keys(storedData).length > 0;
        if (hasKeys) return true;
    }
    if (pageType === "multipleThings" && postedFlag) {
        return true;
    }
    return false;
}

/**
 * Mirrors review validation to decide if a page currently has outstanding errors.
 *
 * @param {object} opts Inputs bundle
 * @returns {boolean}
 */
function hasValidationErrors({ page, pageType, storedData, req, service, siteId }) {
    if (pageType === "multipleThings") {
        const lang = service?.site?.lang || req?.globalLang || "el";
        const errors = validateMultipleThings(page, storedData, lang);
        return Object.keys(errors || {}).length > 0;
    }

    const formElement = getFormElementForPage({ page, pageType, req, service, siteId });
    if (!formElement) {
        return false;
    }

    const errors = validateFormElements(
        formElement.params?.elements || [],
        storedData,
        page?.pageData?.url
    );

    return Object.keys(errors || {}).length > 0;
}

/**
 * Retrieves a form element definition so the validator can run against it.
 *
 * @param {object} params Inputs bundle
 * @returns {object|null}
 */
function getFormElementForPage({ page, pageType, req, service, siteId }) {
    if (pageType === "updateMyDetails") {
        const lang = service?.site?.lang || req?.globalLang || "el";
        const template = createUmdManualPageTemplate(siteId, lang, page, req, true);
        return findFormElement(template?.sections);
    }

    return findFormElement(page?.pageTemplate?.sections);
}

/**
 * Depth-first scan for the first form element within renderer sections.
 *
 * @param {Array} sections Renderer sections array
 * @returns {object|null}
 */
function findFormElement(sections = []) {
    if (!Array.isArray(sections)) return null;
    for (const section of sections) {
        const elements = section?.elements || [];
        for (const element of elements) {
            if (element?.element === "form") {
                return element;
            }
        }
    }
    return null;
}

/**
 * Constructs the canonical payload returned by computePageTaskStatus.
 *
 * @param {object} page Page config
 * @param {string} pageType Derived type string
 * @param {string} pageUrl Page identifier
 * @param {boolean} hasData Whether any user input exists
 * @param {string} status Status flag
 * @param {object|null} conditionResult Optional condition evaluation details
 * @returns {object}
 */
function buildStatusResult(page, pageType, pageUrl, hasData, status, conditionResult = null) {
    let title = page?.pageData?.title || {};
    if (pageType === "updateMyDetails") {
        title = govcyResources.staticResources.text.updateMyDetailsTitle;
    } else if (pageType === "multipleThings") {
        title = page?.multipleThings?.listPage?.title || title;
    }

    const result = {
        pageUrl,
        title,
        type: pageType,
        status,
        hasData
    };

    if (conditionResult) {
        result.conditionResult = conditionResult;
    }

    return result;
}

/**
 * Collapses individual task statuses into a single overall status.
 *
 * @param {Array<{status:string}>} tasks Task descriptors
 * @returns {"NOT_STARTED"|"IN_PROGRESS"|"COMPLETED"}
 */
function deriveTaskListStatus(tasks = []) {
    const relevant = tasks.filter(task => task.status !== "SKIPPED");
    if (relevant.length === 0) return "COMPLETED";

    const statuses = relevant.map(task => task.status);
    const hasNotStarted = statuses.includes("NOT_STARTED");
    const hasCompleted = statuses.includes("COMPLETED");
    const hasInProgress = statuses.includes("IN_PROGRESS");

    if (hasInProgress || (hasCompleted && hasNotStarted)) {
        return "IN_PROGRESS";
    }
    if (hasNotStarted) {
        return "NOT_STARTED";
    }
    return "COMPLETED";
}
