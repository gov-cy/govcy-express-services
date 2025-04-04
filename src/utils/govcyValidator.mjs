/**
 * @module govcyValidator
 * @fileoverview This module provides validation functions for form elements.
 * It includes a function to validate form elements based on specified rules and conditions.
 * It also handles conditional elements and checks for specific input types.
 * Validation Types Breakdown:
 * - `required`: Checks if the value is not null, undefined, or an empty string (after trimming).
 * - `valid`: Executes the appropriate validation based on the checkValue (e.g., numeric, telCY, etc.).
 * - `length`: Ensures that the value's length doesn't exceed the specified limit.
 * - `regCheck`: Performs custom regex validation as per the rule's checkValue.
 */
import * as govcyResources from "../resources/govcyResources.mjs";

/**
 * This function validates a value based on the provided rules.
 * 
 * @param {string} value The value to validate
 * @param {Array} rules The validation rules to apply
 * @returns Error message text object if validation fails, otherwise null
*/
function validateValue(value, rules) {
  const validationRules = {
    // Valid validation rules
    numeric: (val) => /^\d+$/.test(val),
    numDecimal: (val) => /^\d+(,\d+)?$/.test(val),
    currency: (val) => /^\d+(,\d{1,2})?$/.test(val),
    alpha: (val) => /^[A-Za-z]+$/.test(val),
    alphaNum: (val) => /^[A-Za-z0-9]+$/.test(val),
    name: (val) => /^[A-Za-z\s]+$/.test(val),
    tel: (val) => /^\d{6,15}$/.test(val),
    mobile: (val) => /^\d{8,15}$/.test(val),
    telCY: (val) => /^(?:\+|00)?357[-\s]?(2|9)\d{7}$/.test(val.replace(/[\s-]/g, '')),
    mobileCY: (val) => /^(?:\+|00)?357[-\s]?9\d{7}$/.test(val.replace(/[\s-]/g, '')),
    iban: (val) => /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(val.replace(/[\s-]/g, '')),
    email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    date: (val) => !isNaN(Date.parse(val)),
    dateISO: (val) => {
      if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(val)) return false; // Basic format check
  
        const [year, month, day] = val.split("-").map(Number);
        const date = new Date(year, month - 1, day); // JavaScript months are 0-based
    
        return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        );
    },
    dateDMY: (val) => {
      if  (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) return false; // First check format

      const [day, month, year] = val.split('/').map(Number); // Convert to numbers
      const date = new Date(year, month - 1, day); // Month is zero-based in JS

      // Validate actual date parts
      return (
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
      );
    },
    // Other validation rules
    length: (val, length) => val.length <= length,
    required: (val) => !(val === null || val === undefined || (typeof val === 'string' && val.trim() === "")),
    regCheck: (val, regex) => new RegExp(regex).test(val),
  };

  for (const rule of rules) {
    // Extract rule parameters
    const { check, params } = rule;
    // Extract rule parameters
    const { checkValue, message } = params;

     // Handle "required" rules (check if value is not empty, null, or undefined)
     if (check === "required") {
      const isValid = validationRules.required(value);
      if (!isValid) {
        return message;
      }
    }

    // Check for "valid" rules (e.g., numeric, telCY, etc.)
    if (check === "valid" && validationRules[checkValue]) {
      const isValid = validationRules[checkValue](value);
      if (!isValid) {
        return message;
      }
    }

    // Check for "length" rules (e.g., max length check)
    if (check === "length") {
      const isValid = validationRules.length(value, checkValue);
      if (!isValid) {
        return message;
      }
    }

    // Check for "regCheck" rules (custom regex checks)
    if (check === "regCheck") {
      const isValid = validationRules.regCheck(value, checkValue);
      if (!isValid) {
        return message;
      }
    }
  }

  return null;
}

/**
 * 🔹 Recursive function to validate form fields, including conditionally displayed fields.
 * @param {Array} elements - The form elements (including conditional ones)
 * @param {Object} formData - The submitted form data
 * @param {string} pageUrl - Use this when linking error summary with the page instead of the element 
 * @returns {Object} validationErrors - The object containing validation errors
 */
