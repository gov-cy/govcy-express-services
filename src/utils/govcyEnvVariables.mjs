/**
 * @module govcyEnvVariables
 * @fileoverview This module manages environment variables and settings for the application.
 * It loads environment variables from a .env file in non-production environments,
 * and provides functions to check the current environment and retrieve environment variables.
 */

import * as dotenv from 'dotenv';

// Load environment variables from .env file only in non-production environments
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
    dotenv.config();
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
 * Return the current environment (development, staging, production)
 * 
 * @returns {string} The current environment (development, staging, production)
 */
export function whatsIsMyEnvironment() {
    // Determine environment 
    return process.env.NODE_ENV || 'development';
}