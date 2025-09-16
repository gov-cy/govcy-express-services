import { expect } from "chai";
import sinon from "sinon";
import { govcyFormsPostHandler } from "../../src/middleware/govcyFormsPostHandler.mjs";

describe("govcyFormsPostHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            method: "POST",
            params: {
                siteId: "test-site",
                pageUrl: "test-page"
            },
            query: {},
            session: {
                siteData: {
                    "test-site": {
                        inputData: {
                            "test-page": {
                                formData: {}
                            }
                        }
                    }
                },
                user: {
                    email: "test@example.com"
                }
            },
            body: {
                fullName: "John"
            },
            serviceData: {
                site: {
                    id: "test-site"
                },
                pages: [
                    {
                        pageData: {
                            url: "test-page",
                            nextPage: "review"
                        },
                        pageTemplate: {
                            sections: [
                                {
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
                                                                en: "Name",
                                                                el: "Όνομα"
                                                            }
                                                        }
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
            }
        };

        res = {
            redirect: (url) => {
                res._redirectedTo = url;
            }
        };

        next = (err) => {
            if (err) throw err;
        };
    });

    it("1. should redirect if page conditions evaluate to true", () => {
        // Simulate a condition that evaluates to true (skip page)
        req.serviceData.pages[0].pageData.conditions = [
            {
                expression: "true", // always true
                redirect: "other-page"
            }
        ];

        const handler = govcyFormsPostHandler();
        handler(req, res, next);

        expect(res._redirectedTo).to.include("other-page");
    });

    it("2. should return error if form definition is missing", () => {
        // Remove form element from the page
        req.serviceData.pages[0].pageTemplate.sections = [
            {
                elements: [
                    {
                        element: "textElement", // not a form
                        params: {
                            text: "No form here"
                        }
                    }
                ]
            }
        ];

        const handler = govcyFormsPostHandler();

        // Override next to capture error
        let capturedError = null;
        next = (err) => {
            capturedError = err;
        };

        handler(req, res, next);

        expect(capturedError).to.be.an("error");
        expect(capturedError.message).to.include("Form definition not found");
    });

    it("3. should return error if form validation fails", () => {
        // Ensure res.redirect is a stub
        res.redirect = sinon.stub();

        // Setup a validated input inside a form
        req.serviceData.pages[0].pageTemplate.sections = [
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
                                        label: { el: "Όνομα", en: "Name" }
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
        ];

        // Provide empty body to fail validation
        req.body = {};

        const handler = govcyFormsPostHandler();
        handler(req, res, next);

        expect(res.redirect.calledOnce, "res.redirect was not called").to.be.true;

        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("errorSummary-title");

        const errorObj =
            req.session.siteData["test-site"].inputData["test-page"].validationErrors.errors["fullName"];

        expect(errorObj).to.exist;
        expect(errorObj.message.en).to.include("Required field");
    });

    it("4. should store form data and redirect on successful POST", () => {
        // Stub redirect
        res.redirect = sinon.stub();

        // Mock body with valid data
        req.body = {
            fullName: "John Doe"
        };

        // Add a simple form with no validations
        req.serviceData.pages[0].pageTemplate.sections = [
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
                                        label: { el: "Όνομα", en: "Name" }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ];

        // Add nextPage to simulate routing
        req.serviceData.pages[0].pageData.nextPage = "next-step";

        const handler = govcyFormsPostHandler();
        handler(req, res, next);

        // ✅ Expect session to store form data
        const stored =
            req.session.siteData["test-site"].inputData["test-page"].formData.fullName;
        expect(stored).to.equal("John Doe");

        // ✅ Expect redirect to next page
        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("next-step");
    });

    it("5. should skip form save and redirect if condition evaluates to true", () => {
        // Stub redirect
        res.redirect = sinon.stub();

        // Inject a page condition that always evaluates to true (meaning: skip this page)
        req.serviceData.pages[0].pageData.conditions = [
            {
                expression: "true",
                redirect: "skip-here"
            }
        ];

        // Fill in valid body
        req.body = {
            fullName: "John Doe"
        };

        // Define a form with no validations (to isolate condition logic)
        req.serviceData.pages[0].pageTemplate.sections = [
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
                                        label: { el: "Όνομα", en: "Name" }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ];

        const handler = govcyFormsPostHandler();
        handler(req, res, next);

        // ✅ Expect redirect due to condition
        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("skip-here");

        // ✅ Expect form data was NOT stored
        const stored = req.session.siteData["test-site"].inputData["test-page"]?.formData;
        expect(stored).to.deep.equal({}); // or even .to.be.empty
    });

    it("6. should successfully store data and redirect to next page", () => {
        // Stub redirect
        res.redirect = sinon.stub();

        // Provide valid input data
        req.body = {
            fullName: "John Doe"
        };

        // Setup a form with a required field
        req.serviceData.pages[0].pageData.nextPage = "success-page";
        req.serviceData.pages[0].pageTemplate.sections = [
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
                                            en: "Full Name",
                                            el: "Ονοματεπώνυμο"
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
        ];

        const handler = govcyFormsPostHandler();
        handler(req, res, next);

        const stored = req.session.siteData["test-site"].inputData["test-page"].formData;
        expect(stored.fullName).to.equal("John Doe");

        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.equal("/test-site/success-page");
    });

    it("7. should redirect to review page when route is 'review'", () => {
        res.redirect = sinon.stub();

        // Simulate review route
        req.query.route = "review";

        // Provide valid input
        req.body = {
            fullName: "John Doe"
        };

        // Set up page with valid form and no nextPage (since we're overriding it via `review` route)
        req.serviceData.pages[0].pageData.nextPage = "this-should-be-ignored";
        req.serviceData.pages[0].pageTemplate.sections = [
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
                                            en: "Full Name",
                                            el: "Ονοματεπώνυμο"
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
        ];

        const handler = govcyFormsPostHandler();
        handler(req, res, next);

        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.equal("/test-site/review"); // This is what should happen
    });


});
