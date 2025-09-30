import { expect } from "chai";
import { govcyReviewPageHandler } from "../../src/middleware/govcyReviewPageHandler.mjs";

describe("govcyReviewPageHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { siteId: "site123" },
            csrfToken: () => "mock-csrf-token",
            session: {
                siteData: {
                    site123: {
                        inputData: {
                            "test-page": {
                                formData: {
                                    fullName: "Test User"
                                }
                            }
                        },
                        submissionErrors: null,
                        user: {
                            name: "Test User"
                        }
                    }
                }
            },
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
                    title: { el: "Fake Title", en: "Fake Title" },
                    lang: "el",
                    cdn: { dist: "/mock" }
                },
                pages: [
                    {
                        pageData: {
                            url: "test-page",
                            title: "Test Page"
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

        res = {};
        next = (err) => { if (err) throw err; };
    });

    it("1. should populate processedPage with title, summary and submit form", () => {
        const handler = govcyReviewPageHandler();
        handler(req, res, next);

        const processed = req.processedPage;
        expect(processed).to.be.an("object");
        expect(processed.pageData.pageData.title.el).to.include("Ελέγξτε τις απαντήσεις σας");

        const mainSection = processed.pageTemplate.sections.find(sec => sec.name === "main");
        expect(mainSection).to.exist;

        const elements = mainSection.elements;
        const hasSubmitForm = elements.some(el => el.element === "form");
        const hasH1 = elements.some(el => el.element === "textElement" && el.params.type === "h1");

        expect(hasSubmitForm).to.be.true;
        expect(hasH1).to.be.true;
    });

    it("2. should render error summary when submissionErrors exist", () => {
        // Add submissionErrors to session
        req.session.siteData["site123"].submissionErrors = {
        errors: {
            "test-page": {
                type: "normal",
                "test-pagefullName": {
                    id: "fullName",
                    pageUrl: "test-page",
                    message: {
                        el: "Το όνομα είναι υποχρεωτικό",
                        en: "Name is required",
                        tr: ""
                    }
                }
            }
        },
        errorSummary: []
    };

        const handler = govcyReviewPageHandler();
        handler(req, res, next);

        const processed = req.processedPage;
        expect(processed).to.be.an("object");

        const mainSection = processed.pageTemplate.sections.find(sec => sec.name === "main");
        expect(mainSection).to.exist;

        const hasErrorSummary = mainSection.elements.some(el => el.element === "errorSummary");
        expect(hasErrorSummary).to.be.true;

        const errorSummary = mainSection.elements.find(el => el.element === "errorSummary");
        expect(errorSummary.params).to.be.an("object");
        expect(errorSummary.params.errors).to.be.an("array");
        expect(errorSummary.params.errors[0].text.el).to.include("Το όνομα είναι υποχρεωτικό");
        expect(errorSummary.params.errors[0].link).to.include("/site123/test-page?route=review");
    });

});
