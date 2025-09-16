import { expect } from "chai";
import { govcyRoutePageHandler } from "../../src/middleware/govcyRoutePageHandler.mjs";

describe("govcyRoutePageHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {
                cs: "test" // This should match a mock/test config in your repo
            },
            globalLang: "en",
            session: {
                user: {
                    name: "Test User"
                }
            }
        };

        res = {
            redirectUrl: null,
            redirect(url) {
                this.redirectUrl = url;
            },
            send: () => { }
        };

        next = (err) => {
            if (err) throw err;
        };
    });

    it("1. should redirect to homeRedirectPage if cs cookie exists", () => {
        govcyRoutePageHandler(req, res, next);

        expect(res.redirectUrl).to.be.a("string");
        expect(res.redirectUrl).to.include("/"); // Example: /test/index or /test/home
    });

    it("2. should render available services page when no cs cookie exists", () => {
        // Remove the cookie
        req.cookies = {};

        // Override res.send to capture the output
        let sentHtml = "";
        res.send = (html) => {
            sentHtml = html;
        };

        govcyRoutePageHandler(req, res, next);

        // ✅ Check that it rendered HTML (non-empty)
        expect(sentHtml).to.be.a("string").and.not.empty;

        // ✅ Optional: Check for content that should exist (e.g. page heading)
        expect(sentHtml).to.include("Available Services"); // or some string from your page template
    });

    it("3. should append user name section if user is logged in", () => {
        // Clear any redirecting cookie
        req.cookies.cs = undefined;

        // Simulate logged-in user
        req.session = {
            user: {
                name: "Test User"
            }
        };

        // Capture sent HTML
        let sentHtml = "";
        res.send = (html) => {
            sentHtml = html;
        };

        govcyRoutePageHandler(req, res, next);

        // ✅ Check that user name appears in the HTML
        expect(sentHtml).to.include("Test User");
    });

    it("4. should render available services page if no cookie and no user", () => {
        // Simulate no cs cookie and no user session
        req.cookies = {};
        req.session = {}; // no user

        // Capture sent HTML
        let sentHtml = "";
        res.send = (html) => {
            sentHtml = html;
        };

        // Call the handler
        govcyRoutePageHandler(req, res, next);

        // Assertions
        expect(sentHtml, "No HTML sent in response").to.be.a("string");
        expect(sentHtml).to.include("govcy-service-name"); // generic indicator
        expect(sentHtml).to.include("Available Services"); // govcyResources.availableServicesPageTemplate includes this
    });

    it("5. should fallback to el or first available language if lang is missing", () => {
        req.cookies = { cs: "test" };
        req.globalLang = "fr"; // unsupported

        let redirectedTo = "";
        res.redirect = (url) => {
            redirectedTo = url;
        };

        govcyRoutePageHandler(req, res, next);

        expect(redirectedTo).to.equal("https://www.gov.cy/service/aitisi-gia-taftotita/");
    });

    it("6. should not redirect if no homeRedirectPage is defined", () => {
        // Use a valid cookie, but simulate no homeRedirectPage
        req.cookies = { cs: "test-files" };

        let redirectedTo = "";
        let sentHtml = "";
        res.redirect = (url) => {
            redirectedTo = url;
        };
        res.send = (html) => {
            sentHtml = html;
        };

        govcyRoutePageHandler(req, res, next);

        expect(redirectedTo).to.equal(""); // should not redirect
        expect(sentHtml).to.include("govcy-service-name"); // generic indicator
        expect(sentHtml).to.include("Available Services"); // govcyResources.availableServicesPageTemplate includes this
    });

    it("7. should redirect using root-level homeRedirectPage string", () => {
        req.cookies = { cs: "test" };
        req.globalLang = "en"; 

        let redirectedTo = "";
        res.redirect = (url) => {
            redirectedTo = url;
        };

        govcyRoutePageHandler(req, res, next);

        expect(redirectedTo).to.equal("https://www.gov.cy/en/service/issue-an-id-card/");
    });


});
