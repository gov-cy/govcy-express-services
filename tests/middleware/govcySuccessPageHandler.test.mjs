import { expect } from "chai";
import { govcySuccessPageHandler } from "../../src/middleware/govcySuccessPageHandler.mjs";

describe("govcySuccessPageHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { siteId: "test-site" },
            serviceData: {
                site: {
                    id: "test-site",
                    languages: [
                        { code: "el", label: "ΕΛ", href: "?lang=el" },
                        { code: "en", label: "EN", href: "?lang=en" }
                    ],
                    title: { el: "Υπηρεσία", en: "Service" },
                    lang: "el",
                    cdn: { dist: "/mock" }
                }
            },
            session: {
                siteData: {
                    "test-site": {
                        submissionData: {} // Empty object simulates no data
                    }
                }
            }
        };

        res = {};
        next = (err) => {
            req._error = err;
        };
    });

    it("1. should return 404 if submission data is missing", () => {
        const handler = govcySuccessPageHandler();
        handler(req, res, next);

        expect(req._error).to.be.an("error");
        expect(req._error.status).to.equal(404);
        expect(req._error.message).to.include("Submission data not found");
    });

    it("2. should populate processedPage with success panel and summary", () => {
        req.session.siteData["test-site"].submissionData = {
            referenceNumber: "ABC123",
            rendererData: {
                element: "summaryList",
                params: {
                    title: "Your Submission",
                    items: [
                        { key: "Full Name", value: "Test User" },
                        { key: "Email", value: "user@example.com" }
                    ]
                }
            }
        };

        req.session.user = { name: "Test User" }; // Simulate logged in user

        const handler = govcySuccessPageHandler();
        handler(req, res, next);

        const processed = req.processedPage;

        expect(processed).to.be.an("object");
        const elements = processed.pageTemplate.sections.find(sec => sec.name === "main").elements;

        // Check for panel with referenceNumber
        const panel = elements.find(el => el.element === "panel");
        expect(panel).to.exist;
        expect(panel.params.referenceNumber.el).to.equal("ABC123");

        // Check summary list included
        const summaryList = elements.find(el => el.element === "summaryList");
        expect(summaryList).to.exist;
        expect(summaryList.params.items.length).to.equal(2);
    });

});
