import { govcyFrontendRenderer } from "@gov-cy/govcy-frontend-renderer";

/**
 * Middleware function to render pages using the GovCy Frontend Renderer.
 * This function takes the processed page data and template, and generates the final HTML response.
 */
export function renderGovcyPage() {
    return (req, res) => {
        const renderer = new govcyFrontendRenderer();
        const { processedPage } = req;
        const html = renderer.renderFromJSON(processedPage.pageTemplate, processedPage.pageData);
        res.send(html);
    };
}