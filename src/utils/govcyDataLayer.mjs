/**
 * @module govcyDataLayer
 * @fileoverview This utility provides functions for storing and retrieving data from the session store.
 * It includes functions to initialize the data layer, store page validation errors, store form data,
 * retrieve validation errors, and clear site data.
 * 
 */

/**
 * Initialize the data layer
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id 
 * @param {string} pageUrl The page url
 */
export function initializeSiteData(store, siteId, pageUrl = null) {
    if (!store.siteData) store.siteData = {};
    if (!store.siteData[siteId]) store.siteData[siteId] = {};
    if (!store.siteData[siteId].submission) store.siteData[siteId].submission = {};

    if (pageUrl && !store.siteData[siteId].submission[pageUrl]) {
        store.siteData[siteId].submission[pageUrl] = { formData: {} };
    }
}

// export function getSubmissionData(store, siteId, pageUrl) {
//     return store.siteData?.[siteId]?.submission?.[pageUrl]?.formData || {};
// }

/**
 * Store the page errors in the data layer
 * 
 * @param {object} store The session store 
 * @param {string} siteId The site id 
 * @param {string} pageUrl The page url 
 * @param {object} validationErrors The validation errors 
 * @param {object} formData The form data that produced the errors 
 */
export function storePageValidationErrors(store, siteId, pageUrl, validationErrors, formData) {
    // Ensure session structure is initialized
    initializeSiteData(store, siteId, pageUrl);

    // Store the validation errors
    store.siteData[siteId].submission[pageUrl]["validationErrors"] = {
        errors: validationErrors,
        formData: formData,
        errorSummary: []
    };
}

/**
 * Stores the page's form data in the data layer
 * 
 * @param {object} store The session store 
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url 
 * @param {object} formData The form data to be stored 
 */
export function storePageData(store, siteId, pageUrl, formData) {
    // Ensure session structure is initialized
    initializeSiteData(store, siteId, pageUrl);

    store.siteData[siteId].submission[pageUrl]["formData"] = formData;
}

/**
 * Stores the site validation errors in the data layer 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {object} validationErrors The validation errors to be stored
 */
export function storeSiteValidationErrors(store, siteId, validationErrors) {
    initializeSiteData(store, siteId); // Ensure the structure exists

    store.siteData[siteId]["submissionErrors"] = {
        errors: validationErrors,
        errorSummary: []
    };
}

/**
 * Get the page validation errors from the store and clear them
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url
 * @returns The validation errors for the page or null if none exist. Also clears the errors from the store.
 */
export function getPageValidationErrors(store, siteId, pageUrl) {
    const validationErrors = store?.siteData?.[siteId]?.submission?.[pageUrl]?.validationErrors || null;
    
    if (validationErrors) {
        // Clear validation errors from the session
        delete store.siteData[siteId].submission[pageUrl].validationErrors;
        return validationErrors;
    }

    return null;
}

/**
 * Get the posted page data from the store
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url
 * @returns The form data for the page or an empty object if none exist.
 */
export function getPageData(store, siteId, pageUrl) {
    return store?.siteData?.[siteId]?.submission?.[pageUrl]?.formData || {};
}

/**
 * Get the site validation errors from the store and clear them
 * 
 * @param {object} store The session store
 * @param {string} siteId |The site id
 * @returns The validation errors for the site or null if none exist. Also clears the errors from the store.
 */
export function getSiteSubmissionErrors(store, siteId) {
    const validationErrors = store?.siteData?.[siteId]?.submissionErrors || null;
    
    if (validationErrors) {
        // Clear validation errors from the session
        delete store.siteData[siteId].submissionErrors;
        return validationErrors;
    }

    return null;
}

/**
 * Get the value of a specific form data element from the store
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url
 * @param {string} elementName The element name
 * @returns The value of the form data for the element or an empty string if none exist.
 */
export function getFormDataValue(store, siteId, pageUrl, elementName) {
    return store?.siteData?.[siteId]?.submission?.[pageUrl]?.formData?.[elementName] || "";
}

/**
 * Get the user object from the session store
 * 
 * @param {object} store The session store 
 * @returns The user object from the store or null if it doesn't exist.
 */
export function getUser(store){
    return store.user || null;
}

export function clearSiteData(store, siteId) {
    delete store?.siteData[siteId];
}

