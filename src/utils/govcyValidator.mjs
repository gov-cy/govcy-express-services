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
import { ALLOWED_FORM_ELEMENTS } from "./govcyConstants.mjs";

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
    alpha: (val) => /^[A-Za-zΑ-Ωα-ω\u0370-\u03ff\u1f00-\u1fff\s]+$/.test(val),
    alphaNum: (val) => /^[A-Za-zΑ-Ωα-ω\u0370-\u03ff\u1f00-\u1fff0-9\s]+$/.test(val),
    noSpecialChars: (val) => /^([0-9]|[A-Z]|[a-z]|[α-ω]|[Α-Ω]|[,]|[.]|[-]|[(]|[)]|[?]|[!]|[;]|[:]|[\n]|[\r]|[ _]|[\u0370-\u03ff\u1f00-\u1fff])+$/.test(val),
    noSpecialCharsEl: (val) => /^([0-9]|[α-ω]|[Α-Ω]|[,]|[.]|[-]|[(]|[)]|[?]|[!]|[;]|[:]|[\n]|[\r]|[ _]|[\u0370-\u03ff\u1f00-\u1fff])+$/.test(val),
    name: (val) => /^[A-Za-zΑ-Ωα-ω\u0370-\u03ff\u1f00-\u1fff\s'-]+$/.test(val),
    tel: (val) => /^(?:\+|00)?[\d\s\-()]{8,20}$/.test(val.replace(/[\s\-()]/g, '')),
    mobile: (val) => /^(?:\+|00)?[\d\s\-()]{8,20}$/.test(val.replace(/[\s\-()]/g, '')),
    // telCY: (val) => /^(?:\+|00)?357[-\s]?(2|9)\d{7}$/.test(val.replace(/[\s\-()]/g, '')),
    // telCY: (val) => /^(?:\+|00)?357?(2|9)\d{7}$/.test(val.replace(/[\s\-()]/g, '')),
    telCY: (val) => {
      const normalized = val.replace(/[\s\-()]/g, '');
      const isValid = /^(?:\+357|00357)?(2|9)\d{7}$/.test(normalized);
      return isValid;
    },
    // mobileCY: (val) => /^(?:\+|00)?357[-\s]?9\d{7}$/.test(val.replace(/[\s\-()]/g, '')),
    mobileCY: (val) => {
      const normalized = val.replace(/[\s\-()]/g, ''); // Remove spaces, hyphens, and parentheses
      return /^(?:\+357|00357)?9\d{7}$/.test(normalized); // Match Cypriot mobile numbers
    },
    iban: (val) => {
      const cleanedIBAN = val.replace(/[\s-]/g, '').toUpperCase(); // Remove spaces/hyphens and convert to uppercase
      const regex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

      // Validate structure and checksum
      return regex.test(cleanedIBAN) && validateIBANChecksum(cleanedIBAN);
    },
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
      if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) return false; // First check format

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
    //Min and Max
    minValue: (val, min) => {
      const normalizedVal = normalizeNumber(val); // Normalize the input
      if (isNaN(normalizedVal)) {
        return false; // Return false if val cannot be converted to a number
      }
      return normalizedVal >= min;
    },
    maxValue: (val, max) => {
      const normalizedVal = normalizeNumber(val); // Normalize the input
      if (isNaN(normalizedVal)) {
        return false; // Return false if val cannot be converted to a number
      }
      return normalizedVal <= max;
    },
    // ✅ Year based current rules
    maxCurrentYear: (val) => {
      const normalizedVal = normalizeNumber(val);
      if (isNaN(normalizedVal)) return false;
      const currentYear = new Date().getFullYear();
      return normalizedVal <= currentYear;
    },
    minCurrentYear: (val) => {
      const normalizedVal = normalizeNumber(val);
      if (isNaN(normalizedVal)) return false;
      const currentYear = new Date().getFullYear();
      return normalizedVal >= currentYear;
    },
    // ✅ Date-based current rules
    minCurrentDate: (val) => {
      const valueDate = parseDate(val);
      const today = new Date();
      if (isNaN(valueDate)) return false;
      // strip time components from both
      const valueOnly = new Date(valueDate.getFullYear(), valueDate.getMonth(), valueDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return valueOnly >= todayOnly;
    },

    maxCurrentDate: (val) => {
      const valueDate = parseDate(val);
      const today = new Date();
      if (isNaN(valueDate)) return false;
      const valueOnly = new Date(valueDate.getFullYear(), valueDate.getMonth(), valueDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return valueOnly <= todayOnly;
    },

    minValueDate: (val, minDate) => {
      const valueDate = parseDate(val); // Parse the input date
      const min = parseDate(minDate); // Parse the minimum date
      if (isNaN(valueDate) || isNaN(min)) {
        return false; // Return false if either date is invalid
      }
      return valueDate >= min;
    },
    maxValueDate: (val, maxDate) => {
      const valueDate = parseDate(val); // Parse the input date
      const max = parseDate(maxDate); // Parse the maximum date
      if (isNaN(valueDate) || isNaN(max)) {
        return false; // Return false if either date is invalid
      }
      return valueDate <= max;
    },
    minLength: (val, min) => val.length >= min
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

    // Skip validation if the value is empty
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === "")) {
      continue; // let "required" handle emptiness
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

    // Check for "minValue"
    if (check === 'minValue' && !validationRules.minValue(value, checkValue)) {
      return message;
    }

    // Check for "maxValue"
    if (check === 'maxValue' && !validationRules.maxValue(value, checkValue)) {
      return message;
    }

    // Check for "minValueDate"
    if (check === 'minValueDate' && !validationRules.minValueDate(value, checkValue)) {
      return message;
    }

    // Check for "maxValueDate"
    if (check === 'maxValueDate' && !validationRules.maxValueDate(value, checkValue)) {
      return message;
    }

    // Check for "minLength"
    if (check === 'minLength' && !validationRules.minLength(value, checkValue)) {
      return message;
    }


  }

  return null;
}

