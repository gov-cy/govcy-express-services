/**
 * @module govcyEnvVariables
 * @fileoverview This module manages environment variables and settings for the application.
 * It loads environment variables from a .env file in non-production environments,
 * and provides functions to check the current environment and retrieve environment variables.
 */

import * as dotenv from 'dotenv';
import fs from 'fs';
import { dirname, join } from 'path';

// Load environment variables from .env file 
let envFilePath = join(process.cwd(),'secrets', '.env');
dotenv.config({ path: envFilePath });

// Load additional environment variables from .env.{{environment}} 
let configPathEnv = join(process.cwd(),'.env.' + whatsIsMyEnvironment());
if (fs.existsSync(configPathEnv)) {
    dotenv.config({ path: configPathEnv, override: false }); // don't override existing vars from secrets
}
//:todo, when loading the service, change `matomo.url` and `matomo.siteId` to the service's values
/**
 * Check if the current environment is production
 * 
 * @returns {boolean} true if the environment is production, false otherwise
 */
export function isProd() {
    // Determine environment settings
    const ENV = whatsIsMyEnvironment();
    return ENV === 'production';
}

/**
 * Check if the current environment is production or staging
 * 
 * @returns {boolean} true if the environment is production or staging, false otherwise
 */
export function isProdOrStaging() {
    // Determine environment settings
    const ENV = whatsIsMyEnvironment();
    return ENV === 'production' || ENV === 'staging';
}

/**
 * Get the value of an environment variable
 * 
 * @param {string} key The environment variable key
 * @param {string} defaultValue The default value to return if the key is not found
 * @returns The value of the environment variable or the default value
 */
export function getEnvVariable(key, defaultValue = undefined) {
    return process.env[key] || defaultValue;
}

/**
 * Get the value of an environment variable as a boolean
 * 
 * @param {string} key The environment variable key
 * @param {boolean} defaultValue The default value to return if the key is not found
 * @returns {boolean} The boolean value of the environment variable or the default value
 */
export function getEnvVariableBool(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true';
}

/**
 * Return the current environment (development, staging, production)
 * 
 * @returns {string} The current environment (development, staging, production)
 */
export function whatsIsMyEnvironment() {
    // Determine environment 
    return process.env.NODE_ENV || 'development';
}