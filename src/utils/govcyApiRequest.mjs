import axios from "axios";
import { logger } from "./govcyLogger.mjs";

/**
 * Utility to handle API communication with retry logic
 * @param {string} method - HTTP method (e.g., 'post', 'get', etc.)
 * @param {string} url - API endpoint URL
 * @param {object} data - Payload for the request (optional)
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<object>} - API response
 */
export async function govcyApiRequest(method, url, data = {}, retries = 3) {
    let attempt = 0;

    while (attempt < retries) {
        try {
            logger.debug(`📤 Sending API request (Attempt ${attempt + 1})`, { method, url, data });

            const response = await axios({
                method,
                url,
                data,
                timeout: 10000, // 10 seconds timeout
            });

            logger.debug(`📥 Received API response`, { status: response.status, data: response.data });

            if (response.status !== 200) {
                throw new Error(`Unexpected HTTP status: ${response.status}`);
            }

            const { Succeeded, ErrorCode, ErrorMessage } = response.data;

            if (typeof Succeeded !== "boolean") {
                throw new Error("Invalid API response structure: Succeeded must be a boolean");
            }

            if (!Succeeded && typeof ErrorCode !== "number") {
                throw new Error("Invalid API response structure: ErrorCode must be a number when Succeeded is false");
            }

            logger.info(`✅ API call succeeded: ${url}`, response.data);
            return response.data; // Return the successful response
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