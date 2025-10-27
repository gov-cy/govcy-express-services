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

    it("9. should reset custom pages after successful submission", async () => {
        // ✅ Valid form input
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "Test User"
        };

        // ✅ Add mock customPages data in session to simulate dirty state
        req.session.siteData["site123"].customPages = {
            custom1: { data: { something: "old" } }
        };

        // ✅ Mock global app with a static definition
        req.app = {
            siteData: {
                site123: {
                    customPagesDefinition: {
                        custom1: { data: { something: "default" } }
                    }
                }
            }
        };

        // ✅ Set env vars to hit the success flow
        process.env.MOCK_URL = "http://localhost:3002/success";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        // ✅ Add user info
        req.session.user = {
            email: "reset@test.com"
        };

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Should redirect to success page
        expect(res.redirectedTo).to.equal("/site123/success");

        // ✅ After submission, customPages should be reset from app definition
        const resetPageData = req.session.siteData["site123"].customPages["custom1"];
        expect(resetPageData).to.deep.equal({ data: { something: "default" } });
    });

    it("10. should skip resetCustomPages if req.app is missing", async () => {
        // ✅ Valid form input
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "NoApp User"
        };

        // ✅ Add mock customPages data in session
        req.session.siteData["site123"].customPages = {
            custom1: { data: { something: "old" } }
        };

        // ⚠️ Intentionally remove req.app
        delete req.app;

        // ✅ Set env vars for success path
        process.env.MOCK_URL = "http://localhost:3002/success";
        process.env.CLIENT_KEY = "CLIENT_KEY";
        process.env.SERVICE_ID = "SERVICE_ID";

        // ✅ Add user info
        req.session.user = { email: "noapp@test.com" };

        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Should still redirect successfully
        expect(res.redirectedTo).to.equal("/site123/success");

        // ✅ Custom pages should remain unchanged (no reset)
        expect(req.session.siteData["site123"].customPages).to.deep.equal({
            custom1: { data: { something: "old" } }
        });
    });


    it("11. should include custom page errors and redirect to review", async () => {
        // ✅ Prepare a site with valid minimal data
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "Test User"
        };

        // ✅ Add customPages with a validation error
        req.session.siteData["site123"].customPages = {
            custom1: {
                insertAfterPageUrl: "test-page",
                errors: [
                    {
                        id: "custom-error-1",
                        text: { en: "This is a custom error" },
                        pageUrl: "custom1"
                    }
                ]
            }
        };

        // ✅ Provide minimal service definition
        const service = {
            site: {
                id: "site123",
                submissionAPIEndpoint: {
                    url: "MOCK_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            },
            pages: [
                {
                    pageData: { url: "test-page" },
                    pageTemplate: { sections: [{ elements: [{ element: "form", params: { elements: [] } }] }] }
                }
            ]
        };
        req.serviceData = service;

        // ✅ Run handler
        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Should redirect to the review page (not success)
        expect(res.redirectedTo).to.contain("/site123/review");

        // ✅ Should have stored the custom validation error
        const storedErrors = req.session.siteData["site123"].submissionErrors?.errors || {};
        const hasCustomError =
            Object.values(storedErrors).some(e =>
                Object.values(e).some(field => field.message?.en === "This is a custom error")
            );

        expect(hasCustomError).to.be.true;
    });

    it("12. should skip custom page validation when there are no errors and submit successfully", async () => {
        // ✅ Prepare session with normal form data
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "Custom OK"
        };

        // ✅ Define customPages but with no errors
        req.session.siteData["site123"].customPages = {
            custom1: {
                insertAfterPageUrl: "test-page",
                errors: [] // no validation errors
            }
        };

        // ✅ Mock app definition (so resetCustomPages will run)
        req.app = {
            siteData: {
                site123: {
                    customPagesDefinition: {
                        custom1: { data: { default: "defaultValue" } }
                    }
                }
            }
        };

        // ✅ Define service
        const service = {
            site: {
                id: "site123",
                title: { en: "Test Service" },
                lang: "en",
                submissionAPIEndpoint: {
                    url: "MOCK_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            },
            pages: [
                {
                    pageData: { url: "test-page" },
                    pageTemplate: { sections: [{ elements: [{ element: "form", params: { elements: [] } }] }] }
                }
            ]
        };
        req.serviceData = service;

        // ✅ Add mock user for submission
        req.session.user = { email: "customok@test.com" };

        // ✅ Run handler
        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Expect success redirect (normal submission)
        expect(res.redirectedTo).to.equal("/site123/success");

        // ✅ Custom pages should be reset from definition
        const resetPage = req.session.siteData["site123"].customPages.custom1;
        expect(resetPage).to.deep.equal({ data: { default: "defaultValue" } });
    });

    it("13. should skip custom page validation when errors property is missing", async () => {
        // ✅ Prepare session with normal form data
        req.session.siteData["site123"].inputData["test-page"].formData = {
            fullName: "Custom OK Missing Errors"
        };

        // ✅ Define customPages but no `errors` key at all
        req.session.siteData["site123"].customPages = {
            custom1: {
                insertAfterPageUrl: "test-page"
                // no errors property
            }
        };

        // ✅ Mock app definition (so resetCustomPages will run)
        req.app = {
            siteData: {
                site123: {
                    customPagesDefinition: {
                        custom1: { data: { default: "defaultValue" } }
                    }
                }
            }
        };

        // ✅ Define service
        const service = {
            site: {
                id: "site123",
                title: { en: "Test Service" },
                lang: "en",
                submissionAPIEndpoint: {
                    url: "MOCK_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            },
            pages: [
                {
                    pageData: { url: "test-page" },
                    pageTemplate: { sections: [{ elements: [{ element: "form", params: { elements: [] } }] }] }
                }
            ]
        };
        req.serviceData = service;

        // ✅ Add mock user for submission
        req.session.user = { email: "missingerror@test.com" };

        // ✅ Run handler
        const handler = govcyReviewPostHandler();
        await handler(req, res, next);

        // ✅ Expect success redirect (normal submission)
        expect(res.redirectedTo).to.equal("/site123/success");

        // ✅ Custom pages should still reset properly
        const resetPage = req.session.siteData["site123"].customPages.custom1;
        expect(resetPage).to.deep.equal({ data: { default: "defaultValue" } });
    });



});
