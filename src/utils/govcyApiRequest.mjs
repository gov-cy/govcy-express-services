import axios from "axios";
import { logger } from "./govcyLogger.mjs";

/**
 * Utility to handle API communication with retry logic
 * @param {string} method - HTTP method (e.g., 'post', 'get', etc.)
 * @param {string} url - API endpoint URL
 * @param {object} inputData - Payload for the request (optional)
 * @param {boolean} useAccessTokenAuth - Whether to use Authorization header with Bearer token
 * @param {object} user - User object containing access_token (optional)
 * @param {object} headers - Custom headers (optional)
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {boolean} allowSelfSignedCerts - Whether to allow self-signed certificates (default: false)
 * @returns {Promise<object>} - API response
 */
export async function govcyApiRequest(
    method, 
    url, 
    inputData = {}, 
    useAccessTokenAuth = false, 
    user = null, 
    headers = {}, 
    retries = 3,
    allowSelfSignedCerts = false
) {
    let attempt = 0;

    // Clone headers to avoid mutation
    let requestHeaders = { ...headers };

    // Set authorization header if access token is provided
    if (
        useAccessTokenAuth &&
        typeof user?.access_token === "string" &&
        user.access_token.trim().length > 0
    ) {
        requestHeaders['Authorization'] = `Bearer ${user.access_token}`;
    }

    while (attempt < retries) {
        try {
            logger.debug(`📤 Sending API request (Attempt ${attempt + 1})`, { method, url, inputData, requestHeaders });

            // Build axios config
            const axiosConfig = {
                method,
                url,
                [method?.toLowerCase() === 'get' ? 'params' : 'data']: inputData,
                headers: requestHeaders,
                timeout: 10000, // 10 seconds timeout
            };

            // Add httpsAgent if NOT production to allow self-signed certificates
            // Use per-call config for self-signed certs
            if (allowSelfSignedCerts) {
                axiosConfig.httpsAgent = new (await import('https')).Agent({ rejectUnauthorized: false });
            }
            
            const response = await axios(axiosConfig);

            logger.debug(`📥 Received API response`, { status: response.status, data: response.data });

            if (response.status !== 200) {
                throw new Error(`Unexpected HTTP status: ${response.status}`);
            }
            
            // const { Succeeded, ErrorCode, ErrorMessage } = response.data;
            // Normalize to PascalCase regardless of input case
            const {
                succeeded,
                errorCode,
                errorMessage,
                data,
                informationMessage,
                Succeeded,
                ErrorCode,
                ErrorMessage,
                Data,
                InformationMessage
            } = response.data;

            const normalized = {
                Succeeded: Succeeded !== undefined ? Succeeded : succeeded,
                ErrorCode: ErrorCode !== undefined ? ErrorCode : errorCode,
                ErrorMessage: ErrorMessage !== undefined ? ErrorMessage : errorMessage,
                Data: Data !== undefined ? Data : data,
                InformationMessage: InformationMessage !== undefined ? InformationMessage : informationMessage
            };

            // Merge any extra fields (like ReceivedAuthorization, etc.)
            for (const key of Object.keys(response.data)) {
                if (!(key in normalized)) {
                    normalized[key] = response.data[key];
                }
            }

            // Validate the normalized response structure
            if (typeof normalized.Succeeded !== "boolean") {
                throw new Error("Invalid API response structure: Succeeded must be a boolean");
            }
            
            // Check if ErrorCode is a number when Succeeded is false
            if (!normalized.Succeeded && typeof normalized.ErrorCode !== "number") {
                throw new Error("Invalid API response structure: ErrorCode must be a number when Succeeded is false");
            }

            logger.info(`✅ API call succeeded: ${url}`, response.data);
            return normalized; // Return normalized to pascal case the successful response
        } catch (error) {
            attempt++;
            logger.debug(`🚨 API call failed (Attempt ${attempt})`, {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });

            if (attempt >= retries) {
                logger.error(`🚨 API call failed after ${retries} attempts: ${url}`, error.message);
                throw new Error(error.response?.data?.ErrorMessage || "API call failed after retries");
            }

            logger.info(`🔄 Retrying API request (Attempt ${attempt + 1})...`);
        }
    }
}