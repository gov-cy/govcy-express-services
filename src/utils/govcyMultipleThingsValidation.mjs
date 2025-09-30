// utils/govcyMultipleThingsValidation.mjs
import { validateFormElements } from "./govcyValidator.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";

/**
 * Validate multipleThings items against the page's form definition.
 * @param {object} page the page configuration object
 * @param {array} items the array of items to validate
 * @param {string} lang the language code for error messages
 * @returns {object} errors object containing validation errors, if any
 */
export function validateMultipleThings(page, items, lang) {
    const errors = {};

    // 1. Min check
    if (items.length < page.multipleThings.min) {
        // Deep copy page title (so we don’t mutate template)
        let minMsg = JSON.parse(JSON.stringify(govcyResources.staticResources.text.multipleThingsMinMessage));

        // Replace label placeholders on page title
        for (const lang of Object.keys(minMsg)) {
            minMsg[lang] = minMsg[lang].replace("{{min}}", page.multipleThings.min);
        }
        errors._global = {
            message: minMsg,
            link: "#addNewItem0"
        };

        return errors; // early exit
    }

    // 2. Max check (rare, but safe)
    if (items.length > page.multipleThings.max) {
        // Deep copy page title (so we don’t mutate template)
        let maxMsg = JSON.parse(JSON.stringify(govcyResources.staticResources.text.multipleThingsMaxMessage));

        // Replace label placeholders on page title
        for (const lang of Object.keys(maxMsg)) {
            maxMsg[lang] = maxMsg[lang].replace("{{max}}", page.multipleThings.max);
        }
        errors._global = {
            message: maxMsg,
            link: "#multipleThingsList"
        };
        return errors; // early exit
    }

    // 3. Per-item validation
    items.forEach((item, idx) => {
        const formElement = page.pageTemplate.sections
            .flatMap(s => s.elements)
            .find(el => el.element === "form");
        if (!formElement) return; // safety

        const vErrors = validateFormElements(formElement.params.elements, item);
        if (Object.keys(vErrors).length > 0) {
            errors[idx] = vErrors;
        }
    });

    return errors;
}


/**
 * Normalize validation errors into a summary list array.
 * Works for both hub- and review-level errors.
 *
 * @param {object} service - The full service configuration object
 * @param {object} hubErrors - Validation errors object (from dataLayer)
 * @param {string} siteId - Current site id
 * @param {string} pageUrl - Page url (for hub links)
 * @param {object} req - Express request (for lang + route info)
 * @param {string} route - Current route (e.g. "review" or "")
 * @param {boolean} isHub - Whether this is for the hub page (true) or review page (false)
 * 
 * @returns {Array<{text: object, link: string}>}
 */
export function buildMultipleThingsValidationSummary(service, hubErrors, siteId, pageUrl, req, route = "", isHub = true) {
    let validationErrors = [];

    // For each error
    for (const [key, err] of Object.entries(hubErrors)) {
        let pageTitle = { en: "", el: "", tr: "" };
        if (!isHub) {
            // 🔍 Find the page by pageUrl
            const page = getPageConfigData(service, pageUrl);
            for (const lang of Object.keys(page.multipleThings.listPage.title)) {
                pageTitle[lang] = (page.multipleThings.listPage.title[lang] || "") + " - ";
            }
        }

        if (key === "_global") {
            let msg = err.message;
            // Replace label placeholders on page title
            for (const lang of Object.keys(msg)) {
                msg[lang] = pageTitle[lang]
                    + (msg[lang] || '');
            }

            // Add to validationErrors array
            validationErrors.push({
                text: msg,
                link: (isHub 
                    ? err.link || `#multipleThingsList` 
                    : `/${siteId}/${pageUrl}` + (route === "review" ? "?route=review" : ""))
            });
        } else {
            // Deep copy page title (so we don’t mutate template)
            let msg = JSON.parse(JSON.stringify(govcyResources.staticResources.text.multipleThingsItemsValidationPrefix));
            const idx = parseInt(key, 10);

            for (const fieldErr of Object.values(err)) {
                // Replace label placeholders on page title
                for (const lang of Object.keys(msg)) {
                    msg[lang] = pageTitle[lang]
                        + msg[lang].replace("{{index}}", idx + 1)
                        + (fieldErr.message?.[req.globalLang] || '');
                }

                // Add to validationErrors array
                validationErrors.push({
                    text: msg,
                    link: `/${siteId}/${pageUrl}/multiple/edit/${idx}${route === "review" ? "?route=review" : ""}`
                });
            }
        }
    }

    return validationErrors;
}