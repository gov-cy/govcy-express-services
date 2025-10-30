/**
 * @fileoverview This module provides middleware functions for authentication and authorization in an Express application.
 * It includes functions to check if a user is logged in, handle login and logout routes, and enforce natural person policy.
 * 
 * @module cyLoginAuth
 */
import { getLoginUrl, handleCallback, getLogoutUrl } from '../auth/cyLoginAuth.mjs';
import { logger } from "../utils/govcyLogger.mjs";
import { handleMiddlewareError } from "../utils/govcyUtils.mjs";
import { errorResponse } from "../utils/govcyApiResponse.mjs";
import { isApiRequest } from '../utils/govcyApiDetection.mjs';


/**
 * Middleware to check if the user is authenticated. If not, redirect to the login page.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function 
 */
export function requireAuth(req, res, next) {
    if (!req.session.user) {
        if (isApiRequest(req)) {
            const err = new Error("Unauthorized: user not authenticated");
            err.status = 401;
            return next(err);
        }

        // Store the original URL before redirecting to login
        req.session.redirectAfterLogin = req.originalUrl;
        return res.redirect('/login');
    }
    next();
}

/* c8 ignore start */

/**
 * Middleware to handle the login route. Redirects the user to the login URL.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
 */
export function handleLoginRoute() {
    return async (req, res, next) => {
        try {
            let loginUrl = await getLoginUrl(req);
            res.redirect(loginUrl);
        } catch (error) {
            next(error); // Pass any errors to Express error handler
        }
    };
}

/**
 * Middleware to handle the sign-in callback from the authentication provider.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
 */
export function handleSigninOidc() {
    return async (req, res, next) => {
        try {
            const { tokens, claims, userInfo } = await handleCallback(req);
            // Store user information in session
            req.session.user = {
                ...userInfo,
                id_token: tokens.id_token,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || null,
            };

            // Redirect to the stored URL after login or fallback to '/'
            const redirectUrl = req.session.redirectAfterLogin || '/';
            // Clean up session for redirect after login
            delete req.session.redirectAfterLogin;
            // Redirect to the stored URL
            res.redirect(redirectUrl);
        } catch (error) {
            logger.debug('Token exchange failed:', error, req);
            res.status(500).send('Authentication failed');
        }
    }
}

/**
 * Middleware to handle the logout route. Destroys the session and redirects the user to the logout URL.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
 */
export function handleLogout() {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/'); // Redirect if not logged in
        }

        const id_token_hint = req.session.user.id_token; // Retrieve ID token

        req.session.destroy(() => {
            const logoutUrl = getLogoutUrl(id_token_hint);
            res.redirect(logoutUrl);
        });
    };
}
/* c8 ignore end */


/************************************************************************/
/**
 * Middleware to enforce natural person policy. If the user is not a verified natural person, return a false.
 * 
 * @param {object} req The request object
 */
export function naturalPersonPolicy(req) {
    // https://dev.azure.com/cyprus-gov-cds/Documentation/_wiki/wikis/Documentation/42/For-Cyprus-Natural-or-Legal-person
    const { profile_type, unique_identifier } = req.session.user || {};
    // Allow only natural persons with approved profiles
    if (profile_type === 'Individual' && unique_identifier) {

        // Validate Cypriot Citizen (starts with "00" and is 10 characters long)
        if (unique_identifier.startsWith('00') && unique_identifier.length === 10) {
            return true;
        }

        // Validate Foreigner with ARN (starts with "05" and is 10 characters long)
        if (unique_identifier.startsWith('05') && unique_identifier.length === 10) {
            return true;
        }
    }

    // Deny access if validation fails
    return false;
}

/** * Middleware to enforce legal person policy. If the user is not a verified legal person, return false.
 * 
 * @param {object} req The request object
 */
export function legalPersonPolicy(req) {
    // https://dev.azure.com/cyprus-gov-cds/Documentation/_wiki/wikis/Documentation/42/For-Cyprus-Natural-or-Legal-person
    const { profile_type, legal_unique_identifier } = req.session.user || {};
    // Allow only legal persons with approved profiles
    if (profile_type === 'Organisation' && legal_unique_identifier) {
        return true;
    }

    // Deny access if validation fails
    return false;
}

const policyRegistry = {
    naturalPerson: naturalPersonPolicy,
    legalPerson: legalPersonPolicy,
};

export function cyLoginPolicy(req, res, next) {
    // Check what is allowed in the service configuration
    const allowed = req?.serviceData?.site?.cyLoginPolicies || ["naturalPerson"];

    // Check each policy in the allowed list
    for (const name of allowed) {
        const policy = policyRegistry[name];
        // Skip if the policy is not registered
        if (!policy) {
            console.warn(`🚨 Unknown policy: ${name}`);
            continue
        };

        // 🚨 Strict mode: let errors throw naturally if data is malformed
        const passed = policy(req);
        if (passed) return next();
    }

    return handleMiddlewareError(
        "🚨 Access Denied: none of the allowed CY Login policies matched.",
        403,
        next
    );
}
/************************************************************************/