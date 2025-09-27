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
    if (!store.siteData[siteId].inputData) store.siteData[siteId].loadData = {};
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
 * @param {string} key The key to store the errors under. Used for multiple items. Defaults to null
 */
export function storePageValidationErrors(store, siteId, pageUrl, validationErrors, formData, key = null) {
  // Ensure session structure is initialized
  initializeSiteData(store, siteId, pageUrl);

  // Build the error object
  const errorObj = {
    errors: validationErrors,
    formData: formData,
    errorSummary: []
  };

  // If a key is provided (e.g., "add" or "2"), store under that key
  if (key !== null) {
    const existing = store.siteData[siteId].inputData[pageUrl]["validationErrors"] || {};
    store.siteData[siteId].inputData[pageUrl]["validationErrors"] = {
      ...existing,
      [key]: errorObj
    };
  } else {
    // Normal page (no key)
    store.siteData[siteId].inputData[pageUrl]["validationErrors"] = errorObj;
  }
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

export function storePageDataElement(store, siteId, pageUrl, elementName, value) {
    // Ensure session structure is initialized
    initializeSiteData(store, siteId, pageUrl);

    // Store the element value
    store.siteData[siteId].inputData[pageUrl].formData[elementName] = value;
}
/**
 * Stores the page's input data in the data layer
 *  * 
 * @param {object} store The session store 
 * @param {string} siteId The site id
 * @param {object} loadData The form data to be stored 
 */
export function storeSiteInputData(store, siteId, loadData) {
    // Ensure session structure is initialized
    initializeSiteData(store, siteId);

    store.siteData[siteId]["inputData"] = loadData;
}

/**
 * Stores the page's load data in the data layer
 *  * 
 * @param {object} store The session store 
 * @param {string} siteId The site id
 * @param {object} loadData The form data to be stored 
 */
export function storeSiteLoadData(store, siteId, loadData) {
    // Ensure session structure is initialized
    initializeSiteData(store, siteId);

    store.siteData[siteId]["loadData"] = loadData;
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
    // Clear presaved/temporary save data
    store.siteData[siteId].loadData = {};

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
 * Get the site's data from the store (including input data and eligibility data)
 * 
 * @param {object} store The session store
 * @param {string} siteId |The site id
 * @returns The site data or null if none exist.
 */
export function getSiteData(store, siteId) {
    const inputData = store?.siteData?.[siteId] || {};

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
export function getSiteInputData(store, siteId) {
    const inputData = store?.siteData?.[siteId]?.inputData || {};

    if (inputData) {
        return inputData;
    }

    return null;
}

/**
 * Get the site's load data from the store 
 * 
 * @param {object} store The session store
 * @param {string} siteId |The site id
 * @returns The site load data or null if none exist.
 */
export function getSiteLoadData(store, siteId) {
    const loadData = store?.siteData?.[siteId]?.loadData || {};

    if (loadData) {
        return loadData;
    }

    return null;
}

/**
 * Get the site's reference number from load data from the store 
 * 
 * @param {object} store The session store
 * @param {string} siteId The site ID
 * @returns {string|null} The reference number or null if not available
 */
export function getSiteLoadDataReferenceNumber(store, siteId) {
    const ref = store?.siteData?.[siteId]?.loadData?.referenceValue;

    return typeof ref === 'string' && ref.trim() !== '' ? ref : null;
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
export function getFormDataValue(store, siteId, pageUrl, elementName, index = null) {
    const pageData = store?.siteData?.[siteId]?.inputData?.[pageUrl];
    if (!pageData) return "";

    // Case 1: formData is an array (multipleThings edit)
    if (Array.isArray(pageData.formData) && index !== null) {
        return pageData?.formData[index]?.[elementName] || "";
    }

    // Case 2: formData is a flat object (single page or multipleThings add seed)
    if (pageData.formData && !Array.isArray(pageData.formData)) {
        const val = pageData.formData[elementName];
        // If the flat value exists and is non-empty, prefer it.
        const hasNonEmptyFlat =
            val !== undefined &&
            val !== "" &&
            !(typeof val === "object" && val !== null && Object.keys(val).length === 0);
        if (hasNonEmptyFlat) return val;

        // Otherwise, fall back to multipleDraft (used in add flow) if present.
        if (pageData.multipleDraft && typeof pageData.multipleDraft === "object") {
            const draftVal = pageData.multipleDraft[elementName];
            if (draftVal !== undefined && draftVal !== "") return draftVal;
        }
        // If neither exists, return an empty string
        return "";
    }

    // Case 3: no flat formData; fall back to multipleDraft (used in add flow)
    if (pageData.multipleDraft && typeof pageData.multipleDraft === "object") {
        return pageData?.multipleDraft?.[elementName] || "";
    }

    return "";
}


/**
 * Get the user object from the session store
 * 
 * @param {object} store The session store 
 * @returns The user object from the store or null if it doesn't exist.
 */
export function getUser(store) {
    return store?.user || null;
}

export function clearSiteData(store, siteId) {
    delete store?.siteData[siteId];
}

/**
 * Get multiple things draft data while adding a new multiple thing
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url
 * @returns The multiple things draft data while adding a new multiple thing. 
 */
export function getMultipleDraft(store, siteId, pageUrl) {
  return store?.siteData?.[siteId]?.inputData?.[pageUrl]?.multipleDraft || null;
}

/**
 * Store multiple things draft data used while adding a new multiple thing
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url
 * @param {*} obj The multiple things draft data to be stored
 */
export function setMultipleDraft(store, siteId, pageUrl, obj) {
  initializeSiteData(store, siteId, pageUrl);
  store.siteData[siteId].inputData[pageUrl].multipleDraft = obj || {};
}

/**
 * Clear multiple things draft data used while adding a new multiple thing
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {string} pageUrl The page url 
 */
export function clearMultipleDraft(store, siteId, pageUrl) {
  if (store?.siteData?.[siteId]?.inputData?.[pageUrl]) {
    store.siteData[siteId].inputData[pageUrl].multipleDraft = null;
  }
}

/**
 * Check if a file reference is used in more than one place (field) across the site's inputData.
 *
 * A "file reference" is an object like:
 *   { sha256: "abc...", fileId: "xyz..." }
 *
 * Matching rules:
 *  - If both fileId and sha256 are provided, both must match.
 *  - If only one is provided, we match by that single property.
 *
 * Notes:
 *  - Does NOT mutate the session.
 *  - Safely handles missing site/pages.
 *  - If a form field is an array (e.g., multiple file inputs), each item is checked.
 *
 * @param {object} store   The session object (e.g., req.session)
 * @param {string} siteId  The site identifier
 * @param {object} params  { fileId?: string, sha256?: string }
 * @returns {boolean}      true if the file is found in more than one place, else false
 */
export function isFileUsedInSiteInputDataAgain(store, siteId, { fileId, sha256 } = {}) {
    // If neither identifier is provided, we cannot match anything
    if (!fileId && !sha256) return false;

    // Ensure session structure is initialized
    initializeSiteData(store, siteId);

    // Site input data: session.siteData[siteId].inputData
    const site = store?.siteData?.[siteId]?.inputData;
    if (!site || typeof site !== 'object') return false;

    let hits = 0; // how many fields across the site reference this file

    // Loop all pages under the site
    for (const pageKey of Object.keys(site)) {
        const pageData = site[pageKey];
        if (!pageData) continue;

        // Helper to scan an object for file matches
        const scanObject = (obj) => {
            for (const value of Object.values(obj)) {
                if (value == null) continue;
                const candidates = Array.isArray(value) ? value : [value];
                for (const candidate of candidates) {
                    if (
                        candidate &&
                        typeof candidate === "object" &&
                        "fileId" in candidate &&
                        "sha256" in candidate
                    ) {
                        const idMatches = fileId ? candidate.fileId === fileId : true;
                        const shaMatches = sha256 ? candidate.sha256 === sha256 : true;
                        if (idMatches && shaMatches) {
                            hits += 1;
                            if (hits > 1) return true;
                        }
                    }
                }
            }
            return false;
        };

        // Case 1: flat formData object
        if (pageData.formData && !Array.isArray(pageData.formData)) {
            if (scanObject(pageData.formData)) return true;
        }

        // Case 2: multipleDraft
        if (pageData.multipleDraft) {
            if (scanObject(pageData.multipleDraft)) return true;
        }

        // Case 3: formData as array (multiple items)
        if (Array.isArray(pageData.formData)) {
            for (const item of pageData.formData) {
                if (scanObject(item)) return true;
            }
        }
        
        // Case 4: formData.multipleItems array (your current design)
        if (Array.isArray(pageData.formData?.multipleItems)) {
            for (const item of pageData.formData.multipleItems) {
                if (scanObject(item)) return true;
            }
        }
    }

    // If we get here, it was used 0 or 1 times
    return false;
}


/**
 * Remove (replace with "") file values across ALL pages of a site,
 * matching a specific fileId and/or sha256.
 *
 * Matching rules:
 *  - If BOTH fileId and sha256 are provided, a file object must match BOTH.
 *  - If ONLY fileId is provided, match on fileId.
 *  - If ONLY sha256 is provided, match on sha256.
 *
 * Scope:
 *  - Operates on every page under store.siteData[siteId].inputData.
 *  - Shallow traversal of formData:
 *      • Direct fields: formData[elementId] = { fileId, sha256, ... }
 *      • Arrays: [ {fileId...}, {sha256...}, "other" ] → ["", "", "other"] (for matches)
 *
 * Side effects:
 *  - Mutates store.siteData[siteId].inputData[*].formData in place.
 *  - Intentionally returns nothing.
 *
 * @param {object} store - The data-layer store.
 * @param {string} siteId - The site key under store.siteData to modify.
 * @param {{ fileId?: string|null, sha256?: string|null }} match - Identifiers to match.
 *   Provide at least one of fileId/sha256. If both are given, both must match.
 */
export function removeAllFilesFromSite(
    store,
    siteId,
    { fileId = null, sha256 = null } = {}
) {
    // Ensure session structure is initialized
    initializeSiteData(store, siteId);

    // --- Guard rails ---------------------------------------------------------

    // Nothing to remove if neither identifier is provided.
    if (!fileId && !sha256) return;

    // Per your structure: dig under .inputData for the site's pages.
    const site = store?.siteData?.[siteId]?.inputData;
    if (!site || typeof site !== "object") return;

    // --- Helpers -------------------------------------------------------------

    // Is this value a "file-like" object (has fileId and/or sha256)?
    const isFileLike = (v) =>
        v &&
        typeof v === "object" &&
        (Object.prototype.hasOwnProperty.call(v, "fileId") ||
            Object.prototype.hasOwnProperty.call(v, "sha256"));

    // Does a file-like object match the provided criteria?
    const isMatch = (obj) => {
        if (!isFileLike(obj)) return false;

        // Strict when both are given
        if (fileId && sha256) {
            return obj.fileId === fileId && obj.sha256 === sha256;
        }
        // Otherwise match whichever was provided
        if (fileId) return obj.fileId === fileId;
        if (sha256) return obj.sha256 === sha256;

        return false;
    };

    // --- Main traversal over all pages --------------------------------------

    for (const page of Object.values(site)) {
        if (!page || typeof page !== "object") continue;

        // --- Case 1: flat formData object -----------------------------------
        if (page.formData && !Array.isArray(page.formData)) {
            const formData = page.formData;
            for (const key of Object.keys(formData)) {
                const val = formData[key];

                // Case A: a single file object → replace with "" if it matches.
                if (isMatch(val)) {
                    formData[key] = "";
                    continue;
                }

                // Case B: an array → replace ONLY the matching items with "".
                if (Array.isArray(val)) {
                    let changed = false;
                    const mapped = val.map((item) => {
                        if (isMatch(item)) {
                            changed = true;
                            return "";
                        }
                        return item;
                    });
                    if (changed) formData[key] = mapped;
                }
            }
        }

        // --- Case 2: formData as array (multiple items) ---------------------
        if (Array.isArray(page.formData)) {
            for (const item of page.formData) {
                if (!item || typeof item !== "object") continue;
                for (const key of Object.keys(item)) {
                    const val = item[key];
                    if (isMatch(val)) {
                        item[key] = "";
                        continue;
                    }
                    if (Array.isArray(val)) {
                        let changed = false;
                        const mapped = val.map((sub) =>
                            isMatch(sub) ? "" : sub
                        );
                        if (changed) item[key] = mapped;
                    }
                }
            }
        }

        // --- Case 3: multipleDraft ------------------------------------------
        if (page.multipleDraft && typeof page.multipleDraft === "object") {
            for (const key of Object.keys(page.multipleDraft)) {
                const val = page.multipleDraft[key];
                if (isMatch(val)) {
                    page.multipleDraft[key] = "";
                    continue;
                }
                if (Array.isArray(val)) {
                    let changed = false;
                    const mapped = val.map((sub) =>
                        isMatch(sub) ? "" : sub
                    );
                    if (changed) page.multipleDraft[key] = mapped;
                }
            }
        }

        // Note: If you later store file-like objects deeper in nested objects,
        // add a recursive visitor here (with cycle protection / max depth).
    }
}


