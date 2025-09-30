
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "./govcyDataLayer.mjs";
import { DSFEmailRenderer } from '@gov-cy/dsf-email-templates';
import { ALLOWED_FORM_ELEMENTS } from "./govcyConstants.mjs";
import { evaluatePageConditions } from "./govcyExpressions.mjs";
import { getPageConfigData } from "./govcyLoadConfigData.mjs";
import { logger } from "./govcyLogger.mjs";
import nunjucks from "nunjucks";

/**
 * Prepares the submission data for the service, including raw data, print-friendly data, and renderer data.
 * 
 * @param {object} req The request object containing session data
 * @param {string} siteId The site ID
 * @param {object} service The service object containing site and page data
 * @returns {object} The submission data object containing raw data, print-friendly data, and renderer data
 */
export function prepareSubmissionData(req, siteId, service) {
    // Get the raw data from the session store
    // const rawData = dataLayer.getSiteInputData(req.session, siteId);

    // ----- Conditional logic comes here
    // Filter site input data based on active pages only
    // const rawData = {};
    // for (const page of service.pages) {
    // const shouldInclude = evaluatePageConditions(page, req.session, siteId, req).result === true;
    //     if (shouldInclude) {
    //         const pageUrl = page.pageData.url;
    //         const formData = dataLayer.getPageData(req.session, siteId, pageUrl);
    //         if (formData && Object.keys(formData).length > 0) {
    //             rawData[pageUrl] = { formData };
    //         }
    //     }
    // }

    // ----- consistent data model for submissionData (CONFIG-BASED)
    const submissionData = {};

    // Loop through every page in the service definition
    for (const page of service.pages) {
        const pageUrl = page.pageData.url || "";

        // Find the <form> element in the page
        let formElement = null;
        for (const section of page.pageTemplate.sections || []) {
            formElement = section.elements.find(el => el.element === "form");
            if (formElement) break;
        }

        if (!formElement) continue; // ⛔ Skip pages without a <form> element

        // 🔹 Case A: multipleThings page → array of items
        if (page.multipleThings) {
            // get the items array from session (or empty array if not found / not an array)
            let items = dataLayer.getPageData(req.session, siteId, pageUrl);
            if (!Array.isArray(items)) items = [];

            submissionData[pageUrl] = [];

            items.forEach((item, idx) => {
                const itemData = {};
                for (const el of formElement.params.elements || []) {
                    if (!ALLOWED_FORM_ELEMENTS.includes(el.element)) continue;
                    const elId = el.params?.id || el.params?.name;
                    if (!elId) continue;

                    // ✅ normalized with index
                    let value = getValue(el, pageUrl, req, siteId, idx);
                    itemData[elId] = value;

                    // handle fileInput special naming
                    if (el.element === "fileInput") {
                        itemData[elId + "Attachment"] = value;
                        delete itemData[elId];
                    }

                    // radios conditional elements
                    if (el.element === "radios") {
                        for (const radioItem of el.params.items || []) {
                            for (const condEl of radioItem.conditionalElements || []) {
                                if (!ALLOWED_FORM_ELEMENTS.includes(condEl.element)) continue;
                                const condId = condEl.params?.id || condEl.params?.name;
                                if (!condId) continue;
                                let condValue = getValue(condEl, pageUrl, req, siteId, idx);
                                itemData[condId] = condValue;

                                if (condEl.element === "fileInput") {
                                    itemData[condId + "Attachment"] = condValue;
                                    delete itemData[condId];
                                }
                            }
                        }
                    }
                }
                submissionData[pageUrl].push(itemData);
            });
        } else {
            // 🔹 Case B: normal page → single object

            // submissionData[pageUrl] = { formData: {} }; // ✅ Now initialize only if a form is present
            submissionData[pageUrl] = {}; // ✅ Now initialize only if a form is present

            // Traverse the form elements inside the form
            for (const element of formElement.params.elements || []) {
                const elType = element.element;

                // ✅ Skip non-input elements like buttons
                if (!ALLOWED_FORM_ELEMENTS.includes(elType)) continue;

                const elId = element.params?.id || element.params?.name;
                if (!elId) continue; // ⛔ Skip elements with no id/name

                // 🟢 Use helper to get session value (or "" fallback if missing)
                const value = getValue(element, pageUrl, req, siteId) ?? "";

                // Store in submissionData
                // submissionData[pageUrl].formData[elId] = value;
                submissionData[pageUrl][elId] = value;

                // handle fileInput
                if (elType === "fileInput") {
                    // change the name of the key to include "Attachment" at the end but not have the original key
                    // submissionData[pageUrl].formData[elId + "Attachment"] = value;
                    submissionData[pageUrl][elId + "Attachment"] = value;
                    // delete submissionData[pageUrl].formData[elId];
                    delete submissionData[pageUrl][elId];
                }

                // 🔄 If radios with conditionalElements, walk ALL options
                if (elType === "radios" && Array.isArray(element.params?.items)) {
                    for (const radioItem of element.params.items) {
                        const condEls = radioItem.conditionalElements;
                        if (!Array.isArray(condEls)) continue;

                        for (const condElement of condEls) {
                            const condType = condElement.element;
                            if (!ALLOWED_FORM_ELEMENTS.includes(condType)) continue;

                            const condId = condElement.params?.id || condElement.params?.name;
                            if (!condId) continue;

                            // Again: read from session or fallback to ""
                            const condValue = getValue(condElement, pageUrl, req, siteId) ?? "";

                            // Store even if the field was not visible to user
                            // submissionData[pageUrl].formData[condId] = condValue;
                            submissionData[pageUrl][condId] = condValue;
                            // handle fileInput
                            if (condType === "fileInput") {
                                // change the name of the key to include "Attachment" at the end but not have the original key
                                // submissionData[pageUrl].formData[condId + "Attachment"] = condValue;
                                submissionData[pageUrl][condId + "Attachment"] = condValue;
                                // delete submissionData[pageUrl].formData[condId];
                                delete submissionData[pageUrl][condId];
                            }
                        }
                    }
                }
            }
        }
    }
    logger.debug("Submission Data prepared:", submissionData);
    // ----- END config-based stable submissionData block

    // Get the print-friendly data from the session store
    const printFriendlyData = preparePrintFriendlyData(req, siteId, service);

    // Get the renderer data from the session store
    const reviewSummaryList = generateReviewSummary(printFriendlyData, req, siteId, false);
    // Prepare the submission data object
    return {
        submissionUsername: dataLayer.getUser(req.session).name,
        submissionEmail: dataLayer.getUser(req.session).email,
        submissionData: submissionData, // Raw data as submitted by the user in each page
        submissionDataVersion: service.site?.submissionDataVersion || service.site?.submission_data_version || "", // The submission data version
        printFriendlyData: printFriendlyData, // Print-friendly data
        rendererData: reviewSummaryList, // Renderer data of the summary list
        rendererVersion: service.site?.rendererVersion || service.site?.renderer_version || "", // The renderer version
        designSystemsVersion: service.site?.designSystemsVersion || service.site?.design_systems_version || "", // The design systems version
        service: { // Service info
            id: service.site.id, // Service ID
            title: service.site.title // Service title multilingual object
        },
        referenceNumber: "", // Reference number
        // timestamp: new Date().toISOString(), // Timestamp `new Date().toISOString();`
    };
}

