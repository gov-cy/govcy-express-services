import initializeGovCyExpressService from '../../../src/index.mjs';
import registerAllFeaturesRoutes from './allFeaturesRoutes.mjs';

// Initialize the service with a custom beforeMount hook for test scenarios.
const service = initializeGovCyExpressService({
    beforeMount({ siteRoute, app }) {
        registerAllFeaturesRoutes({ siteRoute, app });
    }
});

// Start the server
service.startServer();
