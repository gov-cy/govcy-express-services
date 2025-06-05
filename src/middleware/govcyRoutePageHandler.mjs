import { govcyFrontendRenderer } from '@gov-cy/govcy-frontend-renderer';
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import {listAvailableSiteConfigs, getServiceConfigData} from "../utils/govcyLoadConfigData.mjs";

/**
 * Middleware function to handle the route page.
 * This function renders the available services page with a list of available sites.
 */
export function govcyRoutePageHandler(req, res, next) {

    // if current service cookie is set redirect to that page
    if (req.cookies.cs) {
        const siteId  = req.cookies.cs;
        const serviceData = getServiceConfigData(siteId, req.globalLang);
        if (serviceData.site && serviceData.site.homeRedirectPage) {
            // redirect to the homeRedirectPage cookie
            return res.redirect(serviceData.site.homeRedirectPage);
        }
    }

   // Deep copy renderer pageData from
    let pageData = JSON.parse(JSON.stringify(govcyResources.staticResources.rendererPageData));
    const listOfAvailableSites = listAvailableSiteConfigs();

    // Construct the page template
    let pageTemplate = govcyResources.availableServicesPageTemplate(listOfAvailableSites, req.globalLang);
    //use lang from middleware
    pageData.site.lang = req.globalLang; 
    //if user is logged in add he user bane section in the page template
    if (dataLayer.getUser(req.session)) {
    pageTemplate.sections.push(govcyResources.userNameSection(dataLayer.getUser(req.session).name)); // Add user name section
    }
    const renderer = new govcyFrontendRenderer();
    const html = renderer.renderFromJSON(pageTemplate, pageData);
    res.send(html);
}
