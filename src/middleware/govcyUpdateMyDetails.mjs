/**
 * Update My Details (UMD) page handler
 * Variants:
 * 1️⃣ Manual form — for non-eligible users (no access to UMD)
 * 2️⃣ Confirmation radio — eligible user with existing details
 * 3️⃣ External link — eligible user with no details (redirect to UMD service)
 *
 * GET: Determines variant and builds page template
 * POST: Validates form, stores data (variant 1/2), or redirects to UMD (variant 2/no)
 */

import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { getEnvVariable, getEnvVariableBool, isProdOrStaging } from "../utils/govcyEnvVariables.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from '../utils/govcyLogger.mjs';
import { handleMiddlewareError, dateStringISOtoDMY } from "../utils/govcyUtils.mjs";
import { govcyApiRequest } from "../utils/govcyApiRequest.mjs";
import { isUnder18, isValidCypriotCitizen, validateFormElements } from "../utils/govcyValidator.mjs";
import { populateFormData, getFormData } from "../utils/govcyFormHandling.mjs";
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";
import { tempSaveIfConfigured } from "../utils/govcyTempSave.mjs";
import { UPDATE_MY_DETAILS_ALLOWED_HOSTS } from "../utils/govcyConstants.mjs";

export async function govcyUpdateMyDetailsHandler(req, res, next, page, serviceCopy) {
    try {
        const { siteId, pageUrl } = req.params;
        const umdConfig = page?.updateMyDetails;

        // Sanity checks
        if (
            !umdConfig ||                                     // updateMyDetails missing
            !umdConfig.scope ||                               // scope missing
            !Array.isArray(umdConfig.scope) ||                // scope not an array
            umdConfig.scope.length === 0 ||                   // scope empty
            !umdConfig.APIEndpoint ||                         // APIEndpoint missing
            !umdConfig.APIEndpoint.url ||                     // APIEndpoint.url missing
            !umdConfig.APIEndpoint.clientKey ||               // clientKey missing
            !umdConfig.APIEndpoint.serviceId ||               // serviceId missing
            !umdConfig.updateMyDetailsURL                     // updateMyDetailsURL missing
        ) {
            logger.debug("🚨 Invalid updateMyDetails configuration", req);
            return handleMiddlewareError(
                "🚨 Invalid updateMyDetails configuration",
                500,
                next
            );
        }
        // Environment vars
        const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES", false);
        let url = getEnvVariable(umdConfig.APIEndpoint.url || "", false);
        const clientKey = getEnvVariable(umdConfig.APIEndpoint.clientKey || "", false);
        const serviceId = getEnvVariable(umdConfig.APIEndpoint.serviceId || "", false);
        const dsfGtwKey = getEnvVariable(umdConfig?.APIEndpoint?.dsfgtwApiKey || "", "");
        const method = (umdConfig?.APIEndpoint?.method || "GET").toLowerCase();
        const umdBaseURL = getEnvVariable(umdConfig?.updateMyDetailsURL || "", "");

        // Check if the upload API is configured correctly
        if (!url || !clientKey || !umdBaseURL) {
            return handleMiddlewareError(`Missing environment variables for updateMyDetails`, 500, next);
        }
        // Build hub template
        let pageTemplate = {};

        // Get the user
        const user = dataLayer.getUser(req.session);

        let pageVariant = 0;

        // Check if the user is a cypriot
        if (!isValidCypriotCitizen(user)) {
            // --------------- Not eligible for Update my details ---------------
            // --------------- Page variant 1
            pageVariant = 1;
            // load the manual input page
            pageTemplate = createUmdManualPageTemplate(siteId, serviceCopy.site.lang, page, req);
        } else {
            // --------------- Eligible for Update my details ---------------
            // Construct the URL with the language
            url += `/${serviceCopy.site.lang}`;

            // run the API request to check if the user has already uploaded their details
            // Perform the upload request
            const response = await govcyApiRequest(
                method,
                url,
                {},
                true,
                user,
                {
                    accept: "text/plain",
                    "client-key": clientKey,
                    "service-id": serviceId,
                    ...(dsfGtwKey !== "" && { "dsfgtw-api-key": dsfGtwKey })
                },
                3,
                allowSelfSignedCerts
            );

            // If not succeeded, handle error
            if (!response?.Succeeded) {
                return handleMiddlewareError(`updateMyDetailsAPIEndpoint - returned succeeded false`, 500, next);
            }

            // Check if the response contains the expected data
            if (!response?.Data || !response?.Data?.dob) {
                return handleMiddlewareError(`updateMyDetailsAPIEndpoint - Missing response data`, 500, next);
            }

            // calculate if person in under 18 based on date of birth
            if (isUnder18(response.Data.dob)) {
                // --------------- Not eligible for Update my details ---------------
                // --------------- Page variant 1
                pageVariant = 1;
                // load the manual input page
                pageTemplate = createUmdManualPageTemplate(siteId, serviceCopy.site.lang, page, req);
            } else {
                let hasData = true;
                let userDetails = {};
                //for each element in the scope array
                for (const element of umdConfig?.scope || []) {
                    // The key in 
                    let key = element;

                    // Get the value
                    let value = response.Data?.[key] || "";

                    // Special case for address
                    if (element === "address") {
                        key = "addressInfo";
                        //if response.Data.addressInfo is an array
                        if (response.Data.addressInfo && Array.isArray(response.Data.addressInfo)) {
                            value = response.Data?.addressInfo?.[0]?.addressText || "";
                        } 
                        // else if response.Data.addressInfoUnstructured is not null and is an array
                        else if (response.Data.addressInfoUnstructured && Array.isArray(response.Data.addressInfoUnstructured)) {
                            value = response.Data?.addressInfoUnstructured?.[0]?.addressText || "";
                        }
                        // else if response.Data.poBoxAddress is not null and is not an array
                        else if (response.Data.poBoxAddress && Array.isArray(response.Data.poBoxAddress)) {
                            value = response.Data?.poBoxAddress?.[0]?.poBoxText || "";
                        } else {
                            value = "";
                        }
                    } 

                    // Check if the key exists
                    if (!Object.prototype.hasOwnProperty.call(response.Data || {}, key)) {
                        hasData = false;
                        return handleMiddlewareError(`updateMyDetailsAPIEndpoint - Missing response data for element ${element}`, 500, next);
                    }

                    // Check if the value is null, undefined, or empty string
                    if (value == null || value === "") {
                        // Set hasData to false and set the value to an empty string
                        hasData = false;
                        userDetails[element] = "";
                    } else {
                        // Set the value
                        userDetails[element] = value;
                    }
                }

                if (hasData) {
                    // --------------- Page variant 2: Confirmation radio for eligible users with data
                    pageVariant = 2;
                    // load the has data page
                    pageTemplate = createUmdHasDataPageTemplate(siteId, serviceCopy.site.lang, page, req, userDetails);
                } else {
                    // --------------- Page variant 3: External redirect link for users with no data
                    pageVariant = 3;
                    // load the has no data page
                    pageTemplate = createUmdHasNoDataPageTemplate(siteId, serviceCopy.site.lang, page, req, umdBaseURL);
                }
            }
        }

        // Deep copy pageTemplate to avoid modifying the original
        const pageTemplateCopy = JSON.parse(JSON.stringify(pageTemplate));

        // if the page variant is 1 or 2 which means it has a form
        if (pageVariant === 1 || pageVariant === 2) {
            // Handle form data
            let theData = {};

            //--------- Handle Validation Errors ---------
            // Check if validation errors exist in the session
            const validationErrors = dataLayer.getPageValidationErrors(req.session, siteId, pageUrl);
            if (validationErrors) {
                // Populate form data from validation errors
                theData = validationErrors?.formData || {};
            } else {
                // Populate form data from session
                theData = dataLayer.getPageData(req.session, siteId, pageUrl);
            }
            //--------- End of Handle Validation Errors ---------


            populateFormData(
                pageTemplateCopy.sections[0].elements[0].params.elements,
                theData,
                validationErrors,
                req.session,
                siteId,
                pageUrl,
                req.globalLang,
                null,
                req.query.route);


            // if there are validation errors, add an error summary
            if (validationErrors?.errorSummary?.length > 0) {
                pageTemplateCopy.sections[0].elements[0].params.elements.unshift(govcyResources.errorSummary(validationErrors.errorSummary));
            }
        }

        // Add topElements if provided
        if (Array.isArray(umdConfig.topElements)) {
            pageTemplateCopy.sections[0].elements[0].params.elements.unshift(...umdConfig.topElements);
        }

        //if hasBackLink == true add section beforeMain with backlink element
        if (umdConfig?.hasBackLink == true) {
            pageTemplateCopy.sections.unshift({
                name: "beforeMain",
                elements: [
                    {
                        element: "backLink",
                        params: {}
                    }
                ]
            });
        }

        // Attach processed data to request
        req.processedPage = {
            pageData: {
                site: serviceCopy.site,
                pageData: {
                    title: govcyResources.staticResources.text.updateMyDetailsTitle,
                    layout: page?.pageData?.layout || "layouts/govcyBase.njk",
                    mainLayout: page?.pageData?.mainLayout || "two-third"
                }
            },
            pageTemplate: pageTemplateCopy
        };

        logger.debug("Processed `govcyUpdateMyDetailsHandler` page data:", req.processedPage, req);
        next(); // Pass control to the next middleware or route

    } catch (error) {
        logger.debug("Error in govcyUpdateMyDetailsHandler middleware:", error.message);
        return next(error); // Pass the error to the next middleware
    }
}