/**
 * Prepares the submission data for the API, stringifying all relevant fields.
 * 
 * @param {object} data data prepared by `prepareSubmissionData`
 * @returns {object} The API-ready submission data object with all fields as strings
 */
export function prepareSubmissionDataAPI(data) {

    return {
        submissionUsername: String(data.submissionUsername ?? ""),
        submissionEmail: String(data.submissionEmail ?? ""),
        submissionData: JSON.stringify(data.submissionData ?? {}),
        submissionDataVersion: String(data.submissionDataVersion ?? ""),
        printFriendlyData: JSON.stringify(data.printFriendlyData ?? []),
        rendererData: JSON.stringify(data.rendererData ?? {}),
        rendererVersion: String(data.rendererVersion ?? ""),
        designSystemsVersion: String(data.designSystemsVersion ?? ""),
        service: JSON.stringify(data.service ?? {})
    };
}

/**
 * Prepares the print-friendly data for the service, including page data and field labels.
 * 
 * @param {object} req The request object containing session data
 * @param {string} siteId The site ID
 * @param {object} service The service object containing site and page data
 * @returns The print-friendly data for the service, including page data and field labels.
 */
export function preparePrintFriendlyData(req, siteId, service) {
    const submissionData = [];

    const allowedElements = ALLOWED_FORM_ELEMENTS;

    // loop through each page in the service
    // and extract the form data from the session
    for (const page of service.pages) {
        const fields = [];
        const items = []; // ✅ new
        // const currentPageUrl = page.pageData.url;

        // ----- Conditional logic comes here
        // Skip page if conditions indicate it should redirect (i.e. not be shown)
        const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
        if (conditionResult.result === false) {
            continue; // ⛔ Skip this page from print-friendly data
        }

        // find the form element in the page template
        for (const section of page.pageTemplate.sections || []) {
            for (const element of section.elements || []) {
                if (element.element !== "form") continue;

                // loop through each form element and get the data from the session
                for (const formElement of element.params.elements || []) {
                    if (!allowedElements.includes(formElement.element)) continue;

                    // handle raw value 
                    let rawValue = getValue(formElement, page.pageData.url, req, siteId);

                    //create the field object and push it to the fields array
                    // value of the field is handled by getValueLabel function
                    const field = createFieldObject(
                        formElement,
                        rawValue,
                        getValueLabel(formElement, rawValue, page.pageData.url, req, siteId, service),
                        service);
                    fields.push(field);

                    // Handle conditional elements (only for radios for now)
                    if (formElement.element === "radios") {
                        //find the selected radio based on the raw value
                        const selectedRadio = formElement.params.items.find(i => i.value === rawValue);
                        //check if the selected radio has conditional elements
                        if (selectedRadio?.conditionalElements) {
                            //loop through each conditional element and get the data 
                            for (const condEl of selectedRadio.conditionalElements) {
                                if (!allowedElements.includes(condEl.element)) continue;

                                // handle raw value 
                                let condValue = getValue(condEl, page.pageData.url, req, siteId);

                                //create the field object and push it to the fields array
                                // value of the field is handled by getValueLabel function
                                const field = createFieldObject(condEl, condValue, getValueLabel(condEl, condValue, page.pageData.url, req, siteId, service), service);
                                fields.push(field);
                            }
                        }
                    }
                }
            }
        }

        // Special case: multipleThings page → extract item titles // ✅ new
        if (page.multipleThings) {
            let mtItems = dataLayer.getPageData(req.session, siteId, page.pageData.url);
            if (Array.isArray(mtItems)) {
                const env = new nunjucks.Environment(null, { autoescape: false });
                for (const item of mtItems) {
                    const itemTitle = env.renderString(page.multipleThings.itemTitleTemplate, item);
                    items.push({ itemTitle, ...item });
                }
            }
        }

        if (fields.length > 0) {
            submissionData.push({
                pageUrl: page.pageData.url,
                pageTitle: page.pageData.title,
                fields,
                items: (page.multipleThings ? items : null) // ✅ new
            });
        }
    }

    return submissionData;
}

