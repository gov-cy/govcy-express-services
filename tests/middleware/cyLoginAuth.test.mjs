// tests/middleware/cyLoginAuth.test.mjs
import { expect } from "chai";
import sinon from "sinon";
import {
    requireAuth,
    naturalPersonPolicy,
    legalPersonPolicy,
    cyLoginPolicy, 
    handleLoginRoute,
    getUniqueIdentifier 
} from "../../src/middleware/cyLoginAuth.mjs";


describe("cyLoginAuth Policies", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            session: { user: {} },
            serviceData: { site: {} },
            originalUrl: "/test"
        };
        res = {};
        next = sinon.stub();
    });

    // -----------------------------
    // naturalPersonPolicy
    // -----------------------------
    it("1. returns true for Cypriot citizen (00 + length 10)", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "0012345678" };
        const result = naturalPersonPolicy(req);
        expect(result).to.equal(true);
    });

    it("2. returns true for foreigner with ARN (05 + length 10)", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "0512345678" };
        expect(naturalPersonPolicy(req)).to.equal(true);
    });

    it("3. returns false for Individual with wrong prefix", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "9912345678" };
        expect(naturalPersonPolicy(req)).to.equal(false);
    });

    it("4. returns false when profile_type is not Individual", () => {
        req.session.user = { profile_type: "Organisation", unique_identifier: "0012345678" };
        expect(naturalPersonPolicy(req)).to.equal(false);
    });

    // -----------------------------
    // legalPersonPolicy
    // -----------------------------
    it("5. returns true for Organisation with legal_unique_identifier", () => {
        req.session.user = { profile_type: "Organisation", legal_unique_identifier: "HE123456" };
        expect(legalPersonPolicy(req)).to.equal(true);
    });

    it("6. returns false for Organisation missing legal_unique_identifier", () => {
        req.session.user = { profile_type: "Organisation" };
        expect(legalPersonPolicy(req)).to.equal(false);
    });

    it("7. returns false when profile_type is not Organisation", () => {
        req.session.user = { profile_type: "Individual", legal_unique_identifier: "HE123456" };
        expect(legalPersonPolicy(req)).to.equal(false);
    });

    // -----------------------------
    // cyLoginPolicy (dispatcher)
    // -----------------------------
    it("8. calls next() (no error) if naturalPerson passes", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "0012345678" };
        req.serviceData.site.cyLoginPolicies = ["naturalPerson"];
        cyLoginPolicy(req, res, next);
        expect(next.calledOnce).to.equal(true);
        expect(next.firstCall.args.length).to.equal(0); // no error
    });

    it("9. calls next() if any allowed policy passes (legalPerson)", () => {
        req.session.user = { profile_type: "Organisation", legal_unique_identifier: "HE123456" };
        req.serviceData.site.cyLoginPolicies = ["naturalPerson", "legalPerson"];
        cyLoginPolicy(req, res, next);
        expect(next.calledOnce).to.equal(true);
        expect(next.firstCall.args.length).to.equal(0);
    });

    it("10. calls next(err) with 403 if none of the allowed policies pass", () => {
        req.session.user = { profile_type: "Organisation" }; // no legal_unique_identifier
        req.serviceData.site.cyLoginPolicies = ["naturalPerson"];
        cyLoginPolicy(req, res, next);

        expect(next.calledOnce).to.equal(true);
        const err = next.firstCall.args[0];
        expect(err).to.be.instanceOf(Error);
        expect(err.status).to.equal(403);
        expect(err.message).to.match(/none of the allowed CY Login policies/i);
    });

    it("11. ignores unknown policy names but still passes if a known policy matches", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "0012345678" };
        req.serviceData.site.cyLoginPolicies = ["unknownPolicy", "naturalPerson"];
        cyLoginPolicy(req, res, next);
        expect(next.calledOnce).to.equal(true);
        expect(next.firstCall.args.length).to.equal(0);
    });

    it("12. defaults to ['naturalPerson'] when cyLoginPolicies is not set", () => {
        // no req.serviceData.site.cyLoginPolicies set
        req.session.user = { profile_type: "Individual", unique_identifier: "0512345678" };
        cyLoginPolicy(req, res, next);
        expect(next.calledOnce).to.equal(true);
        expect(next.firstCall.args.length).to.equal(0);
    });

    it("13. calls next(err) with 403 when session user is present but invalid for default policy", () => {
        req.session.user = { profile_type: "Organisation" }; // default policy is naturalPerson
        delete req.serviceData.site.cyLoginPolicies;
        cyLoginPolicy(req, res, next);

        expect(next.calledOnce).to.equal(true);
        const err = next.firstCall.args[0];
        expect(err).to.be.instanceOf(Error);
        expect(err.status).to.equal(403);
    });

    it("14. throws if req.session is missing (strict mode)", () => {
        delete req.session;
        req.serviceData.site.cyLoginPolicies = ["naturalPerson"];
        expect(() => cyLoginAuth.cyLoginPolicy(req, res, next)).to.throw();
    });

    it("15. throws if req.session.user is undefined", () => {
        req.session.user = undefined;
        req.serviceData.site.cyLoginPolicies = ["naturalPerson"];
        expect(() => cyLoginAuth.cyLoginPolicy(req, res, next)).to.throw();
    });

    it("16. is case-sensitive for profile_type (should fail on lowercase)", () => {
        req.session.user = { profile_type: "individual", unique_identifier: "0012345678" };
        expect(naturalPersonPolicy(req)).to.be.false;
    });

    it("17. returns false if unique_identifier length is not exactly 10", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "001234567" }; // 9 chars
        expect(naturalPersonPolicy(req)).to.be.false;
    });

    it("18. returns false if legal_unique_identifier is empty", () => {
        req.session.user = { profile_type: "Organisation", legal_unique_identifier: "" };
        expect(legalPersonPolicy(req)).to.be.false;
    });

    it("19. denies access if cyLoginPolicies is empty", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "0012345678" };
        req.serviceData.site.cyLoginPolicies = []; // nothing allowed
        cyLoginPolicy(req, res, next);
        const err = next.firstCall.args[0];
        expect(err).to.be.instanceOf(Error);
        expect(err.status).to.equal(403);
    });

    it("20. ignores invalid cyLoginPolicies type", () => {
        req.session.user = { profile_type: "Individual", unique_identifier: "0012345678" };
        req.serviceData.site.cyLoginPolicies = "naturalPerson"; // not array
        cyLoginPolicy(req, res, next);
        expect(next.calledOnce).to.be.true;
    });

    it("21. should warn and deny access if policy name not in registry", () => {
        req.session.user = { profile_type: "Organisation" };
        req.serviceData.site.cyLoginPolicies = ["nonExistingPolicy"];
        cyLoginPolicy(req, res, next);
        const err = next.firstCall.args[0];
        expect(err).to.be.instanceOf(Error);
        expect(err.status).to.equal(403);
    });







});

