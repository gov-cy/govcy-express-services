import axios from "axios";
import { govcyFrontendRenderer } from "@gov-cy/govcy-frontend-renderer";
import {
    defineCustomPages,
    resetCustomPages,
    clearCustomPageErrors,
    addCustomPageError,
    setCustomPageData,
    setCustomPageSummaryElements,
    setCustomPageEmail,
    getCustomPageProperty,
    setCustomPageProperty
} from "../../../src/utils/govcyCustomPages.mjs";
/* c8 ignore start */

const CUSTOM_PAGE_CONFIG = {
    siteId: "supplies-subsidy",
    key: "options-custom",
    route: "/supplies-subsidy/options-custom",
    insertAfterPageUrl: "index",
    nextPage: "/supplies-subsidy/farmer-registration",
    taskStatus: "NOT_STARTED",
    layout: {
        pageLayout: "layouts/govcyBase.njk",
        mainLayout: "two-third"
    },
    api: {
        optionsUrl: "http://localhost:3002/childrenData"
    },
    fields: {
        selectedValue: "selectedOptionValue"
    },
    errors: {
        requiredId: "option-selection-required"
    },
    content: {
        pageTitle: { el: "Επιλογή παιδιού", en: "Select option" },
        heading: { el: "Επιλέξτε παιδί", en: "Select an option" },
        legend: {
            el: "Ποιο παιδί θέλετε να επιλέξετε;",
            en: "Which option do you want to select?"
        },
        continueButton: { el: "Συνέχεια", en: "Continue" },
        requiredError: { el: "Επιλέξτε παιδί", en: "Select an option" },
        summaryKey: { el: "Επιλέξτε παιδί", en: "Select an option" },
        selectedOptionLabel: { el: "Επιλεγμένο παιδί", en: "Selected option" },
        changeActionText: { el: "Αλλαγή", en: "Change" },
        emailKeys: {
            selectedOption: { el: "Επιλεγμένη επιλογή", en: "Selected option" },
            value: { el: "Τιμή", en: "Value" },
            dateOfBirth: { el: "Ημερομηνία γέννησης", en: "Date of birth" }
        }
    }
};

/**
 * Builds a renderer-ready site object from middleware-provided service data.
 * This avoids relying on internal non-exported framework utilities.
 *
 * @param {import("express").Request} req
 * @returns {object}
 */
function getRenderableSiteData(req) {
    const serviceSite = req?.serviceData?.site || {};
    const site = JSON.parse(JSON.stringify(serviceSite));
    site.lang = req.globalLang || site.lang || "el";
    if (Array.isArray(site.languages) && site.languages.length === 1) {
        site.languages = undefined;
    }
    return site;
}

/**
 * Fetches options data from the mock API used by local tests.
 *
 * @returns {Promise<Array<{fullName: string, dob: string, value: string}>>}
 */
async function fetchAPIData() {
    const response = await axios.get(CUSTOM_PAGE_CONFIG.api.optionsUrl);
    const options = response?.data?.Data?.options;
    if (!Array.isArray(options)) return [];

    // Normalize API shape to a generic option model expected by this template.
    // Supports both modern `value` and legacy/domain-specific `pin` fields.
    return options
        .map((option) => ({
            fullName: option?.fullName ?? "",
            dob: option?.dob ?? "",
            value: option?.value ?? option?.pin ?? ""
        }))
        .filter((option) => option.value !== "");
}

/**
 * Builds custom page summary elements shown on review page.
 *
 * @param {{fullName: string, value: string}} selectedOption
 * @returns {Array}
 */
function buildSummaryElements(selectedOption) {
    return [
        {
            key: CUSTOM_PAGE_CONFIG.content.selectedOptionLabel,
            value: [
                {
                    element: "textElement",
                    params: {
                        type: "span",
                        text: {
                            el: `${selectedOption.fullName} (${selectedOption.value})`,
                            en: `${selectedOption.fullName} (${selectedOption.value})`
                        },
                        showNewLine: true
                    }
                }
            ]
        }
    ];
}

/**
 * Builds custom page email components for dsf-email-templates.
 *
 * @param {{fullName: string, dob: string, value: string}} selectedOption
 * @returns {Array}
 */