//------------------------------- Helper Functions -------------------------------//
/**
 * Helper function to retrieve date raw input.
 * 
 * @param {string} pageUrl The page URL
 * @param {string} name The name of the form element
 * @param {object} req The request object
 * @param {string} siteId The site ID
 * @param {number} index The index of the date input
 * @returns {string} The raw date input in ISO format (YYYY-MM-DD) or an empty string if not found
 */
function getDateInputISO(pageUrl, name, req, siteId, index = null) {
    const day = dataLayer.getFormDataValue(req.session, siteId, pageUrl, `${name}_day`, index);
    const month = dataLayer.getFormDataValue(req.session, siteId, pageUrl, `${name}_month`, index);
    const year = dataLayer.getFormDataValue(req.session, siteId, pageUrl, `${name}_year`, index);
    if (!day || !month || !year) return "";

    // Pad day and month with leading zero if needed
    const paddedDay = String(day).padStart(2, "0");
    const paddedMonth = String(month).padStart(2, "0");

    return `${year}-${paddedMonth}-${paddedDay}`;   // ISO format: YYYY-MM-DD
}

/**
 * Helper function to retrieve date input in DMY format.
 * 
 * @param {string} pageUrl The page URL
 * @param {string} name The name of the form element
 * @param {object} req The request object
 * @param {string} siteId The site ID
 * @param {number} index The index of the date input
 * @returns {string} The raw date input in DMY format (DD/MM/YYYY) or an empty string if not found
 */
