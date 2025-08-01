/**
 * @module govcyFormHandling
 * @fileoverview This module provides utility functions for handling form data in a web application.
 * It includes functions to populate form data with session data, handle conditional elements,
 * and show error summary when there are validation errors.
 */
import { ALLOWED_FORM_ELEMENTS } from "./govcyConstants.mjs";


/**
 * Helper function to populate form data with session data
 * @param {Array} formElements The form elements  
 * @param {*} theData The data either from session or request
 */
export function populateFormData(formElements, theData, validationErrors) {
    const inputElements = ALLOWED_FORM_ELEMENTS;

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
                    populateFormData(item.conditionalElements, theData, validationErrors);
                  
                    // Check if any conditional element has an error and add to the parent "conditionalHasErrors": true
                    if (item.conditionalElements.some(condEl => condEl.params?.error)) {
                        item.conditionalHasErrors = true;
                    }
                }
            });
        }
    });
}


/**
 * Filters form data based on the form definition, including conditionals.
 * 
 * @param {Array} elements - The form elements (including conditional ones).
 * @param {Object} formData - The submitted form data.
 * @returns {Object} filteredData - The filtered form data.
 */
export function getFormData(elements, formData) {
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
                                getFormData(item.conditionalElements, formData)
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