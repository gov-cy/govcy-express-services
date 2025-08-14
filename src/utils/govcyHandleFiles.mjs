import FormData from 'form-data';
import { getPageConfigData } from "./govcyLoadConfigData.mjs";
import { evaluatePageConditions } from "./govcyExpressions.mjs";
import { getEnvVariable, getEnvVariableBool } from "./govcyEnvVariables.mjs";
import { ALLOWED_FILE_MIME_TYPES, ALLOWED_FILE_SIZE_MB } from "./govcyConstants.mjs";
import { govcyApiRequest } from "./govcyApiRequest.mjs";
import * as dataLayer from "./govcyDataLayer.mjs";
import { logger } from './govcyLogger.mjs'; 

/**
 * Handles the logic for uploading a file to the configured Upload API.
 * Does not send a response — just returns a standard object to be handled by middleware.
 *
 * @param {object} opts - Input parameters
 * @param {object} opts.service - The service config object
 * @param {object} opts.store - Session store (req.session)
 * @param {string} opts.siteId - Site ID
 * @param {string} opts.pageUrl - Page URL
 * @param {string} opts.elementName - Name of file input
 * @param {object} opts.file - File object from multer (req.file)
 * @returns {Promise<{ status: number, data?: object, errorMessage?: string }>}
 */
export async function handleFileUpload({ service, store, siteId, pageUrl, elementName, file }) {
  try {
    // Validate essentials
    // Early exit if key things are missing
    if (!file || !elementName) {
      return {
        status: 400,
        errorMessage: 'Missing file or element name'
      };
    }

    // Get the upload configuration
    const uploadCfg = service?.site?.fileUploadAPIEndpoint;
    // Check if upload configuration is available
    if (!uploadCfg?.url || !uploadCfg?.clientKey || !uploadCfg?.serviceId) {
      return {
        status: 400,
        errorMessage: 'Missing upload configuration'
      };
    }

    // Environment vars
    const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES", false);
    let url = getEnvVariable(uploadCfg.url || "", false);
    const clientKey = getEnvVariable(uploadCfg.clientKey || "", false);
    const serviceId = getEnvVariable(uploadCfg.serviceId || "", false);
    const dsfGtwKey = getEnvVariable(uploadCfg?.dsfgtwApiKey || "", "");
    const method = (uploadCfg?.method || "PUT").toLowerCase();

     // Check if the upload API is configured correctly
    if (!url || !clientKey) {
      return {
        status: 400,
        errorMessage: 'Missing environment variables for upload'
      };
    }

    // Construct the URL with tag being the elementName
    const tag = encodeURIComponent(elementName.trim());
    url += `/${tag}`;

    // Get the page configuration using utility (safely extracts the correct page)
    const page = getPageConfigData(service, pageUrl);
    // Check if the page template is valid
    if (!page?.pageTemplate) {
      return {
        status: 400,
        errorMessage: 'Invalid page configuration'
      };
    }

    // ----- Conditional logic comes here
    // Respect conditional logic: If the page is skipped due to conditions, abort
    const conditionResult = evaluatePageConditions(page, store, siteId);
    if (conditionResult.result === false) {
      return {
        status: 403,
        errorMessage: 'This page is skipped by conditional logic'
      };
    }

    // deep copy the page template to avoid modifying the original
    const pageTemplateCopy = JSON.parse(JSON.stringify(page.pageTemplate));
    // Validate the field: Only allow upload if the page contains a fileInput with the given name
    const isAllowed = pageContainsFileInput(pageTemplateCopy, elementName);
    if (!isAllowed) {
      return {
        status: 403,
        errorMessage: `File input [${elementName}] not allowed on this page`
      };
    }

    // Empty file check
    if (file.size === 0) {
      return {
        status: 400,
        errorMessage: 'Uploaded file is empty'
      };
    }

    // file type checks
    // 1. Check declared mimetype
    if (!ALLOWED_FILE_MIME_TYPES.includes(file.mimetype)) {
        return {
            status: 400,
            errorMessage: 'Invalid file type (MIME not allowed)'
        };
    }

    // 2. Check actual file content (magic bytes) matches claimed MIME type
    if (!isMagicByteValid(file.buffer, file.mimetype)) {
        return {
            status: 400,
            errorMessage: 'Invalid file type (magic byte mismatch)'
        };
    }

    // File size check
    if (file.size > ALLOWED_FILE_SIZE_MB * 1024 * 1024) {
      return {
        status: 400,
        errorMessage: 'File exceeds allowed size'
      };
    }

    // Prepare FormData
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    
    logger.debug("Prepared FormData with file:", {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });

    // Get the user
    const user = dataLayer.getUser(store);
    // Perform the upload request
    const response = await govcyApiRequest(
      method,
      url,
      form,
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
      return {
        status: 500,
        errorMessage: `${response?.ErrorCode} - ${response?.ErrorMessage} - fileUploadAPIEndpoint returned succeeded false`
      };
    }

    // Check if the response contains the expected data
    if (!response?.Data?.fileId || !response?.Data?.sha256) {
      return {
        status: 500,
        errorMessage: 'Missing fileId or sha256 in response'
      };
    }

    // ✅ Success
    logger.debug("File upload successful", response.Data);
    logger.info(`File uploaded successfully for element ${elementName} on page ${pageUrl} for site ${siteId}`);
    return {
      status: 200,
      data: {
        sha: response.Data.sha256,
        filename: response.Data.fileName || '',
        fileId: response.Data.fileId,
        mimeType: response.Data.contentType || '',
        sha256: response.Data.fileSize || ''
      }
    };

  } catch (err) {
    return {
      status: 500,
      errorMessage: 'Upload failed' + (err.message ? `: ${err.message}` : ''),
    };
  }
}

