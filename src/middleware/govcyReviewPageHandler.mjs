import { govcyGenerateReviewSummary } from "../utils/govcyReviewSummary.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";

/**
 * Middleware to handle the review page for the service.
 * This middleware processes the review page, populates form data, and shows validation errors.
 */
export function govcyReviewPageHandler() {
    return (req, res, next) => {
        try {
            const { siteId } = req.params;
            
            // Create a deep copy of the service to avoid modifying the original
            let serviceCopy = req.serviceData;
            
            // Deep copy renderer pageData from
            let pageData = JSON.parse(JSON.stringify(govcyResources.staticResources.rendererPageData));
            
            // Base page template structure
            let pageTemplate = {
                sections: [
                    {
                        name: "beforeMain",
                        elements: [govcyResources.staticResources.elements.backLink]
                    }
                ]
            };
            // Construct page title
            const pageH1 = {
                element: "textElement",
                params: {
                    type: "h1",
                    text: govcyResources.staticResources.text.checkYourAnswersTitle
                }
            };
            
            // Construct submit button
            const submitButton = {
                element: "form",
                params: {
                    action: govcyResources.constructPageUrl(siteId, "review"),
                    method: "POST",
                    elements: [
                        {
                            element: "button",
                            params: {
                                type: "submit",
                                variant: "success",
                                text: govcyResources.staticResources.text.submit
                            }
                        }, govcyResources.csrfTokenInput(req.csrfToken())
                    ]
                }
            }
            // Generate the summary list using the utility function
            const summaryList = govcyGenerateReviewSummary(req, siteId, serviceCopy);
            
            //--------- Handle Validation Errors ---------
            // Check if validation errors exist in the session
            const validationErrors = dataLayer.getSiteSubmissionErrors(req.session, siteId);
            let mainElements = [];
            if (validationErrors ) {
                for (const error in validationErrors.errors) {
                    validationErrors.errorSummary.push({
                        link: govcyResources.constructPageUrl(siteId, validationErrors.errors[error].pageUrl, "review"), //`/${siteId}/${error.pageUrl}`,
                        text: validationErrors.errors[error].message
                    });
                }
                mainElements.push(govcyResources.errorSummary(validationErrors.errorSummary));
            } 
            //--------- End Handle Validation Errors ---------

            // Add elements to the main section, the H1, summary list, the submit button and the JS
            mainElements.push(pageH1, summaryList, submitButton, govcyResources.staticResources.elements["govcyFormsJs"]);
            // Append generated summary list to the page template
            pageTemplate.sections.push({ name: "main", elements: mainElements });
            
            //if user is logged in add he user bane section in the page template
            if (dataLayer.getUser(req.session)) {
                pageTemplate.sections.push(govcyResources.userNameSection(dataLayer.getUser(req.session).name)); // Add user name section
            }
            
            //prepare pageData
            pageData.site = serviceCopy.site;
            pageData.pageData.title = govcyResources.staticResources.text.checkYourAnswersTitle;
            
            // Attach processed page data to the request
            req.processedPage = {
                pageData: pageData,
                pageTemplate: pageTemplate
            };
            logger.debug("Processed review page data:", req.processedPage, req);
            next();
        } catch (error) {
            return next(error); // Pass error to govcyHttpErrorHandler
        }
    };
}