// Helper function to validate IBAN
function validateIBANChecksum(iban) {
  // Move the first four characters to the end
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  const numericIBAN = rearranged.replace(/[A-Z]/g, (char) => char.charCodeAt(0) - 55);

  // Perform modulo 97 operation
  let remainder = numericIBAN;
  while (remainder.length > 2) {
    const chunk = remainder.slice(0, 9); // Process in chunks of up to 9 digits
    remainder = (parseInt(chunk, 10) % 97) + remainder.slice(chunk.length);
  }

  return parseInt(remainder, 10) % 97 === 1;
}

// Helper function to normalize numbers
function normalizeNumber(value) {
  if (typeof value !== 'string') {
    return NaN; // Ensure the input is a string
  }
  // Remove thousands separators (.)
  const withoutThousandsSeparator = value.replace(/\./g, '');
  // Replace the decimal separator (,) with a dot (.)
  const normalizedValue = withoutThousandsSeparator.replace(',', '.');
  return parseFloat(normalizedValue); // Convert to a number
}


function parseDate(value) {
  // Check for ISO format (yyyy-mm-dd)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day); // JavaScript months are 0-based
    if (
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day
    ) {
      return parsedDate;
    }
  }

  // Check for DMY format (d/m/yyyy)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/').map(Number);
    const parsedDate = new Date(year, month - 1, day); // JavaScript months are 0-based
    if (
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day
    ) {
      return parsedDate;
    }
  }

  return NaN; // Return NaN if the format is invalid
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
    const inputElements = ALLOWED_FORM_ELEMENTS;
    //only validate input elements
    if (inputElements.includes(field.element)) {
      const fieldValue = (field.element === "dateInput")
        ? [formData[`${field.params.name}_year`],
        formData[`${field.params.name}_month`],
        formData[`${field.params.name}_day`]]
          .filter(Boolean) // Remove empty values
          .join("-") // Join remaining parts
        // unneeded handle of `Attachment` at the end
        // : (field.element === "fileInput") // Handle fileInput
        //   ? formData[`${field.params.name}Attachment`] || ""
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
          if (item.conditionalElements && fieldValue === item.value) {
            if (Array.isArray(item.conditionalElements)) {
              item.conditionalElements.forEach(conditionalElement => {

                const conditionalFieldValue = (conditionalElement.element === "dateInput")
                  ? [formData[`${conditionalElement.params.name}_year`],
                  formData[`${conditionalElement.params.name}_month`],
                  formData[`${conditionalElement.params.name}_day`]]
                    .filter(Boolean) // Remove empty values
                    .join("-") // Join remaining parts
                  : (conditionalElement.element === "fileInput") // Handle fileInput
                    // unneeded handle of `Attachment` at the end
                    // ? formData[`${conditionalElement.params.name}Attachment`] || ""
                    ? formData[`${conditionalElement.params.name}`] || ""
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


/**
 * Checks if a user is an Individual with a valid Cypriot citizen identifier.
 * Rules:
 *  - profile_type must be "Individual"
 *  - unique_identifier must be a string
 *  - must start with "00"
 *  - must be 10 characters long
 *
 * @param {object} user - The user object (e.g. req.session.user)
 * @returns {boolean} true if valid, false otherwise
 */
export function isValidCypriotCitizen(user = {}) {
  const { profile_type, unique_identifier } = user;

  if (
    typeof profile_type === "string" &&
    profile_type === "Individual" &&
    typeof unique_identifier === "string" &&
    unique_identifier.startsWith("00") &&
    unique_identifier.length === 10
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the given user represents a valid foreign resident (ARC holder).
 * Conditions:
 *  - profile_type must equal "Individual"
 *  - unique_identifier must be a string
 *  - unique_identifier must start with "05"
 *  - unique_identifier must be exactly 10 characters long
 *
 * @param {object} user - e.g. req.session.user
 * @returns {boolean} True if valid foreign resident, otherwise false
 */
export function isValidForeignResident(user = {}) {
  const { profile_type, unique_identifier } = user;

  return (
    typeof profile_type === "string" &&
    profile_type === "Individual" &&
    typeof unique_identifier === "string" &&
    unique_identifier.startsWith("05") &&
    unique_identifier.length === 10
  );
}

/**
 * Checks if the user is under 18 years old based on their date of birth.
 * @param {string} dobString - The date of birth in the format "YYYY-MM-DD".
 * @returns {boolean} True if the user is under 18 years old, otherwise false.
 * @throws {Error} If the date of birth is missing or invalid.
 * */
export function isUnder18(dobString) {
  if (!dobString) throw new Error("DOB is missing");
  const dob = new Date(dobString);
  if (isNaN(dob)) throw new Error("Invalid DOB format");

  const today = new Date();
  const ageDiff = today.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  return (hasHadBirthday ? ageDiff : ageDiff - 1) < 18;
}