function getDateInputDMY(pageUrl, name, req, siteId, index = null) {
    const day = dataLayer.getFormDataValue(req.session, siteId, pageUrl, `${name}_day`, index);
    const month = dataLayer.getFormDataValue(req.session, siteId, pageUrl, `${name}_month`, index);
    const year = dataLayer.getFormDataValue(req.session, siteId, pageUrl, `${name}_year`, index);
    if (!day || !month || !year) return "";
    return `${day}/${month}/${year}`;   // EU format: DD/MM/YYYY
}

/**
 * Helper function to create a field object.
 * 
 * @param {object} formElement The form element object 
 * @param {string} value The value of the form element
 * @param {object} valueLabel The label of the form element 
 * @param {object} service The service object
 * @returns {object} The field object containing id, label, value, and valueLabel
 */
function createFieldObject(formElement, value, valueLabel, service) {
    return {
        id: formElement.params?.id || "",
        name: formElement.params?.name || "",
        label: formElement.params.label
            || formElement.params.legend
            || govcyResources.getSameMultilingualObject(service.site.languages, formElement.params.name),
        value: value,
        valueLabel: valueLabel
    };
}

/**
 * Helper function to retrieve the value of a form element from the session.
 * 
 * @param {object} formElement The form element object
 * @param {string} pageUrl The page URL
 * @param {object} req The request object
 * @param {string} siteId The site ID
 * @param {number} index The index of the form element (for multipleThings)
 * @returns {string} The value of the form element from the session or an empty string if not found
 */
function getValue(formElement, pageUrl, req, siteId, index = null) {
    // handle raw value 
    let value = ""
    if (formElement.element === "dateInput") {
        value = getDateInputISO(pageUrl, formElement.params.name, req, siteId, index);
    } else if (formElement.element === "fileInput") {
        // unneeded handle of `Attachment` at the end
        // value = dataLayer.getFormDataValue(req.session, siteId, pageUrl, formElement.params.name + "Attachment");
        value = dataLayer.getFormDataValue(req.session, siteId, pageUrl, formElement.params.name, index);
    } else {
        value = dataLayer.getFormDataValue(req.session, siteId, pageUrl, formElement.params.name, index);
    }

    // 🔁 Normalize checkboxes: always return an array
    if (formElement.element === "checkboxes") {
        // If no value, return empty array
        if (value == null || value === "") return [];
        // If already an array, return as-is (but strip empties just in case)
        if (Array.isArray(value)) {
            // Strip empties just in case
            return value.filter(v => v != null && v !== "");
        }
        // Else single value, convert to array
        return [String(value)];
    }
    return value;
}

/**
 * Helper function to get the label of a form element based on its value and type.
 * 
 * @param {object} formElement The form element object 
 * @param {string} value The value of the form element 
 * @param {string} pageUrl The page URL 
 * @param {object} req The request object
 * @param {string} siteId The site ID
 * @param {object} service The service object
 * @returns {object} The label of the form element based on the value and element type
 */
function getValueLabel(formElement, value, pageUrl, req, siteId, service) {
    //handle checkboxes label
    if (formElement.element === "checkboxes") {
        if (Array.isArray(value)) {
            // loop through each value and find the corresponding item
            return value.map(v => {
                // find the item
                const item = formElement.params.items.find(i => i.value === v);
                return item?.text || govcyResources.getSameMultilingualObject(service.site.languages, "");
            });
        } else if (typeof value === "string") {
            const matchedItem = formElement.params.items.find(item => item.value === value);
            if (matchedItem) {
                return matchedItem.text;
            } else {
                return govcyResources.getSameMultilingualObject(service.site.languages, "")
            }
        }
    }

    // handle radios and select labels
    if (formElement.element === "radios" || formElement.element === "select") {
        const item = formElement.params.items.find(i => i.value === value);
        return item?.text || govcyResources.getSameMultilingualObject(service.site.languages, "");
    }

    // handle dateInput
    if (formElement.element === "dateInput") {
        const formattedDate = getDateInputDMY(pageUrl, formElement.params.name, req, siteId);
        return govcyResources.getSameMultilingualObject(service.site.languages, formattedDate);
    }

    // handle fileInput
    if (formElement.element === "fileInput") {
        // TODO: Ask Andreas how to handle empty file inputs 
        if (value) {
            return govcyResources.staticResources.text.fileUploaded;
        } else {
            return govcyResources.getSameMultilingualObject(service.site.languages, "");
            // return govcyResources.staticResources.text.fileNotUploaded;
        }
    }

    // textInput, textArea, etc.
    return govcyResources.getSameMultilingualObject(service.site.languages, value);
}

