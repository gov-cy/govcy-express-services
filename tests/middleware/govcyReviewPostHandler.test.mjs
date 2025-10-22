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

        // 🔍 Check redirect
        expect(res.redirectedTo).to.include("errorSummary-title");

        // 🔍 Check submissionErrors structure
        const errors = req.session.siteData["site123"].submissionErrors.errors;
        console.log("Stored validation errors:---------------------", errors);
        expect(errors).to.have.property("test-page");
        expect(errors["test-page"]).to.have.property("type", "normal");
        expect(errors["test-page"]).to.have.property("test-pagefullName");

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
        expect(submission.printFriendlyData).to.be.an("array");
    });

    it("6. should handle multipleThings hub validation errors correctly", async () => {
        // ✅ Service setup with multipleThings page
        req.serviceData.pages = [
            {
                pageData: { url: "academic-details", title: { en: "Academic Details" } },
                multipleThings: {
                    itemTitleTemplate: "{{ qualification }}",
                    min: 1, // require at least one
                    max: 5,
                    listPage: { title: { en: "Your qualifications" } }
                },
                pageTemplate: {
                    sections: [
                        {
                            name: "main",
                            elements: [
                                {
                                    element: "form",
                                    params: { elements: [] }
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        // ✅ Session: empty array (violates min requirement)
        req.session.siteData["site123"].inputData["academic-details"] = { formData: [] };

        // ✅ Env vars — ensure submission path is reachable but we trigger validation before it
        process.env.MOCK_URL = "http://localhost:3002/success";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ It should redirect to the review error summary
        expect(res.redirectedTo).to.include("errorSummary");

        // ✅ It should have stored validation errors in session
        const siteErrors = req.session.siteData["site123"].validationErrors || req.session.siteData["site123"].submissionErrors;
        expect(siteErrors).to.be.an("object");

        // ✅ The structure should match multipleThings type
        const pageErrors = siteErrors.errors || siteErrors;
        expect(pageErrors["academic-details"].type).to.equal("multipleThings");
        expect(pageErrors["academic-details"]).to.have.property("hub");
    });

    it("7. should validate updateMyDetails fields and redirect to error summary when missing", async () => {
        // ✅ Add UpdateMyDetails page configuration
        req.serviceData.pages = [
            {
                pageData: { url: "update-my-details", title: { en: "Update My Details" } },
                updateMyDetails: {
                    APIEndpoint: {
                        url: "CIVIL_REGISTRY_CONTACT_API_URL",
                        clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                        serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                    },
                    updateMyDetailsURL: "https://update-my-details.service.gov.cy",
                    scope: ["email", "mobile"],
                    topElements: []
                },
                pageTemplate: {
                    sections: [
                        {
                            name: "main",
                            elements: [
                                {
                                    element: "form",
                                    params: { elements: [] }
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        // ✅ Missing required fields
        req.session.siteData["site123"].inputData["update-my-details"] = {
            formData: {}
        };

        // ✅ Env vars for submission path
        process.env.MOCK_URL = "http://localhost:3002/success";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        
        // ✅ Add this
        req.query = {}; // <-- prevents the route undefined error
        req.csrfToken = () => "mock"; // avoid CSRF undefined function

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Expect redirect to error summary
        expect(res.redirectedTo).to.include("errorSummary");

        // ✅ Check stored errors
        const siteErrors = req.session.siteData["site123"].submissionErrors || req.session.siteData["site123"].validationErrors;
        const pageErrors = siteErrors.errors || siteErrors;
        expect(pageErrors["update-my-details"]).to.exist;
        expect(pageErrors["update-my-details"].type).to.equal("normal");
    });

    it("8. should allow successful submission when updateMyDetails fields are valid", async () => {
        // ✅ Configure same UMD page
        req.serviceData.pages = [
            {
                pageData: { url: "update-my-details", title: { en: "Update My Details" } },
                updateMyDetails: {
                    APIEndpoint: {
                        url: "CIVIL_REGISTRY_CONTACT_API_URL",
                        clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                        serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                    },
                    updateMyDetailsURL: "https://update-my-details.service.gov.cy",
                    scope: ["email", "mobile"],
                    topElements: []
                },
                pageTemplate: {
                    sections: [
                        {
                            name: "main",
                            elements: [
                                {
                                    element: "form",
                                    params: { elements: [] }
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        // ✅ Fill required fields in session
        req.session.siteData["site123"].inputData["update-my-details"] = {
            formData: {
                email: "user@example.com",
                mobile: "+35799123456"
            }
        };

        // ✅ Add this
        req.query = {}; // <-- prevents the route undefined error
        req.csrfToken = () => "mock"; // avoid CSRF undefined function

        // ✅ Env vars for submission success
        process.env.MOCK_URL = "http://localhost:3002/success";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Expect redirect to success page
        expect(res.redirectedTo).to.equal("/site123/success");

        // ✅ Submission data should include updateMyDetails
        const submission = req.session.siteData["site123"].submissionData;
        expect(submission.submissionData["update-my-details"]).to.have.property("email", "user@example.com");
    });


});
