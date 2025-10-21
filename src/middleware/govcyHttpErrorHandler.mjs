import { govcyFrontendRenderer } from '@gov-cy/govcy-frontend-renderer';
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { whatsIsMyEnvironment } from '../utils/govcyEnvVariables.mjs';
import { errorResponse } from '../utils/govcyApiResponse.mjs';
import { isApiRequest } from '../utils/govcyApiDetection.mjs';

/**
 * Middleware function to handle HTTP errors and render appropriate error pages.
 * This function captures errors that occur during the request lifecycle and generates appropriate error pages based on the error status code.
 */
export function govcyHttpErrorHandler(err, req, res, next) {

    logger.debug("HTTP Error details:", err, req); // Log the error details
    // Set default status and message
    let statusCode = err.status || 500;
    let message = err.message || "Internal Server Error";

    // Deep copy renderer pageData from
    let pageData = JSON.parse(JSON.stringify(govcyResources.staticResources.rendererPageData));

    // Handle isTesting 
    pageData.site.isTesting = (whatsIsMyEnvironment() === "staging");
        
    // Handle specific HTTP errors
    switch (statusCode) {
        case 404:
            logger.info("404 - Page not found.", err.message, req.originalUrl); // Log the error
            pageData.pageData.title = govcyResources.staticResources.text.errorPage404Title;
            pageData.pageData.text = govcyResources.staticResources.text.errorPage404Body;
            message = "404 - Page not found.";
            break;
        case 403:
            logger.warn("HTTP Error:", err.message, req.originalUrl); // Log the error
            pageData.pageData.title = govcyResources.staticResources.text.errorPage403Title;
            if (err.message === "Access Denied: natural person policy not met.") {
                pageData.pageData.text = govcyResources.staticResources.text.errorPage403NaturalOnlyPolicyBody;
            } else {
                pageData.pageData.text = govcyResources.staticResources.text.errorPage403Body;
            }
            message = "403 - Forbidden access.";
            break;
        case 500:
            logger.error("HTTP Error:", err.message, req.originalUrl); // Log the error
            pageData.pageData.title = govcyResources.staticResources.text.errorPage500Title;
            pageData.pageData.text = govcyResources.staticResources.text.errorPage500Body;
            message = "500 - Something went wrong on our end.";
            break;
    }

    res.status(statusCode);

    if (isApiRequest(req)) {
        if (err.code === `LIMIT_FILE_SIZE` && err.name === `MulterError`) {
            statusCode = 409;
            message = "File exceeds allowed size";
            return res.status(400).json(errorResponse(statusCode, message));
        }
        return res.status(statusCode).json(errorResponse(statusCode, message));
    }

    // Render an error page for non-JSON requests
    const renderer = new govcyFrontendRenderer();
    let pageTemplate = govcyResources.simpleHtmlPageTemplate(pageData.pageData.title, pageData.pageData.text);
    pageData.site.lang = req.globalLang; //use lang from middleware
    //if user is logged in add he user bane section in the page template
    if (dataLayer.getUser(req.session)) {
        pageTemplate.sections.push(govcyResources.userNameSection(dataLayer.getUser(req.session).name)); // Add user name section
    }
    // Add custom CSS path
    pageData.site.customCSSFile = `/css/govcyExpress.css`;
    const html = renderer.renderFromJSON(pageTemplate, pageData);
    res.send(html);
}
