import express from 'express';
import session from 'express-session';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser'; // Required to read cookies
import https from 'https';
import { requestTimer } from './middleware/govcyRequestTimer.mjs';
import { noCacheAndSecurityHeaders } from "./middleware/govcyHeadersControl.mjs";
import { renderGovcyPage } from "./middleware/govcyPageRender.mjs";
import { govcyPageHandler } from './middleware/govcyPageHandler.mjs';
import { govcyFormsPostHandler } from './middleware/govcyFormsPostHandler.mjs';
import { govcyReviewPostHandler } from './middleware/govcyReviewPostHandler.mjs';
import { govcyReviewPageHandler } from './middleware/govcyReviewPageHandler.mjs';
import { govcySuccessPageHandler } from './middleware/govcySuccessPageHandler.mjs';
import { requestLogger } from './middleware/govcyLogger.mjs';
import { govcyCsrfMiddleware } from './middleware/govcyCsrf.mjs';
import { govcySessionData } from './middleware/govcySessionData.mjs';
import { govcyHttpErrorHandler } from './middleware/govcyHttpErrorHandler.mjs';
import { govcyLanguageMiddleware } from './middleware/govcyLanguageMiddleware.mjs';
import { requireAuth, cyLoginPolicy, handleLoginRoute, handleSigninOidc, handleLogout } from './middleware/cyLoginAuth.mjs';
import { serviceConfigDataMiddleware } from './middleware/govcyConfigSiteData.mjs';
import { govcyManifestHandler } from './middleware/govcyManifestHandler.mjs';
import { govcyRoutePageHandler } from './middleware/govcyRoutePageHandler.mjs';
import { govcyServiceEligibilityHandler } from './middleware/govcyServiceEligibilityHandler.mjs';
import { govcyLoadSubmissionData } from './middleware/govcyLoadSubmissionData.mjs';
import { govcyFileUpload } from './middleware/govcyFileUpload.mjs';
import { govcyFileDeletePageHandler, govcyFileDeletePostHandler } from './middleware/govcyFileDeleteHandler.mjs';
import { govcyFileViewHandler } from './middleware/govcyFileViewHandler.mjs';
import { govcyMultipleThingsAddHandler, govcyMultipleThingsEditHandler, govcyMultipleThingsAddPostHandler, govcyMultipleThingsEditPostHandler } from './middleware/govcyMultipleThingsItemPage.mjs';
import { govcyMultipleThingsDeletePageHandler, govcyMultipleThingsDeletePostHandler } from './middleware/govcyMultipleThingsDeleteHandler.mjs';
import { govcyUpdateMyDetailsPostHandler } from './middleware/govcyUpdateMyDetails.mjs';
import { isProdOrStaging, getEnvVariable, whatsIsMyEnvironment } from './utils/govcyEnvVariables.mjs';
import { logger } from "./utils/govcyLogger.mjs";

import fs from 'fs';

