import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { pageContainsFileInput } from "../utils/govcyHandleFiles.mjs";
import { whatsIsMyEnvironment, getEnvVariable, getEnvVariableBool } from '../utils/govcyEnvVariables.mjs';
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";
import { govcyApiRequest } from "../utils/govcyApiRequest.mjs";
import { URL } from "url";


/**
 * Middleware to handle the delete file page.
 * This middleware processes the delete file page, populates the question, and shows validation errors.
 */
export function govcyFileDeletePageHandler() {
    return (req, res, next) => {
        try {
            const { siteId, pageUrl, elementName } = req.params;

            // Create a deep copy of the service to avoid modifying the original
            let serviceCopy = req.serviceData;

            // ⤵️ Find the current page based on the URL
            const page = getPageConfigData(serviceCopy, pageUrl);

            // deep copy the page template to avoid modifying the original
            const pageTemplateCopy = JSON.parse(JSON.stringify(page.pageTemplate));

            // ----- Conditional logic comes here
            // ✅ Skip this POST handler if the page's conditions evaluate to true (redirect away)
            const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            if (conditionResult.result === false) {
                logger.debug("⛔️ Page condition evaluated to true on POST — skipping form save and redirecting:", conditionResult);
                return res.redirect(govcyResources.constructPageUrl(siteId, conditionResult.redirect));
            }

            // Validate the field: Only allow delete if the page contains a fileInput with the given name
            const fileInputElement = pageContainsFileInput(pageTemplateCopy, elementName);
            if (!fileInputElement) {
                return handleMiddlewareError(`File input [${elementName}] not allowed on this page`, 404, next);
            }

            // Validate if the file input has a label
            if (!fileInputElement?.params?.label) {
                return handleMiddlewareError(`File input [${elementName}] does not have a label`, 404, next);
            }

            // --- Resolve file element data (normal + multipleThings add/edit) ---
            const { index } = req.params;
            const elementData = dataLayer.getFormDataValue(req.session, siteId, pageUrl, elementName, index);
        
            // Guard if still nothing found
            if (!elementData || !elementData.fileId || !elementData.sha256) {
                return handleMiddlewareError(`File input [${elementName}] data not found on this page`, 404, next);
            }


            // Deep copy page title (so we don’t mutate template)
            const pageTitle = JSON.parse(JSON.stringify(govcyResources.staticResources.text.deleteFileTitle));

            // Replace label placeholders on page title
            for (const lang of Object.keys(pageTitle)) {
                const labelForLang = fileInputElement.params.label[lang] || fileInputElement.params.label.el || "";
                pageTitle[lang] = pageTitle[lang].replace("{{file}}", labelForLang);
            }


            // Deep copy renderer pageData from
            let pageData = JSON.parse(JSON.stringify(govcyResources.staticResources.rendererPageData));

            // Handle isTesting 
            pageData.site.isTesting = (whatsIsMyEnvironment() === "staging");

            // Base page template structure
            let pageTemplate = {
                sections: [
                    {
                        name: "beforeMain",
                        elements: [govcyResources.staticResources.elements.backLink]
                    }
                ]
            };

            //contruct the warning if the file was uploaded more than once
            const warningSameFile = {
                element: "warning",
                params: {
                    text: govcyResources.staticResources.text.deleteSameFileWarning,
                }
            };

            const showSameFileWarning = dataLayer.isFileUsedInSiteInputDataAgain(
                req.session,
                siteId,
                elementData
            );

            // Construct page title
            const pageRadios = {
                element: "radios",
                params: {
                    id: "deleteFile",
                    name: "deleteFile",
                    legend: pageTitle,
                    isPageHeading: true,
                    classes: "govcy-mb-6",// only include the warning block when the file is referenced >1 times
                    elements: showSameFileWarning ? [warningSameFile] : [],
                    items: [
                        {
                            value: "yes",
                            text: govcyResources.staticResources.text.deleteYesOption
                        },
                        {
                            value: "no",
                            text: govcyResources.staticResources.text.deleteNoOption
                        }
                    ]

                }
            };
            //-------------
            // Build proper action based on context (normal / multiple add / multiple edit)
            let actionPath;
            if (typeof req.params.index !== "undefined") {
                // multiple edit
                actionPath = `${pageUrl}/multiple/edit/${req.params.index}/delete-file/${elementName}`;
            } else if (req.originalUrl.includes("/multiple/add")) {
                // multiple add
                actionPath = `${pageUrl}/multiple/add/delete-file/${elementName}`;
            } else {
                // normal page
                actionPath = `${pageUrl}/delete-file/${elementName}`;
                // if normal page but has multipleThings, block it
                if (page?.multipleThings) {
                    return handleMiddlewareError(`Single mode delete file not allowed on multipleThings pages`, 404, next)
                }
            }
            // Construct submit button
            const formElement = {
                element: "form",
                params: {
                    action: govcyResources.constructPageUrl(siteId, actionPath, (req.query.route === "review" ? "review" : "")),
                    method: "POST",
                    elements: [
                        pageRadios,
                        {
                            element: "button",
                            params: {
                                type: "submit",
                                text: govcyResources.staticResources.text.continue
                            }
                        },
                        govcyResources.csrfTokenInput(req.csrfToken())
                    ]
                }
            };

            // --------- Handle Validation Errors ---------
            // Check if validation errors exist in the request
            const validationErrors = [];
            let mainElements = [];
            if (req?.query?.hasError) {
                validationErrors.push({
                    link: '#deleteFile-option-1',
                    text: govcyResources.staticResources.text.deleteFileValidationError
                });
                mainElements.push(govcyResources.errorSummary(validationErrors));
                formElement.params.elements[0].params.error = govcyResources.staticResources.text.deleteFileValidationError;
            }
            //--------- End Handle Validation Errors ---------

            // Add elements to the main section, the H1, summary list, the submit button and the JS
            mainElements.push(formElement);
            // Append generated summary list to the page template
            pageTemplate.sections.push({ name: "main", elements: mainElements });

            //prepare pageData
            pageData.site = serviceCopy.site;
            pageData.pageData.title = pageTitle;

            // Attach processed page data to the request
            req.processedPage = {
                pageData: pageData,
                pageTemplate: pageTemplate
            };
            logger.debug("Processed delete file page data:", req.processedPage);
            next();
        } catch (error) {
            return next(error); // Pass error to govcyHttpErrorHandler
        }
    };
}


