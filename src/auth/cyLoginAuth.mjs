import * as client from 'openid-client';
import { getEnvVariable } from '../utils/govcyEnvVariables.mjs';
import { logger } from "../utils/govcyLogger.mjs";


// OpenID Configuration
const issuerUrl = getEnvVariable('CYLOGIN_ISSUER_URL');
const clientId = getEnvVariable('CYLOGIN_CLIENT_ID');
const clientSecret = getEnvVariable('CYLOGIN_CLIENT_SECRET');
const scope = getEnvVariable('CYLOGIN_SCOPE');
const redirect_uri = getEnvVariable('CYLOGIN_REDIRECT_URI');

// Discover OpenID settings
const config = await client.discovery(new URL(issuerUrl), clientId, clientSecret);


/**
 * Generate login URL
 */
export async function getLoginUrl(req) {
    let code_verifier = client.randomPKCECodeVerifier();  // Generate random PKCE per request
    let code_challenge = await client.calculatePKCECodeChallenge(code_verifier); // Ensure `await` is here

    let nonce = client.randomNonce();  // Generate per request 

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
}



/**
 * Handle authorization code and exchange it for tokens
 */
export async function handleCallback(req) {
    let currentUrl = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);

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
}


/**
 * Logout and build end session URL
 */
export function getLogoutUrl(id_token_hint = '') {
    return client.buildEndSessionUrl(config, {
        post_logout_redirect_uri: getEnvVariable('CYLOGIN_POST_LOGOUR_REIDRECT_URI'),
        id_token_hint, // Send ID token if available
    }).href;
}

// Export config if needed elsewhere
export { config };
