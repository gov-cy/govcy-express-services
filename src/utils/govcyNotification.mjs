import axios from "axios";
import { logger } from "./govcyLogger.mjs";
import { getEnvVariable } from "./govcyEnvVariables.mjs";
import https from 'https';

/**
 * Utility to send email using the Notifications API
 * @param {string} subject - Email subject
 * @param {string} body - Email body content
 * @param {string[]} recipients - List of recipient email addresses
 * @param {string} [channel='eMail'] - Channel to use (default: 'eMail')
 * @param {Array<{ Name: string, Content: string }>} [attachments=[]] - List of attachments (optional)
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<object>} - API response
 */
export async function sendEmail(subject, body, recipients, channel = "eMail", attachments = [], retries = 3) {
//     Test	    https://dis.dev.gateway.local/DITS.CeGG.DIS.Notifications/ 
// Production	https://dis.gateway.local/DITS.CeGG.DIS.Notifications/ 
//DSF SWAGGER: https://dsf-api-dev.dmrid.gov.cy/index.html
    const url = getEnvVariable("DSF_API_GTW_NOTIFICATION_API_URL");
    let attempt = 0;

    const payload = {
        subject: subject,
        body: body,
        channel: channel,
        recipients: recipients,
        attachments: attachments,
    };

    while (attempt < retries) {
        try {
            logger.debug(`📤 Sending email (Attempt ${attempt + 1})`, { url, payload });

            const response = await axios.post(url, payload, {
                timeout: 10000, // 10 seconds timeout
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "text/plain",
                    "client-key": `${getEnvVariable("DSF_API_GTW_CLIENT_ID")}`,
                    "dsfgtw-api-key" : `${getEnvVariable("DSF_API_GTW_SECRET")}`,
                    "service-id": `${getEnvVariable("DSF_API_GTW_SERVICE_ID")}`
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
            });

            // Check if the response status is 200
            if (response.status !== 200) {
                throw new Error(`Unexpected HTTP status: ${response.status}`);
            }

            let responseData = response.data;

            // Check if the response data contains the expected structure
            const { succeeded, errorCode, errorMessage } = responseData;
            logger.debug(`📥 Received API response data`, { succeeded, errorCode, errorMessage });
            if (typeof succeeded !== "boolean") {
                throw new Error("Invalid API response structure: Succeeded must be a boolean");
            }

            if (!succeeded && typeof errorCode !== "number") {
                throw new Error("Invalid API response structure: ErrorCode must be a number when Succeeded is false");
            }

            logger.info(`✅ Email sent successfully`, responseData);
            return responseData.data; // Return the successful response
        } catch (error) {
            attempt++;
            logger.debug(`🚨 Email sending failed (Attempt ${attempt})`, {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                error: error
            });

            if (attempt >= retries) {
                logger.error(`🚨 Email sending failed after ${retries} attempts`, error.message);
                throw new Error(error.responseData?.data?.ErrorMessage || "Email sending failed after retries");
            }

            logger.info(`🔄 Retrying email sending (Attempt ${attempt + 1})...`);
        }
    }
}