/**
 * Helper function to get the item value of checkboxes based on the selected value.
 * @param {object} valueLabel the value 
 * @param {string} lang the language 
 * @returns {string} the item value of checkboxes 
 */
function getSubmissionValueLabelString(valueLabel, lang, fallbackLang = "en") {
    if (!valueLabel) return "";

    // Helper to get the desired language string or fallback
    const getText = (obj) =>
        obj?.[lang]?.trim() || obj?.[fallbackLang]?.trim() || "";

    // Case 1: Array of multilingual objects
    if (Array.isArray(valueLabel)) {
        return valueLabel
            .map(getText)       // get lang/fallback string for each item
            .filter(Boolean)    // remove empty strings
            .join(", ");        // join with comma
    }

    // Case 2: Single multilingual object
    if (typeof valueLabel === "object") {
        return getText(valueLabel);
    }

    // Graceful fallback
    return "";
}

//------------------------------- Review Summary -------------------------------//
/**
 * Generates a review summary for the submission data, ready to be rendered.
 * 
 * @param {object} submissionData The submission data object containing page data and fields
 * @param {object} req The request object containing global language and session data
 * @param {string} siteId The site ID
 * @param {boolean} showChangeLinks Flag to show change links or not
 * @returns {object} The review summary to be rendered by the renderer
 */
