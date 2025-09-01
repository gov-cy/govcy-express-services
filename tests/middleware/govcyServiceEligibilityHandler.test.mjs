import { expect } from "chai";
import { govcyServiceEligibilityHandler } from "../../src/middleware/govcyServiceEligibilityHandler.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";


describe("govcyServiceEligibilityHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { siteId: "site123", pageUrl: "info" },
            serviceData: {
                site: {
                    eligibilityAPIEndpoints: []
                },
                pages: [
                    {
                        pageData: { url: "info" },
                        pageTemplate: {
                            sections: [
                                {
                                    name: "main",
                                    elements: [
                                        {
                                            element: "textElement", // ❌ no form element
                                            params: { text: "This is info only." }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            },
            session: {
                siteData: {
                    site123: {}
                }
            }
        };

        res = {};
        next = () => {
            req._nextCalled = true;
        };
    });

    it("1. should skip eligibility check if checkForForm is true and no form present", async () => {
        const handler = govcyServiceEligibilityHandler(true); // 👈 checkForForm = true
        await handler(req, res, next);

        expect(req._nextCalled).to.be.true;
    });

    it("2. should skip eligibility check if no eligibilityAPIEndpoints are defined", async () => {
        req.params.pageUrl = "form-page";
        req.serviceData.pages[0].pageData.url = "form-page";
        req.serviceData.pages[0].pageTemplate.sections[0].elements = [
            {
                element: "form",
                params: { elements: [] }
            }
        ];
        req.serviceData.site.eligibilityAPIEndpoints = []; // ❌ no endpoints

        const handler = govcyServiceEligibilityHandler(true); // still checking for form
        await handler(req, res, () => {
            req._nextCalled = true;
        });

        expect(req._nextCalled).to.be.true;
    });

    it("3. should return error if eligibility endpoint URL is missing", async () => {
        // Simulate a form page
        req.params.pageUrl = "form-page";
        req.serviceData.pages[0].pageData.url = "form-page";
        req.serviceData.pages[0].pageTemplate.sections[0].elements = [
            {
                element: "form",
                params: { elements: [] }
            }
        ];

        // Endpoint config is missing URL
        req.serviceData.site.eligibilityAPIEndpoints = [
            {
                clientKey: "KEY",
                serviceId: "SERVICE"
                // ❌ missing URL
            }
        ];

        const handler = govcyServiceEligibilityHandler(true);
        await handler(req, res, (err) => {
            req._capturedError = err;
        });

        expect(req._capturedError).to.be.an("error");
        expect(req._capturedError.message).to.include("eligibility API endpoint URL is missing");
    });

    it("4. should return error if eligibility endpoint clientKey is missing", async () => {
        // Mock required env var for the URL to resolve
        process.env.MOCK_URL = "http://localhost:3002/mock";

        req.params.pageUrl = "form-page";
        req.serviceData.pages[0].pageData.url = "form-page";
        req.serviceData.pages[0].pageTemplate.sections[0].elements = [
            {
                element: "form",
                params: { elements: [] }
            }
        ];

        req.serviceData.site.eligibilityAPIEndpoints = [
            {
                url: "MOCK_URL",
                serviceId: "SERVICE_ID"
                // ❌ missing clientKey
            }
        ];

        const handler = govcyServiceEligibilityHandler(true);
        await handler(req, res, (err) => {
            req._capturedError = err;
        });

        expect(req._capturedError).to.be.an("error");
        expect(req._capturedError.message).to.include("eligibility API clientKey is missing");
    });

    it("5. should return error if eligibility endpoint serviceId is missing", async () => {
        // Mock required env vars
        process.env.MOCK_URL = "http://localhost:3002/mock";
        process.env.CLIENT_KEY = "CLIENT_KEY";

        req.params.pageUrl = "form-page";
        req.serviceData.pages[0].pageData.url = "form-page";
        req.serviceData.pages[0].pageTemplate.sections[0].elements = [
            {
                element: "form",
                params: { elements: [] }
            }
        ];

        req.serviceData.site.eligibilityAPIEndpoints = [
            {
                url: "MOCK_URL",
                clientKey: "CLIENT_KEY"
                // ❌ missing serviceId
            }
        ];

        const handler = govcyServiceEligibilityHandler(true);
        await handler(req, res, (err) => {
            req._capturedError = err;
        });

        expect(req._capturedError).to.be.an("error");
        expect(req._capturedError.message).to.include("eligibility API serviceId is missing");
    });

    it("6. should redirect to error page if API returns Succeeded: false with known error code", async () => {
        // ✅ Mock environment vars
        process.env.MOCK_URL = "http://localhost:3002/error102";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        res = {
            redirect: (url) => {
                res.redirectedTo = url;
            }
        };

        req.params.pageUrl = "form-page";
        req.serviceData.pages[0].pageData.url = "form-page";
        req.serviceData.pages[0].pageTemplate.sections[0].elements = [
            {
                element: "form",
                params: { elements: [] }
            }
        ];

        req.serviceData.site.eligibilityAPIEndpoints = [
            {
                url: "MOCK_URL",
                clientKey: "CLIENT_KEY",
                serviceId: "SERVICE_ID",
                response: {
                    errorResponse: {
                        "102": {
                            page: "/custom-error-page"
                        }
                    }
                }
            }
        ];

        const handler = govcyServiceEligibilityHandler(true);
        await handler(req, res, next);

        expect(res.redirectedTo).to.equal("/custom-error-page");
    });

    it("7. should call next with 403 if API fails and no custom error page is configured", async () => {
        // ✅ Set up environment variables
        process.env.MOCK_URL = "http://localhost:3002/error999"; // Your mock should return Succeeded: false, ErrorCode: 999
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        res = {
            redirect: (url) => {
                res.redirectedTo = url;
            }
        };

        req.params.pageUrl = "form-page";
        req.serviceData.pages[0].pageData.url = "form-page";
        req.serviceData.pages[0].pageTemplate.sections[0].elements = [
            {
                element: "form",
                params: { elements: [] }
            }
        ];

        req.serviceData.site.eligibilityAPIEndpoints = [
            {
                url: "MOCK_URL",
                clientKey: "CLIENT_KEY",
                serviceId: "SERVICE_ID"
                // ❌ No response.errorResponse defined
            }
        ];

        let errorCaught = null;
        next = (err) => {
            errorCaught = err;
        };

        const handler = govcyServiceEligibilityHandler(true);
        await handler(req, res, next);

        expect(errorCaught).to.be.an("error");
        expect(errorCaught.message).to.include("Bad request"); // ✅ Matches the actual message


    });


    it("8. should use cached eligibility result and skip API call", async () => {
        // Set up the eligibility endpoint
        req.serviceData.site.eligibilityAPIEndpoints = [
            {
                url: "MOCK_ELIGIBILITY_URL",
                clientKey: "CLIENT_KEY",
                serviceId: "SERVICE_ID",
                cashingTimeoutMinutes: 10
            }
        ];

        // Store cached result using the real function
        dataLayer.storeSiteEligibilityResult(req.session, "site123", "MOCK_ELIGIBILITY_URL", {
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: {}
        });

        const handler = govcyServiceEligibilityHandler();
        await handler(req, res, next);

        expect(req._nextCalled).to.be.true;

    });


    it("9. should ignore expired cache and call API again", async () => {
        req.serviceData.site.eligibilityAPIEndpoints = [
            {
                url: "MOCK_ELIGIBILITY_URL",
                clientKey: "CLIENT_KEY",
                serviceId: "SERVICE_ID",
                cashingTimeoutMinutes: 0.0001, // short expiry
            }
        ];

        const siteId = "site123";
        const endpointKey = "MOCK_ELIGIBILITY_URL";

        // Store an old cached value (timestamp too far in past)
        req.session.siteData[siteId].eligibilityResults = {
            [endpointKey]: {
                response: {
                    Succeeded: true,
                    ErrorCode: 0,
                    ErrorMessage: null,
                    Data: {}
                },
                timestamp: Date.now() - 999999 // very old
            }
        };

        // Track if next was called
        req._nextCalled = false;
        next = () => {
            req._nextCalled = true;
        };

        // You can observe console logs or API logs here to confirm call is made
        const handler = govcyServiceEligibilityHandler();
        await handler(req, res, next);

        expect(req._nextCalled).to.be.true;

        // ✅ Optionally check that new response is stored in session
        expect(req.session.siteData[siteId].eligibilityResults[endpointKey].response.Succeeded).to.be.true;
    });




});
