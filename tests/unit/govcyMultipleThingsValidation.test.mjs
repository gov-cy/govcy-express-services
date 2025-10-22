import { expect } from "chai";
import { validateMultipleThings, buildMultipleThingsValidationSummary } from "../../src/utils/govcyMultipleThingsValidation.mjs";

// Mock govcyResources
import * as govcyResources from "../../src/resources/govcyResources.mjs";

describe("govcyMultipleThingsValidation", () => {
    describe("validateMultipleThings()", () => {
        const basePage = {
            multipleThings: { min: 1, max: 3 },
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
                                            element: "textInput", params: { id: "fieldA", name: "fieldA" }, validations: [{
                                                "check": "required",
                                                "params": {
                                                    "checkValue": "",
                                                    "message": {
                                                        "el": "Επιλέξτε τις θέσεις για τις οποίες κάνετε άιτηση"
                                                    }
                                                }
                                            }]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        };

        it("1. should return _global min error when items.length < min", () => {
            const result = validateMultipleThings(basePage, [], "en");
            expect(result).to.have.property("_global");
            expect(result._global.message.en || result._global.message).to.include(
                basePage.multipleThings.min.toString()
            );
            expect(result._global.link).to.equal("#addNewItem0");
        });

        it("2. should return _global max error when items.length > max", () => {
            const items = [{}, {}, {}, {}]; // exceeds max=3
            const result = validateMultipleThings(basePage, items, "en");
            expect(result).to.have.property("_global");
            expect(result._global.message.en || result._global.message).to.include(
                basePage.multipleThings.max.toString()
            );
            expect(result._global.link).to.equal("#multipleThingsList");
        });

        it("3. should validate per-item fields and return item-specific errors", () => {
            // Mock validator: simulate required field missing
            const mockPage = JSON.parse(JSON.stringify(basePage));
            const items = [{ fieldA: "" }, { fieldA: "ok" }];

            const result = validateMultipleThings(mockPage, items, "en");
            // Expect an error only for the first item (index 0)
            expect(result).to.have.property("0");
        });
    });

    describe("buildMultipleThingsValidationSummary()", () => {
        const service = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "academic-details" },
                    multipleThings: {
                        listPage: { title: { en: "Your qualifications", el: "Τα προσόντα σας" } }
                    }
                }
            ]
        };

        const req = {
            globalLang: "en",
            query: {},
        };

        it("4. should build hub summary for _global errors", () => {
            const hubErrors = {
                _global: {
                    message: { en: "You must add at least one qualification" },
                    link: "#multipleThingsList"
                }
            };
            const result = buildMultipleThingsValidationSummary(service, hubErrors, "site123", "academic-details", req, "", true);
            expect(result).to.be.an("array").that.is.not.empty;
            expect(result[0].link).to.equal("#multipleThingsList");
            expect(result[0].text.en).to.include("qualification");
        });

        it("5. should build review summary for indexed field errors (isHub=false)", () => {
            const hubErrors = {
                0: {
                    field1: {
                        message: { en: "Field missing" }
                    }
                }
            };

            const result = buildMultipleThingsValidationSummary(service, hubErrors, "site123", "academic-details", req, "review", false);
            expect(result).to.be.an("array").that.is.not.empty;
            const first = result[0];
            expect(first.link).to.include("/site123/academic-details/multiple/edit/0?route=review");
            expect(first.text.en).to.include("Field missing");
        });
    });
});
