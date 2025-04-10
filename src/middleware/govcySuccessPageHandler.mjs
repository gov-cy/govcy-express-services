import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { generateReviewSummary  } from "../utils/govcySubmitData.mjs";


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
                const error = new Error('Submission data not found');
                error.status = 404;
                throw error;  // Let Express catch this
            }
            // Deep copy renderer pageData from
            let pageData = JSON.parse(JSON.stringify(govcyResources.staticResources.rendererPageData));
            
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
            // Construct page title
            const weHaveSendYouAnEmail = {
                element: "textElement",
                params: {
                    type: "p",
                    text: govcyResources.staticResources.text.weHaveSendYouAnEmail
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
                    header: govcyResources.staticResources.text.submissionSuccessTitle,
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

            let summaryList = generateReviewSummary(submissionData.printFriendlyData,req, siteId,false);

            let mainElements = [];
            // Add elements to the main section
            mainElements.push(
                successPanel,
                weHaveSendYouAnEmail, 
                pdfLink,
                theDataFromYourRequest, 
                summaryList, 
                govcyResources.staticResources.elements["govcyFormsJs"]
            );
            // Append generated summary list to the page template
            pageTemplate.sections.push({ name: "main", elements: mainElements });
            
            //if user is logged in add he user bane section in the page template
            if (dataLayer.getUser(req.session)) {
                pageTemplate.sections.push(govcyResources.userNameSection(dataLayer.getUser(req.session).name)); // Add user name section
            }
            
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
