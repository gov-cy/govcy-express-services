// src/middleware/govcyMultipleThingsHubHandler.mjs
import e from "express";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { buildMultipleThingsValidationSummary } from "../utils/govcyMultipleThingsValidation.mjs";
import nunjucks from "nunjucks";

/**
 * Middleware to render a MultipleThings hub page. 
 
 * @param {Object} page - The page config from the JSON (includes multipleThings block)
 * @param {Object} serviceCopy - The service config (full JSON)
 */
export function govcyMultipleThingsHubHandler(req, res, next, page, serviceCopy) {
    try {
        const { siteId, pageUrl } = req.params;
        const mtConfig = page.multipleThings;
        let addLinkCounter = 0;

        // Sanity checks
        if (!mtConfig) {
            logger.debug("🚨 multipleThings config not found in page config", req);
            return handleMiddlewareError(`🚨 multipleThings config not found in page config`, 500, next);
        }
        if (!mtConfig.listPage
            || !mtConfig.listPage.title) {
            logger.debug("🚨 multipleThings.listPage.title is required", req);
            return handleMiddlewareError(`🚨 multipleThings.listPage.title is required`, 500, next);
        }
        if (!mtConfig.itemTitleTemplate
            || !mtConfig.min === undefined || !mtConfig.min === null
            || !mtConfig.max) {
            logger.debug("🚨 multipleThings.itemTitleTemplate, .min and .max are required", req);
            return handleMiddlewareError(`🚨 multipleThings.itemTitleTemplate, .min and .max are required`, 500, next);
        }

        // Grab items from formData
        let items = dataLayer.getPageData(req.session, siteId, pageUrl);
        if (!Array.isArray(items)) items = [];

        logger.debug(`MultipleThings hub for ${siteId}/${pageUrl}, items: ${items.length}`);

        // Build hub template
        const hubTemplate = {
            sections: [
                {
                    name: "main",
                    elements: [
                        {
                            element: "form",
                            params: {
                                action: govcyResources.constructPageUrl(siteId, page.pageData.url, (req.query.route === "review" ? "review" : "")),
                                method: "POST",
                                elements: []
                            }
                        }
                    ]
                }
            ]
        };

        // ➕ Add CSRF token
        hubTemplate.sections[0].elements[0].params.elements.push(govcyResources.csrfTokenInput(req.csrfToken()));

        //--------- Handle Validation Errors ---------
        // check if there are validation errors from the session (from POST handler)
        const v = dataLayer.getPageValidationErrors(req.session, siteId, pageUrl, "hub");
        const hubErrors = v?.hub?.errors;

        if (hubErrors && Object.keys(hubErrors).length > 0) {
            // Build validation error summary
            let validationErrors = buildMultipleThingsValidationSummary( serviceCopy, hubErrors, siteId, pageUrl, req, req.query?.route || "");
            // Add error summary to the top of the form
            hubTemplate.sections[0].elements[0].params.elements.unshift(govcyResources.errorSummary(validationErrors));
        }
        //--------- End of Handle Validation Errors ---------

        // 1. Add topElements if provided
        if (Array.isArray(mtConfig.listPage.topElements)) {
            hubTemplate.sections[0].elements[0].params.elements.push(...mtConfig.listPage.topElements);
        }

        //If items are less than max show the add another button
        if (items.length < mtConfig.max) {
            // If addButtonPlacement is "top" or "both", add the "Add another" button at the top
            if (mtConfig?.listPage?.addButtonPlacement === "top" || mtConfig?.listPage?.addButtonPlacement === "both") {
                hubTemplate.sections[0].elements[0].params.elements.push(
                    govcyResources.getMultipleThingsLink("add", siteId, pageUrl, serviceCopy.site.lang, "", (req.query?.route === "review" ? "review" : "")
                        , mtConfig?.listPage?.addButtonText?.[serviceCopy.site.lang], addLinkCounter)
                );
                addLinkCounter++;
            }
        }
        // 2. Add list of items or empty state
        if (items.length === 0) {
            hubTemplate.sections[0].elements[0].params.elements.push({
                element: "inset",
                // if no emptyState provided use the static resource
                params: {
                    id: "multipleThingsList",
                    text: (
                        mtConfig?.listPage?.emptyState?.[serviceCopy.site.lang]
                            ? mtConfig.listPage.emptyState
                            : govcyResources.staticResources.text.multipleThingsEnptyState
                    )
                }
            });
        }
        else {
            //nunjucks.renderString(template, item);
            // Build dynamic table items using Nunjucks to render item titles
            const tableItems = items.map((item, idx) => {
                // Render the title string from the template (e.g. "{{title}} – {{institution}}")
                // If item = { title: "BSc CS", institution: "UCY" }, it becomes "BSc CS – UCY"
                const safeItem = (item && typeof item === "object") ? item : {};
                const env = new nunjucks.Environment(null, { autoescape: false });
                let title;
                try {
                    title = env.renderString(mtConfig.itemTitleTemplate, safeItem);
                    // Fallback if Nunjucks returned empty or only whitespace
                    if (!title || !title.trim()) {
                        title = govcyResources.staticResources.text.untitled[serviceCopy.site.lang] || govcyResources.staticResources.text.untitled["el"];
                    }
                } catch (err) {
                    // Log the error and fallback
                    logger.error(`Error rendering itemTitleTemplate for ${siteId}/${pageUrl}, index=${idx}: ${err.message}`, req);
                    title = govcyResources.staticResources.text.untitled[serviceCopy.site.lang] || govcyResources.staticResources.text.untitled["el"];
                }


                return {
                    // Table row text
                    text: { [serviceCopy.site.lang]: title },

                    // Row actions (edit / remove)
                    actions: [
                        {
                            text: govcyResources.staticResources.text.change,
                            // Edit route for this item
                            href: `/${siteId}/${pageUrl}/multiple/edit/${idx}${req.query?.route === "review" ? "?route=review" : ""}`,
                            visuallyHiddenText: { [serviceCopy.site.lang]: ` ${title}` }
                        },
                        {
                            text: govcyResources.staticResources.text.delete,
                            // Delete route for this item
                            href: `/${siteId}/${pageUrl}/multiple/delete/${idx}${req.query?.route === "review" ? "?route=review" : ""}`,
                            visuallyHiddenText: { [serviceCopy.site.lang]: ` ${title}` }
                        }
                    ]
                };
            });

            // Push the table into the hub template
            hubTemplate.sections[0].elements[0].params.elements.push({
                element: "multipleThingsTable",
                params: {
                    id: `multipleThingsList`,
                    classes: "govcy-multiple-table",    // CSS hook
                    items: tableItems                   // The rows we just built
                }
            });

        }

        //If items are less than max show the add another button
        if (items.length < mtConfig.max) {
            // If addButtonPlacement is "bottom" or "both", add the "Add another" button at the bottom
            if (mtConfig?.listPage?.addButtonPlacement === "bottom" || mtConfig?.listPage?.addButtonPlacement === "both" || addLinkCounter === 0) {
                hubTemplate.sections[0].elements[0].params.elements.push(
                    govcyResources.getMultipleThingsLink("add", siteId, pageUrl, serviceCopy.site.lang, "", (req.query?.route === "review" ? "review" : "")
                        , mtConfig?.listPage?.addButtonText?.[serviceCopy.site.lang], addLinkCounter)
                );
            }
        } else {
            // process message
            // Deep copy page title (so we don’t mutate template)
            let maxMsg = JSON.parse(JSON.stringify(govcyResources.staticResources.text.multipleThingsMaxMessage));

            // Replace label placeholders on page title
            for (const lang of Object.keys(maxMsg)) {
                maxMsg[lang] = maxMsg[lang].replace("{{max}}", mtConfig.max);
            }
            hubTemplate.sections[0].elements[0].params.elements.push({
                element: "warning",
                // if no emptyState provided use the static resource
                params: {
                    text: maxMsg
                }
            });
        }

        // 5. Add Continue button
        hubTemplate.sections[0].elements[0].params.elements.push(
            {
                element: "button",
                // if no emptyState provided use the static resource
                params: {
                    text: (
                        mtConfig?.listPage?.continueButtonText?.[serviceCopy.site.lang]
                            ? mtConfig.listPage.continueButtonText
                            : govcyResources.staticResources.text.continue
                    ),
                    variant: "primary",
                    type: "submit"
                }
            }
        );


        //if mtConfig.hasBackLink == true add section beforeMain with backlink element
        if (mtConfig.listPage?.hasBackLink == true) {
            hubTemplate.sections.unshift({
                name: "beforeMain",
                elements: [
                    {
                        element: "backLink",
                        params: {}
                    }
                ]
            });
        }
        // if (dataLayer.getUser(req.session)) {
        //     hubTemplate.sections.push(govcyResources.userNameSection(dataLayer.getUser(req.session).name)); // Add user name section
        // }

        // Attach processedPage (like govcyPageHandler does)
        req.processedPage = {
            pageData: {
                site: serviceCopy.site,
                pageData: {
                    title: mtConfig.listPage.title,
                    layout: page?.pageData?.layout || "layouts/govcyBase.njk",
                    mainLayout: page?.pageData?.mainLayout || "two-third"
                }
            },
            pageTemplate: hubTemplate
        };

        next();
    } catch (error) {
        logger.debug("Error in govcyMultipleThingsHubHandler middleware:", error.message);
        return next(error); // Pass the error to the next middleware
    }
}