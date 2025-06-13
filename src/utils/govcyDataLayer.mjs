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
    if (!store.siteData[siteId].inputData) store.siteData[siteId].inputData = {};
    if (!store.siteData[siteId].submissionData) store.siteData[siteId].submissionData = {};

    if (pageUrl && !store.siteData[siteId].inputData[pageUrl]) {
        store.siteData[siteId].inputData[pageUrl] = { formData: {} };
    }
}

// export function getSubmissionData(store, siteId, pageUrl) {
//     return store.siteData?.[siteId]?.inputData?.[pageUrl]?.formData || {};
// }

/**
 * Store the page errors in the data layer
 * 
 * The following is an example of the data that will be stored:
```json
{
"errors": {
    "Iban": {
        "id": "Iban",
        "message": {
            "en": "Enter your IBAN",
            "el": "Εισαγάγετε το IBAN σας"
        },
        "pageUrl": ""
    },
    "Swift": {
        "id": "Swift",
        "message": {
            "en": "Enter your SWIFT",
            "el": "Εισαγάγετε το SWIFT σας"
        },
        "pageUrl": ""
    }
}
```
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
    store.siteData[siteId].inputData[pageUrl]["validationErrors"] = {
        errors: validationErrors,
        formData: formData,
        errorSummary: []
    };
}

/**
 * Stores the page's form data in the data layer
 * 
 * The following is an example of the data that will be stored:
 ```json
{
    field1: [
        "value1",
        "value2"
    ],
    field2: "value2",
    _csrf: "1234567890"
}
 ```
 * 
 * @param {object} store The session store 
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url 
 * @param {object} formData The form data to be stored 
 */
export function storePageData(store, siteId, pageUrl, formData) {
    // Ensure session structure is initialized
    initializeSiteData(store, siteId, pageUrl);

    store.siteData[siteId].inputData[pageUrl]["formData"] = formData;
}

/**
 * Stores the site validation errors in the data layer 
 * 
 * The following is an example of the data that will be stored:
 * 
```json 
{
  "errors": {
    "bank-detailsIban": {
      "id": "Iban",
      "message": {
        "en": "Enter your IBAN",
        "el": "Εισαγάγετε το IBAN σας"
      },
      "pageUrl": "bank-details"
    },
    "bank-detailsSwift": {
      "id": "Swift",
      "message": {
        "en": "Enter your SWIFT",
        "el": "Εισαγάγετε το SWIFT σας"
      },
      "pageUrl": "bank-details"
    }
  },
  "errorSummary": []
}
```
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
 * Stores the submitted site's input data in the data layer and clears the input data 
 * 
 * Check NOTES.md for sample of the data
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {object} submissionData The submission data to be stored
 */
export function storeSiteSubmissionData(store, siteId, submissionData) {
    initializeSiteData(store, siteId); // Ensure the structure exists

    // let rawData = getSiteInputData(store, siteId);
    // Store the submission data
    store.siteData[siteId].submissionData = submissionData;
      
      // Clear validation errors from the session
    store.siteData[siteId].inputData = {};
}


/**
 * Store eligibility result for a site and endpoint
 * @param {object} store - session store
 * @param {string} siteId
 * @param {string} endpointKey - unique key for the eligibility endpoint (e.g. resolved URL)
 * @param {object} result - API response
 */
export function storeSiteEligibilityResult(store, siteId, endpointKey, result) {
    
    initializeSiteData(store, siteId); // Ensure the structure exists

    if (!store.siteData[siteId].eligibility) store.siteData[siteId].eligibility = {};
    store.siteData[siteId].eligibility[endpointKey] = {
        result,
        timestamp: Date.now()
    };
}

/**
 * Get eligibility result for a site and endpoint
 * @param {object} store - session store
 * @param {string} siteId
 * @param {string} endpointKey
 * @param {number} maxAgeMs - max age in ms (optional)
 * @returns {object|null}
 */
export function getSiteEligibilityResult(store, siteId, endpointKey, maxAgeMs = null) {
    const entry = store?.siteData?.[siteId]?.eligibility?.[endpointKey];
    if (!entry) return null;
    if (maxAgeMs === 0) return null; // 0 Never caches
    if (maxAgeMs && Date.now() - entry.timestamp > maxAgeMs) return null; // Expired
    return entry.result;
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
    const validationErrors = store?.siteData?.[siteId]?.inputData?.[pageUrl]?.validationErrors || null;
    
    if (validationErrors) {
        // Clear validation errors from the session
        delete store.siteData[siteId].inputData[pageUrl].validationErrors;
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
    return store?.siteData?.[siteId]?.inputData?.[pageUrl]?.formData || {};
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
 * Get the site's input data from the store 
 * 
 * @param {object} store The session store
 * @param {string} siteId |The site id
 * @returns The site input data or null if none exist.
 */
export function getSiteInputData(store, siteId) {
    const inputData = store?.siteData?.[siteId]?.inputData || {};
    
    if (inputData) {
        return inputData;
    }

    return null;
}

/**
 * Get the site's input data from the store 
 * 
 * @param {object} store The session store
 * @param {string} siteId |The site id
 * @returns The site input data or null if none exist.
 */
export function getSiteSubmissionData(store, siteId) {
    initializeSiteData(store, siteId); // Ensure the structure exists
    
    const submission = store?.siteData?.[siteId]?.submissionData || {};
    
    if (submission) {
        return submission;
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
    return store?.siteData?.[siteId]?.inputData?.[pageUrl]?.formData?.[elementName] || "";
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

