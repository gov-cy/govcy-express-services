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
import { govcyPDFRender } from './middleware/govcyPDFRender.mjs';
import { govcyFormsPostHandler } from './middleware/govcyFormsPostHandler.mjs';
import { govcyReviewPostHandler } from './middleware/govcyReviewPostHandler.mjs';
import { govcyReviewPageHandler } from './middleware/govcyReviewPageHandler.mjs';
import { govcySuccessPageHandler } from './middleware/govcySuccessPageHandler.mjs';
import { requestLogger } from './middleware/govcyLogger.mjs';
import { govcyCsrfMiddleware } from './middleware/govcyCsrf.mjs';
import { govcySessionData } from './middleware/govcySessionData.mjs';
import { govcyHttpErrorHandler } from './middleware/govcyHttpErrorHandler.mjs';
import { govcyLanguageMiddleware } from './middleware/govcyLanguageMiddleware.mjs';
import { requireAuth, naturalPersonPolicy,handleLoginRoute, handleSigninOidc, handleLogout } from './middleware/cyLoginAuth.mjs';
import { serviceConfigDataMiddleware } from './middleware/govcyConfigSiteData.mjs';
import { govcyManifestHandler } from './middleware/govcyManifestHandler.mjs';
import { govcyRoutePageHandler } from './middleware/govcyRoutePageHandler.mjs';
import { govcyServiceEligibilityHandler } from './middleware/govcyServiceEligibilityHandler.mjs';
import { govcyLoadSubmissionData } from './middleware/govcyLoadSubmissionData.mjs';
import { govcyUploadMiddleware } from './middleware/govcyUpload.mjs';
import { govcyDeleteFilePageHandler, govcyDeleteFilePostHandler } from './middleware/govcyDeleteFileHandler.mjs';
import { isProdOrStaging , getEnvVariable, whatsIsMyEnvironment } from './utils/govcyEnvVariables.mjs';
import { logger } from "./utils/govcyLogger.mjs";

import fs from 'fs';

export default function initializeGovCyExpressService(){
  const app = express();

  // Add this line before session middleware
  app.set('trust proxy', 1);
  
  // Get the directory name of the current module
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Construct the absolute path to local certificate files
  logger.debug('Current directory:', __dirname);
  logger.debug('Current working directory:', process.cwd());
  const  certPath = join(process.cwd(),'server');
  
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
        sameSite:  'lax' // Prevents CSRF by default
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
  app.get('/login', handleLoginRoute() );
  
  // 🔒 -- ROUTE: Handle login Callback
  app.get('/signin-oidc', handleSigninOidc() );
  
  // 🔒 -- ROUTE: Handle Logout
  app.get('/logout', handleLogout() );
  
  //----------------------------------------------------------------------
  
  
  // 🛠️ Debugging routes -----------------------------------------------------
  // 🙍🏻‍♂️ -- ROUTE: Debugging route Protected Route
  if (!isProdOrStaging()) {
    app.get('/user', requireAuth, naturalPersonPolicy, (req, res) => {
      res.send(`
        User name: ${req.session.user.name}
        <br> Sub: ${req.session.user.sub}
        <br> Profile type: ${req.session.user.profile_type}
        <br> Clinent ip: ${req.session.user.client_ip}
        <br> Unique Identifier: ${req.session.user.unique_identifier}
        <br> Email: ${req.session.user.email}
        <br> Id Token: ${req.session.user.id_token}
        <br> Access Token: ${req.session.user.access_token}
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
  
  // 🏡 -- ROUTE: handle the route `/`
   app.get('/', govcyRoutePageHandler);

  // 📝 -- ROUTE: Serve manifest.json dynamically for each site
  app.get('/:siteId/manifest.json', serviceConfigDataMiddleware, govcyManifestHandler());

  // 🗃️ -- ROUTE: Handle POST requests for file uploads for a page. 
  app.post('/apis/:siteId/:pageUrl/upload', 
    serviceConfigDataMiddleware, 
    requireAuth, // UNCOMMENT 
    naturalPersonPolicy, // UNCOMMENT 
    govcyServiceEligibilityHandler(true), // UNCOMMENT 
    govcyUploadMiddleware);
  
  // 🏠 -- ROUTE: Handle route with only siteId (/:siteId or /:siteId/)
  app.get('/:siteId', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(true),govcyLoadSubmissionData(),govcyPageHandler(), renderGovcyPage());
  
  // 👀 -- ROUTE: Add Review Page Route (BEFORE the dynamic route)
  app.get('/:siteId/review',serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(),govcyLoadSubmissionData(), govcyReviewPageHandler(), renderGovcyPage());
  
  // ✅📄 -- ROUTE: Add Success PDF Route (BEFORE the dynamic route)
  app.get('/:siteId/success/pdf',serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(), govcySuccessPageHandler(true), govcyPDFRender());
  
  // ✅ -- ROUTE: Add Success Page Route (BEFORE the dynamic route)
  app.get('/:siteId/success',serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(), govcySuccessPageHandler(), renderGovcyPage());
  
  // ❌🗃️ -- ROUTE: Delete file (BEFORE the dynamic route)
  app.get('/:siteId/:pageUrl/:elementName/delete-file', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(), govcyLoadSubmissionData(), govcyDeleteFilePageHandler(), renderGovcyPage());
  
  // 📝 -- ROUTE: Dynamic route to render pages based on siteId and pageUrl, using govcyPageHandler middleware
  app.get('/:siteId/:pageUrl', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(true), govcyLoadSubmissionData(), govcyPageHandler(), renderGovcyPage());
  
  // ❌🗃️📥 -- ROUTE: Handle POST requests for delete file
  app.post('/:siteId/:pageUrl/:elementName/delete-file', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(true), govcyDeleteFilePostHandler());
  
  // 📥 -- ROUTE: Handle POST requests for review page. The `submit` action
  app.post('/:siteId/review', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(), govcyReviewPostHandler());
  
  // 👀📥 -- ROUTE: Handle POST requests (Form Submissions) based on siteId and pageUrl, using govcyFormsPostHandler middleware
  app.post('/:siteId/:pageUrl', serviceConfigDataMiddleware, requireAuth, naturalPersonPolicy, govcyServiceEligibilityHandler(true), govcyFormsPostHandler());
  
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
