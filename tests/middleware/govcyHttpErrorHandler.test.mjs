import { expect } from "chai";
import { govcyHttpErrorHandler } from "../../src/middleware/govcyHttpErrorHandler.mjs";

describe("govcyHttpErrorHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            originalUrl: "/not-found",
            globalLang: "en",
            session: {
                siteData: {
                    "test-site": {
                        user: {
                            name: "John Tester"
                        }
                    }
                }
            }
        };

        res = {
            statusCode: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            send: function (html) {
                this._sentHtml = html;
            },
            json: function (json) {
                this._sentJson = json;
            }
        };

        next = () => { };
    });

    it("1. should render 404 error page for non-API request", () => {
        const err = { status: 404, message: "Page not found" };

        govcyHttpErrorHandler(err, req, res, next);

        expect(res.statusCode).to.equal(404);
        expect(res._sentHtml).to.include("Page not found");
        expect(res._sentJson).to.be.undefined;
    });

    it("2. should return JSON error for API request", () => {
        const err = { status: 403, message: "Invalid CSRF token" };

        // Simulate API request
        req.originalUrl = "/apis/site1/page1/upload";
        req.path = "/apis/site1/page1/upload";

        govcyHttpErrorHandler(err, req, res, next);

        expect(res.statusCode).to.equal(403);
        expect(res._sentJson).to.be.an("object");
        expect(res._sentJson.ErrorCode).to.equal(403);
        expect(res._sentJson.ErrorMessage).to.include("Forbidden");
        expect(res._sentHtml).to.be.undefined;
    });

    it("3. should default to 500 error and render generic error page", () => {
        const err = new Error("Something unexpected happened"); // No status
        delete err.status; // Explicitly ensure status is missing

        govcyHttpErrorHandler(err, req, res, next);

        expect(res.statusCode).to.equal(500);
        expect(res._sentHtml).to.include("there is a problem with the service"); // 500 page title
    });

    it("4. should render 403 error with natural-only policy body if message matches", () => {
        const err = new Error("Access Denied: natural person policy not met.");
        err.status = 403;

        govcyHttpErrorHandler(err, req, res, next);

        expect(res.statusCode).to.equal(403);
        expect(res._sentHtml).to.include("only allowed to individuals with a verified profile"); // Natural-only body
    });

    it("5. should render generic 403 error if message does not match natural-only policy", () => {
        const err = new Error("Generic 403 error");
        err.status = 403;

        govcyHttpErrorHandler(err, req, res, next);

        expect(res.statusCode).to.equal(403);
        expect(res._sentHtml).to.include("Sign out"); // Generic 403 text
    });

    it("6. should render 500 error page for internal errors", () => {
        const err = new Error("Unexpected failure");
        err.status = 500;

        govcyHttpErrorHandler(err, req, res, next);

        expect(res.statusCode).to.equal(500);
        expect(res._sentHtml).to.include("there is a problem with the service"); // Error 500 message
    });

    it("7. should include user name section when user is logged in", () => {
        const err = { status: 404, message: "Page not found" };

        // Simulate a session with a logged-in user
        req.session.user = { name: "John Tester" };

        govcyHttpErrorHandler(err, req, res, next);

        expect(res.statusCode).to.equal(404);
        expect(res._sentHtml).to.be.a("string");
        // The rendered HTML should contain the user's name (from userNameSection)
        expect(res._sentHtml).to.include("John Tester");
    });

});
