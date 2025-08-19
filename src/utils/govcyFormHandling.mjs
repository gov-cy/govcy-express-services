/**
 * @module govcyFormHandling
 * @fileoverview This module provides utility functions for handling form data in a web application.
 * It includes functions to populate form data with session data, handle conditional elements,
 * and show error summary when there are validation errors.
 */
import { ALLOWED_FORM_ELEMENTS } from "./govcyConstants.mjs";
import * as dataLayer from "./govcyDataLayer.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";


/**
 * Helper function to populate form data with session data
 * @param {Array} formElements The form elements  
 * @param {*} theData The data either from session or request
 * @param {Object} validationErrors The validation errors
 * @param {Object} store The session store
 * @param {string} siteId The site ID
 * @param {string} pageUrl The page URL
 * @param {string} lang The language
 * @param {Object} fileInputElements The file input elements
 * @param {string} routeParam The route parameter
 */
export function populateFormData(formElements, theData, validationErrors, store = {}, siteId = "", pageUrl = "", lang = "el", fileInputElements = null, routeParam = "") {
    const inputElements = ALLOWED_FORM_ELEMENTS;
    const isRootCall = !fileInputElements;
    if (isRootCall) {
        fileInputElements = {};
    }
    // Recursively populate form data with session data
    formElements.forEach(element => {
        if (inputElements.includes(element.element)) {
            const fieldName = element.params.name;

            // Handle `dateInput` separately
            if (element.element === "dateInput") {
                element.params.dayValue = theData[`${fieldName}_day`] || "";
                element.params.monthValue = theData[`${fieldName}_month`] || "";
                element.params.yearValue = theData[`${fieldName}_year`] || "";
            //Handle `datePicker` separately
            } else if (element.element === "datePicker") {
                const val = theData[fieldName];

                // Check if the value exists and matches the D/M/YYYY or DD/MM/YYYY pattern
                if (val && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
                    const [day, month, year] = val.split("/").map(Number); // Convert parts to numbers
                    const date = new Date(year, month - 1, day); // Month is zero-based in JS

                    // Check if the date is valid (e.g., not 31/02/2020)
                    if (
                        date.getFullYear() === year &&
                        date.getMonth() === month - 1 &&
                        date.getDate() === day
                    ) {
                        // Format it as YYYY-MM-DD for the <input type="date"> value
                        const yyyy = year;
                        const mm = String(month).padStart(2, '0');
                        const dd = String(day).padStart(2, '0');
                        element.params.value = `${yyyy}-${mm}-${dd}`;
                    } else {
                        // Invalid date (e.g., 31/02/2020)
                        element.params.value = "";
                    }
                } else {
                    // Invalid format (not matching D/M/YYYY or DD/MM/YYYY)
                    element.params.value = "";
                }
            } else if (element.element === "fileInput") {
                // For fileInput, we change the element.element to "fileView" and set the 
                // fileId and sha256 from the session store
                // unneeded handle of `Attachment` at the end
                // const fileData = dataLayer.getFormDataValue(store, siteId, pageUrl, fieldName + "Attachment");
                const fileData = dataLayer.getFormDataValue(store, siteId, pageUrl, fieldName);
                // TODO: Ask Andreas how to handle empty file inputs
                if (fileData) {
                    element.element = "fileView";
                    element.params.fileId = fileData.fileId;
                    element.params.sha256 = fileData.sha256;
                    element.params.visuallyHiddenText = element.params.label;
                    // TODO: Also need to set the `view` and `download` URLs 
                    element.params.viewHref = "#viewHref";
                    element.params.deleteHref  = `/${siteId}/${pageUrl}/${fieldName}/delete-file${(routeParam) ? `?route=${routeParam}` : ''}`;
                } else {
                    // TODO: Ask Andreas how to handle empty file inputs
                    element.params.value = "";
                }       
                fileInputElements[fieldName] = element;
            // Handle all other input elements (textInput, checkboxes, radios, etc.)
            } else {
                element.params.value = theData[fieldName] || "";
            }

            // if there are validation errors, populate the error message
            if (validationErrors?.errors?.[fieldName]) {
                element.params.error = validationErrors.errors[fieldName].message;
                //populate the error summary
                const elementId = (element.element === "checkboxes" || element.element === "radios") // if checkboxes or radios
                    ? `${element.params.id}-option-1` // use the id of the first option
                    : (element.element === "dateInput") //if dateInput
                    ? `${element.params.id}_day`  // use the id of the day input
                    : element.params.id; // else use the id of the element
                validationErrors.errorSummary.push({
                    link: `#${elementId}`,
                    text: validationErrors.errors[fieldName].message
                });
            }
        }

        // Handle conditional elements inside radios
        if (element.element === "radios" && element.params.items) {
            element.params.items.forEach(item => {
                if (item.conditionalElements) {
                    populateFormData(item.conditionalElements, theData, validationErrors,store, siteId , pageUrl, lang, fileInputElements, routeParam);
                  
                    // Check if any conditional element has an error and add to the parent "conditionalHasErrors": true
                    if (item.conditionalElements.some(condEl => condEl.params?.error)) {
                        item.conditionalHasErrors = true;
                    }
                }
            });
        }
    });
    // add file input elements's definition in js object
    if (isRootCall && Object.keys(fileInputElements).length > 0) {
        const scriptTag = `
        <script type="text/javascript">
            window._govcyFileInputs = ${JSON.stringify(fileInputElements)};
            window._govcySiteId = "${siteId}";
            window._govcyPageUrl = "${pageUrl}";
            window._govcyLang = "${lang}";
        </script>
        <div id="_govcy-upload-status" class="govcy-visually-hidden" role="status" aria-live="assertive"></div>
        <div id="_govcy-upload-error" class="govcy-visually-hidden" role="alert" aria-live="assertive"></div>
        `.trim();
        formElements.push({
            element: 'htmlElement',
            params: {
                text: {
                    en: scriptTag,
                    el: scriptTag,
                    tr: scriptTag
                }
            }
        });
    }
}