function buildEmailElements(selectedOption, lang) {
    const emailKeys = CUSTOM_PAGE_CONFIG.content.emailKeys;
    return [
        {
            component: "bodyKeyValue",
            params: {
                type: "ul",
                items: [
                    { key: getLocalizedText(emailKeys.selectedOption, lang), value: selectedOption.fullName },
                    { key: getLocalizedText(emailKeys.value, lang), value: selectedOption.value },
                    { key: getLocalizedText(emailKeys.dateOfBirth, lang), value: selectedOption.dob }
                ]
            }
        }
    ];
}


/**
 * Resolves a multilingual object to text for the active language.
 * Fallback: requested lang -> Greek -> English -> empty string.
 *
 * @param {object} textObj
 * @param {string} lang
 * @returns {string}
 */
function getLocalizedText(textObj, lang) {
    return textObj?.[lang] || textObj?.el || textObj?.en || "";
}

/**
 * Creates radio items from the API response model.
 * Pure transformer: no session/middleware dependencies.
 *
 * @param {Array<{fullName: string, dob: string, value: string}>} options
 * @returns {Array}
 */
function buildRadioItems(options) {
    return options.map((option) => ({
        value: option.value,
        text: {
            el: `${option.fullName} - ${option.dob}`,
            en: `${option.fullName} - ${option.dob}`
        }
    }));
}

/**
 * Builds the renderer pageData object for this custom page.
 * Pure builder so the GET route stays thin and reusable.
 *
 * @param {object} site
 * @returns {object}
 */
function buildCustomPageData(site) {
    return {
        site,
        pageData: {
            title: CUSTOM_PAGE_CONFIG.content.pageTitle,
            layout: CUSTOM_PAGE_CONFIG.layout.pageLayout,
            mainLayout: CUSTOM_PAGE_CONFIG.layout.mainLayout
        }
    };
}

/**
 * Builds the form elements list. Error summary is intentionally first when present.
 * Pure builder; all dependencies are passed in as args.
 *
 * @param {object} args
 * @param {string} args.action
 * @param {string} args.csrfToken
 * @param {Array} args.errors
 * @param {string} args.selectedValue
 * @param {Array<{fullName: string, dob: string, value: string}>} args.options
 * @returns {Array}
 */
function buildFormElements({ action, csrfToken, errors, selectedValue, options }) {
    return [
        ...(errors.length > 0
            ? [{
                element: "errorSummary",
                params: { id: "errorSummary", errors }
            }]
            : []),
        {
            element: "textElement",
            params: {
                id: "title",
                type: "h1",
                text: CUSTOM_PAGE_CONFIG.content.heading
            }
        },
        {
            element: "htmlElement",
            params: {
                text: {
                    el: `<input type="hidden" name="_csrf" value="${csrfToken}">`,
                    en: `<input type="hidden" name="_csrf" value="${csrfToken}">`
                }
            }
        },
        {
            element: "radios",
            params: {
                id: CUSTOM_PAGE_CONFIG.fields.selectedValue,
                name: CUSTOM_PAGE_CONFIG.fields.selectedValue,
                legend: CUSTOM_PAGE_CONFIG.content.legend,
                ...(selectedValue !== "" ? { value: selectedValue } : {}),
                isPageHeading: false,
                items: buildRadioItems(options)
            }
        },
        {
            element: "button",
            params: {
                text: CUSTOM_PAGE_CONFIG.content.continueButton,
                type: "submit"
            }
        }
    ];
}

/**
 * Builds the full pageTemplate for renderer.
 * Pure builder; route code should only provide inputs.
 *
 * @param {object} args
 * @param {string} args.action
 * @param {string} args.csrfToken
 * @param {Array} args.errors
 * @param {string} args.selectedValue
 * @param {Array<{fullName: string, dob: string, value: string}>} args.options
 * @returns {object}
 */
