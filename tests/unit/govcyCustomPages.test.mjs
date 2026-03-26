import { expect } from "chai";
import * as govcyCustomPages from "../../src/utils/govcyCustomPages.mjs";

describe("govcyCustomPages", () => {

    it("1. should define a new custom page with all core properties", () => {
        const store = {};
        const siteId = "mysite";
        const pageUrl = "/custom-page";
        const pageTitle = { en: "Custom Page", el: "Προσαρμοσμένη Σελίδα" };
        const insertAfterPageUrl = "previous-page";
        const errors = [
            { id: "err1", text: { en: "Error one" } },
            { id: "err2", text: { en: "Error two" } }
        ];
        const summaryElements = [
            { key: { en: "Extra" }, value: [] }
        ];
        const summaryHtml = { en: "<p>Summary HTML</p>" };
        const extraProps = { nextPage: "confirm" };

        govcyCustomPages.defineCustomPages(
            store,
            siteId,
            pageUrl,
            pageTitle,
            insertAfterPageUrl,
            errors,
            summaryElements,
            summaryHtml,
            "NOT_STARTED",
            extraProps
        );

        const defined = store.siteData[siteId].customPagesDefinition[pageUrl];

        // ✅ Structure check
        expect(defined).to.include.all.keys(
            "pageTitle",
            "insertAfterPageUrl",
            "summaryElements",
            "errors",
            "summaryActions"
        );

        // ✅ Error normalization: pageUrl should be added without "/"
        expect(defined.errors[0].pageUrl).to.equal("custom-page");

        // ✅ Summary actions generated correctly
        expect(defined.summaryActions[0].href).to.include("/custom-page?route=review");

        // ✅ Extra property merged
        expect(defined.nextPage).to.equal("confirm");

        // ✅ HTML preserved
        expect(defined.summaryHtml).to.deep.equal(summaryHtml);
    });

    it("2. should return custom page definition if exists, otherwise empty object", () => {
        const store = {
            siteData: {
                mysite: {
                    customPagesDefinition: {
                        "/custom-page": { pageTitle: { en: "Custom Page" } }
                    }
                }
            }
        };

        // ✅ Existing definition
        const result1 = govcyCustomPages.getCustomPageDefinition(store, "mysite", "/custom-page");
        expect(result1).to.deep.equal({ pageTitle: { en: "Custom Page" } });

        // ❌ Non-existent definition
        const result2 = govcyCustomPages.getCustomPageDefinition(store, "mysite", "/missing-page");
        expect(result2).to.deep.equal({});
    });

    it("3. should reset custom pages from definition and perform deep copy", () => {
        const siteId = "mysite";

        const configStore = {
            siteData: {
                [siteId]: {
                    customPagesDefinition: {
                        "/custom-page": { data: { key: "value" } },
                        "/another-page": { data: { key: "other" } }
                    }
                }
            }
        };

        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": { data: { key: "old" } }
                    }
                }
            }
        };

        // ✅ Run reset
        govcyCustomPages.resetCustomPages(configStore, store, siteId);

        const result = store.siteData[siteId].customPages;

        // ✅ Both pages should now exist
        expect(Object.keys(result)).to.have.lengthOf(2);
        expect(result["/custom-page"].data.key).to.equal("value");
        expect(result["/another-page"].data.key).to.equal("other");

        // ✅ Deep copy check (mutating one should not affect the other)
        result["/custom-page"].data.key = "mutated";
        expect(configStore.siteData[siteId].customPagesDefinition["/custom-page"].data.key)
            .to.equal("value");
    });

    it("4. should set data for an existing custom page or warn if not found", () => {
        const siteId = "mysite";

        // Mock console.warn to capture warnings
        let warningMessage = null;
        const originalWarn = console.warn;
        console.warn = msg => { warningMessage = msg; };

        // ✅ Existing custom page
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": { data: { old: "value" } }
                    }
                }
            }
        };

        const newData = { field1: "123", field2: "ABC" };
        govcyCustomPages.setCustomPageData(store, siteId, "/custom-page", newData);

        // ✅ Data should be overwritten
        expect(store.siteData[siteId].customPages["/custom-page"].data).to.deep.equal(newData);

        // ⚠️ Non-existent custom page
        govcyCustomPages.setCustomPageData(store, siteId, "/missing-page", { test: "value" });
        expect(warningMessage).to.include("⚠️ setCustomPageData: page '/missing-page' not found");

        // Restore console.warn
        console.warn = originalWarn;
    });

    it("5. should clear errors for existing custom page or safely skip if not found", () => {
        const siteId = "mysite";

        // Mock store with errors
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": {
                            errors: [
                                { id: "err1", text: { en: "Error one" } },
                                { id: "err2", text: { en: "Error two" } }
                            ],
                            data: { key: "value" }
                        }
                    }
                }
            }
        };

        // ✅ Run clearCustomPageErrors
        govcyCustomPages.clearCustomPageErrors(store, siteId, "/custom-page");

        // ✅ Expect errors cleared but other data intact
        expect(store.siteData[siteId].customPages["/custom-page"].errors).to.deep.equal([]);
        expect(store.siteData[siteId].customPages["/custom-page"].data.key).to.equal("value");

        // ⚠️ Should skip gracefully if page not found
        expect(() =>
            govcyCustomPages.clearCustomPageErrors(store, siteId, "/missing-page")
        ).to.not.throw();
    });

    it("6. should add new error entry and normalize pageUrl", () => {
        const siteId = "mysite";

        // Mock console.warn to capture warnings
        let warningMessage = null;
        const originalWarn = console.warn;
        console.warn = msg => { warningMessage = msg; };

        // ✅ Store with one page
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": {
                            errors: [],
                            data: { field1: "value" }
                        }
                    }
                }
            }
        };

        // ✅ Add first error
        govcyCustomPages.addCustomPageError(
            store,
            siteId,
            "/custom-page",
            "error-1",
            { en: "Something went wrong" }
        );

        const page = store.siteData[siteId].customPages["/custom-page"];
        expect(page.errors).to.have.lengthOf(1);
        expect(page.errors[0].id).to.equal("error-1");
        expect(page.errors[0].text.en).to.equal("Something went wrong");

        // ✅ pageUrl normalization (should not include leading "/")
        expect(page.errors[0].pageUrl).to.equal("custom-page");

        // ⚙️ Add second error (ensure it appends)
        govcyCustomPages.addCustomPageError(
            store,
            siteId,
            "/custom-page",
            "error-2",
            { en: "Another issue" }
        );
        expect(page.errors).to.have.lengthOf(2);

        // ⚠️ Attempt to add error to missing page
        govcyCustomPages.addCustomPageError(
            store,
            siteId,
            "/missing-page",
            "error-3",
            { en: "Should warn" }
        );

        expect(warningMessage).to.include("⚠️ addCustomPageError: page '/missing-page' not found");

        // Restore console.warn
        console.warn = originalWarn;
    });

    it("7. should set or overwrite email property for custom page", () => {
        const siteId = "mysite";

        // Mock console.warn to capture warnings
        let warningMessage = null;
        const originalWarn = console.warn;
        console.warn = msg => { warningMessage = msg; };

        // ✅ Store with one existing custom page
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": { data: {}, email: [] }
                    }
                }
            }
        };

        // ✅ Define DSF email-templates array
        const newEmailObjects = [
            {
                component: "bodyKeyValue",
                params: { type: "ul", items: [{ key: "Label", value: "Value" }] }
            },
            {
                component: "bodyParagraph",
                body: "Extra info"
            }
        ];

        // ✅ Set the email
        govcyCustomPages.setCustomPageEmail(store, siteId, "/custom-page", newEmailObjects);

        const result = store.siteData[siteId].customPages["/custom-page"].email;
        expect(result).to.deep.equal(newEmailObjects);

        // ⚠️ Should warn if page not found
        govcyCustomPages.setCustomPageEmail(store, siteId, "/missing-page", newEmailObjects);
        expect(warningMessage).to.include("⚠️ setCustomPageData: page '/missing-page' not found");

        // Restore console.warn
        console.warn = originalWarn;
    });

    it("8. should set and get custom page property in data and definition modes", () => {
        const siteId = "mysite";

        // ✅ Store with one page in both definition and session
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": { data: {}, extra: "old" }
                    },
                    customPagesDefinition: {
                        "/custom-page": { meta: "definitionMeta" }
                    }
                }
            }
        };

        // ✅ Set property on session (customPages)
        govcyCustomPages.setCustomPageProperty(store, siteId, "/custom-page", "extra", "newValue");
        const updatedValue = govcyCustomPages.getCustomPageProperty(store, siteId, "/custom-page", "extra");
        expect(updatedValue).to.equal("newValue");

        // ✅ Set property on definition (using isDefinition=true)
        govcyCustomPages.setCustomPageProperty(store, siteId, "/custom-page", "nextPage", "review", true);
        const definitionValue = govcyCustomPages.getCustomPageProperty(store, siteId, "/custom-page", "nextPage", true);
        expect(definitionValue).to.equal("review");

        // ⚠️ Missing page should warn but not throw
        let warningMessage = null;
        const originalWarn = console.warn;
        console.warn = msg => { warningMessage = msg; };

        govcyCustomPages.setCustomPageProperty(store, siteId, "/missing-page", "foo", "bar");
        expect(warningMessage).to.include("⚠️ setCustomPageProperty: page '/missing-page' not found");

        console.warn = originalWarn;
    });


    it("9. should handle missing siteData or siteId gracefully", () => {
        const store = {}; // no siteData at all

        // Functions should not throw even with empty store
        expect(() =>
            govcyCustomPages.defineCustomPages(store, "missing", "/page", { en: "Test" })
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.getCustomPageDefinition(store, "missing", "/page")
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.resetCustomPages({}, store, "missing")
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.setCustomPageData(store, "missing", "/page", { foo: "bar" })
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.clearCustomPageErrors(store, "missing", "/page")
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.addCustomPageError(store, "missing", "/page", "e1", { en: "err" })
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.setCustomPageEmail(store, "missing", "/page", [])
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.setCustomPageProperty(store, "missing", "/page", "foo", "bar")
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.getCustomPageProperty(store, "missing", "/page", "foo")
        ).to.not.throw();
    });

    it("10. should overwrite existing properties when defining page twice", () => {
        const store = {};
        const siteId = "mysite";
        const pageUrl = "/custom-page";

        // First definition
        govcyCustomPages.defineCustomPages(
            store,
            siteId,
            pageUrl,
            { en: "Page One" },
            "prev",
            [],
            [],
            false,
            "NOT_STARTED",
            { nextPage: "review" }
        );

        // Redefine same page (overwrites)
        govcyCustomPages.defineCustomPages(
            store,
            siteId,
            pageUrl,
            { en: "Updated Page" },
            "prev",
            [],
            [],
            false,
            "NOT_STARTED",
            { customFlag: true }
        );

        const defined = store.siteData[siteId].customPagesDefinition[pageUrl];

        // ✅ Should overwrite everything including previous props
        expect(defined.pageTitle.en).to.equal("Updated Page");
        expect(defined.nextPage).to.be.undefined; // old prop gone
        expect(defined.customFlag).to.be.true;
    });



    it("11. should not duplicate errors when addCustomPageError is called repeatedly with same id", () => {
        const siteId = "mysite";
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": { errors: [] }
                    }
                }
            }
        };

        // Add same error twice
        govcyCustomPages.addCustomPageError(store, siteId, "/custom-page", "dup", { en: "Duplicate" });
        govcyCustomPages.addCustomPageError(store, siteId, "/custom-page", "dup", { en: "Duplicate" });

        const errors = store.siteData[siteId].customPages["/custom-page"].errors;

        // Only one entry should exist
        expect(errors).to.have.lengthOf(1);
        expect(errors[0].id).to.equal("dup");
    });


    it("12. should not crash if custom page has unexpected structure", () => {
        const siteId = "mysite";

        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-page": {
                            errors: "not-an-array", // malformed
                            data: "invalid-data-type" // should be object
                        }
                    }
                }
            }
        };

        // ✅ Should self-correct or skip safely
        expect(() =>
            govcyCustomPages.clearCustomPageErrors(store, siteId, "/custom-page")
        ).to.not.throw();

        expect(() =>
            govcyCustomPages.addCustomPageError(store, siteId, "/custom-page", "err1", { en: "Safe" })
        ).to.not.throw();

        // ✅ After running addCustomPageError, errors should now be an array
        const page = store.siteData[siteId].customPages["/custom-page"];
        expect(page.errors).to.be.an("array");
        expect(page.errors[0].id).to.equal("err1");
    });

    it("13. should persist default task status when defining custom page", () => {
        const store = {};
        const siteId = "mysite";
        govcyCustomPages.defineCustomPages(
            store,
            siteId,
            "/custom-task",
            { en: "Custom Task" },
            "review",
            [],
            [],
            false,
            "IN_PROGRESS"
        );

        const definition = store.siteData[siteId].customPagesDefinition["/custom-task"];
        expect(definition.taskStatus).to.equal("IN_PROGRESS");
    });

    it("14. should set and get custom page task status", () => {
        const siteId = "mysite";
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        "/custom-task": { pageTitle: { en: "Custom Task" } }
                    }
                }
            }
        };

        // Get should fallback to NOT_STARTED
        expect(govcyCustomPages.getCustomPageTaskStatus(store, siteId, "/custom-task")).to.equal("NOT_STARTED");

        // Set valid status
        govcyCustomPages.setCustomPageTaskStatus(store, siteId, "/custom-task", "completed");
        expect(govcyCustomPages.getCustomPageTaskStatus(store, siteId, "/custom-task")).to.equal("COMPLETED");

        // Invalid status falls back to NOT_STARTED
        govcyCustomPages.setCustomPageTaskStatus(store, siteId, "/custom-task", "unknown");
        expect(govcyCustomPages.getCustomPageTaskStatus(store, siteId, "/custom-task")).to.equal("NOT_STARTED");
    });

    it("13. should export all expected helper functions", () => {
        const expectedExports = [
            "defineCustomPages",
            "getCustomPageDefinition",
            "resetCustomPages",
            "setCustomPageData",
            "clearCustomPageErrors",
            "addCustomPageError",
            "setCustomPageEmail",
            "setCustomPageProperty",
            "getCustomPageProperty",
            "setCustomPageSummaryElements",
            "setCustomPageTaskStatus",
            "getCustomPageTaskStatus"
        ];

        expectedExports.forEach(fn => {
            expect(govcyCustomPages[fn], `${fn} should be exported`).to.be.a("function");
        });

        const allExportKeys = Object.keys(govcyCustomPages);
        allExportKeys.forEach(fn => {
            expect(expectedExports).to.include(fn, `Unexpected export: ${fn}`);
        });
    });

    it("14. should set summaryElements for a custom page", () => {
        const siteId = "mysite";
        const pageUrl = "/custom-summary";

        // 🧩 Prepare minimal store
        const store = {
            siteData: {
                [siteId]: {
                    customPages: {
                        [pageUrl]: {
                            summaryElements: []
                        }
                    }
                }
            }
        };

        // ✅ Define new summary elements
        const newSummary = [
            {
                key: { en: "Field 1", el: "Πεδίο 1" },
                value: [
                    {
                        element: "textElement",
                        params: {
                            text: { en: "Value 1", el: "Τιμή 1" },
                            type: "span"
                        }
                    }
                ]
            },
            {
                key: { en: "Field 2", el: "Πεδίο 2" },
                value: [
                    {
                        element: "textElement",
                        params: {
                            text: { en: "Value 2", el: "Τιμή 2" },
                            type: "span"
                        }
                    }
                ]
            }
        ];

        // 🧠 Run helper
        govcyCustomPages.setCustomPageSummaryElements(store, siteId, pageUrl, newSummary);

        // ✅ Validate result
        const target = store.siteData[siteId].customPages[pageUrl];
        expect(target.summaryElements).to.deep.equal(newSummary);
    });



});
