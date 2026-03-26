import * as govcyResources from "../resources/govcyResources.mjs";

const ALLOWED_TASK_STATUSES = new Set(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);

function normalizeTaskStatus(statusKey = "NOT_STARTED") {
    if (typeof statusKey !== "string") return "NOT_STARTED";
    const normalized = statusKey.toUpperCase();
    return ALLOWED_TASK_STATUSES.has(normalized) ? normalized : "NOT_STARTED";
}

/**
 * Defines custom pages for a given siteId and pageUrl.
 * This function initializes the custom pages in the store and sets up the necessary data structure.
 * @param {object} store The session store (usually req.app)
 * @param {string} siteId The site identifier (e.g., `"cso"`)
 * @param {string} pageUrl The URL of the custom page (e.g., `"/cso/custom"`)
 * @param {string} pageTitle The title of the custom page (e.g., `{ en: "My custom section", el: "Προσαρμοσμένη ενότητα" }`)
 * @param {string} insertAfterPageUrl The page URL to insert the custom page after (e.g., `"qualifications"`)
 * @param {array} errors An array of error objects (e.g., `[{ id: "error1", text: { en: "Error 1", el: "Error 1"} }, { id: "error2", text: { en: "Error 2", el: "Error 2"} }]`)
 * @param {array} summaryElements An array of summary element objects (e.g., `{ key: { en: "Extra value", el: "Πρόσθετη τιμή" }, value: [] }` )
 * @param {boolean} summaryHtml Optional HTML content for the summary (e.g., `{ en: "<strong>Summary HTML</strong>", el: "<strong>Περίληψη HTML</strong>" }`)
 * @param {string} taskStatus Optional default task status for task lists (NOT_STARTED/IN_PROGRESS/COMPLETED)
 * @param {object} [extraProps={}] Optional extra metadata (e.g., `{ nextPage: "confirmation", requiresOTP: true }`)
 */