/**
 * Middleware to handle delete file post form processing
 * This middleware processes the post, validates the form and handles the file data layer
 */
export function govcyFileDeletePostHandler() {
    return async (req, res, next) => {
        try {
            // Extract siteId and pageUrl from request
            let { siteId, pageUrl, elementName } = req.params;

            // get service data
            let serviceCopy = req.serviceData;

            // 🔍 Find the page by pageUrl
            const page = getPageConfigData(serviceCopy, pageUrl);

            // Deep copy pageTemplate to avoid modifying the original
            const pageTemplateCopy = JSON.parse(JSON.stringify(page.pageTemplate));

            // ----- Conditional logic comes here
            // Check if the page has conditions and apply logic
            const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            if (conditionResult.result === false) {
                logger.debug("⛔️ Page condition evaluated to true on POST — skipping form save and redirecting:", conditionResult);
                return res.redirect(govcyResources.constructPageUrl(siteId, conditionResult.redirect));
            }

            // Validate the field: Only allow delete if the page contains a fileInput with the given name
            const fileInputElement = pageContainsFileInput(pageTemplateCopy, elementName);
            if (!fileInputElement) {
                return handleMiddlewareError(`File input [${elementName}] not allowed on this page`, 404, next);
            }

            // --- Resolve file element data (normal + multipleThings add/edit) ---
            const { index } = req.params;
            const elementData = dataLayer.getFormDataValue(req.session, siteId, pageUrl, elementName, index);
        
            // Guard if still nothing found
            if (!elementData || !elementData.fileId || !elementData.sha256) {
                return handleMiddlewareError(`File input [${elementName}] data not found on this page`, 404, next);
            }

            // Build proper action based on context (normal / multiple add / multiple edit)
            let actionPath;
            if (typeof req.params.index !== "undefined") {
                // multiple edit
                actionPath = `${pageUrl}/multiple/edit/${req.params.index}`;
            } else if (req.originalUrl.includes("/multiple/add")) {
                // multiple add
                actionPath = `${pageUrl}/multiple/add`;
            } else {
                // normal page
                actionPath = `${pageUrl}`;
                // if normal page but has multipleThings, block it
                if (page?.multipleThings) {
                    return handleMiddlewareError(`Single mode delete file not allowed on multipleThings pages`, 404, next)
                }
            }

            // the page base return url
            const pageBaseReturnUrl = `http://localhost:3000/${siteId}/${actionPath}`;

            //check if input `deleteFile` has a value
            if (!req?.body?.deleteFile ||
                (req.body.deleteFile !== "yes" && req.body.deleteFile !== "no")) {
                logger.debug("⛔️ No deleteFile value provided on POST — skipping form save and redirecting:", req.body);
                //construct the page url with error 
                let myUrl = new URL(pageBaseReturnUrl + `/delete-file/${elementName}`);
                //check if the route is review
                if (req.query.route === "review") {
                    myUrl.searchParams.set("route", "review");
                }
                //set the error flag
                myUrl.searchParams.set("hasError", "1");

                //redirect to the same page with error summary (relative path)
                return res.redirect(govcyResources.constructErrorSummaryUrl(myUrl.pathname + myUrl.search));
            }

            //if no validation errors
            if (req.body.deleteFile === "yes") {
                // Try to delete the file via the delete API. 
                // If it fails, log the error but continue to remove the file from the session
                try {
                    // Get the delete file configuration
                    const deleteCfg = serviceCopy?.site?.fileDeleteAPIEndpoint;
                    // Check if download file configuration is available
                    if (!deleteCfg?.url || !deleteCfg?.clientKey || !deleteCfg?.serviceId) {
                        return handleMiddlewareError(`File delete APU configuration not found`, 404, next);
                    }

                    // Environment vars
                    const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES", false);
                    let url = getEnvVariable(deleteCfg.url || "", false);
                    const clientKey = getEnvVariable(deleteCfg.clientKey || "", false);
                    const serviceId = getEnvVariable(deleteCfg.serviceId || "", false);
                    const dsfGtwKey = getEnvVariable(deleteCfg?.dsfgtwApiKey || "", "");
                    const method = (deleteCfg?.method || "GET").toLowerCase();

                    // Check if the upload API is configured correctly
                    if (!url || !clientKey) {
                        return handleMiddlewareError(`Missing environment variables for upload`, 404, next);
                    }

                    // Construct the URL with tag being the elementName
                    url += `/${encodeURIComponent(elementData.fileId)}/${encodeURIComponent(elementData.sha256)}`;

                    // Get the user
                    const user = dataLayer.getUser(req.session);
                    // Perform the delete request
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
                        logger.error("fileDeleteAPIEndpoint returned succeeded false");
                    }

                } catch (error) {
                    logger.error(`fileDeleteAPIEndpoint Call failed: ${error.message}`);
                }
                // if succeeded all good
                // dataLayer.storePageDataElement(req.session, siteId, pageUrl, elementName, "");
                dataLayer.removeAllFilesFromSite(req.session, siteId, { fileId: elementData.fileId, sha256: elementData.sha256 });
                logger.info(`File deleted by user`, { siteId, pageUrl, elementName });
            }
            // construct the page url
            let myUrl = new URL(pageBaseReturnUrl);
            //check if the route is review
            if (req.query.route === "review") {
                myUrl.searchParams.set("route", "review");
            }

            // redirect to the page (relative path)
            res.redirect(myUrl.pathname + myUrl.search);
        } catch (error) {
            logger.error("Error in govcyFileDeletePostHandler middleware:", error.message);
            return next(error);  // Pass error to govcyHttpErrorHandler
        }
    };
}
