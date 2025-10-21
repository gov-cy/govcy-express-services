import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { generateReviewSummary  } from "../utils/govcySubmitData.mjs";
import { whatsIsMyEnvironment } from '../utils/govcyEnvVariables.mjs';


/**
 * Middleware to handle the success page for the service.
 * This middleware shows the success page.
 * @param {boolean} isPDF - True if the success page is for a PDF, false otherwise
 * 
 */
export function govcySuccessPageHandler(isPDF = false) {
    return (req, res, next) => {
        try {
            const { siteId } = req.params;
            
            // Create a deep copy of the service to avoid modifying the original
            let serviceCopy = req.serviceData;
                       
            // Get the submission data
            let submissionData = dataLayer.getSiteSubmissionData(req.session, siteId);
            // ❌ Check if submission data is empty 
            if (!submissionData || Object.keys(submissionData).length === 0) {
                return handleMiddlewareError("🚨 Submission data not found.", 404, next);
            }
            // Deep copy renderer pageData from
            let pageData = JSON.parse(JSON.stringify(govcyResources.staticResources.rendererPageData));
            
            // Handle isTesting 
            pageData.site.isTesting = (whatsIsMyEnvironment() === "staging");

            if (isPDF) {
                pageData.pageData.mainLayout = "max-width";
            }
            // Base page template structure
            let pageTemplate = {
                sections: [
                    // {
                    //     name: "beforeMain",
                    //     elements: [govcyResources.staticResources.elements.backLink]
                    // }
                ]
            };

            let weHaveSendYouAnEmailText = JSON.parse(JSON.stringify(govcyResources.staticResources.text.weHaveSendYouAnEmail));
            // Replace label placeholders for email
            for (const lang of Object.keys(weHaveSendYouAnEmailText)) {
                weHaveSendYouAnEmailText[lang] = weHaveSendYouAnEmailText[lang].replace("{{email}}", 
                    submissionData.contactEmailAddress || ""
                );
            }

            // Construct page title
            const weHaveSendYouAnEmail = {
                element: "textElement",
                params: {
                    type: "p",
                    text: weHaveSendYouAnEmailText
                }
            };
            
            // Construct page title
            const theDataFromYourRequest = {
                element: "textElement",
                params: {
                    type: "p",
                    text: govcyResources.staticResources.text.theDataFromYourRequest
                }
            };
            // Construct page title
            const successPanel = {
                element: "panel",
                params: {
                    // if serviceCopy has site.successPageHeader use it otherwise use the static resource. it should test if serviceCopy.site.successPageHeader[req.globalLang] exists
                    header: (
                        serviceCopy?.site?.successPageHeader?.[req.globalLang]
                        ? serviceCopy.site.successPageHeader
                        : govcyResources.staticResources.text.submissionSuccessTitle
                    ),
                    // header: govcyResources.staticResources.text.submissionSuccessTitle,
                    body: govcyResources.staticResources.text.yourSubmissionId,
                    referenceNumber: govcyResources.getSameMultilingualObject(serviceCopy.site.languages,submissionData.referenceNumber)
                }
            };

            const pdfLink = {
                element: "htmlElement",
                params: {
                    text: govcyResources.getSubmissionPDFLinkHtml(siteId)
                }   
            }

            let summaryList = submissionData.rendererData;

            let mainElements = [];
            // Add elements to the main section
            mainElements.push(
                successPanel,
                weHaveSendYouAnEmail, 
                pdfLink,
                theDataFromYourRequest, 
                summaryList
            );
            // Append generated summary list to the page template
            pageTemplate.sections.push({ name: "main", elements: mainElements });
            
            //prepare pageData
            pageData.site = serviceCopy.site;
            pageData.pageData.title = govcyResources.staticResources.text.submissionSuccessTitle;
            
            // Attach processed page data to the request
            req.processedPage = {
                pageData: pageData,
                pageTemplate: pageTemplate
            };
            logger.debug("Processed success page data:", req.processedPage, req);
            next();
        } catch (error) {
            return next(error); // Pass error to govcyHttpErrorHandler
        }
    };
}
