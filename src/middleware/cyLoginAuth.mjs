/**
 * @fileoverview This module provides middleware functions for authentication and authorization in an Express application.
 * It includes functions to check if a user is logged in, handle login and logout routes, and enforce natural person policy.
 * 
 * @module cyLoginAuth
 */
import { getLoginUrl, handleCallback, getLogoutUrl } from '../auth/cyLoginAuth.mjs';

/**
 * Middleware to check if the user is authenticated. If not, redirect to the login page.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function 
 */
export function requireAuth(req, res, next) {
    if (!req.session.user) {
        // Store the original URL before redirecting to login
        req.session.redirectAfterLogin = req.originalUrl;
        return res.redirect('/login');
    }
    next();
}

/**
 * Middleware to enforce natural person policy. If the user is not a natural person, return a 403 error.
 * 
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next The next middleware function
 */
export function naturalPersonPolicy(req, res, next) {
    // allow only natural persons with approved profiles
    if (req.session.user.profile_type == 'Individual' && req.session.user.unique_identifier) {
        next();
    } else {
        const error = new Error('Access Denied: natural person policy not met.');
        error.status = 403;
        return next(error);
    }
}

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
            console.error('Token exchange failed:', error);
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