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
 * The following is an example of the data that will be stored:
 * 
```json
{
  service: {
    id: "example-service-id",
    title: {
      en: "Example Service",
      el: "Παράδειγμα υπηρεσίας"
    }
  },
  referenceNumber: "12345",
  timestamp: "2023-08-31T12:34:56Z",
  user: {
    unique_identifier: "0000123456",
    name: "User Name",
    email: "test@example.com",
    
  },
  rawData: {
    page1: {
      formData: {
        field1: [
          "value1",
          "value2"
        ],
        field2: "value2",
        _csrf: "1234567890"
      }
    },
    page2: {
      formData: {
        field3: "value3",
        field4: "value4",
        _csrf: "1234567890"
      }
    }
  },
  printFriendlyData: [
    {
      "pageUrl": "page1",
      "pageTitle": {
        "el": "Σελίδα 1",
        "en": "Page 1",
        "tr": ""
      },
      "fields": [
        {
          "id": "field1",
          "label": {
            "el": "Ετικέτα για το πεδιο ένα",
            "en": "Field one label",
            
          },
          "value": [
            "value1",
            "value2"
          ],
          "valueLabel": [
            {
              "el": "Ετικέτα για value1",
              "en": "Label for value1"
            },
            {
              "el": "Ετικέτα για value2",
              "en": "Label for value2"
            }
          ]
        },
        {
          "id": "field2",
          "label": {
            "el": "Ετικέτα για το πεδιο δυο",
            "en": "Field two label",
            
          },
          "value": "value2",
          "valueLabel": {
            "el": "Ετικέτα για value2",
            "en": "Label for value2"
          }
        }
      ]
    },
    {
      "pageUrl": "page2",
      "pageTitle": {
        "el": "Σελίδα 2",
        "en": "Page 2"
      },
      "fields": [
        {
          "id": "field3",
          "label": {
            "el": "Ετικέτα για το πεδιο 3",
            "en": "Field 3 label",
            
          },
          "value": "value2",
          "valueLabel": {
            "el": "Ετικέτα για value3",
            "en": "Label for value3"
          }
        },
        {
          "id": "field4",
          "label": {
            "el": "Ετικέτα για το πεδιο 4",
            "en": "Field 4 label",
            
          },
          "value": "value2",
          "valueLabel": {
            "el": "Ετικέτα για value4",
            "en": "Label for value4"
          }
        }
      ]
    }
  ]
}
  ```
 * 
 * @param {object} store The session store
 * @param {string} siteId The site id
 * @param {object} service The service config object
 * @param {string} referenceNumber The reference number
 * @param {string} timestamp The timestamp as ISO 8601 strings in UTC
 * @param {Array} printFriendlyData The print friendly data prepared for printing 
 */
export function storeSiteSubmissionData(store, siteId, service, referenceNumber, timestamp,  printFriendlyData) {
    initializeSiteData(store, siteId); // Ensure the structure exists

    let rawData = getSiteInputData(store, siteId);
    // Store the submission data
    store.siteData[siteId].submissionData = {
        service: {  // Service info
            id: service.site.id, // Service id
            title: service.site.title // Service title multilingual object
        },
        referenceNumber: referenceNumber, // Reference number
        timestamp: timestamp, // Timestamp `new Date().toISOString();`
        user: { // User info
            unique_identifier: getUser(store).unique_identifier, // User unique identifier 
            name: getUser(store).name, // User name
            email: getUser(store).email // User email
        },
        rawData: rawData, // Raw data as submitted by the user in each page
        printFriendlyData: printFriendlyData // Print friendly data
    }

    // Clear validation errors from the session
    store.siteData[siteId].inputData = {};
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

