import { expect } from "chai";
import { govcyReviewPostHandler } from "../../src/middleware/govcyReviewPostHandler.mjs";

describe("govcyReviewPostHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                siteId: "site123"
            },
            originalUrl: "/site123/review",
            serviceData: {
                site: {
                    id: "site123",
                    languages: [
                        {
                            code: "el",
                            label: "EL",
                            alt: "Ελληνική γλώσσα",
                            href: "?lang=el"
                        },
                        {
                            code: "en",
                            label: "EN",
                            alt: "English language",
                            href: "?lang=en"
                        }
                    ],
                    submissionAPIEndpoint: {
                        url: "MOCK_URL",
                        clientKey: "CLIENT_KEY",
                        serviceId: "SERVICE_ID"
                    },
                    title: { el: "Fake Title" },
                    lang: "el"
                },
                pages: [
                    {
                        pageData: {
                            url: "test-page",
                            title: "Test Page",
                            title: {
                                el: "Δοκιμαστική Σελίδα",
                                en: "Test Page"
                            },
                            layout: "layouts/govcyBase.njk",
                            mainLayout: "two-third",
                            nextPage: "review"
                        },
                        pageTemplate: {
                            sections: [
                                {
                                    name: "main",
                                    elements: [
                                        {
                                            element: "form",
                                            params: {
                                                elements: [
                                                    {
                                                        element: "textInput",
                                                        params: {
                                                            id: "fullName",
                                                            name: "fullName",
                                                            label: {
                                                                el: "Όνομα",
                                                                en: "Name"
                                                            }
                                                        },
                                                        validations: [
                                                            {
                                                                check: "required",
                                                                params: {
                                                                    checkValue: "",
                                                                    message: {
                                                                        el: "Υποχρεωτικό πεδίο",
                                                                        en: "Required field"
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
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
                    site123: {
                        inputData: {
                            "test-page": {
                                formData: {} // ❌ Missing required field
                            }
                        }
                    }
                },
                user: {
                    email: "test@example.com"
                }
            }
        };

        res = {
            redirect: (url) => {
                res.redirectedTo = url;
            }
        };

        next = (err) => {
            throw err;
        };
    });

    it("1. should return error when submission env vars are missing", async () => {
        // Remove endpoint config from serviceData
        req.serviceData.site.submissionAPIEndpoint = {}; // 👈 Simulate missing config
        //remove validations to reach that part of the code
        req.serviceData.pages[0].pageTemplate.sections[0].elements[0].params.elements[0].validations = [];

        const handler = govcyReviewPostHandler();
        let errorCaught = null;

        // Override next to capture error
        next = (err) => {
            errorCaught = err;
        };

        await handler(req, res, next);

        expect(errorCaught).to.be.an("error");
        expect(errorCaught.message).to.include("Submission API endpoint URL is missing");
    });

    it("2. should return validation error and redirect to error summary", async () => {
        // Add the env vars so we pass that check
        process.env.MOCK_URL = "http://localhost:3002/success"; // ensure getEnvVariable resolves
        process.env.CLIENT_KEY = "CLIENT_KEY"; // ensure getEnvVariable resolves
        process.env.SERVICE_ID = "SERVICE_ID"; // ensure getEnvVariable resolves

        // Simulate a required input but leave session data empty
        req.session.siteData["site123"].inputData["test-page"].formData = {}; // missing required field

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        expect(res.redirectedTo).to.include("errorSummary-title");
        expect(req.session.siteData["site123"].submissionErrors.errors).to.have.property("test-pagefullName");
    });

    it("3. should return error if submission API returns unknown error code", async () => {
        // ✅ Fill required form field so validation passes
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "Test User"
        };

        // ✅ Add env vars (simulate injected endpoint)
        process.env.MOCK_URL = "http://localhost:3002/error102"; // ensure getEnvVariable resolves
        process.env.CLIENT_KEY = "CLIENT_KEY"; // ensure getEnvVariable resolves
        process.env.SERVICE_ID = "SERVICE_ID"; // ensure getEnvVariable resolves

        // ✅ Mock govcyApiRequest by setting a known bad endpoint in MOCK_API
        const handler = govcyReviewPostHandler();

        let errorCaught = null;
        next = (err) => {
            errorCaught = err;
        };

        await handler(req, res, next);

        expect(errorCaught).to.be.an("error");
        expect(errorCaught.message).to.include("Unknown error code received from API");
    });

    it("4. should redirect to known error page if API returns known error code", async () => {
        // ✅ Populate required field so validation passes
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "Test User"
        };

        // ✅ Set env vars
        process.env.MOCK_URL = "http://localhost:3002/error102";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        // ✅ Add error mapping in config
        req.serviceData.site.submissionAPIEndpoint.response = {
            errorResponse: {
                102: { page: "/some-error-page" }
            }
        };

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        expect(res.redirectedTo).to.equal("/some-error-page");
    });

    it("5. should store submission data and redirect to success page on successful API response", async () => {
        // ✅ Valid form input
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "Test User"
        };

        // ✅ Set env vars
        process.env.MOCK_URL = "http://localhost:3002/success";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        // 👤 Add mock user email (for sending email)
        req.session.user = {
            email: "test@example.com"
        };

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Assert redirection to success page
        expect(res.redirectedTo).to.equal("/site123/success");

        // ✅ Assert submission data was stored
        const submission = req.session.siteData["site123"].submissionData;
        expect(submission).to.have.property("referenceNumber");
        expect(submission.print_friendly_data).to.be.an("array");
    });


});