function buildPageTemplate({ action, csrfToken, errors, selectedValue, options }) {
    return {
        sections: [
            {
                name: "beforeMain",
                elements: [{ element: "backLink", params: {} }]
            },
            {
                name: "main",
                elements: [
                    {
                        element: "form",
                        params: {
                            action,
                            method: "POST",
                            elements: buildFormElements({
                                action,
                                csrfToken,
                                errors,
                                selectedValue,
                                options
                            })
                        }
                    }
                ]
            }
        ]
    };
}

/**
 * Creates one reusable in-page error object for the custom route UI.
 * Keevalueg this centralized avoids divergence between POST paths.
 *
 * @returns {object}
 */
function buildInPageRequiredError() {
    return {
        id: CUSTOM_PAGE_CONFIG.errors.requiredId,
        link: "#selectedOptionValue-option-1",
        text: CUSTOM_PAGE_CONFIG.content.requiredError,
        pageUrl: `${CUSTOM_PAGE_CONFIG.siteId}/${CUSTOM_PAGE_CONFIG.key}`
    };
}

/**
 * Renders the custom option-selection page using govcy-frontend-renderer.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {Array<{fullName: string, dob: string, value: string}>} options
 * @param {string} [selectedValue=""]
 * @param {Array} [errors=[]]
 * @returns {void}
 */
function renderCustomPage(req, res, options, selectedValue = "", errors = []) {
    const site = getRenderableSiteData(req);
    const routeSuffix = req.query.route === "review" ? "?route=review" : "";
    const action = `${CUSTOM_PAGE_CONFIG.route}${routeSuffix}`;
    const pageData = buildCustomPageData(site);
    const pageTemplate = buildPageTemplate({
        action,
        csrfToken: req.csrfToken(),
        errors,
        selectedValue,
        options
    });

    const renderer = new govcyFrontendRenderer();
    const html = renderer.renderFromJSON(pageTemplate, pageData);
    res.send(html);
}

/**
 * Normalizes per-session custom summary action links to the full custom route.
 * This avoids stale/mismatched links in long-lived sessions.
 *
 * @param {import("express").Request} req
 * @returns {void}
 */
function normalizeSummaryActionLinks(req) {
    // Read per-session summary actions (session copy, not global definition).
    const summaryActions =
        req.session?.siteData?.[CUSTOM_PAGE_CONFIG.siteId]?.customPages?.[CUSTOM_PAGE_CONFIG.key]?.summaryActions;
    // Ensure "Change" always points to full route with review context.
    if (Array.isArray(summaryActions) && summaryActions.length > 0) {
        summaryActions[0].href = `${CUSTOM_PAGE_CONFIG.route}?route=review`;
    }
}

/**
 * Refreshes localized custom-page email block from canonical selected value.
 * This avoids stale language in email when user changes language later.
 *
 * Safe behavior:
 * - scoped to the target service path only
 * - no redirects/response writes
 * - fail-open on errors (never blocks framework flow)
 *
 * @param {import("express").Request} req
 * @returns {Promise<void>}
 */
async function refreshCustomEmailForActiveLanguage(req) {
    // Scope refresh strictly to requests under this service route.
    const isTargetServicePath = req.path.startsWith(`/${CUSTOM_PAGE_CONFIG.siteId}`);
    if (!isTargetServicePath) return;

    // Use canonical selection stored in custom page data.
    const selectedValue =
        req.session?.siteData?.[CUSTOM_PAGE_CONFIG.siteId]?.customPages?.[CUSTOM_PAGE_CONFIG.key]?.data?.[CUSTOM_PAGE_CONFIG.fields.selectedValue];
    // Nothing selected yet -> no email block to rebuild.
    if (typeof selectedValue !== "string" || selectedValue.trim() === "") return;

    // Re-resolve the selected option from current API data shape.
    const options = await fetchAPIData();
    const selectedOption = options.find((option) => option.value === selectedValue.trim());
    // If option no longer exists, keep existing session email untouched.
    if (!selectedOption) return;

    // Rebuild localized email block with current request language.
    setCustomPageEmail(
        req.session,
        CUSTOM_PAGE_CONFIG.siteId,
        CUSTOM_PAGE_CONFIG.key,
        buildEmailElements(selectedOption, req.globalLang || "el")
    );
}

/**
 * Registers all-features custom pages and routes.
 *
 * @param {{siteRoute: Function, app: import("express").Application}} params
 * @returns {void}
 */
