import { expect } from "chai";
import {
    govcyMultipleThingsAddHandler,
    govcyMultipleThingsEditHandler,
    govcyMultipleThingsAddPostHandler,
    govcyMultipleThingsEditPostHandler
} from "../../src/middleware/govcyMultipleThingsItemPage.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";

describe("govcyMultipleThingsItemPage", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { siteId: "test-site", pageUrl: "academic-details", index: "0" },
            query: {},
            csrfToken: () => "12345",
            globalLang: "en",
            session: { siteData: { "test-site": { inputData: {} } } },
            serviceData: {
                site: { id: "test-site", lang: "en" },
                pages: [
                    {
                        pageData: { url: "academic-details", title: { en: "Academic details" } },
                        multipleThings: {
                            itemTitleTemplate: "{{ qualification }}",
                            min: 0,
                            max: 3,
                            listPage: { title: { en: "Your qualifications" } }
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
                                                    { element: "textElement", params: { type: "h1", text: { en: "Academic details" } } },
                                                    { element: "textInput", params: { id: "qualification", name: "qualification" } },
                                                    { element: "button", params: { prototypeNavigate: true } }
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
            redirectedTo: null,
            redirect(url) { this.redirectedTo = url; },
        };
        next = (err) => { next.called = true; next.error = err; };
        next.called = false;
    });

    it("1. should build Add item page and create draft when none exists", async () => {
        const handler = govcyMultipleThingsAddHandler();
        await handler(req, res, next);
        expect(req.processedPage).to.be.an("object");
        expect(req.processedPage.pageData.pageData.title.en).to.include("Add");
    });

    it("2. should build Edit item page for given index", async () => {
        // Simulate stored items
        req.session.siteData["test-site"].inputData["academic-details"] = {
            formData: [{ qualification: "BSc CS" }]
        };

        const handler = govcyMultipleThingsEditHandler();
        await handler(req, res, next);
        expect(req.processedPage).to.be.an("object");
        const title = req.processedPage.pageData.pageData.title.en;
        expect(title).to.include("Change");
    });

    it("3. should handle invalid index in Edit and call next(error)", async () => {
        req.params.index = "5"; // out of range
        const handler = govcyMultipleThingsEditHandler();
        await handler(req, res, next);
        expect(next.called).to.be.true;
        expect(next.error).to.be.an("error");
    });

    it("4. should add new item on POST Add", async () => {
        req.body = { qualification: "New item" };
        const handler = govcyMultipleThingsAddPostHandler();
        await handler(req, res, next);

        const data = req.session.siteData["test-site"].inputData["academic-details"].formData;
        expect(Array.isArray(data)).to.be.true;
        expect(data[0].qualification).to.equal("New item");
        expect(res.redirectedTo).to.include("/test-site/academic-details");
    });

    it("5. should enforce max limit on POST Add", async () => {
        req.body = { qualification: "Overflow" };
        req.session.siteData["test-site"].inputData["academic-details"] = {
            formData: [{}, {}, {}] // already at max 3
        };
        const handler = govcyMultipleThingsAddPostHandler();
        await handler(req, res, next);
        expect(res.redirectedTo).to.include("errorSummary");
    });

    it("6. should update existing item on POST Edit", async () => {
        req.body = { qualification: "Updated" };
        req.session.siteData["test-site"].inputData["academic-details"] = {
            formData: [{ qualification: "Old" }]
        };
        const handler = govcyMultipleThingsEditPostHandler();
        await handler(req, res, next);
        const items = req.session.siteData["test-site"].inputData["academic-details"].formData;
        expect(items[0].qualification).to.equal("Updated");
        expect(res.redirectedTo).to.include("/test-site/academic-details");
    });

    it("7. should call next(error) when edit index invalid on POST Edit", async () => {
        req.params.index = "2";
        req.session.siteData["test-site"].inputData["academic-details"] = { formData: [{ qualification: "One" }] };
        const handler = govcyMultipleThingsEditPostHandler();
        await handler(req, res, next);
        expect(next.called).to.be.true;
        expect(next.error).to.be.an("error");
    });
    it("8. should prevent adding a duplicate item", async () => {
        req.serviceData.pages[0].multipleThings.dedupe = true;
        req.body = { qualification: "Duplicate" };
        req.session.siteData["test-site"].inputData["academic-details"] = {
            formData: [{ qualification: "Duplicate" }]
        };

        const handler = govcyMultipleThingsAddPostHandler();
        await handler(req, res, next);

        // It should redirect with errorSummary instead of adding another item
        expect(res.redirectedTo).to.include("errorSummary");

        // Should still have only one item in the list
        const items = req.session.siteData["test-site"].inputData["academic-details"].formData;
        expect(items).to.have.lengthOf(1);
    });

    it("9. should preserve route=review in redirect after successful Add", async () => {
        req.query.route = "review";
        req.body = { qualification: "Review item" };

        const handler = govcyMultipleThingsAddPostHandler();
        await handler(req, res, next);

        expect(res.redirectedTo).to.include("?route=review");
    });


    it("10. should store validation errors in session when Add validation fails", async () => {
        req.serviceData.pages[0].pageTemplate.sections[0].elements[0].params.elements[1].validations = [
            {
                "check": "required",
                "params": {
                    "checkValue": "",
                    "message": {
                        "el": "Επιλέξτε τις θέσεις για τις οποίες κάνετε άιτηση",
                        "en": "... is required",
                        "tr": ""
                    }
                }
            }
        ];
        req.body = { qualification: "" }; // empty, triggers required validation
        const handler = govcyMultipleThingsAddPostHandler();
        await handler(req, res, next);

        expect(res.redirectedTo).to.include("errorSummary");

        const stored = dataLayer.getPageValidationErrors(req.session, "test-site", "academic-details", "draft");
        expect(stored).to.be.an("object");
        expect(JSON.stringify(stored)).to.include("qualification");
    });

    describe("govcyMultipleThingsAddHandler - invalid multipleThings configs", () => {
        let req, res, next, service;

        beforeEach(() => {
            req = {
                params: { siteId: "test-site", pageUrl: "academic-details" },
                globalLang: "en",
                csrfToken: () => "12345",
                session: { siteData: { "test-site": { inputData: {} } } },
                serviceData: { site: { id: "test-site", lang: "en" } }
            };
            res = {};
            next = (err) => { next.called = true; next.error = err; };
            next.called = false;
        });

        it("11. should call next(error) when multipleThings config is missing", async () => {
            // No multipleThings at all
            req.serviceData.pages = [
                { pageData: { url: "academic-details", title: { en: "Bad page" } } }
            ];

            const handler = govcyMultipleThingsAddHandler();
            await handler(req, res, next);

            expect(next.called).to.be.true;
            expect(next.error).to.be.an("error");
            expect(next.error.message).to.include("multipleThings config not found");
        });

        it("12. should call next(error) when listPage.title is missing", async () => {
            req.serviceData.pages = [
                {
                    pageData: { url: "academic-details" },
                    multipleThings: { listPage: {} } // missing title
                }
            ];

            const handler = govcyMultipleThingsAddHandler();
            await handler(req, res, next);

            expect(next.called).to.be.true;
            expect(next.error.message).to.include("listPage.title is required");
        });

        it("13. should call next(error) when itemTitleTemplate/min/max missing", async () => {
            req.serviceData.pages = [
                {
                    pageData: { url: "academic-details" },
                    multipleThings: {
                        listPage: { title: { en: "Bad Config" } }
                        // missing itemTitleTemplate/min/max
                    }
                }
            ];

            const handler = govcyMultipleThingsAddHandler();
            await handler(req, res, next);

            expect(next.called).to.be.true;
            expect(next.error.message).to.include("itemTitleTemplate, .min and .max are required");
        });
    });

    describe("govcyMultipleThingsItemPage - validation error recovery (add/edit GET)", () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                params: { siteId: "test-site", pageUrl: "academic-details", index: "0" },
                query: {},
                csrfToken: () => "12345",
                globalLang: "en",
                session: { siteData: { "test-site": { inputData: {} } } },
                serviceData: {
                    site: { id: "test-site", lang: "en" },
                    pages: [
                        {
                            pageData: { url: "academic-details", title: { en: "Academic details" } },
                            multipleThings: {
                                itemTitleTemplate: "{{ qualification }}",
                                min: 0,
                                max: 3,
                                listPage: { title: { en: "Your qualifications" } }
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
                                                        { element: "textInput", params: { id: "qualification", name: "qualification" } }
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
            next = (err) => { next.called = true; next.error = err; };
            next.called = false;
        });

        // ---------------------- ADD MODE ----------------------
        it("14. should repopulate form from stored validation errors (add mode)", async () => {
            req.originalUrl = "/apis/test-site/academic-details/multiple/add";
            const siteId = "test-site";
            const pageUrl = "academic-details";

            // simulate validationErrorsAll with key "add"
            req.session.siteData[siteId].inputData[pageUrl] = {
                validationErrors: {
                    add: {
                        formData: { qualification: "Previous invalid value" },
                        errors: { qualification: { message: { en: "Required" } } },
                        errorSummary: [{ text: "Required" }]
                    }
                }
            };

            const handler = govcyMultipleThingsAddHandler();
            await handler(req, res, next);

            expect(req.processedPage).to.be.an("object");
            const html = JSON.stringify(req.processedPage.pageTemplate.sections);
            expect(html).to.include("Previous invalid value");
            expect(html).to.include("qualification");
        });

        // ---------------------- EDIT MODE ----------------------
        it("15. should repopulate form from stored validation errors (edit mode)", async () => {
            req.originalUrl = "/apis/test-site/academic-details/multiple/edit/0";
            const siteId = "test-site";
            const pageUrl = "academic-details";

            // simulate validationErrorsAll with key "0"
            req.session.siteData[siteId].inputData[pageUrl] = {
                validationErrors: {
                    "0": {
                        formData: { qualification: "Bad Edit Value" },
                        errors: { qualification: { message: { en: "Required" } } },
                        errorSummary: [{ text: "Required" }]
                    }
                },
                formData: [{ qualification: "Good Value" }] // existing items
            };

            const handler = govcyMultipleThingsEditHandler();
            await handler(req, res, next);

            expect(req.processedPage).to.be.an("object");
            const html = JSON.stringify(req.processedPage.pageTemplate.sections);
            expect(html).to.include("Bad Edit Value");
            expect(html).to.include("qualification");
        });
    });

    describe("govcyMultipleThingsItemPage - validation error recovery (add/edit GET)", () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                params: { siteId: "test-site", pageUrl: "academic-details", index: "0" },
                query: {},
                csrfToken: () => "12345",
                globalLang: "en",
                session: { siteData: { "test-site": { inputData: {} } } },
                serviceData: {
                    site: { id: "test-site", lang: "en" },
                    pages: [
                        {
                            pageData: { url: "academic-details", title: { en: "Academic details" } },
                            multipleThings: {
                                itemTitleTemplate: "{{ qualification }}",
                                min: 0,
                                max: 3,
                                listPage: { title: { en: "Your qualifications" } }
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
                                                        { element: "textInput", params: { id: "qualification", name: "qualification" } }
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
            next = (err) => { next.called = true; next.error = err; };
            next.called = false;
        });

        // ✅ ADD MODE (key = "add")
        it("16. should repopulate form from stored validation errors (add mode)", async () => {
            req.originalUrl = "/apis/test-site/academic-details/multiple/add";
            const siteId = "test-site";
            const pageUrl = "academic-details";

            // Simulate validationErrorsAll stored under 'add'
            req.session.siteData[siteId].inputData[pageUrl] = {
                validationErrors: {
                    add: {
                        formData: { qualification: "Previous invalid value" },
                        errors: { qualification: { message: { en: "Required" } } },
                        errorSummary: [{ text: "Required" }]
                    }
                }
            };

            const handler = govcyMultipleThingsAddHandler();
            await handler(req, res, next);

            expect(req.processedPage).to.be.an("object");
            const html = JSON.stringify(req.processedPage.pageTemplate.sections);
            expect(html).to.include("Previous invalid value");
            expect(html).to.include("qualification");
        });

        // ✅ EDIT MODE (key = index)
        it("17. should repopulate form from stored validation errors (edit mode)", async () => {
            req.originalUrl = "/apis/test-site/academic-details/multiple/edit/0";
            const siteId = "test-site";
            const pageUrl = "academic-details";

            // Simulate validationErrorsAll stored under index "0"
            req.session.siteData[siteId].inputData[pageUrl] = {
                validationErrors: {
                    "0": {
                        formData: { qualification: "Bad Edit Value" },
                        errors: { qualification: { message: { en: "Required" } } },
                        errorSummary: [{ text: "Required" }]
                    }
                },
                formData: [{ qualification: "Good Value" }]
            };

            const handler = govcyMultipleThingsEditHandler();
            await handler(req, res, next);

            expect(req.processedPage).to.be.an("object");
            const html = JSON.stringify(req.processedPage.pageTemplate.sections);
            expect(html).to.include("Bad Edit Value");
            expect(html).to.include("qualification");
        });
    });


    
});

