import { govcyFrontendRenderer } from "@gov-cy/govcy-frontend-renderer";
import * as govcyResources from "../resources/govcyResources.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";

/**
 * Middleware function to render pages using the GovCy Frontend Renderer.
 * This function takes the processed page data and template, and generates the final HTML response.
 */
export function renderGovcyPage() {
    return (req, res) => {
        const afterBody = {
            name: "afterBody",
            elements: [ 
                govcyResources.staticResources.elements["govcyLoadingOverlay"],
                govcyResources.staticResources.elements["govcyFormsJs"]
            ]
        };
        // Initialize the renderer
        const renderer = new govcyFrontendRenderer();
        const { processedPage } = req;
        processedPage.pageTemplate.sections.push(afterBody);
        
        //if user is logged in add the user name section in the page template
        if (dataLayer.getUser(req.session)) {
            processedPage.pageTemplate.sections.push(govcyResources.userNameSection(dataLayer.getUser(req.session).name)); // Add user name section
        }
        const html = renderer.renderFromJSON(processedPage.pageTemplate, processedPage.pageData);
        res.send(html);
    };
}