//--------------------------------------------------------------------------
// Helper Functions
/**
 * Recursively checks whether any element (or its children) is a fileInput
 * with the matching elementName.
 *
 * Supports:
 * - Top-level fileInput
 * - Nested `params.elements` (used in groups, conditionals, etc.)
 * - Conditional radios/checkboxes with `items[].conditionalElements`
 * 
 * @param {Array} elements - The array of elements to search
 * @param {string} targetName - The name of the file input to check
 * @returns {boolean} True if a matching fileInput is found, false otherwise
 */
function containsFileInput(elements = [], targetName) {
  for (const el of elements) {
    // ✅ Direct file input match
    if (el.element === 'fileInput' && el.params?.name === targetName) {
      return true;
    }
    // 🔁 Recurse into nested elements (e.g. groups, conditionals)
    if (Array.isArray(el?.params?.elements)) {
      if (containsFileInput(el.params.elements, targetName)) return true;
    }

    // 🎯 Special case: conditional radios/checkboxes
    if (
      (el.element === 'radios' || el.element === 'checkboxes') &&
      Array.isArray(el?.params?.items)
    ) {
      for (const item of el.params.items) {
        if (Array.isArray(item?.conditionalElements)) {
          if (containsFileInput(item.conditionalElements, targetName)) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Checks whether the specified page contains a valid fileInput for this element ID
 * under any <form> element in its sections
 * 
 * @param {object} pageTemplate The page template object
 * @param {string} elementName The name of the element to check
 * @return {boolean} True if a fileInput exists, false otherwise
 */
function pageContainsFileInput(pageTemplate, elementName) {
  const sections = pageTemplate?.sections || [];
  return sections.some(section =>
    section?.elements?.some(el =>
      el.element === 'form' &&
      containsFileInput(el.params?.elements, elementName)
    )
  );
}

/**
 * Validates magic bytes against expected mimetype
 * @param {Buffer} buffer 
 * @param {string} mimetype 
 * @returns {boolean}
 */
function isMagicByteValid(buffer, mimetype) {
  const signatures = {
    'application/pdf':      [0x25, 0x50, 0x44, 0x46],                // %PDF
    'image/png':            [0x89, 0x50, 0x4E, 0x47],                // PNG
    'image/jpeg':           [0xFF, 0xD8, 0xFF],                      // JPG/JPEG
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // DOCX
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04],       // XLSX
  };

  const expected = signatures[mimetype];
  if (!expected) return false; // unknown type

  const actual = Array.from(buffer.slice(0, expected.length));
  return expected.every((byte, i) => actual[i] === byte);
}