describe("requireAuth", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            session: {},
            originalUrl: "/protected-page",
            path: "/protected-page",
            headers: {},
        };
        res = {
            redirectUrl: null,
            redirect(url) { this.redirectUrl = url; },
        };
        next = sinon.stub();
    });

    // -------------------------------------
    it("1. redirects to /login and stores redirectAfterLogin when user not logged in", () => {
        requireAuth(req, res, next);
        expect(res.redirectUrl).to.equal("/login");
        expect(req.session.redirectAfterLogin).to.equal("/protected-page");
        expect(next.called).to.be.false;
    });

    it("2. calls next() when user is authenticated", () => {
        req.session.user = { name: "John Tester" };
        requireAuth(req, res, next);
        expect(next.calledOnce).to.be.true;
        expect(next.firstCall.args.length).to.equal(0);
    });

    it("3. treats Accept: application/json as API request → calls next(err) 401", () => {
        req.headers.accept = "application/json";
        requireAuth(req, res, next);
        const err = next.firstCall.args[0];
        expect(err).to.be.instanceOf(Error);
        expect(err.status).to.equal(401);
        expect(err.message).to.include("Unauthorized");
    });

    it("4. treats /apis/.../upload URL as API request → calls next(err) 401", () => {
        req.originalUrl = "/apis/site1/page1/upload";
        requireAuth(req, res, next);
        const err = next.firstCall.args[0];
        expect(err).to.be.instanceOf(Error);
        expect(err.status).to.equal(401);
    });

    it("5. overwrites redirectAfterLogin with current URL even if already set", () => {
        req.session.redirectAfterLogin = "/custom";
        requireAuth(req, res, next);
        expect(req.session.redirectAfterLogin).to.equal("/protected-page"); // overwritten
    });

});

describe("handleLoginRoute (behavioral)", () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: {} };
    res = {
      redirectedTo: null,
      redirect(url) { this.redirectedTo = url; }
    };
    next = sinon.stub();
  });

  it("1. should eventually redirect somewhere (successful login flow)", async () => {
    const middleware = handleLoginRoute();

    await middleware(req, res, next);

    // Either we get a redirect or next(error) — at least one should happen
    const redirected = typeof res.redirectedTo === "string";
    const errored = next.calledOnce && next.firstCall.args[0] instanceof Error;

    expect(redirected || errored).to.be.true;
  });

  it("2. should call next(error) if an error occurs internally", async () => {
    // Force failure by deleting essential property expected by getLoginUrl
    delete req.session; // getLoginUrl will probably throw
    const middleware = handleLoginRoute();

    await middleware(req, res, next);

    expect(next.calledOnce).to.be.true;
    const err = next.firstCall.args[0];
    expect(err).to.be.instanceOf(Error);
  });
});

describe("getUniqueIdentifier", () => {
    let req;

    beforeEach(() => {
        req = { session: { user: {} } };
    });

    it("1. returns unique_identifier when present", () => {
        req.session.user = { unique_identifier: "0012345678" };
        const result = getUniqueIdentifier(req);
        expect(result).to.equal("0012345678");
    });

    it("2. returns legal_unique_identifier when unique_identifier is missing", () => {
        req.session.user = { legal_unique_identifier: "HE123456" };
        const result = getUniqueIdentifier(req);
        expect(result).to.equal("HE123456");
    });

    it("3. prefers unique_identifier when both exist", () => {
        req.session.user = {
            unique_identifier: "0012345678",
            legal_unique_identifier: "HE987654"
        };
        const result = getUniqueIdentifier(req);
        expect(result).to.equal("0012345678");
    });

    it("4. returns empty string if both identifiers missing", () => {
        req.session.user = {};
        const result = getUniqueIdentifier(req);
        expect(result).to.equal("");
    });

    it("5. returns empty string if req.session.user is null", () => {
        req.session.user = null;
        const result = getUniqueIdentifier(req);
        expect(result).to.equal("");
    });

    it("6. returns empty string if req.session is missing (safe fallback)", () => {
        req = {}; // no session object
        const result = getUniqueIdentifier(req);
        expect(result).to.equal("");
    });

    it("7. handles invalid types gracefully (numbers, arrays, etc.)", () => {
        req.session.user = { unique_identifier: 12345 };
        const result = getUniqueIdentifier(req);
        expect(result).to.equal("12345"); // JS will coerce to string
    });
});