export function generateReviewSummary(submissionData, req, siteId, showChangeLinks = true) {
    // Base summary list structure
    let summaryList = { element: "summaryList", params: { items: [] } };

    /**
     * Helper function to create a summary list item.
     * @param {object} key the key of multilingual object
     * @param {string} value the value
     * @returns {object} the summary list item
    */
    function createSummaryListItem(key, value) {
        return {
            "key": key,
            "value": [
                {
                    "element": "textElement",
                    "params": {
                        "text": { "en": value, "el": value, "tr": value },
                        "type": "span",
                        "showNewLine": true
                    }
                }
            ]
        };
    }

    /**
     * Helper function to create a summary list item for file links.
     * @param {object} key the key of multilingual object
     * @param {string} value the value
     * @param {string} siteId the site id
     * @param {string} pageUrl the page url
     * @param {string} elementName the element name
     * @returns {object} the summary list item with file link
    */
    function createSummaryListItemFileLink(key, value, siteId, pageUrl, elementName) {
        return {
            "key": key,
            "value": [
                {
                    "element": "htmlElement",
                    "params": {
                        "text": {
                            "en": `<a href="/${siteId}/${pageUrl}/view-file/${elementName}" target="_blank">${govcyResources.staticResources.text.viewFile.en}<span class="govcy-visually-hidden"> ${key?.en || ""}</span></a>`,
                            "el": `<a href="/${siteId}/${pageUrl}/view-file/${elementName}" target="_blank">${govcyResources.staticResources.text.viewFile.el}<span class="govcy-visually-hidden"> ${key?.el || ""}</span></a>`,
                            "tr": `<a href="/${siteId}/${pageUrl}/view-file/${elementName}" target="_blank">${govcyResources.staticResources.text.viewFile.tr}<span class="govcy-visually-hidden"> ${key?.tr || ""}</span></a>`
                        }
                    }
                }
            ]
        };
    }



    const env = new nunjucks.Environment(null, { autoescape: true });
    // One template renders multiple things
    const multipleThingsTemplate = `
        <div><strong>${govcyResources.staticResources.text.multipleThingsEntries[req.globalLang] || govcyResources.staticResources.text.multipleThingsEntries["el"]}</strong></div>
        <ol class="govcy-mt-2">
        {% for it in items -%}
            <li>{{ it.itemTitle | trim }}</li>
        {%- endfor %}
        </ol>
        `;

    // Loop through each page in the submission data
    for (const page of submissionData) {
        // Get the page URL, title, and fields
        const { pageUrl, pageTitle, fields, items } = page;


        let summaryListInner = { element: "summaryList", params: { items: [] } };

        // Special handling: multipleThings page → show <ol> of itemTitle only
        if (Array.isArray(items)) {
            summaryListInner = { element: "htmlElement", params: { text: {} } };
            if (items.length == 0) {
                summaryListInner.params.text = govcyResources.staticResources.text.multipleThingsEmptyStateReview
            } else {
                // Build ordered list HTML
                let htmlByLang = env.renderString(multipleThingsTemplate, { items });
                // Set the HTML for each language
                summaryListInner.params.text = govcyResources.getMultilingualObject(htmlByLang, htmlByLang, htmlByLang);
            }
        } else { // Normal page → keep old behavior
            // loop through each field and add it to the summary entry
            for (const field of fields) {
                const label = field.label;
                const valueLabel = getSubmissionValueLabelString(field.valueLabel, req.globalLang);
                // --- HACK --- to see if this is a file element
                // check if field.value is an object with `sha256` and `fileId` properties
                if (typeof field.value === "object" && field.value.hasOwnProperty("sha256") && field.value.hasOwnProperty("fileId") && showChangeLinks) {
                    summaryListInner.params.items.push(createSummaryListItemFileLink(label, valueLabel, siteId, pageUrl, field.name));
                } else {
                    // add the field to the summary entry
                    summaryListInner.params.items.push(createSummaryListItem(label, valueLabel));
                }
            }
        }

        // Add inner summary list to the main summary list
        let outerSummaryList = {
            "key": pageTitle,
            "value": [summaryListInner],
            "actions": [ //add change link
                {
                    text: govcyResources.staticResources.text.change,
                    classes: govcyResources.staticResources.other.noPrintClass,
                    href: govcyResources.constructPageUrl(siteId, pageUrl, "review"),
                    visuallyHiddenText: pageTitle
                }
            ]
        };

        // If showChangeLinks is false, remove the change link
        if (!showChangeLinks) {
            delete outerSummaryList.actions;
        }

        //push to the main summary list
        summaryList.params.items.push(outerSummaryList);

    }

    return summaryList;
}


//------------------------------- Email Generation -------------------------------//
/**
 * Generates an email HTML body for the submission data, ready to be sent.
 * 
 * @param {object} service The service object
 * @param {object} submissionData The submission data object containing page data and fields
 * @param {string} submissionId The submission id
 * @param {object} req The request object containing global language and session data
 * @returns {string} The email HTML body
 */
