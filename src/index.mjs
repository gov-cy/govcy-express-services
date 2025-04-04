// Import required modules
// npm link C:\Users\constantinos\Documents\code\DSF\govcy-frontend-renderer
// npm unlink @gov-cy/govcy-frontend-renderer

import express from 'express';
import session from 'express-session';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser'; // Required to read cookies
import https from 'https';
import { noCache } from "./middleware/govcyCacheControl.mjs";
import { renderGovcyPage } from "./middleware/govcyPageRender.mjs";
import { govcyPageHandler } from './middleware/govcyPageHandler.mjs';
import { govcyFormsPostHandler } from './middleware/govcyFormsPostHandler.mjs';
import { govcyReviewPostHandler } from './middleware/govcyReviewPostHandler.mjs';
import { govcyReviewPageHandler } from './middleware/govcyReviewPageHandler.mjs';
import { requestLogger } from './middleware/govcyLogger.mjs';
import { govcyCsrfMiddleware } from './middleware/govcyCsrf.mjs';
import { govcySessionData } from './middleware/govcySessionData.mjs';
import { govcyHttpErrorHandler } from './middleware/govcyHttpErrorHandler.mjs';
import { govcyLanguageMiddleware } from './middleware/govcyLanguageMiddleware.mjs';
import { requireAuth, naturalPersonPolicy,handleLoginRoute, handleSigninOidc, handleLogout } from './middleware/cyLoginAuth.mjs';
import { serviceConfigDataMiddleware } from './middleware/govcyConfigSiteData.mjs';
import { isProdOrStaging , getEnvVariable, whatsIsMyEnvironment } from './utils/govcyEnvVariables.mjs';

import fs from 'fs';

const app = express();

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));
// Construct the absolute path to local certificate files
const  certPath = join(__dirname, '..','server');

// Determine environment settings
const ENV = whatsIsMyEnvironment();
// Set port
const PORT = getEnvVariable('PORT') || 44319;
// Use HTTPS if isProdOrStaging or certificate files exist
const USE_HTTPS = isProdOrStaging() || (fs.existsSync(certPath + '.cert') && fs.existsSync(certPath + '.key'));


// Middleware
// Enable parsing of URL-encoded data (data from HTML form submissions with application/x-www-form-urlencoded encoding)
app.use(express.urlencoded({ extended: true }));
// Enable parsing of JSON request bodies
app.use(express.json());
// Enable session management
app.use(
  session({
    secret: getEnvVariable('SESSION_SECRET'), // Use environment variable or fallback for dev. To generate a secret, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`
    resave: false,  // Prevents unnecessary session updates
    saveUninitialized: false, // Don't save empty sessions
    cookie: { secure: process.env.NODE_ENV === 'production',// Secure cookies only in production
      secure: USE_HTTPS, // Secure cookies only if HTTPS is used
      httpOnly: true,   // Prevents XSS attacks
      maxAge: 3600000,  // Session expires after 1 hour
      sameSite:  'lax' // Prevents CSRF by default
    } 
  })
);
// Enable cookie parsing
app.use(cookieParser()); 
// Apply language middleware
app.use(govcyLanguageMiddleware); 
// add csrf middleware
app.use(govcyCsrfMiddleware);


// 🔒 cyLogin ----------------------------------------

// 🔒 -- ROUTE: Redirect to Login
app.get('/login', noCache, handleLoginRoute() );

// 🔒 -- ROUTE: Handle login Callback
app.get('/signin-oidc', noCache, handleSigninOidc() );

// 🔒 -- ROUTE: Handle Logout
app.get('/logout', noCache, handleLogout() );

//----------------------------------------------------------------------


// 🛠️ Debugging routes -----------------------------------------------------
// 🙍🏻‍♂️ -- ROUTE: Debugging route Protected Route
if (!isProdOrStaging()) {
  app.get('/user', requireAuth, naturalPersonPolicy, noCache, (req, res) => {
    res.send(`
      User name: ${req.session.user.name}
      <br> Sub: ${req.session.user.sub}
      <br> Profile type: ${req.session.user.profile_type}
      <br> Clinent ip: ${req.session.user.client_ip}
      <br> Unique Identifier: ${req.session.user.unique_identifier}
      <br> Email: ${req.session.user.email}
      `);
  });
}
//----------------------------------------------------------------------


// ✅ Ensures session structure exists
app.use(govcySessionData);  
// add logger middleware
app.use(requestLogger);

// Construct the absolute path to the public directory
const publicPath = join(__dirname, 'public');
// 🌐 -- ROUTE: Serve static files in the public directory. Route for `/js/`
app.use(express.static(publicPath));

// 🏠 -- ROUTE: Handle route with only siteId (/:siteId or /:siteId/)
app.get('/:siteId', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, noCache, govcyPageHandler(), renderGovcyPage());

// 👀 -- ROUTE: Add Review Page Route (BEFORE the dynamic route)
app.get('/:siteId/review',serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, noCache, govcyReviewPageHandler(), renderGovcyPage());

// 📝 -- ROUTE: Dynamic route to render pages based on siteId and pageUrl, using govcyPageHandler middleware
app.get('/:siteId/:pageUrl', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, noCache, govcyPageHandler(), renderGovcyPage());

// 📥 -- ROUTE: Handle POST requests for review page
app.post('/:siteId/review', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, noCache, govcyReviewPostHandler());

// 📥 -- ROUTE: Handle POST requests (Form Submissions) based on siteId and pageUrl, using govcyFormsPostHandler middleware
app.post('/:siteId/:pageUrl', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, noCache, govcyFormsPostHandler());


// post for /:siteId/review

// 🔹 Catch 404 errors (must be after all routes)
app.use((req, res, next) => {
  next({ status: 404, message: "Page not found" });
});

// 🔹 Centralized error handling (must be the LAST middleware)
app.use(govcyHttpErrorHandler);

// Start Server
if (USE_HTTPS) {
  const options = {
    key: fs.readFileSync(certPath + '.key'),
    cert: fs.readFileSync(certPath + '.cert'),
  };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`🔒 Server running at https://localhost:${PORT} (${ENV})`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`⚡ Server running at http://localhost:${PORT} (${ENV})`);
  });
}