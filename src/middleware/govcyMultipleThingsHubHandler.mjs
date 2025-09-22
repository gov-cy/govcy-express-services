// src/middleware/govcyMultipleThingsHubHandler.mjs
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from "../utils/govcyLogger.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";

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
            || !mtConfig.listPage.title ) {
            logger.debug("🚨 multipleThings.listPage.title is required", req);
            return handleMiddlewareError(`🚨 multipleThings.listPage.title is required`, 500, next);
        }
        if (!mtConfig.itemTitleTemplate
            || !mtConfig.min
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
                    elements: []
                }
            ]
        };

        // 1. Add topElements if provided
        if (Array.isArray(mtConfig.listPage.topElements)) {
            hubTemplate.sections[0].elements.push(...mtConfig.listPage.topElements);
        }

        // If addButtonPlacement is "top" or "both", add the "Add another" button at the top
        if (mtConfig?.listPage?.addButtonPlacement === "top" || mtConfig?.listPage?.addButtonPlacement === "both") {
            hubTemplate.sections[0].elements.push(
                govcyResources.getMultipleThingsLink("add",siteId, pageUrl, req.globalLang,"", (req.query?.route === "review" ? "review" : "")
                ,mtConfig?.listPage?.addButtonText?.[req.globalLang] ) 
            );
            addLinkCounter++;
        }
        // 2. Add list of items or empty state
        // if (items.length === 0) {
            // hubTemplate.sections[0].elements.push({
            //     element: "inset",
            //     // if no emptyState provided use the static resource
            //     params: {
            //         text:(
            //             mtConfig?.listPage?.emptyState?.[req.globalLang]
            //             ? mtConfig.listPage.emptyState
            //             : govcyResources.staticResources.text.multipleThingsEnptyState
            //         )
            //     }
            // });
        // } 
        // else {
            hubTemplate.sections[0].elements.push({
                "element": "multipleThingsTable",
                "params": {
                    "id": "govcy-test-128",
                    "classes": "govcy-test-class",
                    "items": [
                        {
                            "text": { "en": "BSc Computer Science – University of Cyprus"
                                    , "el": "BSc Computer Science – University of Cyprus" },
                            "actions": [
                            {
                                "text": { "en": "Change", "el": "Αλλαγή" },
                                "href": "#change1",
                                "visuallyHiddenText": { "en": "+BSc Computer Science – University of Cyprus", "el": "+BSc Computer Science – University of Cyprus el" }
                            },
                            {
                                "text": { "en": "Remove", "el": "Διαγραφή" },
                                "href": "#remove1",
                                "classes": "govcy-test-class",
                                "visuallyHiddenText": { "en": "+BSc Computer Science – University of Cyprus", "el": "+BSc Computer Science – University of Cyprus el" }
                            }
                            ]
                        },
                        {
                            "text": { "en": "MSc Artificial Intelligence – UCL", "el": "MSc Artificial Intelligence – UCL el" },
                            "actions": [
                            {
                                "text": { "en": "Change", "el": "Αλλαγή" },
                                "href": "#change2",
                                "visuallyHiddenText": { "en": "MSc Artificial Intelligence – UCL", "el": "MSc Artificial Intelligence – UCL el" }
                            },
                            {
                                "text": { "en": "Remove", "el": "Διαγραφή" },
                                "href": "#remove2",
                                "classes": "govcy-test-class",
                                "visuallyHiddenText": { "en": "MSc Artificial Intelligence – UCL", "el": "MSc Artificial Intelligence – UCL el" }
                            }
                            ]
                        }
                    ]
                }
            });
        // }
        //else {
        //     // TODO: build table from items + mtConfig.itemTitleTemplate
        //     hubTemplate.sections[0].elements.push(
        //         govcyResources.multipleThingsTable(items, mtConfig, pageUrl)
        //     );
        // }

        
        // If addButtonPlacement is "bottom" or "both", add the "Add another" button at the bottom
        if (mtConfig?.listPage?.addButtonPlacement === "bottom" || mtConfig?.listPage?.addButtonPlacement === "both" || addLinkCounter === 0) {
            hubTemplate.sections[0].elements.push(
                govcyResources.getMultipleThingsLink("add",siteId, pageUrl, req.globalLang,"", (req.query?.route === "review" ? "review" : "")
                ,mtConfig?.listPage?.addButtonText?.[req.globalLang] ) 
            );
        }

        // 5. Add Continue button
        hubTemplate.sections[0].elements.push(
            {
                element: "button",
                // if no emptyState provided use the static resource
                params: {
                    text:(
                        mtConfig?.listPage?.continueButtonText?.[req.globalLang]
                        ? mtConfig.listPage.continueButtonText
                        : govcyResources.staticResources.text.continue
                    ),
                    variant: "primary"
                }
            }
        );

        
        //if user is logged in add the user nane section in the page template
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