export function generateSubmitEmail(service, submissionData, submissionId, req) {
    let body = [];

    //check if there is submission Id
    if (submissionId) {
        // Add success message to the body
        body.push(
            {
                component: "bodySuccess",
                params: {
                    title: service?.site?.successEmailHeader?.[req.globalLang]
                        || govcyResources.getLocalizeContent(govcyResources.staticResources.text.submissionSuccessTitle, req.globalLang),
                    body: `${govcyResources.getLocalizeContent(govcyResources.staticResources.text.yourSubmissionId, req.globalLang)} ${submissionId}`
                }
            }
        );
    }

    // Add data title to the body
    body.push(
        {
            component: "bodyParagraph",
            body: govcyResources.getLocalizeContent(govcyResources.staticResources.text.theDataFromYourRequest, req.globalLang)
        }
    );

    const env = new nunjucks.Environment(null, { autoescape: true })

    // For each page in the submission data
    for (const page of submissionData) {
        // Get the page URL, title, and fields
        const { pageUrl, pageTitle, fields, items } = page;

        // Add data title to the body
        body.push(
            {
                component: "bodyHeading",
                params: { "headingLevel": 2 },
                body: govcyResources.getLocalizeContent(pageTitle, req.globalLang)
            }
        );

        if (Array.isArray(items)) {
            // 🔹 MultipleThings page → loop through items
            // multipleThings → use itemTitleTemplate
            const pageConfig = getPageConfigData(service, pageUrl);
            const template = pageConfig.multipleThings?.itemTitleTemplate || "{{itemTitle}}";

            if (items.length === 0) {
                // Empty state message
                body.push({
                    component: "bodyParagraph",
                    body: govcyResources.getLocalizeContent(
                        govcyResources.staticResources.text.multipleThingsEmptyStateReview,
                        req.globalLang
                    )
                });
            } else {
                // Build ordered list of item titles
                const listItems = items.map(item => {
                    const safeTitle = env.renderString(template, item);
                    return safeTitle; // already escaped
                });

                // Add ordered list to the body
                body.push({
                    component: "bodyList",
                    params: {
                        type: "ol",
                        items: listItems
                    }
                });
            }
        } else {
            // 🔹 Normal page → continue below
            let dataUl = [];
            // loop through each field and add it to the summary entry
            for (const field of fields) {
                const label = govcyResources.getLocalizeContent(field.label, req.globalLang);
                const valueLabel = getSubmissionValueLabelString(field.valueLabel, req.globalLang);
                dataUl.push({ key: label, value: valueLabel });
            }
            // add data to the body
            body.push(
                {
                    component: "bodyKeyValue",
                    params: { type: "ul", items: dataUl },
                });
        }


    }

    let emailObject = govcyResources.getEmailObject(
        service.site.title,
        govcyResources.staticResources.text.emailSubmissionPreHeader,
        service.site.title,
        dataLayer.getUser(req.session).name,
        body,
        service.site.title,
        req.globalLang
    )

    // Create an instance of DSFEmailRenderer
    const emailRenderer = new DSFEmailRenderer();
    return emailRenderer.renderFromJson(emailObject);
}



/*
{
 "bank-details": {
   "formData": {
     "AccountName": "asd",
     "Iban": "CY12 0020 0123 0000 0001 2345 6789",
     "Swift": "BANKCY2NXXX",
     "_csrf": "sjknv79rxjgv0uggo0d5312vzgz37jsh"
   }
 },
 "answer-bank-boc": {
   "formData": {
     "Objection": "Object",
     "country": "Azerbaijan",
     "ObjectionReason": "ObjectionReasonCode1",
     "ObjectionExplanation": "asdsa",
     "DepositsBOCAttachment": "",
     "_csrf": "sjknv79rxjgv0uggo0d5312vzgz37jsh"
   }
 },
 "bank-settlement": {
   "formData": {
     "ReceiveSettlementExplanation": "",
     "ReceiveSettlementDate_day": "",
     "ReceiveSettlementDate_month": "",
     "ReceiveSettlementDate_year": "",
     "ReceiveSettlement": "no",
     "_csrf": "sjknv79rxjgv0uggo0d5312vzgz37jsh"
   }
 }
}



[
 {
   pageUrl: "personal-details",
   pageTitle: { en: "Personal data", el: "Προσωπικά στοιχεία" }, // from pageData.title in correct language
   fields: [
     [
       {
           id: "firstName",
           label: { en: "First Name", el: "Όνομα" },
           value: "John",  // The actual user input value
           valueLabel: { en: "John", el: "John" }  // Same label as the value for text inputs
       },
       {
           id: "lastName",
           label: { en: "Last Name", el: "Επίθετο" },
           value: "Doe",  // The actual user input value
           valueLabel: { en: "Doe", el: "Doe" }  // Same label as the value for text inputs
       },
       {
           id: "gender",
           label: { en: "Gender", el: "Φύλο" },
           value: "m",  // The actual value ("male")
           valueLabel: { en: "Male", el: "Άντρας" }  // The corresponding label for "male"
       },
       {
           id: "languages",
           label: { en: "Languages", el: "Γλώσσες" },
           value: ["en", "el"],  // The selected values ["en", "el"]
           valueLabel: [
               { en: "English", el: "Αγγλικά" },  // Labels corresponding to "en" and "el"
               { en: "Greek", el: "Ελληνικά" }
           ]
       },
       {
           id: "birthDate",
           label: { en: "Birth Date", el: "Ημερομηνία Γέννησης" },
           value: "1990-01-13",  // The actual value based on user input
           valueLabel: "13/1/1990"  // Date inputs label will be conveted to D/M/YYYY
       }
   ]
 },
 ...
]



   */