/**
 * Middleware to handle page form submission for updateMyDetails
 */
export function govcyUpdateMyDetailsPostHandler() {
    return async (req, res, next) => {
        try {
            const { siteId, pageUrl } = req.params;

            // ⤵️ Load service and check if it exists
            const service = req.serviceData;

            // ⤵️ Find the current page based on the URL
            const page = getPageConfigData(service, pageUrl);

            if (!service || !page) {
                return handleMiddlewareError("Service or page data missing", 400, next);
            }

            // ----- Conditional logic comes here
            // ✅ Skip this POST handler if the page's conditions evaluate to true (redirect away)
            const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            if (conditionResult.result === false) {
                logger.debug("⛔️ Page condition evaluated to true on POST — skipping form save and redirecting:", conditionResult);
                return res.redirect(govcyResources.constructPageUrl(siteId, conditionResult.redirect));
            }

            //-----------------------------------------------------------------------------
            // UpdateMyDetails configuration
            const umdConfig = page?.updateMyDetails;

            // Sanity checks
            if (
                !umdConfig ||                                     // updateMyDetails missing
                !umdConfig.scope ||                               // scope missing
                !Array.isArray(umdConfig.scope) ||                // scope not an array
                umdConfig.scope.length === 0 ||                   // scope empty
                !umdConfig.APIEndpoint ||                         // APIEndpoint missing
                !umdConfig.APIEndpoint.url ||                     // APIEndpoint.url missing
                !umdConfig.APIEndpoint.clientKey ||               // clientKey missing
                !umdConfig.APIEndpoint.serviceId ||               // serviceId missing
                !umdConfig.updateMyDetailsURL                     // updateMyDetailsURL missing
            ) {
                logger.debug("🚨 Invalid updateMyDetails configuration", req);
                return handleMiddlewareError(
                    "🚨 Invalid updateMyDetails configuration",
                    500,
                    next
                );
            }
            // Environment vars
            const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES", false);
            let url = getEnvVariable(umdConfig.APIEndpoint.url || "", false);
            const clientKey = getEnvVariable(umdConfig.APIEndpoint.clientKey || "", false);
            const serviceId = getEnvVariable(umdConfig.APIEndpoint.serviceId || "", false);
            const dsfGtwKey = getEnvVariable(umdConfig?.APIEndpoint?.dsfgtwApiKey || "", "");
            const method = (umdConfig?.APIEndpoint?.method || "GET").toLowerCase();
            const umdBaseURL = getEnvVariable(umdConfig?.updateMyDetailsURL || "", "");

            // Check if the upload API is configured correctly
            if (!url || !clientKey || !umdBaseURL) {
                return handleMiddlewareError(`Missing environment variables for updateMyDetails`, 500, next);
            }
            // Build hub template
            let pageTemplate = {};

            // user details (for variant 2: Confirmation radio for eligible users with data)
            let userDetails = {};

            // Get the user
            const user = dataLayer.getUser(req.session);

            let pageVariant = 0;

            // Check if the user is a cypriot
            if (!isValidCypriotCitizen(user)) {
                // --------------- Not eligible for Update my details ---------------
                // --------------- Page variant 1:Manual form for non-eligible users
                pageVariant = 1;
                // load the manual input page
                pageTemplate = createUmdManualPageTemplate(siteId, service.site.lang, page, req);
            } else {
                // --------------- Eligible for Update my details ---------------
                // Construct the URL with the language
                url += `/${service.site.lang}`;

                // run the API request to check if the user has already uploaded their details
                // Perform the upload request
                const response = await govcyApiRequest(
                    method,
                    url,
                    {},
                    true,
                    user,
                    {
                        accept: "text/plain",
                        "client-key": clientKey,
                        "service-id": serviceId,
                        ...(dsfGtwKey !== "" && { "dsfgtw-api-key": dsfGtwKey })
                    },
                    3,
                    allowSelfSignedCerts
                );

                // If not succeeded, handle error
                if (!response?.Succeeded) {
                    return handleMiddlewareError(`updateMyDetailsAPIEndpoint - returned succeeded false`, 500, next);
                }

                // Check if the response contains the expected data
                if (!response?.Data || !response?.Data?.dob) {
                    return handleMiddlewareError(`updateMyDetailsAPIEndpoint - Missing response data`, 500, next);
                }

                // calculate if person in under 18 based on date of birth
                if (isUnder18(response.Data.dob)) {
                    // --------------- Not eligible for Update my details ---------------
                    // --------------- Page variant 1:Manual form for non-eligible users
                    pageVariant = 1;
                    // load the manual input page
                    pageTemplate = createUmdManualPageTemplate(siteId, service.site.lang, page, req);
                } else {
                    let hasData = true;
                    //for each element in the scope array
                    for (const element of umdConfig?.scope || []) {
                        // The key in 
                        let key = element;

                        // Get the value
                        let value = response.Data?.[key] || "";

                        // Special case for address
                        if (element === "address") {
                            key = "addressInfo";
                            //if response.Data.addressInfo is an array
                            if (response.Data.addressInfo && Array.isArray(response.Data.addressInfo)) {
                                value = response.Data?.addressInfo?.[0]?.addressText || "";
                            } 
                            // else if response.Data.addressInfoUnstructured is not null and is an array
                            else if (response.Data.addressInfoUnstructured && Array.isArray(response.Data.addressInfoUnstructured)) {
                                value = response.Data?.addressInfoUnstructured?.[0]?.addressText || "";
                            }
                            // else if response.Data.poBoxAddress is not null and is not an array
                            else if (response.Data.poBoxAddress && Array.isArray(response.Data.poBoxAddress)) {
                                value = response.Data?.poBoxAddress?.[0]?.poBoxText || "";
                            } else {
                                value = "";
                            }
                        } 

                        // Check if the key exists
                        if (!Object.prototype.hasOwnProperty.call(response.Data || {}, key)) {
                            hasData = false;
                            return handleMiddlewareError(`updateMyDetailsAPIEndpoint - Missing response data for element ${element}`, 500, next);
                        }

                        // Check if the value is null, undefined, or empty string
                        if (value == null || value === "") {
                            // Set hasData to false and set the value to an empty string
                            hasData = false;
                            userDetails[element] = "";
                        } else {
                            if (element === "dob") {
                                key = "dob";
                                // value = response.Data?.[key] || "";
                                // Store different for ${element}_day, ${element}_month, ${element}_year
                                const [year, month, day] = value.split("-").map(Number);
                                userDetails[`${element}_day`] = day;
                                userDetails[`${element}_month`] = month;
                                userDetails[`${element}_year`] = year;
                            } else {
                                // Set the value as it is 
                                userDetails[element] = value;
                            }
                        }
                    }

                    if (hasData) {
                        // --------------- Page variant 2: Confirmation radio for eligible users with data
                        pageVariant = 2;
                        // load the has data page
                        pageTemplate = createUmdHasDataPageTemplate(siteId, service.site.lang, page, req, userDetails);
                    } else {
                        // --------------- Page variant 3: External redirect link for users with no data
                        return handleMiddlewareError(`updateMyDetailsAPIEndpoint - Unexpected POST for User that has no Update my details data.`, 400, next);
                    }
                }
            }



            //-----------------------------------------------------------------------------
            // 🔍 Find the form definition inside `pageTemplate.sections`
            let formElement = null;
            for (const section of pageTemplate.sections) {
                formElement = section.elements.find(el => el.element === "form");
                if (formElement) break;
            }

            if (!formElement) {
                return handleMiddlewareError("🚨 Form definition not found.", 500, next);
            }

            let nextPage = null;

            // const formData = req.body; // Submitted data
            const formData = getFormData(formElement.params.elements, req.body, req.session, siteId, pageUrl); // Submitted data

            // ☑️ Start validation from top-level form elements
            const validationErrors = validateFormElements(formElement.params.elements, formData);

            // ❌ Return validation errors if any exist
            if (Object.keys(validationErrors).length > 0) {
                logger.debug("🚨 Validation errors:", validationErrors, req);
                logger.info("🚨 Validation errors on:", req.originalUrl);
                // store the validation errors
                dataLayer.storePageValidationErrors(req.session, siteId, pageUrl, validationErrors, formData);
                //redirect to the same page with error summary
                return res.redirect(govcyResources.constructErrorSummaryUrl(
                    govcyResources.constructPageUrl(siteId, page.pageData.url, (req.query.route === "review" ? "review" : ""))
                ));
            }

            if (pageVariant === 1) {
                // --------------- Page variant 1:Manual form for non-eligible users
                //⤴️ Store validated form data in session
                dataLayer.storePageData(req.session, siteId, pageUrl, formData);
                dataLayer.storePageUpdateMyDetails(req.session, siteId, pageUrl, formData);
            } else if (pageVariant === 2) {
                // --------------- Page variant 2: Confirmation radio for eligible users with data
                const userChoice = req.body?.useTheseDetails?.trim().toLowerCase();
                if (userChoice === "yes") {
                    //⤴️ Store validated form data in session
                    dataLayer.storePageData(req.session, siteId, pageUrl, userDetails);
                    dataLayer.storePageUpdateMyDetails(req.session, siteId, pageUrl, userDetails);
                } else if (userChoice === "no") {
                    // construct the return url to go to `:siteId/:pageUrl` + `?route=` + `review`
                    const returnUrl = `${req.protocol}://${req.get("host")}${govcyResources.constructPageUrl(siteId, page.pageData.url, (req.query.route === "review" ? "review" : ""))}`;
                    // Get user profile id
                    const userId = user?.sub || "";
                    // 🔄 User chose to update their details externally
                    const redirectUrl = constructUpdateMyDetailsRedirect(req, userId, umdBaseURL, returnUrl);
                    logger.info("User opted to update details externally", {
                        userId: user.unique_identifier,
                        redirectUrl
                    });
                    return res.redirect(redirectUrl);
                }
                else {
                    // 🚨 Should never happen (defensive)
                    return handleMiddlewareError("Invalid value for useTheseDetails", 400, next);
                }
            }


            // 🔄 Fire-and-forget temporary save (non-blocking)
            (async () => {
                try { await tempSaveIfConfigured(req.session, service, siteId); }
                catch (e) { /* already logged internally */ }
            })();

            logger.debug("✅ Form submitted successfully:", dataLayer.getPageData(req.session, siteId, pageUrl), req);
            logger.info("✅ Form submitted successfully:", req.originalUrl);

            // 🔍 Determine next page (if applicable)
            for (const section of pageTemplate.sections) {
                const form = section.elements.find(el => el.element === "form");
                if (form) {
                    //handle review route
                    if (req.query.route === "review") {
                        nextPage = govcyResources.constructPageUrl(siteId, "review");
                    } else {
                        nextPage = page.pageData.nextPage;
                        //nextPage = form.params.elements.find(el => el.element === "button" && el.params?.prototypeNavigate)?.params.prototypeNavigate;
                    }
                }
            }

            // ➡️ Redirect to the next page if defined, otherwise return success
            if (nextPage) {
                logger.debug("🔄 Redirecting to next page:", nextPage, req);
                // 🛠 Fix relative paths
                return res.redirect(govcyResources.constructPageUrl(siteId, `${nextPage.split('/').pop()}`));
            }
            res.json({ success: true, message: "Form submitted successfully" });

        } catch (error) {
            return next(error); // Pass error to govcyHttpErrorHandler
        }
    };
}


