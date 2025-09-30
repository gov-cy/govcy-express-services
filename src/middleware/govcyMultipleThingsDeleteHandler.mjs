import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";
import { whatsIsMyEnvironment } from '../utils/govcyEnvVariables.mjs';
import { tempSaveIfConfigured } from "../utils/govcyTempSave.mjs";
import nunjucks from "nunjucks";
import { URL } from "url";

/**
 * Middleware to show a confirmation page before deleting a multipleThings item.
 */
export function govcyMultipleThingsDeletePageHandler() {
    return (req, res, next) => {
        try {
            const { siteId, pageUrl, index } = req.params;
            const serviceCopy = req.serviceData;
            const page = getPageConfigData(serviceCopy, pageUrl);

            // --- Sanity checks ---
            const mtConfig = page.multipleThings;
            if (!mtConfig) {
                return handleMiddlewareError(`🚨 multipleThings config not found for ${siteId}/${pageUrl}`, 404, next);
            }
            if (!mtConfig.listPage || !mtConfig.listPage.title) {
                return handleMiddlewareError(`🚨 multipleThings.listPage.title is required for ${siteId}/${pageUrl}`, 404, next);
            }
            if (!mtConfig.itemTitleTemplate || !mtConfig.min === undefined || !mtConfig.min === null || !mtConfig.max) {
                return handleMiddlewareError(`🚨 multipleThings.itemTitleTemplate, .min and .max are required for ${siteId}/${pageUrl}`, 404, next);
            }

            // --- Conditions ---
            const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            if (conditionResult.result === false) {
                logger.debug("⛔️ Page condition evaluated to true on GET — skipping and redirecting:", conditionResult);
                return res.redirect(govcyResources.constructPageUrl(siteId, conditionResult.redirect));
            }

            // --- Validate index ---
            let items = dataLayer.getPageData(req.session, siteId, pageUrl);
            if (!Array.isArray(items)) items = [];
            const idx = parseInt(index, 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= items.length) {
                return handleMiddlewareError(`🚨 multipleThings delete index not found for ${siteId}/${pageUrl} (index=${index})`, 404, next);
            }

            const item = items[idx];

            // --- Build page title ---
            // We’ll use the itemTitleTemplate to render the item title
            const env = new nunjucks.Environment(null, { autoescape: false });
            const itemTitle = env.renderString(mtConfig.itemTitleTemplate, item);

            // Base page template
            let pageTemplate = {
                sections: [
                    {
                        name: "beforeMain",
                        elements: [govcyResources.staticResources.elements.backLink]
                    }
                ]
            };

            // Deep copy page title (so we don’t mutate template)
            let pageTitle = JSON.parse(JSON.stringify(govcyResources.staticResources.text.multipleThingsDeleteTitle));

            // Replace label placeholders on page title
            for (const lang of Object.keys(pageTitle)) {
                pageTitle[lang] = pageTitle[lang].replace("{{item}}", itemTitle);
            }

            // Radios for confirmation
            const pageRadios = {
                element: "radios",
                params: {
                    id: "deleteItem",
                    name: "deleteItem",
                    legend: pageTitle,
                    isPageHeading: true,
                    classes: "govcy-mb-6",
                    items: [
                        { value: "yes", text: govcyResources.staticResources.text.deleteYesOption },
                        { value: "no", text: govcyResources.staticResources.text.deleteNoOption }
                    ]
                }
            };

            // Form element
            const formElement = {
                element: "form",
                params: {
                    action: govcyResources.constructPageUrl(siteId, `${pageUrl}/multiple/delete/${index}`, req.query.route === "review" ? "review" : ""),
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
            // Add validation errors if present
            const validationErrors = [];
            let mainElements = [];
            if (req?.query?.hasError) {
                validationErrors.push({
                    link: "#deleteItem-option-1",
                    text: govcyResources.staticResources.text.multipleThingsDeleteValidationError
                });
                mainElements.push(govcyResources.errorSummary(validationErrors));
                formElement.params.elements[0].params.error = govcyResources.staticResources.text.multipleThingsDeleteValidationError;
            }
            //--------- End Handle Validation Errors ---------

            mainElements.push(formElement);
            pageTemplate.sections.push({ name: "main", elements: mainElements });

            const pageData = JSON.parse(JSON.stringify(govcyResources.staticResources.rendererPageData));
            // Handle isTesting 
            pageData.site.isTesting = (whatsIsMyEnvironment() === "staging");

            pageData.site = serviceCopy.site;
            
            pageData.pageData.title = pageTitle;

            req.processedPage = { pageData, pageTemplate };
            logger.debug("Processed delete item page data:", req.processedPage);
            next();
        } catch (error) {
            return next(error);
        }
    };
}


/**
 * Middleware to handle delete item POST for multipleThings
 */
export function govcyMultipleThingsDeletePostHandler() {
  return (req, res, next) => {
    try {
      const { siteId, pageUrl, index } = req.params;
      const service = req.serviceData;
      const page = getPageConfigData(service, pageUrl);

      // --- Sanity checks ---
      const mtConfig = page.multipleThings;
      if (!mtConfig) {
        return handleMiddlewareError(
          `🚨 multipleThings config not found for ${siteId}/${pageUrl}`,
          404,
          next
        );
      }

      // --- Conditions ---
      const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
      if (conditionResult.result === false) {
        logger.debug(
          "⛔️ Page condition evaluated to true on POST — skipping and redirecting:",
          conditionResult
        );
        return res.redirect(
          govcyResources.constructPageUrl(siteId, conditionResult.redirect)
        );
      }

      // --- Validate index ---
      let items = dataLayer.getPageData(req.session, siteId, pageUrl);
      if (!Array.isArray(items)) items = [];
      const idx = parseInt(index, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= items.length) {
        return handleMiddlewareError(
          `🚨 multipleThings delete index not found for ${siteId}/${pageUrl} (index=${index})`,
          404,
          next
        );
      }

      // --- Validate form value ---
      if (
        !req?.body?.deleteItem ||
        (req.body.deleteItem !== "yes" && req.body.deleteItem !== "no")
      ) {
        logger.debug(
          "⛔️ No deleteItem value provided on POST — redirecting with error:",
          req.body
        );

        const pageBaseReturnUrl = `http://localhost:3000/${siteId}/${pageUrl}/multiple/delete/${index}`;
        let myUrl = new URL(pageBaseReturnUrl);
        if (req.query.route === "review") {
          myUrl.searchParams.set("route", "review");
        }
        myUrl.searchParams.set("hasError", "1");

        return res.redirect(
          govcyResources.constructErrorSummaryUrl(myUrl.pathname + myUrl.search)
        );
      }

      // --- Handle deletion ---
      if (req.body.deleteItem === "yes") {
        items.splice(idx, 1); // remove the item
        dataLayer.storePageData(req.session, siteId, pageUrl, items);
        logger.info(`Item deleted by user`, { siteId, pageUrl, index });

        //Temp save
        (async () => { try { await tempSaveIfConfigured(req.session, service, siteId); } catch (e) { } })();
      }

      // --- Redirect back to the hub ---
      const hubUrl = govcyResources.constructPageUrl(
        siteId,
        pageUrl,
        req.query.route === "review" ? "review" : ""
      );
      return res.redirect(hubUrl);
    } catch (error) {
      logger.error("Error in govcyMultipleThingsDeletePostHandler middleware:", error);
      return next(error);
    }
  };
}