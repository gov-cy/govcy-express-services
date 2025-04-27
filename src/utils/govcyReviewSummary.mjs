/**
 * @module govcyReviewSummary
 * @fileoverview This module generates a review summary list based on user input.
 */

import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "./govcyDataLayer.mjs";
import { ALLOWED_FORM_ELEMENTS } from "./govcyConstants.mjs";
/**
 * Generate a review summary list based on the user's input.
 * 
 * @param {object} req the request object
 * @param {string} siteId the site id
 * @param {object} service the service object
 * @returns {object} summaryList the summary list object 
 */
export function govcyGenerateReviewSummary(req, siteId, service) {
    // Base summary list structure
    let summaryList = { element: "summaryList", params: { items: [] } };

    // Define allowed form elements
    //TODO: Handle textInput
    const allowedElements = ALLOWED_FORM_ELEMENTS;

    /**
     * Helper function to retrieve user input from session.
     * 
     * @param {string} pageUrl the page url
     * @param {string} elementName the element name
     * @returns {string} the session value or an empty string if not found
     */
    function getSessionValue(pageUrl, elementName) {
        return dataLayer.getFormDataValue(req.session, siteId, pageUrl, elementName) || ""; // Use the utility function to get the value
    }

    /**
     * Helper function to format the date input.
     * @param {string} pageUrl the page url
     * @param {string} elementName the element name
     * @param {string} lang the language
     * @returns {string} the formatted date input
     */
    function formatDateInput(pageUrl, elementName, lang) {
        const day = getSessionValue(pageUrl, `${elementName}_day`);
        const month = getSessionValue(pageUrl, `${elementName}_month`);
        const year = getSessionValue(pageUrl, `${elementName}_year`);

        if (!day || !month || !year) return "";

        return `${day}/${month}/${year}`; // EU format: DD/MM/YYYY
    }

    /**
     * Helper function to get the item value of checkboxes based on the selected value.
     * @param {object} formElement the form element
     * @param {sting} value the value 
     * @param {string} lang the language 
     * @returns {string} the item value of checkboxes 
     */
    function processCheckboxes(formElement, value, lang) {
        let valueString = "";
        // Check if the value is an array and process accordingly
        if (Array.isArray(value)) {
            value.forEach(selectedValue => {
                const matchedItem = formElement.params.items.find(item => item.value === selectedValue);
                if (matchedItem) {
                    valueString += `${matchedItem.text[lang]}, `;
                }
            });
        // If the value is a string, find the corresponding item
        } else if (typeof value === "string") {
            const matchedItem = formElement.params.items.find(item => item.value === value);
            if (matchedItem) {
                valueString = matchedItem.text[lang];
            }
        }
        // Remove trailing comma and space
        return valueString.replace(/,\s*$/, ""); // Remove trailing comma
    }

    /**
     * Helper function to get the item value of radios or select based on the selected value. 
     * @param {object} formElement the form element
     * @param {string} value the value
     * @param {string} lang the language
     * @returns {string} the item value of radios or select
    */
    function processRadiosOrSelect(formElement, value, lang) {
        if (typeof value === "string") {
            const matchedItem = formElement.params.items.find(item => item.value === value);
            if (matchedItem) {
                return matchedItem.text[lang];
            }
        }
        return value;
    }
    
    /**
     * Helper function to create a summary list item.
     * @param {object} formElement the form element
     * @param {string} value the value
     * @param {string} lang the language
     * @returns {object} the summary list item
    */
    function createSummaryListItem(formElement, value, lang) {
        return {
            "key": formElement.params.label || formElement.params.legend || { "en": formElement.params.name, "el": formElement.params.name, "tr": formElement.params.name },
            "value": [
                {
                    "element": "textElement",
                    "params": {
                        "text": { "en": value, "el": value, "tr": value},
                        "type": "span"
                    }
                }
            ]
        };
    }

    // Process each page in the service
    service.pages.forEach(page => {
        page.pageTemplate.sections.forEach(section => {
            if (!section.elements) return;

            section.elements.forEach(element => {
                if (element.element === "form") {
                    let summaryListInner = { element: "summaryList", params: { items: [] } };

                    element.params.elements.forEach(formElement => {
                        if (allowedElements.includes(formElement.element)) {
                            let value = getSessionValue(page.pageData.url, formElement.params.name);

                            // Handle checkboxes
                            if (formElement.element === "checkboxes" && value.length > 0) {
                                value = processCheckboxes(formElement, value, req.globalLang);
                            }

                            // Handle select and radios
                            if ((formElement.element === "select" || formElement.element === "radios") && typeof value === "string") {
                                value = processRadiosOrSelect(formElement, value, req.globalLang);
                            }

                            // Handle date input
                            if (formElement.element === "dateInput") {
                                value = formatDateInput(page.pageData.url, formElement.params.name, req.globalLang);
                            }

                            // Add to summary list
                            summaryListInner.params.items.push(createSummaryListItem(formElement, value, req.globalLang));
                        }

                        // Handle conditional elements inside radios
                        if (formElement.element === "radios") {
                            let selectedRadioValue = getSessionValue(page.pageData.url, formElement.params.name);

                            formElement.params.items.forEach(item => {
                                if (item.conditionalElements && selectedRadioValue === item.value) { // ✅ New: Only process matching radio option
                                    item.conditionalElements.forEach(conditionalElement => {
                                        if (allowedElements.includes(conditionalElement.element)) {
                                            let value = getSessionValue(page.pageData.url, conditionalElement.params.name);

                                            // Handle checkboxes
                                            if (conditionalElement.element === "checkboxes" && value.length > 0) {
                                                value = processCheckboxes(conditionalElement, value, req.globalLang);
                                            }

                                            // Handle select and radios
                                            if ((conditionalElement.element === "select" || conditionalElement.element === "radios") && typeof value === "string") {
                                                value = processRadiosOrSelect(conditionalElement, value, req.globalLang);
                                            }

                                            // Handle date input
                                            if (conditionalElement.element === "dateInput") {
                                                value = formatDateInput(page.pageData.url, conditionalElement.params.name, req.globalLang);
                                            }

                                            // Add to summary list
                                            summaryListInner.params.items.push(createSummaryListItem(conditionalElement, value, req.globalLang));
                                        }
                                    });
                                }
                            });
                        }
                    });

                    // Add inner summary list to the main summary list
                    summaryList.params.items.push({
                        "key": page.pageData.title,
                        "value": [summaryListInner],
                        "actions": [ //add change link
                            {
                                text:govcyResources.staticResources.text.change,
                                classes: govcyResources.staticResources.other.noPrintClass,
                                href: govcyResources.constructPageUrl(siteId, page.pageData.url, "review"),
                                visuallyHiddenText: page.pageData.title
                            }
                        ]
                    });
                }
            });
        });
    });

    return summaryList;
}
