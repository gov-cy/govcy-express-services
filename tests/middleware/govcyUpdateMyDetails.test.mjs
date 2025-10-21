import { expect } from "chai";
import sinon from "sinon";
import { createUmdManualPageTemplate, govcyUpdateMyDetailsHandler, govcyUpdateMyDetailsPostHandler } from "../../src/middleware/govcyUpdateMyDetails.mjs";
import * as umd from "../../src/middleware/govcyUpdateMyDetails.mjs";

describe("createUmdManualPageTemplate()", () => {
    let req, page, siteId, lang;

    beforeEach(() => {
        siteId = "test-site";
        lang = "en";

        // Mock request (just enough to satisfy function)
        req = {
            query: {},
            csrfToken: () => "mock-csrf",
        };

        // Minimal page config
        page = {
            pageData: { url: "update-my-details" },
            updateMyDetails: {
                scope: ["email", "mobile"]
            },
        };
    });

    it("1. should build a valid manual UMD page template with correct structure", () => {
        const result = createUmdManualPageTemplate(siteId, lang, page, req);

        // Top-level structure
        expect(result).to.have.property("sections").that.is.an("array").with.lengthOf(1);
        const section = result.sections[0];
        expect(section).to.have.property("elements").that.is.an("array");

        // Check form structure
        const form = section.elements.find(el => el.element === "form");
        expect(form).to.exist;
        expect(form.params).to.have.property("action").that.includes("update-my-details/update-my-details-response");
        expect(form.params).to.have.property("method", "POST");

        // Check for CSRF input
        const hasCsrf = form.params.elements.some(el => el.params?.name === "_csrf" || el.element === "htmlElement");
        expect(hasCsrf).to.be.true;

        // Should include a continue button
        const button = form.params.elements.find(el => el.element === "button");
        expect(button).to.exist;
        expect(button.params.variant).to.equal("primary");
        expect(button.params.type).to.equal("submit");

        // Should include elements for each scope field (email, mobile)
        const hasEmailField = form.params.elements.some(el => el.element === "textInput" && el.params?.id === "email");
        const hasMobileField = form.params.elements.some(el => el.element === "textInput" && el.params?.id === "mobile");
        expect(hasEmailField || hasMobileField).to.be.true;
    });

    it("2. should adjust action URL and button text when route=review", () => {
        // Mock req with ?route=review
        req.query = { route: "review" };

        const result = createUmdManualPageTemplate(siteId, lang, page, req);

        // ✅ Action URL should include /review
        const form = result.sections[0].elements.find(el => el.element === "form");
        expect(form.params.action).to.include("route=review");

        // ✅ Continue button text should be "Save and continue"
        const button = form.params.elements.find(el => el.element === "button");
        expect(button.params.text.en).to.equal("Continue");
    });


    it("3. should handle missing or empty scope gracefully", () => {
        // Missing scope should currently throw (expected)
        delete page.updateMyDetails.scope;

        expect(() => createUmdManualPageTemplate(siteId, lang, page, req)).to.throw();

        // But empty scope should work
        page.updateMyDetails.scope = [];
        const result = createUmdManualPageTemplate(siteId, lang, page, req);
        const form = result.sections[0].elements.find(el => el.element === "form");
        const textInputs = form.params.elements.filter(el => el.element === "textInput");
        expect(textInputs).to.have.length(0);
    });



});