export function defineCustomPages(
    store,
    siteId,
    pageUrl,
    pageTitle,
    insertAfterPageUrl,
    errors,
    summaryElements,
    summaryHtml = false,
    taskStatus = "NOT_STARTED",
    extraProps = {}
) {
    // Initialize custom pages in session if not already set
    store.siteData ??= {};
    store.siteData[siteId] ??= {};
    store.siteData[siteId].customPagesDefinition ??= {}; // Initialize custom pages definition
    store.siteData[siteId].customPagesDefinition[pageUrl] ??= {}; // Initialize specific page definition

    // ✅ Normalize error objects: add pageUrl if missing
    let normalizedErrors = [];
    if (Array.isArray(errors)) {
        normalizedErrors = errors.map(err => ({
            ...err,
            // pageUrl replace first `/` with empty string to ensure it is relative
            pageUrl: err.pageUrl || pageUrl.replace(/^\//, "") // ← ensure pageUrl is set
        }));
    }

    // Initialize the custom summary actions
    let summaryActions = [];

    // Base definition
    const definition = {
        pageTitle,
        insertAfterPageUrl,
        summaryElements: summaryElements || [],
        errors: normalizedErrors,
        summaryActions: summaryActions,
        taskStatus: normalizeTaskStatus(taskStatus),
        ...(summaryHtml ? { summaryHtml } : {}),
        ...extraProps // ✅ Merge any additional developer-defined properties
    };

    // Construct default summaryActions
    if (pageTitle && pageUrl) {
        definition.summaryActions = [
            {
                text: govcyResources.staticResources.text.change,
                classes: "govcy-d-print-none",
                href: `${pageUrl}?route=review`,
                visuallyHiddenText: pageTitle
            }
        ];
    }

    // Save definition
    store.siteData[siteId].customPagesDefinition[pageUrl] = definition;

}

/**
 * Retrieves the custom page definition for a given siteId and pageUrl.
 * 
 * @param {object} store The custom pages configuration store. Should be req.app
 * @param {string} siteId The site id
 * @param {string} pageUrl The URL of the custom page
 * @returns {object} The custom page definition or an empty object if not found.
 */
export function getCustomPageDefinition(store, siteId, pageUrl) {
    return store.siteData?.[siteId]?.customPagesDefinition?.[pageUrl] || {};
}

/**
 * Resets the custom pages for a given siteId.
 * This will deep copy the customPagesDefinition to customPages.
 * This is useful for initializing or resetting the custom pages. 
 * 
 * @param {object} configStore The custom pages configuration store. Should be req.app
 * @param {object} store The data layer store. Should be the req.session
 * @param {string} siteId The site id
 */
export function resetCustomPages(configStore, store, siteId) {
    if (!configStore?.siteData?.[siteId]?.customPagesDefinition) return;
    // Reset custom pages for the given siteId based on the customPagesDefinition
    store.siteData[siteId].customPages = JSON.parse(JSON.stringify(configStore.siteData[siteId].customPagesDefinition))
}

// ==========================================================
// 🧰 Custom Page Error Helpers
// ==========================================================

/**
 * Sets a custom property on a given custom page definition or instance.
 * 
 * @param {object} store - The store containing siteData.
 * @param {string} siteId - The site identifier.
 * @param {string} pageUrl - The custom page URL.
 * @param {string} property - The property name to set.
 * @param {*} value - The value to assign.
 * @param {boolean} [isDefinition=false] - Whether to modify the global definition instead of session data.
 */
export function setCustomPageProperty(store, siteId, pageUrl, property, value, isDefinition = false) {
    const container = isDefinition
        ? store.siteData?.[siteId]?.customPagesDefinition
        : store.siteData?.[siteId]?.customPages;

    if (!container || !container[pageUrl]) {
        console.warn(`⚠️ setCustomPageProperty: page '${pageUrl}' not found for site '${siteId}'`);
        return;
    }

    container[pageUrl][property] = value;
}

/**
 * Gets a custom property from a given custom page definition or instance.
 * 
 * @param {object} store - The store containing siteData.
 * @param {string} siteId - The site identifier.
 * @param {string} pageUrl - The custom page URL.
 * @param {string} property - The property name to get.
 * @param {boolean} [isDefinition=false] - Whether to read from the global definition instead of session data.
 * @returns {*} The value of the property, or undefined if not found.
 */
export function getCustomPageProperty(store, siteId, pageUrl, property, isDefinition = false) {
    const container = isDefinition
        ? store.siteData?.[siteId]?.customPagesDefinition
        : store.siteData?.[siteId]?.customPages;

    return container?.[pageUrl]?.[property];
}


/**
 * Sets the data object for a given custom page.
 * Overwrites the existing data (does not merge).
 * 
 * @param {Object} store - The store containing siteData.
 * @param {string} siteId - The site identifier.
 * @param {string} pageUrl - The URL of the custom page.
 * @param {Object} data - The data to store.
 */
export function setCustomPageData(store, siteId, pageUrl, data) {

    const target = store.siteData?.[siteId]?.customPages?.[pageUrl];
    if (!target) {
        console.warn(`⚠️ setCustomPageData: page '${pageUrl}' not found for site '${siteId}'`);
        return;
    }

    target.data = data; // overwrite existing data
}

/**
 * Sets the email array with dsf-email-templates objects for a given custom page.
 * Overwrites the existing data (does not merge).
 * 
 * @param {Object} store - The store containing siteData.
 * @param {string} siteId - The site identifier.
 * @param {string} pageUrl - The URL of the custom page.
 * @param {Array<Object>} arrayOfEmailObjects - Array of dsf-email-templates objects.
 */
export function setCustomPageEmail(store, siteId, pageUrl, arrayOfEmailObjects) {

    const target = store.siteData?.[siteId]?.customPages?.[pageUrl];
    if (!target) {
        console.warn(`⚠️ setCustomPageData: page '${pageUrl}' not found for site '${siteId}'`);
        return;
    }

    if (!Array.isArray(arrayOfEmailObjects)) {
        console.warn(`⚠️ setCustomPageEmail: expected array for custom page '${normalizedPageUrl}', got`, typeof arrayOfEmailObjects);
        return;
    }

    target.email = arrayOfEmailObjects; // overwrite existing data
}

/**
 * Sets the summaryElements array for a given custom page.
 * Replaces the existing summaryElements array.
 * 
 * @param {Object} store - The store containing siteData.
 * @param {string} siteId - The site identifier.
 * @param {string} pageUrl - The URL of the custom page.
 * @param {Array} summaryElements - Array of summary element definitions.
 */
export function setCustomPageSummaryElements(store, siteId, pageUrl, summaryElements) {

    const target = store.siteData?.[siteId]?.customPages?.[pageUrl];
    if (!target) {
        console.warn(`⚠️ setCustomPageSummaryElements: page '${pageUrl}' not found for site '${siteId}'`);
        return;
    }

    target.summaryElements = Array.isArray(summaryElements) ? summaryElements : [];
}

/**
 * Clears all errors for a given custom page.
 * Works on either customPages or customPagesDefinition.
 * 
 * @param {Object} store - The store containing siteData.
 * @param {string} siteId - The site identifier.
 * @param {string} pageUrl - The URL of the custom page.
 */
export function clearCustomPageErrors(store, siteId, pageUrl) {

    const data = store.siteData?.[siteId]?.customPages?.[pageUrl];

    if (data) data.errors = [];
}

/**
 * Adds an error to a given custom page (definition or data).
 * Auto-fills pageUrl and ensures array exists.
 * 
 * @param {Object} store - The store containing siteData.
 * @param {string} siteId - The site identifier.
 * @param {string} pageUrl - The URL of the custom page.
 * @param {string} errorId - Unique identifier for the error.
 * @param {Object} errorTextObject - Multilingual Object containing localized error texts.
 */
export function addCustomPageError(store, siteId, pageUrl, errorId, errorTextObject) {
    const normalizedPageUrl = pageUrl.replace(/^\/+/, "");

    const target =
        store.siteData?.[siteId]?.customPages?.[pageUrl]

    if (!target) {
        console.warn(`⚠️ addCustomPageError: page '${pageUrl}' not found for site '${siteId}'`);
        return;
    }

    target.errors ??= [];
    
    // ✅ Prevent duplicate errors by ID
    if (target.errors.some(err => err.id === errorId)) return;

    // Normalize and push error
    target.errors.push({
        id: errorId,
        text: errorTextObject,
        pageUrl: normalizedPageUrl,
    });

}

/**
 * Sets the task status for a custom page so task-list pages can show progress.
 *
 * @param {object} store Session store (req.session)
 * @param {string} siteId Current site id
 * @param {string} pageUrl Custom page url
 * @param {string} statusKey One of NOT_STARTED/IN_PROGRESS/COMPLETED
 */
export function setCustomPageTaskStatus(store, siteId, pageUrl, statusKey = "NOT_STARTED") {
    const target = store?.siteData?.[siteId]?.customPages?.[pageUrl];
    if (!target) {
        console.warn(`⚠️ setCustomPageTaskStatus: page '${pageUrl}' not found for site '${siteId}'`);
        return;
    }
    target.taskStatus = normalizeTaskStatus(statusKey);
}

/**
 * Retrieves the stored task status for a custom page.
 *
 * @param {object} store Session store (req.session)
 * @param {string} siteId Current site id
 * @param {string} pageUrl Custom page url
 * @returns {string} Task status key
 */
export function getCustomPageTaskStatus(store, siteId, pageUrl) {
    const target = store?.siteData?.[siteId]?.customPages?.[pageUrl];
    if (!target) return "NOT_STARTED";
    return normalizeTaskStatus(target.taskStatus);
}
