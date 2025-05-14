/**
 * @module govcyLoadConfigData
 * @fileoverview This module provides functions to load and manipulate configuration data for services.
 * It includes functions to load service data from JSON files, handle language settings, and check for staging environments.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { whatsIsMyEnvironment } from './govcyEnvVariables.mjs';
import { logger } from "./govcyLogger.mjs";


/**
 * Load JSON data from `/data` by siteId
 * @param {string} siteId The siteId
 * @returns {Array} services - Array of JSON data
 */
function loadConfigDataById(siteId) {
//   const __filename = fileURLToPath(import.meta.url);
//   const __dirname = path.dirname(__filename);
//   const dataPath = path.join(__dirname, '..', '..', 'data'); // Adjust if needed
  const dataPath = path.join(process.cwd(), 'data'); // Adjust if needed
  const filePath = path.join(dataPath, `${siteId}.json`);

  try {
      if (!fs.existsSync(filePath)) {
          logger.debug(`Service data for '${siteId}' not found.`);
          return null; // Return null so caller can handle 404 response
      }

      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
      logger.error(`Error loading ${siteId}.json:`, error.message);
      logger.debug(`Error loading ${siteId}.json:`, error);
      return null;
  }
}


/**
 * Load service by siteId and return a deep copy
 * 
 * @param {string} siteId The siteId
 * @param {string} lang The desired language
 * @returns {Array} services - Array of JSON data
 */
export function getServiceConfigData(siteId,lang) {
    //Load data from source
    const service = loadConfigDataById(siteId);
    if (!service) {
        const error = new Error('Service not found');
        error.status = 404;
        throw error;  // Let Express catch this
    }
    //Handle deep copy: Deep copy to avoid mutations
    let serviceCopy = JSON.parse(JSON.stringify(service));

    //Handle lang: Set language based on provided `lang` parameter
    if (Array.isArray(serviceCopy.site.languages)) {
        if (serviceCopy.site.languages.length === 1) {
            // If there's only one language, set it to that language
            serviceCopy.site.lang = serviceCopy.site.languages[0].code;
            serviceCopy.site.languages = undefined;
        } else if (serviceCopy.site.languages.some(l => l.code === lang)) {
            // If the provided lang exists in the languages array, set it
            serviceCopy.site.lang = lang;
        } else if (!serviceCopy.site.lang) {
            // Default to 'el' if no language is set
            serviceCopy.site.lang = "el";
        }
    } else if (!serviceCopy.site.lang) {
        // Default to 'el' if languages is not defined and no language is set
        serviceCopy.site.lang = "el";
    }
    
    //Handle TESTING banner: check if staging and set isTesting
    serviceCopy.site.isTesting = (whatsIsMyEnvironment() === "staging");

    // Add manifest path
    serviceCopy.site.manifest = `/${siteId}/manifest.json`;

    return serviceCopy; 
}

/**
 * Load page by pageUrl and return a deep copy
 * 
 * @param {object} service The service object containing page configurations
 * @param {string} pageUrl The page URL
 * @returns The page configuration object
 */
export function getPageConfigData(service, pageUrl) {
   
    // Find the page by pageUrl
    let page = service.pages.find(p => p.pageData.url === pageUrl);
    
    if (!page) {
        const error = new Error('Page not found');
        error.status = 404;
        throw error;  // Let Express catch this
    }
    
    return page; 
}