/**
 * Filters form data based on the form definition, including conditionals.
 * 
 * @param {Array} elements - The form elements (including conditional ones).
 * @param {Object} formData - The submitted form data.
 * @param {Object} store - The session store .
 * @param {string} siteId - The site ID .
 * @param {string} pageUrl - The page URL .
 * @returns {Object} filteredData - The filtered form data.
 */
export function getFormData(elements, formData, store = {}, siteId = "", pageUrl = "") {
    const filteredData = {};
    elements.forEach(element => {
        const { name } = element.params || {};

        // Check if the element is allowed and has a name
        if (ALLOWED_FORM_ELEMENTS.includes(element.element) && name) {
            // Handle conditional elements (e.g., checkboxes, radios, select)
            if (["checkboxes", "radios", "select"].includes(element.element)) {
                const value = formData[name];
                filteredData[name] = value !== undefined && value !== null ? value : "";
                // Process conditional elements inside items
                if (element.element === "radios" && element.params.items) {
                    element.params.items.forEach(item => {
                        if (item.conditionalElements) {
                            Object.assign(
                                filteredData,
                                getFormData(item.conditionalElements, formData, store, siteId, pageUrl)
                            );
                        }
                    });
                }
                
            }
            // Handle dateInput
            else if (element.element === "dateInput") {
                const day = formData[`${name}_day`];
                const month = formData[`${name}_month`];
                const year = formData[`${name}_year`];
                filteredData[`${name}_day`] = day !== undefined && day !== null ? day : "";
                filteredData[`${name}_month`] = month !== undefined && month !== null ? month : "";
                filteredData[`${name}_year`] = year !== undefined && year !== null ? year : "";
            // handle fileInput
            } else if (element.element === "fileInput") {
                // fileInput elements are already stored in the store when it was uploaded
                // so we just need to check if the file exists in the dataLayer in the store and add it the filteredData
                // unneeded handle of `Attachment` at the end
                // const fileData = dataLayer.getFormDataValue(store, siteId, pageUrl, name + "Attachment");
                const fileData = dataLayer.getFormDataValue(store, siteId, pageUrl, name);
                if (fileData) {
                    // unneeded handle of `Attachment` at the end
                    // filteredData[name + "Attachment"] = fileData;
                    filteredData[name] = fileData;
                } else {
                    //TODO: Ask Andreas how to handle empty file inputs
                    // unneeded handle of `Attachment` at the end
                    // filteredData[name + "Attachment"] = ""; // or handle as needed
                    filteredData[name] = ""; // or handle as needed
                }
            // Handle other elements (e.g., textInput, textArea, datePicker)
            } else {
                filteredData[name] = formData[name] !== undefined && formData[name] !== null ? formData[name] : "";
            }

            // Always process conditional elements directly attached to the current element
            // if (element.conditionalElements) {
            //     Object.assign(filteredData, getFormData(element.conditionalElements, formData));
            // }
        }
    
    });
    

    return filteredData;
}