/**
 * Creates the has data page template for users that have data in Update My Details
 * @param {string} siteId The site id  
 * @param {string} lang The language 
 * @param {object} page The page object 
 * @param {object} req The request object 
 * @param {Array} userDetails The user details 
 * @returns {object} The page template
 */
function createUmdHasDataPageTemplate(siteId, lang, page, req, userDetails) {
    const umdConfig = page?.updateMyDetails || {};
    // Build hub template
    const pageTemplate = {
        sections: [
            {
                name: "main",
                elements: [
                    {
                        element: "form",
                        params: {
                            action: govcyResources.constructPageUrl(siteId, `${page.pageData.url}/update-my-details-response`, (req.query.route === "review" ? "review" : "")),
                            method: "POST",
                            elements: [govcyResources.csrfTokenInput(req.csrfToken())]
                        }
                    }
                ]
            }
        ]
    };

    // the continue button
    let continueButton = {
        element: "button",
        params: {
            // if no continue button is provided use the static resource
            // text: (
            //     umdConfig?.continueButtonText?.[lang]
            //         ? umdConfig.continueButtonText
            //         : govcyResources.staticResources.text.continue
            // ),
            text: govcyResources.staticResources.text.continue,
            variant: "primary",
            type: "submit"
        }
    }

    // ➕ Add header and instructions
    pageTemplate.sections[0].elements[0].params.elements.push(govcyResources.staticResources.elements.umdHasData["header"]);
    pageTemplate.sections[0].elements[0].params.elements.push(govcyResources.staticResources.elements.umdHasData["instructions"]);

    // ➕ The data summaryList
    let summaryList = {
        element: "summaryList",
        params: {
            items: []
        }
    }
    //for each element in the scope array
    umdConfig?.scope.forEach(element => {
        let value = userDetails?.[element] || "";

        //if element is dob
        if (element === "dob") {
            value = dateStringISOtoDMY(value);
        }
        // add the key and value to the summaryList
        summaryList.params.items.push({
            key: govcyResources.staticResources.text.updateMyDetailsScopes[element],
            value: [
                {
                    element: "textElement",
                    params: {
                        type: "span",
                        classes: "govcy-whitespace-pre-line",
                        text: govcyResources.getSameMultilingualObject(null, value)
                    }
                }
            ]
        })
    })
    // ➕ Add the element 
    pageTemplate.sections[0].elements[0].params.elements.push(summaryList);

    // ➕ Add the question
    pageTemplate.sections[0].elements[0].params.elements.push(govcyResources.staticResources.elements.umdHasData["question"]);

    // ➕ Add the continue button
    pageTemplate.sections[0].elements[0].params.elements.push(continueButton);

    return pageTemplate;
}

