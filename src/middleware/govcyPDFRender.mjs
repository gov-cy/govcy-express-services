import { govcyFrontendRenderer } from "@gov-cy/govcy-frontend-renderer";
import { generatePDF } from "../utils/govcyPdfMaker.mjs";
import { logger } from "../utils/govcyLogger.mjs";

/**
 * Middleware function to render PDFs using the GovCy Frontend Renderer.
 * This function takes the processed page data and template, and generates the final PDF response.
 */
export function govcyPDFRender() {
    return async (req, res) => {
        try {
            const renderer = new govcyFrontendRenderer();
            const { processedPage } = req;
            const html = renderer.renderFromJSON(processedPage.pageTemplate, processedPage.pageData);
            let fileName= "govcy.pdf";
            if (processedPage.fileName) {
                fileName = `${processedPage.fileName} - ${fileName}`;
            }
            const pdfBuffer = await generatePDF(html);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Length': pdfBuffer.length,
                'Content-Disposition': `attachment; filename="${fileName}"`,
            });
            res.send(pdfBuffer);
        } catch (error) {
            logger.error("Error generating PDF:", error);
            res.status(500).send('Unable to generate PDF at this time.');
        }
    };
}