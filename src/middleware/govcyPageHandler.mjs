import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { populateFormData } from "../utils/govcyFormHandling.mjs";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
// import {flattenContext, evaluateExpressionWithFlattening, evaluatePageConditions } from "../utils/govcyExpressions.mjs";

/**
 * Middleware to handle page rendering and form processing
 * This middleware processes the page template, populates form data, and shows validation errors.
 */
export function govcyPageHandler() {
  return (req, res, next) => {
    try {
      // Extract siteId and pageUrl from request
      let { siteId, pageUrl } = req.params; 
      
      // get service data
      let serviceCopy = req.serviceData; 
      
      // 🏠 Handle index page: If pageUrl is undefined (meaning the user accessed `/:siteId`), set a default value or handle accordingly
      if (!pageUrl) {
        logger.debug(`No pageUrl provided for siteId: ${siteId}`, req);
        // Example: Redirect to a default page or load a homepage
        pageUrl = "index"; // Change "index" to whatever makes sense for your service
      }

      // 🔍 Find the page by pageUrl
      const page = getPageConfigData(serviceCopy, pageUrl);

      // Deep copy pageTemplate to avoid modifying the original
      const pageTemplateCopy = JSON.parse(JSON.stringify(page.pageTemplate));

      // TODO: Conditional logic comes here
      //if user is logged in add the user nane section in the page template
      if (dataLayer.getUser(req.session)) {
        pageTemplateCopy.sections.push(govcyResources.userNameSection(dataLayer.getUser(req.session).name)); // Add user name section
      }
      //⚙️ Process forms before rendering
      pageTemplateCopy.sections.forEach(section => {
        section.elements.forEach(element => {
          if (element.element === "form") {
            logger.debug("Processing form element:", element, req);
            element.params.action = govcyResources.constructPageUrl(siteId, page.pageData.url, (req.query.route === "review" ? "review" : ""));
            // Set form method to POST
            element.params.method = "POST";
            // ➕ Add CSRF token
            element.params.elements.push(govcyResources.csrfTokenInput(req.csrfToken()));
            element.params.elements.push(govcyResources.staticResources.elements["govcyFormsJs"]);

            // 🔍 Find the first button with `prototypeNavigate`
            const button = element.params.elements.find(subElement =>
              // subElement.element === "button" && subElement.params.prototypeNavigate
              subElement.element === "button"
            );

            // ⚙️ Modify the button if it exists
            if (button) {
              // Store the value of `prototypeNavigate`
              //const prototypeNavigateValue = button.params.prototypeNavigate;
              // Remove `prototypeNavigate`
              if (button.params.prototypeNavigate) {
                delete button.params.prototypeNavigate;
              }
              // Set `type` to "submit"
              button.params.type = "submit";
            }

            // Handle form data
            let theData = {};

            //--------- Handle Validation Errors ---------
            // Check if validation errors exist in the session
            const validationErrors = dataLayer.getPageValidationErrors(req.session, siteId, pageUrl);
            if (validationErrors ) {
              // Populate form data from validation errors
              theData = validationErrors?.formData || {};
            } else {
              // Populate form data from session
              theData = dataLayer.getPageData(req.session, siteId, pageUrl);
            }
            //--------- End of Handle Validation Errors ---------
            
            populateFormData(element.params.elements, theData,validationErrors);
            // if there are validation errors, add an error summary
            if (validationErrors?.errorSummary?.length > 0) {
              element.params.elements.unshift(govcyResources.errorSummary(validationErrors.errorSummary));
            }
            logger.debug("Processed form element:", element, req);
          }
        });
      });

      // Attach processed data to request
      req.processedPage = {
        pageData: {
          "site": serviceCopy.site, 
          "pageData": {
            "title": page.pageData.title,
            "layout": page.pageData.layout,
            "mainLayout": page.pageData.mainLayout
          }
        },
        pageTemplate: pageTemplateCopy
      };
      logger.debug("Processed page data:", req.processedPage, req);
      next(); // Pass control to the next middleware or route
    } catch (error) {
        return next(error);  // Pass error to govcyHttpErrorHandler
    }
  };
}