export function validateFormElements(elements, formData, pageUrl) {
  const validationErrors = {};
  elements.forEach(field => {
      const inputElements = ["textInput", "textArea", "select", "radios", "checkboxes", "datePicker", "dateInput"];
      //only validate input elements
      if (inputElements.includes(field.element)) {
        const fieldValue = (field.element === "dateInput")
          ? [formData[`${field.params.name}_year`], 
            formData[`${field.params.name}_month`], 
            formData[`${field.params.name}_day`]]
            .filter(Boolean) // Remove empty values
            .join("-") // Join remaining parts
          : formData[field.params.name] || ""; // Get submitted value

        //Autocheck: check for "checkboxes", "radios", "select" if `fieldValue` is one of the `field.params.items
        if (["checkboxes", "radios", "select"].includes(field.element) && fieldValue !== "") {
          const valuesToCheck = Array.isArray(fieldValue) ? fieldValue : [fieldValue]; // Ensure it's always an array
          const isMatch = valuesToCheck.every(value => 
            field.params.items.some(item => item.value === value)
          );

          if (!isMatch) {
            validationErrors[(pageUrl ? pageUrl : "") + field.params.name] = {
              id: field.params.id, 
              message: govcyResources.staticResources.text.valueNotOnList,
              pageUrl: pageUrl || "", 
            };
          }
        }
        
        if (field.validations) {
            // 🔍 Validate the field using all its validation rules
            const errorMessage = validateValue(fieldValue, field.validations);
               if (errorMessage) {
                    if (!validationErrors[field.params.name]) {
                        validationErrors[(pageUrl ? pageUrl : "") + field.params.name] = {};
                    }
                    validationErrors[(pageUrl ? pageUrl : "") + field.params.name] = {
                      id: field.params.id, 
                      message: errorMessage,
                      pageUrl: pageUrl || "",
                    };
                }
        } 
    
        // 🔹 Handle conditional fields (only validate them if the parent condition is met)
        // Handle conditional elements inside radios
        if (field.element === "radios" && field.params.items) {
            field.params.items.forEach(item => {
            if (item.conditionalElements  && fieldValue === item.value) {
                if (Array.isArray(item.conditionalElements)){
                    item.conditionalElements.forEach(conditionalElement => {

                      const conditionalFieldValue = (conditionalElement.element === "dateInput")
                        ? [formData[`${conditionalElement.params.name}_year`], 
                          formData[`${conditionalElement.params.name}_month`], 
                          formData[`${conditionalElement.params.name}_day`]]
                          .filter(Boolean) // Remove empty values
                          .join("-") // Join remaining parts
                        : formData[conditionalElement.params.name] || ""; // Get submitted value

                        //Autocheck: check for "checkboxes", "radios", "select" if `fieldValue` is one of the `field.params.items`
                        if (["checkboxes", "radios", "select"].includes(conditionalElement.element) && conditionalFieldValue !== "") {
                          const valuesToCheck = Array.isArray(conditionalFieldValue) ? conditionalFieldValue : [conditionalFieldValue]; // Ensure it's always an array
                          const isMatch = valuesToCheck.every(value => 
                            conditionalElement.params.items.some(item => item.value === value)
                          );

                          if (!isMatch) {
                            validationErrors[(pageUrl ? pageUrl : "") + conditionalElement.params.name] = {
                              id: conditionalElement.params.id, 
                              message: govcyResources.staticResources.text.valueNotOnList,
                              pageUrl: pageUrl || "",
                            };
                          }
                        }
                        //if conditional element has validations
                        if (conditionalElement.validations) {
                            const errorMessage = validateValue(conditionalFieldValue, conditionalElement.validations);
                            if (errorMessage) {
                                if (!validationErrors[conditionalElement.params.name]) {
                                    validationErrors[(pageUrl ? pageUrl : "") + conditionalElement.params.name] = {};
                                }
                                validationErrors[(pageUrl ? pageUrl : "") + conditionalElement.params.name] = {
                                  id: conditionalElement.params.id, 
                                  message: errorMessage,
                                  pageUrl: pageUrl || "",
                                };
                            }
                        }
                    });
                }
            }
            });
        }
      }
  });
  return validationErrors;
}