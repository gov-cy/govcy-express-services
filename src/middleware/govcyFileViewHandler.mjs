import { getPageConfigData } from "../utils/govcyLoadConfigData.mjs";
import { evaluatePageConditions } from "../utils/govcyExpressions.mjs";
import { getEnvVariable, getEnvVariableBool } from "../utils/govcyEnvVariables.mjs";
import { ALLOWED_FILE_MIME_TYPES } from "../utils/govcyConstants.mjs";
import { govcyApiRequest } from "../utils/govcyApiRequest.mjs";
import * as dataLayer from "../utils/govcyDataLayer.mjs";
import { logger } from '../utils/govcyLogger.mjs';
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { isMagicByteValid, pageContainsFileInput } from "../utils/govcyHandleFiles.mjs";

export function govcyFileViewHandler() {
    return async (req, res, next) => {
        try {
            const { siteId, pageUrl, elementName } = req.params;

            // Detect MultipleThings modes based on URL
            let mode = "single";
            let index = null;

            if (req.originalUrl.includes("/multiple/add")) {
                mode = "multipleThingsDraft";
            } else if (req.originalUrl.includes("/multiple/edit/")) {
                mode = "multipleThingsEdit";
                index = parseInt(req.params.index, 10);
            }

            // Create a deep copy of the service to avoid modifying the original
            let serviceCopy = req.serviceData;

            // Get the download file configuration
            const downloadCfg = serviceCopy?.site?.fileDownloadAPIEndpoint;
            // Check if download file configuration is available
            if (!downloadCfg?.url || !downloadCfg?.clientKey || !downloadCfg?.serviceId) {
                return handleMiddlewareError(`File download APU configuration not found`, 404, next);
            }

            // Environment vars
            const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES", false);
            let url = getEnvVariable(downloadCfg.url || "", false);
            const clientKey = getEnvVariable(downloadCfg.clientKey || "", false);
            const serviceId = getEnvVariable(downloadCfg.serviceId || "", false);
            const dsfGtwKey = getEnvVariable(downloadCfg?.dsfgtwApiKey || "", "");
            const method = (downloadCfg?.method || "GET").toLowerCase();

            // Check if the upload API is configured correctly
            if (!url || !clientKey) {
                return handleMiddlewareError(`Missing environment variables for upload`, 404, next);
            }


            // ⤵️ Find the current page based on the URL
            const page = getPageConfigData(serviceCopy, pageUrl);

            // deep copy the page template to avoid modifying the original
            const pageTemplateCopy = JSON.parse(JSON.stringify(page.pageTemplate));

            // ----- Conditional logic comes here
            // ✅ Skip this POST handler if the page's conditions evaluate to true (redirect away)
            // const conditionResult = evaluatePageConditions(page, req.session, siteId, req);
            // if (conditionResult.result === false) {
            //     logger.debug("⛔️ Page condition evaluated to true on POST — skipping form save and redirecting:", conditionResult);
            //     return handleMiddlewareError(`Page condition evaluated to true on POST — skipping form save and redirecting`, 404, next);
            // }

            // Validate the field: Only allow delete if the page contains a fileInput with the given name
            const fileInputElement = pageContainsFileInput(pageTemplateCopy, elementName);
            if (!fileInputElement) {
                return handleMiddlewareError(`File input [${elementName}] not allowed on this page`, 404, next);
            }

            //check the reference number
            const referenceNo = dataLayer.getSiteLoadDataReferenceNumber(req.session, siteId);
            if (!referenceNo) {
                return handleMiddlewareError(`Missing submission reference number`, 404, next);
            }

            //get element data 
            let elementData;
            if (mode === "single") {
                elementData = dataLayer.getFormDataValue(req.session, siteId, pageUrl, elementName);
            } else if (mode === "multipleThingsDraft") {
                elementData = dataLayer.getMultipleDraft(req.session, siteId, pageUrl)?.[elementName];
            } else if (mode === "multipleThingsEdit") {
                const items = dataLayer.getPageData(req.session, siteId, pageUrl) || [];
                elementData = items[index]?.[elementName];
            }

            // If the element data is not found, return an error response
            if (!elementData || !elementData?.sha256 || !elementData?.fileId) {
                return handleMiddlewareError(`File input [${elementName}] data not found on this page`, 404, next);
            }

            // Construct the URL with tag being the elementName
            url += `/${encodeURIComponent(referenceNo)}/${encodeURIComponent(elementData.fileId)}/${encodeURIComponent(elementData.sha256)}`;

            // Get the user
            const user = dataLayer.getUser(req.session);
            // Perform the upload request
            const response = await govcyApiRequest(
                method,
                url,
                {},
                true,
                user,
                {
                    accept: "text/plain",
                    "client-key": clientKey,
                    "service-id": serviceId,
                    ...(dsfGtwKey !== "" && { "dsfgtw-api-key": dsfGtwKey })
                },
                3,
                allowSelfSignedCerts
            );

            // If not succeeded, handle error
            if (!response?.Succeeded) {
                return handleMiddlewareError(`fileDownloadAPIEndpoint returned succeeded false`, 500, next);
            }

            // Check if the response contains the expected data
            if (!response?.Data?.contentType || !response?.Data?.fileName || !response?.Data?.base64) {
                return handleMiddlewareError(`fileDownloadAPIEndpoint - Missing contentType, fileName or base64 in response data`, 500, next);
            }

            // Get filename
            const filename = response?.Data?.fileName || "filename";
            const fallbackFilename = asciiFallback(filename);
            const utf8Filename = encodeRFC5987(filename);

            // Decode base64 to binary
            const fileBuffer = Buffer.from(response.Data.base64, 'base64');

            // file type checks
            // 1. Check declared mimetype
            if (!ALLOWED_FILE_MIME_TYPES.includes(response?.Data?.contentType)) {
                return handleMiddlewareError(`fileDownloadAPIEndpoint - Invalid file type (MIME not allowed)`, 500, next);
            }

            // 2. Check actual file content (magic bytes) matches claimed MIME type
            if (!isMagicByteValid(fileBuffer, response?.Data?.contentType)) {
                return handleMiddlewareError(`fileDownloadAPIEndpoint - Invalid file type (magic byte mismatch)`, 500, next);
            }

            // Check if Buffer is empty
            if (!fileBuffer || fileBuffer.length === 0) {
                return handleMiddlewareError(`fileDownloadAPIEndpoint - File is empty or invalid`, 500, next);
            }
            // Send the file to the browser
            res.type(response?.Data?.contentType);
            res.setHeader(
                'Content-Disposition',
                `inline; filename="${fallbackFilename}"; filename*=UTF-8''${utf8Filename}`
            );
            res.send(fileBuffer);

        } catch (error) {
            logger.error("Error in govcyViewFileHandler middleware:", error.message);
            return next(error); // Pass the error to the next middleware
        }
    };
}

//------------------------------------------------------------------------------
// Helper functions
// rfc5987 encoding for filename*
function encodeRFC5987(str) {
    return encodeURIComponent(str)
        .replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
        .replace(/%(7C|60|5E)/g, (m, p) => '%' + p); // | ` ^
}

// ASCII fallback for old browsers
function asciiFallback(str) {
    return str
        .replace(/[^\x20-\x7E]/g, '')     // strip non-ASCII
        .replace(/[/\\?%*:|"<>]/g, '-')   // reserved chars
        .replace(/[\r\n]/g, ' ')          // drop newlines
        .replace(/"/g, "'")               // no quotes
        || 'download';
}
