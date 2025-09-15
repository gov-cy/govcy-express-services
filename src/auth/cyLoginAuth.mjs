import * as client from 'openid-client';
import { getEnvVariable } from '../utils/govcyEnvVariables.mjs';
import { logger } from "../utils/govcyLogger.mjs";

/* c8 ignore start */
// OpenID Configuration
const issuerUrl = getEnvVariable('CYLOGIN_ISSUER_URL');
const clientId = getEnvVariable('CYLOGIN_CLIENT_ID');
const clientSecret = getEnvVariable('CYLOGIN_CLIENT_SECRET');
const scope = getEnvVariable('CYLOGIN_SCOPE');
const redirect_uri = getEnvVariable('CYLOGIN_REDIRECT_URI');

// Discover OpenID settings with error handling and retry mechanism
let config = null; // Changed: Initialize config as null
async function initializeConfig() {
    try {
        config = await client.discovery(new URL(issuerUrl), clientId, clientSecret);
        logger.info('OpenID configuration successfully discovered.');
    } catch (error) {
        logger.error('Failed to discover OpenID configuration:', error);
        logger.debug('Failed to discover OpenID configuration:', issuerUrl, error)
        config = null; // Ensure config remains null if discovery fails
    }
}

// Initial attempt to load config
await initializeConfig();

// Retry mechanism to reinitialize config if it fails
setInterval(async () => {
    if (!config) {
        logger.debug('Retrying OpenID configuration discovery...');
        await initializeConfig();
    }
}, 60000); // Retry every 60 seconds (adjust as needed)

/**
 * Generate login URL
 */
export async function getLoginUrl(req) {
    try {
        if (!config) throw new Error('OpenID configuration is unavailable.');

        let code_verifier = client.randomPKCECodeVerifier();  // Generate random PKCE per request
        let code_challenge = await client.calculatePKCECodeChallenge(code_verifier); // Ensure `await` is here

        let nonce = client.randomNonce();  // Generate per request 

        logger.info('Generating login URL with code_verifier:', code_verifier);
        logger.info('Generating login URL with code_challenge:', code_challenge);
        logger.info('Generating login URL with nonce:', nonce);

        // Store these in session
        req.session.pkce = { code_verifier, nonce };

        let parameters = {
            redirect_uri,
            scope,
            code_challenge,
            code_challenge_method: getEnvVariable('CYLOGIN_CODE_CHALLENGE_METHOD'),
            nonce,
            ui_locales: req.globalLang || 'el',  // Default to 'el' if req.globalLang is not set
        };

        return client.buildAuthorizationUrl(config, parameters).href;
    } catch (error) {
        logger.error('Error generating login URL:', error.message);
        throw new Error('Unable to generate login URL at this time.');
    }
}



/**
 * Handle authorization code and exchange it for tokens
 */
export async function handleCallback(req) {
    try {
        if (!config) throw new Error('OpenID configuration is unavailable.');

        let currentUrl = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);

        logger.info('currentUrl:', currentUrl); // debug
        logger.info('Session PKCE:', req.session.pkce); // debug

        let { code_verifier, nonce } = req.session.pkce || {};  // Retrieve from session

        let tokens = await client.authorizationCodeGrant(config, currentUrl, {
            pkceCodeVerifier: code_verifier,  // Validate PKCE
            expectedNonce: nonce,  // Validate nonce
            idTokenExpected: true,
        });

        delete req.session.pkce;  // Clear PKCE data after successful login

        logger.debug('Token Endpoint Response', tokens);

        let { access_token } = tokens;
        let claims = tokens.claims();
        logger.debug('ID Token Claims', claims);

        let { sub } = claims;
        let userInfo = await client.fetchUserInfo(config, access_token, sub);
        logger.debug('UserInfo Response', userInfo);

        return { tokens, claims, userInfo };
    } catch (error) {
        logger.debug('Error processing login callback:', error);
        logger.error('Error processing login callback:', error.message);
        throw new Error('Unable to process login callback at this time.');
    }
}


/**
 * Logout and build end session URL
 */
export function getLogoutUrl(id_token_hint = '') {
    try {
        if (!config) throw new Error('OpenID configuration is unavailable.');

        return client.buildEndSessionUrl(config, {
            post_logout_redirect_uri: getEnvVariable('CYLOGIN_POST_LOGOUR_REIDRECT_URI'),
            id_token_hint, // Send ID token if available
        }).href;
    } catch (error) {
        logger.error('Error generating logout URL:', error.message);
        throw new Error('Unable to generate logout URL at this time.');
    }
}

// Export config if needed elsewhere
export { config };
/* c8 ignore end */