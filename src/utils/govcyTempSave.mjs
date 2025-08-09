// utils/govcyTempSave.mjs
import { govcyApiRequest } from "./govcyApiRequest.mjs";
import { getEnvVariable, getEnvVariableBool } from "./govcyEnvVariables.mjs";
import * as dataLayer from "./govcyDataLayer.mjs";
import { logger } from "./govcyLogger.mjs";
/**
 * Temporary save of in-progress form data via configured API endpoints.
 * @param {object} store The session store
 * @param {object} service The service object
 * @param {string} siteId The site id
 */
export async function tempSaveIfConfigured(store, service, siteId) {
    // Check if temp save is configured for this service with a PUT endpoint
  const putCfg = service?.site?.submissionPutAPIEndpoint;
  if (!putCfg?.url || !putCfg?.clientKey || !putCfg?.serviceId) return;

  //Get environment variables
  const allowSelfSignedCerts = getEnvVariableBool("ALLOW_SELF_SIGNED_CERTIFICATES", false);
  const url = getEnvVariable(putCfg.url || "", false);
  const clientKey = getEnvVariable(putCfg.clientKey || "", false);
  const serviceId = getEnvVariable(putCfg.serviceId || "", false);
  const dsfGtwKey = getEnvVariable(putCfg?.dsfgtwApiKey || "", "");
  const method = (putCfg?.method || "PUT").toLowerCase();
  const user = dataLayer.getUser(store);

  // Prepare minimal temp payload (send whole inputData snapshot)
  const inputData = dataLayer.getSiteInputData(store, siteId) || {};
  const tempPayload = {
    // mirror final submission format: send stringified JSON
    submission_data: JSON.stringify(inputData)
  };

  if (!url || !clientKey) {
    logger.error("🚨 Temp save API configuration is incomplete:", { url, clientKey })
    return; // don't break UX
  } 

  try {
    // Call the API to save temp data
    const resp = await govcyApiRequest(
      method,
      url,
      tempPayload,
      true, // auth with user access token
      user,
      {
        accept: "text/plain",
        "client-key": clientKey,
        "service-id": serviceId,
        ...(dsfGtwKey !== "" && { "dsfgtw-api-key": dsfGtwKey }),
        "content-type": "application/json"
      },
      3,
      allowSelfSignedCerts
    );

    if (!resp?.Succeeded) {
      logger.warn("Temp save returned Succeeded=false", resp);
      return; // don’t break UX
    }

    logger.info("✅ Temp save successful for site:", siteId, "Response:", resp);
    // Optional: reflect any server state locally (e.g., keep referenceValue in loadData)
    if (resp?.Data) {
      dataLayer.storeSiteLoadData(store, siteId,resp.Data );
    }
  } catch (e) {
    logger.error("Temp save failed (non-blocking):", e?.message);
  }
}