/**
 * Creates the has no data page template for users that have no data in Update My Details
 * @param {string} siteId The site id 
 * @param {string} lang The language 
 * @param {object} page The page object 
 * @param {object} req The request object 
 * @returns {object} The page template 
 */
function createUmdHasNoDataPageTemplate(siteId, lang, page, req, umdBaseURL) {
    const umdConfig = page?.updateMyDetails || {};

    // Get user
    const user = dataLayer.getUser(req.session);
    // Get user profile id
    const userId = user?.sub || "";
    const redirectUrl = constructUpdateMyDetailsRedirect(req, userId, umdBaseURL)
    // deep copy the continue button
    const continueButtonText = JSON.parse(JSON.stringify(govcyResources.staticResources.text.continue))

    // Replace label placeholders on page title
    for (const lang of Object.keys(continueButtonText)) {
        continueButtonText[lang] = `<a class="govcy-btn-primary" href="${redirectUrl}">${continueButtonText[lang]}</a>`;
    }

    // Build hub template
    const pageTemplate = {
        sections: [
            {
                name: "main",
                elements: [
                    {
                        element: "form",
                        params: {
                            elements: [
                                govcyResources.staticResources.elements.umdHasNoData.header,
                                govcyResources.staticResources.elements.umdHasNoData.instructions,
                                {
                                    element: "htmlElement",
                                    params: {
                                        text: continueButtonText
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    return pageTemplate;
}

/**
 * Creates the page template for the updateMyDetails manual input page 
 * @param {string} siteId The site id 
 * @param {string} lang The language 
 * @param {object} page The page object 
 * @param {object} req The request object
 * @returns {object} The page template 
 */
export function createUmdManualPageTemplate(siteId, lang, page, req) {
    const umdConfig = page?.updateMyDetails || {};
    // Build hub template
    const pageTemplate = {
        sections: [
            {
                name: "main",
                elements: [
                    {
                        element: "form",
                        params: {
                            action: govcyResources.constructPageUrl(siteId, `${page.pageData.url}/update-my-details-response`, (req.query.route === "review" ? "review" : "")),
                            method: "POST",
                            elements: [govcyResources.csrfTokenInput(req.csrfToken())]
                        }
                    }
                ]
            }
        ]
    };


    // the continue button
    let continueButton = {
        element: "button",
        params: {
            // text: (
            //     // if no continue button is provided use the static resource
            //     umdConfig?.continueButtonText?.[lang]
            //         ? umdConfig.continueButtonText
            //         : govcyResources.staticResources.text.continue
            // ),
            text: govcyResources.staticResources.text.continue,
            variant: "primary",
            type: "submit"
        }
    }

    // ➕ Add header and instructions
    pageTemplate.sections[0].elements[0].params.elements.push(govcyResources.staticResources.elements.umdManual["header"]);
    pageTemplate.sections[0].elements[0].params.elements.push(govcyResources.staticResources.elements.umdManual["instructions"]);
    //for each element in the scope array
    umdConfig?.scope.forEach(element => {
        // ➕ Add the element 
        pageTemplate.sections[0].elements[0].params.elements.push(govcyResources.staticResources.elements.umdManual[element]);

    })
    // ➕ Add the continue button
    pageTemplate.sections[0].elements[0].params.elements.push(continueButton);

    return pageTemplate;

}

/**
 * Constructs the redirect URL for Update My Details
 * @param {object} req The request object
 * @param {string} userId The user id
 * @param {string} umdBaseURL The Update My Details base URL
 * @param {string} returnUrl (Optional) The return URL
 * @returns {string} The redirect URL
 */
export function constructUpdateMyDetailsRedirect(req, userId, umdBaseURL, returnUrl = "") {
    // Only allow certain hosts
    const allowedHosts = UPDATE_MY_DETAILS_ALLOWED_HOSTS;

    // Validate URL against allowed hosts
    const parsed = new URL(umdBaseURL);
    if (!allowedHosts.includes(parsed.hostname)) {
        throw new Error("Invalid Update My Details URL");
    }

    if (returnUrl === "") {
        // Construct return URL
        returnUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    }

    // Validate return URL for production only (HTTPS)
    if (!returnUrl.startsWith("https://") && isProdOrStaging() === "production") {
        throw new Error("Return URL must be HTTPS in production");
    }
    // Encode url args
    const encodedReturnUrl = encodeURIComponent(Buffer.from(returnUrl).toString("base64"));
    const encodedUserId = encodeURIComponent(Buffer.from(userId).toString("base64"));
    const lang = req.globalLang || "el";

    // Construct redirect URL
    return `${umdBaseURL}/ReturnUrl/SetReturnUrl?Url=${encodedReturnUrl}&UserProfileId=${encodedUserId}&lang=${lang}`;
}