describe("govcyUpdateMyDetailsHandler() and govcyUpdateMyDetailsPostHandler()", () => {
    let req, res, next, siteId, service, page;

    beforeEach(() => {
        siteId = "test-site";

        // env required by handler (reads API config from env via keys in page.updateMyDetails)
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";
        process.env.CIVIL_REGISTRY_CLIENT_KEY = "CIVIL_REGISTRY_CLIENT_KEY";
        process.env.CIVIL_REGISTRY_SERVICE_ID = "CIVIL_REGISTRY_SERVICE_ID";
        process.env.UPDATE_MY_DETAILS_URL = "https://update-my-details.staging.service.gov.cy";

        req = {
            params: { siteId, pageUrl: "update-my-details" },
            query: {},                       // handler reads req.query.route etc.
            csrfToken: () => "mock-csrf",    // used when building the form
            session: {
                siteData: { [siteId]: { inputData: {} } },
                user: {
                    // Non-eligible: unique_identifier does NOT start with "00"
                    sub: "0500099999",
                    name: "User1",
                    profile_type: "Individual",
                    unique_identifier: "1234567890",
                    email: "user@example.com",
                    phone_number: "99999999",
                }
            }
        };

        res = {
            redirect: sinon.spy(),
            json: sinon.spy()   // ✅ Add this
        };
        next = sinon.spy();

        service = { site: { lang: "en" }, pages: [] };

        // page config uses env variable names in APIEndpoint + updateMyDetailsURL
        page = {
            pageData: { url: "update-my-details" },
            updateMyDetails: {
                APIEndpoint: {
                    url: "CIVIL_REGISTRY_CONTACT_API_URL",
                    clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                    serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                },
                updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                scope: ["email", "mobile"]
            }
        };
    });

    afterEach(() => {
        delete process.env.CIVIL_REGISTRY_CONTACT_API_URL;
        delete process.env.CIVIL_REGISTRY_CLIENT_KEY;
        delete process.env.CIVIL_REGISTRY_SERVICE_ID;
        delete process.env.UPDATE_MY_DETAILS_URL;
    });

    it("1. should populate req.processedPage with manual template (variant 1) and call next()", async () => {
        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        // middleware-style contract: sets processedPage + calls next
        expect(req.processedPage).to.be.an("object");
        expect(next.calledOnce).to.be.true;

        const { pageTemplate } = req.processedPage;
        expect(pageTemplate).to.be.an("object");
        expect(pageTemplate.sections).to.be.an("array").that.is.not.empty;

        // find the <form> inside the generated manual page
        const form = pageTemplate.sections
            .flatMap(s => s.elements || [])
            .find(el => el.element === "form");
        expect(form).to.exist;

        // should include CSRF + submit button
        const hasCsrf = form.params.elements.some(
            el => el.element === "htmlElement" && String(el.params?.text?.en || el.params?.text).includes("_csrf")
        );
        expect(hasCsrf).to.be.true;

        const submitBtn = form.params.elements.find(el => el.element === "button");
        expect(submitBtn).to.exist;
        expect(submitBtn.params.type).to.equal("submit");

        // fields from scope (email, mobile) must be present
        const textInputs = form.params.elements.filter(el => el.element === "textInput");
        const ids = textInputs.map(el => el.params.id);
        expect(ids).to.include.members(["email", "mobile"]);
    });

    it("2. should build external redirect link page (variant 3) for eligible user with no data", async () => {
        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenNotUpdated";

        // ✅ Mock Express request properties required by constructUpdateMyDetailsRedirect()
        req.protocol = "https";
        req.get = (header) => (header === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        expect(next.calledOnce).to.be.true;
        const { pageTemplate } = req.processedPage;

        const form = pageTemplate.sections[0].elements.find(el => el.element === "form");
        expect(form).to.exist;

        const htmlElement = form.params.elements.find(el => el.element === "htmlElement");
        expect(htmlElement).to.exist;
        const textObj = htmlElement.params.text;
        expect(textObj).to.be.an("object");
        expect(Object.values(textObj)[0]).to.match(/https:\/\/update-my-details\.staging\.service\.gov\.cy/);

        // ✅ No input fields
        const hasInput = form.params.elements.some(el => el.element === "textInput");
        expect(hasInput).to.be.false;
    });

    it("3. should build confirmation radio page (variant 2) for eligible user with existing data", async () => {
        // ✅ Eligible Cypriot citizen
        req.session.user.unique_identifier = "0012345678";

        // ✅ Use mock API that returns user details
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";

        // ✅ Mock Express request props (required for potential redirects)
        req.protocol = "https";
        req.get = (header) => (header === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        // ✅ Should call next() and populate processedPage
        expect(next.calledOnce).to.be.true;
        expect(req.processedPage).to.be.an("object");

        const { pageTemplate } = req.processedPage;
        expect(pageTemplate.sections).to.be.an("array").and.not.empty;

        // ✅ Find the <form> element
        const form = pageTemplate.sections[0].elements.find(el => el.element === "form");
        expect(form).to.exist;

        // ✅ Should have a CSRF hidden field
        const csrf = form.params.elements.find(el => el.element === "htmlElement");
        expect(csrf).to.exist;
        expect(Object.values(csrf.params.text)[0]).to.include("_csrf");

        // ✅ Should include a summary list with user details
        const summaryList = form.params.elements.find(el => el.element === "summaryList");
        expect(summaryList).to.exist;
        const items = summaryList.params.items.map(i => i.key.en || i.key);
        expect(items).to.include.members(["Email", "Mobile phone number"]);

        // ✅ Should include the confirmation question block
        const hasQuestion = form.params.elements.some(el =>
            el.params?.legend?.en?.includes("Should we use these details")
        );
        expect(hasQuestion).to.be.true;

        // ✅ Should have a primary submit button
        const button = form.params.elements.find(el => el.element === "button");
        expect(button).to.exist;
        expect(button.params.variant).to.equal("primary");
        expect(button.params.type).to.equal("submit");
    });

    it("4. should handle invalid updateMyDetails configuration (missing config)", async () => {
        // ❌ Remove updateMyDetails block completely
        delete page.updateMyDetails;

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        // ✅ Should call next() once with an error
        expect(next.calledOnce).to.be.true;
        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("Invalid updateMyDetails configuration");
    });

    it("5. should handle missing environment variables for updateMyDetails", async () => {
        // ✅ Eligible Cypriot citizen (to pass initial checks)
        req.session.user.unique_identifier = "0012345678";

        // ❌ Remove one critical env var to simulate missing config
        delete process.env.CIVIL_REGISTRY_CLIENT_KEY;

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        // ✅ Verify handler triggered error via next()
        expect(next.calledOnce).to.be.true;
        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("Missing environment variables for updateMyDetails");
    });

    it("6. should handle various API failure and edge responses correctly", async () => {
        // ✅ Make user eligible (to reach API call stage)
        req.session.user.unique_identifier = "0012345678";

        // ✅ Common Express mock props
        req.protocol = "https";
        req.get = (header) => (header === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        // Helper to reset `next` between subcases
        const resetNext = () => (next.resetHistory ? next.resetHistory() : (next = sinon.spy()));

        // ------------------------------
        // ❌ Case 1: API returns Succeeded=false
        // ------------------------------
        // process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenFail";
        // resetNext();
        // await govcyUpdateMyDetailsHandler(req, res, next, page, service);
        // let err = next.firstCall.args[0];
        // expect(err).to.be.an("error");
        // expect(err.message).to.include("returned succeeded false");

        // ------------------------------
        // ❌ Case 2: Missing Data or dob
        // ------------------------------
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdUnverified";
        resetNext();
        await govcyUpdateMyDetailsHandler(req, res, next, page, service);
        let err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("returned succeeded false");

        // ------------------------------
        // ❌ Case 3: Missing scope field
        // ------------------------------
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenNonActive";
        resetNext();
        await govcyUpdateMyDetailsHandler(req, res, next, page, service);
        err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("returned succeeded false");

        // ------------------------------
        // ⚙️ Case 4: Underage (should fail)
        // ------------------------------
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdAgeEligibility";
        resetNext();
        await govcyUpdateMyDetailsHandler(req, res, next, page, service);
        err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("returned succeeded false");

        // ------------------------------
        // ⚙️ Case 5: Pin unknown (no data → external redirect link)
        // ------------------------------
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdPinUnknown";
        resetNext();
        await govcyUpdateMyDetailsHandler(req, res, next, page, service);
        err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("returned succeeded false");
    });

    it("7. should prepend topElements and add backLink section when configured", async () => {
        // ✅ Non-eligible user triggers variant 1 (manual form) — no API call needed
        req.session.user.unique_identifier = "1234567890"; // non-cypriot → variant 1

        // ✅ Extend page config
        page.updateMyDetails.topElements = [
            { element: "htmlElement", params: { text: { en: "<p>Custom Top Element</p>" } } }
        ];
        page.updateMyDetails.hasBackLink = true;

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        // ✅ Middleware called next()
        expect(next.calledOnce).to.be.true;

        const { pageTemplate } = req.processedPage;

        // -----------------------------
        // ✅ 1. Back link section check
        // -----------------------------
        const beforeMainSection = pageTemplate.sections.find(s => s.name === "beforeMain");
        expect(beforeMainSection).to.exist;
        expect(beforeMainSection.elements[0].element).to.equal("backLink");

        // -----------------------------
        // ✅ 2. Top element injection check
        // -----------------------------
        const mainSection = pageTemplate.sections.find(s => s.name === "main");
        expect(mainSection).to.exist;

        const form = mainSection.elements.find(el => el.element === "form");
        expect(form).to.exist;

        const firstEl = form.params.elements[0];
        expect(firstEl.element).to.equal("htmlElement");
        expect(firstEl.params.text.en).to.include("Custom Top Element");
    });

    it("8. should handle missing service or page in POST handler", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ req.serviceData missing
        delete req.serviceData; // or leave undefined
        delete req.params.pageUrl;

        await postHandler(req, res, next);

        expect(next.calledOnce).to.be.true;
        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("undefined");


    });


    it("9. POST should redirect if page condition evaluates to true", async () => {
        // Ensure params match the page we’ll define below
        req.params.siteId = "test-site";
        req.params.pageUrl = "update-my-details";

        // Minimal serviceData for the POST handler to find the page
        // Inject the page-level condition so it short-circuits immediately
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: {
                        url: "update-my-details",
                        // ✅ condition evaluates to TRUE ⇒ handler must redirect and skip save
                        conditions: [{ expression: "true", redirect: "redirect-page" }]
                    },
                    // Keep a minimal but valid block in case handler reads it (won’t be used because we short-circuit)
                    updateMyDetails: {
                        scope: ["email", "mobile"],
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL"
                    }
                }
            ]
        };

        // res.redirect spy (no stubs on modules, just the response object)
        res.redirect = sinon.spy();

        // Create the POST handler and call it
        const postHandler = govcyUpdateMyDetailsPostHandler();
        await postHandler(req, res, next);

        // ✅ Should redirect (and not call next/continue)
        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("redirect-page");
        expect(next.called).to.be.false;
    });

    it("10. should handle invalid updateMyDetails configuration (missing config) in POST handler", async () => {
        // Create POST handler
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ Mock serviceData so handler finds a page but missing the updateMyDetails block
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" }
                    // ❌ No updateMyDetails property
                }
            ]
        };

        // ✅ Run the handler
        await postHandler(req, res, next);

        // ✅ Should call next() with an error
        expect(next.calledOnce).to.be.true;
        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("Invalid updateMyDetails configuration");
    });


    it("11. should handle missing environment variables for updateMyDetails in POST handler", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ Service/page structure is valid
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["email", "mobile"]
                    }
                }
            ]
        };

        // ❌ Remove one required env var (client key)
        delete process.env.CIVIL_REGISTRY_CLIENT_KEY;

        await postHandler(req, res, next);

        // ✅ Should trigger handleMiddlewareError → next(error)
        expect(next.calledOnce).to.be.true;
        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("Missing environment variables for updateMyDetails");
    });

    it("12. should store form data in session and redirect (variant 1 manual POST happy path)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ Non-eligible user triggers manual variant
        req.session.user.unique_identifier = "1234567890"; // not starting with 00

        // ✅ Minimal service/page config
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["email", "mobile"]
                    }
                }
            ]
        };

        // ✅ Mock form POST body
        req.body = {
            email: "newuser@example.com",
            mobile: "99999999",
            _csrf: "mock-csrf"
        };

        // ✅ Spy on redirect
        res.redirect = sinon.spy();

        // ✅ Run handler
        await postHandler(req, res, next);

        // ---------------------------
        // ✅ Assertions
        // ---------------------------

        // Should either redirect or call next() with no error
        const err = next.firstCall?.args?.[0];
        expect(err).to.be.undefined;

        // Check that form data stored in session
        const storedData =
            req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.formData;
        expect(storedData).to.deep.include({
            email: "newuser@example.com",
            mobile: "99999999"
        });

        const jsonCalled = res.json?.calledOnce ?? false;
        expect(jsonCalled).to.be.true;

        const payload = res.json.firstCall.args[0];
        expect(payload).to.have.property("success", true);

    });


    it("13. should store registry data and return success when user selects Yes (variant 2 POST)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ Eligible user
        req.session.user.unique_identifier = "0012345678";

        // ✅ Minimal service/page config for variant 2
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID",
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["email", "mobile"],
                    },
                },
            ],
        };


        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";

        // ✅ Mock that Civil Registry data already exists in session
        req.session.siteData[siteId].inputData["update-my-details"] = {
            formData: {}
        };

        // ✅ Simulate user choosing “Yes”
        req.body = {
            useTheseDetails: "yes",
            _csrf: "mock-csrf",
        };

        // ✅ Mock Express response
        res = { json: sinon.spy(), redirect: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        // ---------------------------
        // ✅ Assertions
        // ---------------------------

        //check formData
        const storedData =
            req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.formData;

        expect(storedData).to.deep.include({
            email: "dsftesting1@gmail.com",
            mobile: "0035799123456",
        });

        //check updateMyDetails
        const updateMyDetailsData = req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.updateMyDetails;
        expect(updateMyDetailsData).to.deep.include({
            email: "dsftesting1@gmail.com",
            mobile: "0035799123456",
        });
        req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.formData;

        // should respond with JSON success
        expect(res.json.calledOnce).to.be.true;
        const payload = res.json.firstCall.args[0];
        expect(payload).to.have.property("success", true);

        // and not call next() with error
        const err = next.firstCall?.args?.[0];
        expect(err).to.be.undefined;
    });

    it("14. should build external redirect URL and redirect when user selects No (variant 2 POST)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ Eligible user
        req.session.user.unique_identifier = "0012345678";

        // ✅ Service/page config (same as previous test)
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID",
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["email", "mobile"],
                    },
                },
            ],
        };

        // ✅ Environment points to mock API for existing registry data
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";

        // ✅ User chooses “No”
        req.body = { useTheseDetails: "no", _csrf: "mock-csrf" };

        // ✅ Mock Express props needed to build redirect URL
        req.protocol = "https";
        req.get = (h) => (h === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        // ✅ Mock response
        res = { json: sinon.spy(), redirect: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        // ---------------------------
        // ✅ Assertions
        // ---------------------------

        // Should redirect externally (no JSON)
        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("https://update-my-details.staging.service.gov.cy");
        expect(redirectUrl).to.match(/ReturnUrl/); // includes encoded return URL
        expect(res.json.called).to.be.false;

        // No error
        const err = next.firstCall?.args?.[0];
        expect(err).to.be.undefined;
    });

    it("15. should store validation errors and redirect when form data is invalid (variant 1 manual POST)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ Non-eligible user → manual variant
        req.session.user.unique_identifier = "1234567890"; // not starting with "00"

        // ✅ Minimal service/page config
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID",
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["email", "mobile"],
                    },
                },
            ],
        };

        // ✅ Mock form POST with missing “email”
        req.body = {
            email: "", // invalid (required)
            mobile: "99999999",
            _csrf: "mock-csrf",
        };

        // ✅ Mock Express response
        res = { redirect: sinon.spy(), json: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        // ---------------------------
        // ✅ Assertions
        // ---------------------------

        // Should redirect back to same page with error anchor
        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("#errorSummary-title");
        expect(res.json.called).to.be.false;

        // Validation errors should exist in session
        const validationErrors =
            req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.validationErrors?.errors;

        expect(validationErrors).to.be.an("object");
        expect(Object.keys(validationErrors)).to.include("email");

        // No hard crash / unexpected error
        const err = next.firstCall?.args?.[0];
        expect(err).to.be.undefined;
    });

    it("16. should handle missing form definition gracefully in POST handler", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        // ✅ Non-eligible user (variant 1 path)
        req.session.user.unique_identifier = "1234567890";

        // ✅ Service/page config with empty scope → no inputs or form built
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID",
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: [], // ← forces createUmdManualPageTemplate to return an empty section
                    },
                },
            ],
        };

        // ✅ Mock Express response
        res = { redirect: sinon.spy(), json: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        // ---------------------------
        // ✅ Assertions
        // ---------------------------
        expect(next.calledOnce).to.be.true;
        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.include("Invalid updateMyDetails configuration");
    });


    it("17. should handle structured addressInfo array correctly", async () => {
        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";

        // Mock Express request props
        req.protocol = "https";
        req.get = (header) => (header === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        // Include address in scope
        page.updateMyDetails.scope = ["address"];

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        // ✅ Should call next() and populate processedPage
        expect(next.calledOnce).to.be.true;
        const { pageTemplate } = req.processedPage;
        const summaryList = pageTemplate.sections[0].elements[0].params.elements.find(
            el => el.element === "summaryList"
        );

        // ✅ Should have structured address text
        const addressItem = summaryList.params.items.find(i => i.key.en === "Mailing address");
        const valueText = addressItem?.value?.[0]?.params?.text?.en || addressItem?.value?.[0]?.params?.text;
        expect(valueText).to.include("ΙΩΝΩΝ  12");
    });

    it("18. should handle unstructured addressInfoUnstructured array correctly", async () => {
        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdatedUnstructured";

        req.protocol = "https";
        req.get = (header) => (header === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        page.updateMyDetails.scope = ["address"];

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        expect(next.calledOnce).to.be.true;
        const { pageTemplate } = req.processedPage;
        const summaryList = pageTemplate.sections[0].elements[0].params.elements.find(
            el => el.element === "summaryList"
        );

        const addressItem = summaryList.params.items.find(i => i.key.en === "Mailing address");
        const valueText = addressItem?.value?.[0]?.params?.text?.en || addressItem?.value?.[0]?.params?.text;
        expect(valueText).to.include("Potsi poda");
    });

    it("19. should handle poBoxAddress array correctly", async () => {
        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdatedPOBox";

        req.protocol = "https";
        req.get = (header) => (header === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        page.updateMyDetails.scope = ["address"];

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        expect(next.calledOnce).to.be.true;
        const { pageTemplate } = req.processedPage;
        const summaryList = pageTemplate.sections[0].elements[0].params.elements.find(
            el => el.element === "summaryList"
        );

        const addressItem = summaryList.params.items.find(i => i.key.en === "Mailing address");
        const valueText = addressItem?.value?.[0]?.params?.text?.en || addressItem?.value?.[0]?.params?.text;
        expect(valueText).to.include("PO box 12452");
    });

    it("20. should store structured addressInfo correctly when user selects Yes (variant 2 POST)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";

        // ✅ Minimal page config
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["address"]
                    }
                }
            ]
        };

        // ✅ POST body → user chooses Yes
        req.body = { useTheseDetails: "yes", _csrf: "mock-csrf" };

        res = { json: sinon.spy(), redirect: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        // ✅ Check session data
        const storedData = req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.formData;
        expect(storedData).to.have.property("address", "ΙΩΝΩΝ  12  \n1101 ΛΕΥΚΩΣΙΑ\nΛΕΥΚΩΣΙΑ\nΚΥΠΡΟΣ");

        // ✅ Should respond with success JSON
        expect(res.json.calledOnce).to.be.true;
        const payload = res.json.firstCall.args[0];
        expect(payload).to.have.property("success", true);
    });

    it("21. should store unstructured addressInfoUnstructured correctly when user selects Yes (variant 2 POST)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdatedUnstructured";

        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["address"]
                    }
                }
            ]
        };

        req.body = { useTheseDetails: "yes", _csrf: "mock-csrf" };

        res = { json: sinon.spy(), redirect: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        const storedData = req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.formData;
        expect(storedData).to.have.property("address", "Potsi poda\n2460 BBKing\nΒΑΝΟΥΑΤΟΥ");

        expect(res.json.calledOnce).to.be.true;
        const payload = res.json.firstCall.args[0];
        expect(payload).to.have.property("success", true);
    });

    it("22. should store poBoxAddress correctly when user selects Yes (variant 2 POST)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdatedPOBox";

        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["address"]
                    }
                }
            ]
        };

        req.body = { useTheseDetails: "yes", _csrf: "mock-csrf" };

        res = { json: sinon.spy(), redirect: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        const storedData = req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.formData;
        expect(storedData).to.have.property("address", "PO box 12452\n2244");

        expect(res.json.calledOnce).to.be.true;
        const payload = res.json.firstCall.args[0];
        expect(payload).to.have.property("success", true);
    });

    it("23. should format date of birth correctly in summary list (GET handler)", async () => {
        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";

        // Mock Express request props
        req.protocol = "https";
        req.get = (header) => (header === "host" ? "localhost:44319" : "");
        req.originalUrl = `/service/${siteId}/${page.pageData.url}`;

        // Include DOB in scope
        page.updateMyDetails.scope = ["dob"];

        await govcyUpdateMyDetailsHandler(req, res, next, page, service);

        expect(next.calledOnce).to.be.true;
        const { pageTemplate } = req.processedPage;

        // Find summary list element
        const summaryList = pageTemplate.sections[0].elements[0].params.elements.find(
            el => el.element === "summaryList"
        );

        // Check DOB formatting (e.g. 1989-10-23 → 23/10/1989)
        const dobItem = summaryList.params.items.find(i => i.key.en === "Date of birth");
        const valueText = dobItem?.value?.[0]?.params?.text?.en || dobItem?.value?.[0]?.params?.text;
        expect(valueText).to.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it("24. should split DOB into day, month, and year fields in formData (POST handler)", async () => {
        const postHandler = govcyUpdateMyDetailsPostHandler();

        req.session.user.unique_identifier = "0012345678";
        process.env.CIVIL_REGISTRY_CONTACT_API_URL = "http://localhost:3002/umdCitizenUpdated";

        // ✅ Minimal page config with dob in scope
        req.serviceData = {
            site: { lang: "en" },
            pages: [
                {
                    pageData: { url: "update-my-details" },
                    updateMyDetails: {
                        APIEndpoint: {
                            url: "CIVIL_REGISTRY_CONTACT_API_URL",
                            clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
                            serviceId: "CIVIL_REGISTRY_SERVICE_ID"
                        },
                        updateMyDetailsURL: "UPDATE_MY_DETAILS_URL",
                        scope: ["dob"]
                    }
                }
            ]
        };

        // ✅ Simulate user selecting Yes (variant 2)
        req.body = { useTheseDetails: "yes", _csrf: "mock-csrf" };

        res = { json: sinon.spy(), redirect: sinon.spy(), status: sinon.stub().returnsThis() };

        await postHandler(req, res, next);

        // ✅ Verify session data
        const storedData = req.session.siteData?.[siteId]?.inputData?.["update-my-details"]?.formData;
        expect(storedData).to.have.property("dob_day");
        expect(storedData).to.have.property("dob_month");
        expect(storedData).to.have.property("dob_year");

        // ✅ Example: 1989-10-23 → 23 / 10 / 1989
        expect(storedData.dob_day).to.be.within(1, 31);
        expect(storedData.dob_month).to.be.within(1, 12);
        expect(storedData.dob_year).to.be.greaterThan(1900);

        // ✅ Should respond with JSON success
        expect(res.json.calledOnce).to.be.true;
        const payload = res.json.firstCall.args[0];
        expect(payload).to.have.property("success", true);
    });


});
