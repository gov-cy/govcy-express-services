import { expect } from "chai";
import sinon from "sinon";
import { govcyCsrfMiddleware } from "../../src/middleware/govcyCsrf.mjs";

describe("govcyCsrfMiddleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            session: {},
            method: "GET",
            headers: {},
        };

        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };

        next = sinon.stub();
    });

    it("1. should generate a CSRF token on first request", () => {
        govcyCsrfMiddleware(req, res, next);

        expect(req.session.csrfToken).to.be.a("string");
        expect(req.csrfToken()).to.equal(req.session.csrfToken);
        expect(next.calledOnce).to.be.true;
    });

    it("2. should reject POST with invalid CSRF token in body", () => {
        req.method = "POST";
        req.headers["content-type"] = "application/x-www-form-urlencoded"; // not multipart
        req.session.csrfToken = "valid-token";
        req.body = { _csrf: "invalid-token" };

        govcyCsrfMiddleware(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("Invalid CSRF token");
        expect(error.status).to.equal(403);
    });

    it("3. should accept POST with valid CSRF token in body", () => {
        req.method = "POST";
        req.headers["content-type"] = "application/x-www-form-urlencoded";
        req.session.csrfToken = "valid-token";
        req.body = { _csrf: "valid-token" };

        govcyCsrfMiddleware(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(next.firstCall.args[0]).to.be.undefined;
    });


    it("4. should reject multipart API POST with invalid CSRF token", () => {
        req.method = "POST";
        req.headers["content-type"] = "multipart/form-data";
        req.session.csrfToken = "valid-token";
        req.get = (header) => {
            if (header === "X-CSRF-Token") return "invalid-token";
            return undefined;
        };

        // Fake that it is an API request
        req.originalUrl = "/apis/site1/page1/upload";
        req.path = "/apis/site1/page1/upload"; // or anything your isApiRequest() uses internally

        govcyCsrfMiddleware(req, res, next);

        expect(res.status.calledWith(400)).to.be.true;
        expect(res.json.calledOnce).to.be.true;

        const jsonResponse = res.json.firstCall.args[0];
        expect(jsonResponse.ErrorCode).to.equal(403);
        expect(jsonResponse.ErrorMessage).to.include("Invalid CSRF token");
    });

    it("5. should accept multipart API POST with valid CSRF token", () => {
        req.method = "POST";
        req.headers["content-type"] = "multipart/form-data";
        req.session.csrfToken = "valid-token";
        req.get = (header) => {
            if (header === "X-CSRF-Token") return "valid-token";
            return undefined;
        };

        // Simulate API detection
        req.originalUrl = "/apis/site1/page1/upload";
        req.path = "/apis/site1/page1/upload";

        govcyCsrfMiddleware(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(next.firstCall.args[0]).to.be.undefined;
    });

    it("6. should call next() on non-POST requests", () => {
        req.method = "GET"; // could be HEAD, OPTIONS, etc.
        delete req.body; // irrelevant for GET
        delete req.headers["content-type"]; // irrelevant

        govcyCsrfMiddleware(req, res, next);

        expect(req.session.csrfToken).to.be.a("string"); // still generates token
        expect(next.calledOnce).to.be.true;
        expect(next.firstCall.args[0]).to.be.undefined;
    });



});
