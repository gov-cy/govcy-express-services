import multer from 'multer';
import { logger } from '../utils/govcyLogger.mjs';
import { successResponse, errorResponse } from '../utils/govcyApiResponse.mjs';
import { ALLOWED_MULTER_FILE_SIZE_MB } from "../utils/govcyConstants.mjs";
import { handleFileUpload } from "../utils/govcyHandleFiles.mjs";

/* c8 ignore start */
// Configure multer to store the file in memory (not disk) and limit the size to 10MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: ALLOWED_MULTER_FILE_SIZE_MB * 1024 * 1024 } // 10MB
});




export const govcyFileUpload = [
    upload.single('file'), // multer parses the uploaded file and stores it in req.file

    async function govcyUploadHandler(req, res) {
        let mode = "single";
        let index = null;

        // Detect MultipleThings modes based on URL
        if (req.originalUrl.includes("/multiple/add")) {
            mode = "multipleThingsDraft";
        } else if (req.originalUrl.includes("/multiple/edit/")) {
            mode = "multipleThingsEdit";
            index = parseInt(req.params.index, 10);
        }

        const result = await handleFileUpload({
            service: req.serviceData,
            store: req.session,
            siteId: req.params.siteId,
            pageUrl: req.params.pageUrl,
            elementName: req.body?.elementName,
            file: req.file,
            mode,
            index
        });

        if (result.status !== 200) {
            logger.error("Upload failed", result);
            return res.status(result.status).json(errorResponse(result.dataStatus, result.errorMessage || 'File upload failed'));
        }

        return res.json(successResponse(result.data));
    }
];
/* c8 ignore end */