export default function initializeGovCyExpressService(opts = {}) {
  const app = express();

  // Add this line before session middleware
  app.set('trust proxy', 1);

  // Get the directory name of the current module
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Construct the absolute path to local certificate files
  logger.debug('Current directory:', __dirname);
  logger.debug('Current working directory:', process.cwd());
  const certPath = join(process.cwd(), 'server');

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
      cookie: {
        secure: false, // Secure cookies only if HTTPS is used
        httpOnly: true,   // Prevents XSS attacks
        maxAge: 1800000,  // Session expires after 30 mins
        sameSite: 'lax' // Prevents CSRF by default
      }
    })
  );
  // Enable cookie parsing
  app.use(cookieParser());
  // Apply language middleware
  app.use(govcyLanguageMiddleware);
  // Add request timing middleware
  app.use(requestTimer);
  // add csrf middleware
  app.use(govcyCsrfMiddleware);
  // Enable security headers
  app.use(noCacheAndSecurityHeaders);

  // 🔒 cyLogin ----------------------------------------

  // 🔒 -- ROUTE: Redirect to Login
  app.get('/login', handleLoginRoute());

  // 🔒 -- ROUTE: Handle login Callback
  app.get('/signin-oidc', handleSigninOidc());

  // 🔒 -- ROUTE: Handle Logout
  app.get('/logout', handleLogout());

  //----------------------------------------------------------------------


  // 🛠️ Debugging routes -----------------------------------------------------
  // 🙍🏻‍♂️ -- ROUTE: Debugging route Protected Route
  // if (!isProdOrStaging()) {
  //   app.get('/user', requireAuth, cyLoginPolicy, (req, res) => {
  //     res.send(`
  //       User name: ${req.session.user.name}
  //       <br> Sub: ${req.session.user.sub}
  //       <br> Profile type: ${req.session.user.profile_type}
  //       <br> Clinent ip: ${req.session.user.client_ip}
  //       <br> Unique Identifier: ${req.session.user.unique_identifier}
  //       <br> Email: ${req.session.user.email}
  //       <br> Id Token: ${req.session.user.id_token}
  //       <br> Access Token: ${req.session.user.access_token}
  //       `);
  //   });
  // }
  //----------------------------------------------------------------------


  // ✅ Ensures session structure exists
  app.use(govcySessionData);
  // add logger middleware
  app.use(requestLogger);

  // Construct the absolute path to the public directory
  const publicPath = join(__dirname, 'public');
  // 🌐 -- ROUTE: Serve static files in the public directory. Route for `/js/`
  app.use(express.static(publicPath));

  // 🏡 -- ROUTE: handle the route `/`
  app.get('/', govcyRoutePageHandler);

  // 📝 -- ROUTE: Serve manifest.json dynamically for each site
  app.get('/:siteId/manifest.json', serviceConfigDataMiddleware, govcyManifestHandler());

  // 🗃️ -- ROUTE: Handle POST requests for file uploads for a page. 
  app.post('/apis/:siteId/:pageUrl/upload',
    serviceConfigDataMiddleware,
    requireAuth, // UNCOMMENT 
    cyLoginPolicy, // UNCOMMENT 
    govcyServiceEligibilityHandler(true), // UNCOMMENT 
    govcyFileUpload);

  // 🗃️ -- ROUTE: Handle POST requests for file uploads inside multipleThings (add)
  app.post('/apis/:siteId/:pageUrl/multiple/add/upload',
    serviceConfigDataMiddleware,
    requireAuth, // UNCOMMENT
    cyLoginPolicy, // UNCOMMENT
    govcyServiceEligibilityHandler(true), // UNCOMMENT
    govcyFileUpload
  );

  // ==========================================================
  //  Custom pages
  // ==========================================================
  /**
   * siteRoute helper:
   * Registers a route NOT under /:siteId, but injects req.params.siteId manually.
   */
  const siteRoute = (siteId, method, path, ...handlers) => {
    if (typeof app[method] !== "function") {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Middleware to manually inject the siteId param
    const injectSiteId = (req, res, next) => {
      req.params = req.params || {};
      req.params.siteId = siteId;
      next();
    };

    // Chain your standard middlewares AFTER injection
    const wrappedHandlers = [
      injectSiteId,
      serviceConfigDataMiddleware,
      requireAuth,
      cyLoginPolicy,
      govcyServiceEligibilityHandler(),
      ...handlers,
    ];

    // ✅ Register under a plain path (no /:siteId/)
    // e.g. path = "/custom" → registers "/custom" only
    app[method](path, ...wrappedHandlers);
  };

  // Allow custom routes
  if (typeof opts.beforeMount === "function") {
    opts.beforeMount({ siteRoute, app });
  }
  // ==========================================================

  // 🗃️ -- ROUTE: Handle POST requests for file uploads inside multipleThings (edit)
  app.post('/apis/:siteId/:pageUrl/multiple/edit/:index/upload',
    serviceConfigDataMiddleware,
    requireAuth, // UNCOMMENT
    cyLoginPolicy, // UNCOMMENT
    govcyServiceEligibilityHandler(true), // UNCOMMENT
    govcyFileUpload
  );

  // View (multipleThings draft)
  app.get('/:siteId/:pageUrl/multiple/add/view-file/:elementName',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyFileViewHandler());

  // ❌🗃️ -- ROUTE: Delete file during multipleThings ADD (before dynamic route)
  app.get('/:siteId/:pageUrl/multiple/add/delete-file/:elementName',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(),
    govcyLoadSubmissionData(),
    govcyFileDeletePageHandler(),
    renderGovcyPage()
  );

  // ❌🗃️ -- ROUTE: Delete file during multipleThings EDIT (before dynamic route)
  app.get('/:siteId/:pageUrl/multiple/edit/:index/delete-file/:elementName',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(),
    govcyLoadSubmissionData(),
    govcyFileDeletePageHandler(),
    renderGovcyPage()
  );


  // ❌🗃️📥 -- ROUTE: Handle POST requests for delete file in multipleThings ADD
  app.post('/:siteId/:pageUrl/multiple/add/delete-file/:elementName',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyFileDeletePostHandler()
  );

  // ❌🗃️📥 -- ROUTE: Handle POST requests for delete file in multipleThings EDIT
  app.post('/:siteId/:pageUrl/multiple/edit/:index/delete-file/:elementName',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyFileDeletePostHandler()
  );


  // View (multipleThings edit)
  app.get('/:siteId/:pageUrl/multiple/edit/:index/view-file/:elementName',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyFileViewHandler());

  // 🏠 -- ROUTE: Handle route with only siteId (/:siteId or /:siteId/)
  app.get('/:siteId', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(true), govcyLoadSubmissionData(), govcyPageHandler(), renderGovcyPage());
  
  // 👀 -- ROUTE: Add Review Page Route (BEFORE the dynamic route)
  app.get('/:siteId/review', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(), govcyLoadSubmissionData(), govcyReviewPageHandler(), renderGovcyPage());
  
  // ✅ -- ROUTE: Add Success Page Route (BEFORE the dynamic route)
  app.get('/:siteId/success', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(), govcySuccessPageHandler(), renderGovcyPage());

  // 👀🗃️ -- ROUTE: View file (BEFORE the dynamic route)
  app.get('/:siteId/:pageUrl/view-file/:elementName', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(), govcyLoadSubmissionData(), govcyFileViewHandler());

  // ❌🗃️ -- ROUTE: Delete file (BEFORE the dynamic route)
  app.get('/:siteId/:pageUrl/delete-file/:elementName', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(), govcyLoadSubmissionData(), govcyFileDeletePageHandler(), renderGovcyPage());

  // ➕ -- ROUTE: Add item page (BEFORE the generic dynamic route)
  app.get('/:siteId/:pageUrl/multiple/add',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyLoadSubmissionData(),
    govcyMultipleThingsAddHandler(),
    renderGovcyPage()
  );


  // ➕ -- ROUTE: Add item POST (BEFORE the generic POST)
  app.post('/:siteId/:pageUrl/multiple/add',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyMultipleThingsAddPostHandler()
  );

  // ✏️ -- ROUTE: Edit item page (BEFORE the generic dynamic route)
  app.get('/:siteId/:pageUrl/multiple/edit/:index',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyLoadSubmissionData(),
    govcyMultipleThingsEditHandler(),
    renderGovcyPage()
  );

  // 🗃️ -- ROUTE: Handle POST requests for multipleThings EDIT item
  app.post('/:siteId/:pageUrl/multiple/edit/:index',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyMultipleThingsEditPostHandler()
  );

  // ❌🗃️ -- ROUTE: Delete multipleThings item (BEFORE the dynamic route)
  app.get('/:siteId/:pageUrl/multiple/delete/:index',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(),
    govcyLoadSubmissionData(),
    govcyMultipleThingsDeletePageHandler(),
    renderGovcyPage()
  );

  // ❌🗃️📥 -- ROUTE: Handle POST requests for delete multipleThings item
  app.post('/:siteId/:pageUrl/multiple/delete/:index',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyMultipleThingsDeletePostHandler()
  );

  // ----- `updateMyDetails` handling

  // 🔀➡️ -- ROUTE coming from incoming update my details /:siteId/:pageUrl/update-my-details-response
  app.post('/:siteId/:pageUrl/update-my-details-response',
    serviceConfigDataMiddleware,
    requireAuth,
    cyLoginPolicy,
    govcyServiceEligibilityHandler(true),
    govcyUpdateMyDetailsPostHandler());
  // ----- `updateMyDetails` handling

  // 📝 -- ROUTE: Dynamic route to render pages based on siteId and pageUrl, using govcyPageHandler middleware
  app.get('/:siteId/:pageUrl', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(true), govcyLoadSubmissionData(), govcyPageHandler(), renderGovcyPage());

  // ❌🗃️📥 -- ROUTE: Handle POST requests for delete file
  app.post('/:siteId/:pageUrl/delete-file/:elementName', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(true), govcyFileDeletePostHandler());

  // 📥 -- ROUTE: Handle POST requests for review page. The `submit` action
  app.post('/:siteId/review', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(), govcyReviewPostHandler());

  // 👀📥 -- ROUTE: Handle POST requests (Form Submissions) based on siteId and pageUrl, using govcyFormsPostHandler middleware
  app.post('/:siteId/:pageUrl', serviceConfigDataMiddleware, requireAuth, cyLoginPolicy, govcyServiceEligibilityHandler(true), govcyFormsPostHandler());

  // post for /:siteId/review

  // 🔹 Catch 404 errors (must be after all routes)
  app.use((req, res, next) => {
    next({ status: 404, message: "Page not found" });
  });

  // 🔹 Centralized error handling (must be the LAST middleware)
  app.use(govcyHttpErrorHandler);

  let server = null;

  return {
    app,
    startServer: () => {
      // Start Server
      if (!isProdOrStaging()) {
        const options = {
          key: fs.readFileSync(certPath + '.key'),
          cert: fs.readFileSync(certPath + '.cert'),
        };
        server = https.createServer(options, app).listen(PORT, () => {
          logger.info(`🔒 Server running at https://localhost:${PORT} (${ENV})`);
        });
      } else {
        server = app.listen(PORT, () => {
          logger.info(`⚡ Server running at http://localhost:${PORT} (${ENV})`);
        });
      }
    },
    stopServer: () => {
      if (server) {
        server.close(() => {
          logger.info('Server stopped');
        });
      }
    }
  };
}
