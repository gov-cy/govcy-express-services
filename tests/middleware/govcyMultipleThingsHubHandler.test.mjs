import { expect } from "chai";
import { govcyMultipleThingsHubHandler } from "../../src/middleware/govcyMultipleThingsHubHandler.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";

describe("govcyMultipleThingsHubHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { siteId: "test-site", pageUrl: "academic-details" },
            query: {},
            csrfToken: () => "12345",
            session: { siteData: { "test-site": { inputData: {} } } },
            globalLang: "en"
        };
        res = {};
        next = function (err) {
            next.called = true;
            next.error = err;
        };
        next.called = false;
    });

    const makePage = (overrides = {}) => ({
        pageData: { url: "academic-details", title: { en: "Academic details" } },
        multipleThings: {
            itemTitleTemplate: "{{ qualification }}",
            min: 0,
            max: 2,
            listPage: {
                title: { en: "Your qualifications" },
                addButtonPlacement: "bottom",
                addButtonText: { en: "Add another qualification" },
                continueButtonText: { en: "Continue" },
                hasBackLink: true
            },
            ...overrides
        },
        pageTemplate: { sections: [{ name: "main", elements: [] }] }
    });

    const makeService = () => ({
        site: { id: "test-site", lang: "en" }
    });

    it("1. should build hub with table and continue button when items exist", async () => {
        req.session.siteData["test-site"].inputData["academic-details"] = {
            formData: [
                { qualification: "BSc CS" },
                { qualification: "MSc AI" }
            ]
        };

        const page = makePage();
        const service = makeService();

        await govcyMultipleThingsHubHandler(req, res, next, page, service);

        expect(req.processedPage).to.be.an("object");
        const html = JSON.stringify(req.processedPage.pageTemplate.sections);
        expect(html).to.include("multipleThingsTable");
        expect(html).to.include("Continue");
        // expect(html).to.include("Add another qualification");
        expect(next.called).to.be.true;
    });

    it("2. should include empty state inset when there are no items", async () => {
        req.session.siteData["test-site"].inputData["academic-details"] = { formData: [] };

        const page = makePage();
        const service = makeService();
        await govcyMultipleThingsHubHandler(req, res, next, page, service);

        const html = JSON.stringify(req.processedPage.pageTemplate.sections);
        expect(html).to.include("inset");
        expect(html).to.include("multipleThingsList");
    });

    it("3. should add warning and no add link when items >= max", async () => {
        req.session.siteData["test-site"].inputData["academic-details"] = {
            formData: [{ qualification: "A" }, { qualification: "B" }]
        };

        const page = makePage({ max: 2 });
        const service = makeService();
        await govcyMultipleThingsHubHandler(req, res, next, page, service);

        const html = JSON.stringify(req.processedPage.pageTemplate.sections);
        expect(html).to.include("warning");
        expect(html).to.include("max");
        expect(html).to.not.include("Add another qualification");
    });

    it("4. should prepend error summary when validation errors exist", async () => {
        const siteId = "test-site";
        const pageUrl = "academic-details";

        // session + input data
        req.session.siteData[siteId].inputData[pageUrl] = {
            formData: [],
            // 👇 This must match what the handler expects after getPageValidationErrors(..., "hub")
            validationErrors: {
                hub: {
                    errors: {
                        _global: {
                            message: { en: "Error with your qualifications" },
                            link: "#multipleThingsList",
                            pageUrl
                        }
                    },
                    formData: {},
                    errorSummary: []
                }
            }
        };

        const page = {
            pageData: { url: pageUrl, title: { en: "Academic Details" } },
            multipleThings: {
                itemTitleTemplate: "{{ qualification }}",
                min: 0,
                max: 2,
                listPage: {
                    title: { en: "Your qualifications" },
                    addButtonPlacement: "bottom",
                    addButtonText: { en: "Add another qualification" },
                    continueButtonText: { en: "Continue" },
                    hasBackLink: true
                }
            },
            pageTemplate: { sections: [{ name: "main", elements: [] }] }
        };
        const service = { site: { id: siteId, lang: "en" } };

        await govcyMultipleThingsHubHandler(req, res, next, page, service);

        expect(req.processedPage).to.be.an("object");
        const html = JSON.stringify(req.processedPage.pageTemplate.sections);
        expect(html).to.include("errorSummary");
        expect(html).to.include("Error with your qualifications");
    });


    it("5. should call next(error) when required listPage.title is missing", async () => {
        const badPage = makePage({ listPage: {} });
        const service = makeService();
        await govcyMultipleThingsHubHandler(req, res, next, badPage, service);

        expect(next.called).to.be.true;
        expect(next.error).to.be.instanceOf(Error);
    });

    it("6. should include topElements from multipleThings.listPage in the hub template", async () => {
        const siteId = "test-site";
        const pageUrl = "academic-details";

        // --- Session setup ---
        req.session.siteData[siteId].inputData[pageUrl] = { formData: [] };

        // --- Page setup with topElements ---
        const page = {
            pageData: { url: pageUrl, title: { en: "Academic Details" } },
            multipleThings: {
                itemTitleTemplate: "{{ qualification }}",
                min: 0,
                max: 3,
                listPage: {
                    title: { en: "Your qualifications" },
                    addButtonPlacement: "bottom",
                    addButtonText: { en: "Add another qualification" },
                    continueButtonText: { en: "Continue" },
                    hasBackLink: true,
                    // 👇 the line under test
                    topElements: [
                        { element: "htmlElement", params: { text: "TOP ELEMENT A" } },
                        { element: "htmlElement", params: { text: "TOP ELEMENT B" } }
                    ]
                }
            },
            pageTemplate: { sections: [{ name: "main", elements: [] }] }
        };

        const service = { site: { id: siteId, lang: "en" } };

        // --- Run handler ---
        await govcyMultipleThingsHubHandler(req, res, next, page, service);

        // --- Assertions ---
        expect(req.processedPage).to.be.an("object");
        const html = JSON.stringify(req.processedPage.pageTemplate.sections);

        // The handler should have pushed the topElements into the hub form
        expect(html).to.include("TOP ELEMENT A");
        expect(html).to.include("TOP ELEMENT B");

        // Sanity: still includes continue button (so main form built normally)
        expect(html).to.include("Continue");
    });

    

});