export default function registerAllFeaturesRoutes({ siteRoute, app }) {
    defineCustomPages(
        app, // store
        CUSTOM_PAGE_CONFIG.siteId, // siteId
        CUSTOM_PAGE_CONFIG.key, // custom page key
        CUSTOM_PAGE_CONFIG.content.pageTitle, // pageTitle
        CUSTOM_PAGE_CONFIG.insertAfterPageUrl, // insertAfterPageUrl
        [ // default errors
            {
                id: CUSTOM_PAGE_CONFIG.errors.requiredId,
                text: CUSTOM_PAGE_CONFIG.content.requiredError,
                pageUrl: `${CUSTOM_PAGE_CONFIG.siteId}/${CUSTOM_PAGE_CONFIG.key}`
            }
        ],
        [ // initial summary elements
            {
                key: CUSTOM_PAGE_CONFIG.content.summaryKey,
                value: []
            }
        ],
        false, // summaryHtml
        CUSTOM_PAGE_CONFIG.taskStatus, // taskStatus
        {
            pageUrl: CUSTOM_PAGE_CONFIG.key,
            nextPage: CUSTOM_PAGE_CONFIG.nextPage
        }
    );

    // We override summaryActions on the definition because the custom page key
    // (`options-custom`) is intentionally different from the actual route path
    // (`/supplies-subsidy/options-custom`). Without this override, review "Change"
    // links may point to the key-based path instead of the real service route.
    setCustomPageProperty(
        app,
        CUSTOM_PAGE_CONFIG.siteId,
        CUSTOM_PAGE_CONFIG.key,
        "summaryActions",
        [{
            text: CUSTOM_PAGE_CONFIG.content.changeActionText,
            classes: "govcy-d-print-none",
            href: `${CUSTOM_PAGE_CONFIG.route}?route=review`,
            visuallyHiddenText: CUSTOM_PAGE_CONFIG.content.pageTitle
        }],
        true
    );

    app.use(async (req, res, next) => {
        // Ensure baseline session nodes exist for this service.
        // Initialize session data for custom pages
        req.session.siteData ??= {};
        req.session.siteData[CUSTOM_PAGE_CONFIG.siteId] ??= {};

        // Initialize session custom pages from global definitions once.
        // Reset session copies if missing (first visit)
        if (!req.session.siteData[CUSTOM_PAGE_CONFIG.siteId].customPages) {
            resetCustomPages(app, req.session, CUSTOM_PAGE_CONFIG.siteId); // 🔁 deep copy from app to session
            req.session.save((err) => {
                if (err) console.error("⚠️ Error initializing customPages:", err);
            });
        }
        // Keep summary links stable even in long-lived/stale sessions.
        normalizeSummaryActionLinks(req);
        try {
            // Keep custom email section aligned with current request language.
            await refreshCustomEmailForActiveLanguage(req);
        } catch (err) {
            // Fail-open: never block framework request flow because of refresh logic.
            console.warn("Custom page email language refresh skipped:", err?.message || err);
        }
        next();
    });

    // ==========================================================
    // CUSTOM ROUTE (GET)
    // ==========================================================

    siteRoute(CUSTOM_PAGE_CONFIG.siteId, "get", CUSTOM_PAGE_CONFIG.route, async (req, res, next) => {
        try {
            // Load runtime options from API.
            const options = await fetchAPIData();
            // Recover selected value from session data (validated against current options).
            const rawPin =
                req.session?.siteData?.[CUSTOM_PAGE_CONFIG.siteId]?.customPages?.[CUSTOM_PAGE_CONFIG.key]?.data?.[CUSTOM_PAGE_CONFIG.fields.selectedValue];
            const normalizedPin = typeof rawPin === "string" ? rawPin.trim() : "";
            const selectedValue = options.some((option) => option.value === normalizedPin) ? normalizedPin : "";
            const pageState = req.session?.siteData?.[CUSTOM_PAGE_CONFIG.siteId]?.customPages?.[CUSTOM_PAGE_CONFIG.key];
            // In-page errors are flash-like: show once and clear.
            const errors = Array.isArray(pageState?.inPageErrors) ? pageState.inPageErrors : [];
            if (pageState) {
                pageState.inPageErrors = [];
            }
            // Render custom page with resolved options, value, and transient errors.
            renderCustomPage(req, res, options, selectedValue, errors);
        } catch (error) {
            next(error);
        }
    });

    // ==========================================================
    // CUSTOM ROUTE (GET)
    // ==========================================================

    siteRoute(CUSTOM_PAGE_CONFIG.siteId, "post", CUSTOM_PAGE_CONFIG.route, async (req, res, next) => {
        try {
            // Clear review-level custom errors before re-validating this submission.
            clearCustomPageErrors(req.session, CUSTOM_PAGE_CONFIG.siteId, CUSTOM_PAGE_CONFIG.key);

            // Read posted value and resolve selected option from current API data.
            const selectedOptionValue = req.body?.[CUSTOM_PAGE_CONFIG.fields.selectedValue] || "";
            const options = await fetchAPIData();
            const selectedOption = options.find((option) => option.value === selectedOptionValue);

            if (!selectedOption) {
                // Invalid submit: add review-level error and set in-page error summary.
                addCustomPageError(
                    req.session,
                    CUSTOM_PAGE_CONFIG.siteId,
                    CUSTOM_PAGE_CONFIG.key,
                    CUSTOM_PAGE_CONFIG.errors.requiredId,
                    CUSTOM_PAGE_CONFIG.content.requiredError
                );
                // Normalize review error links to the real service route.
                const reviewErrors = req.session?.siteData?.[CUSTOM_PAGE_CONFIG.siteId]?.customPages?.[CUSTOM_PAGE_CONFIG.key]?.errors;
                if (Array.isArray(reviewErrors) && reviewErrors.length > 0) {
                    reviewErrors.forEach((err) => {
                        err.pageUrl = `${CUSTOM_PAGE_CONFIG.siteId}/${CUSTOM_PAGE_CONFIG.key}`;
                    });
                }
                req.session.siteData[CUSTOM_PAGE_CONFIG.siteId].customPages[CUSTOM_PAGE_CONFIG.key].inPageErrors =
                    [buildInPageRequiredError()];
                // Redirect back to custom page and focus error summary anchor.
                res.redirect(`${CUSTOM_PAGE_CONFIG.route}${req.query.route === "review" ? "?route=review" : ""}#errorSummary-title`);
                return;
            }

            // Valid submit: persist canonical custom-page data for submission pipeline.
            setCustomPageData(req.session, CUSTOM_PAGE_CONFIG.siteId, CUSTOM_PAGE_CONFIG.key, {
                [CUSTOM_PAGE_CONFIG.fields.selectedValue]: selectedOption.value
            });
            // Update review/email projections based on latest selected option.
            setCustomPageSummaryElements(req.session, CUSTOM_PAGE_CONFIG.siteId, CUSTOM_PAGE_CONFIG.key, buildSummaryElements(selectedOption));
            setCustomPageEmail(req.session, CUSTOM_PAGE_CONFIG.siteId, CUSTOM_PAGE_CONFIG.key, buildEmailElements(selectedOption, req.globalLang || "el"));
            // Clear any stale custom errors after successful selection.
            clearCustomPageErrors(req.session, CUSTOM_PAGE_CONFIG.siteId, CUSTOM_PAGE_CONFIG.key);
            req.session.siteData[CUSTOM_PAGE_CONFIG.siteId].customPages[CUSTOM_PAGE_CONFIG.key].inPageErrors = [];

            if (req.query.route === "review") {
                // When returning from review flow, keep user in review context.
                res.redirect(`/${CUSTOM_PAGE_CONFIG.siteId}/review`);
                return;
            }

            // Normal flow: redirect to configured next page.
            const nextPage = getCustomPageProperty(
                req.session,
                CUSTOM_PAGE_CONFIG.siteId,
                CUSTOM_PAGE_CONFIG.key,
                "nextPage",
                false
            );

            res.redirect(nextPage || CUSTOM_PAGE_CONFIG.nextPage);
        } catch (error) {
            next(error);
        }
    });
}

/* c8 ignore end */