import { expect } from "chai";
import { govcyLanguageMiddleware } from "../../src/middleware/govcyLanguageMiddleware.mjs";

describe("govcyLanguageMiddleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            query: { lang: "en" },
            cookies: {}
        };

        res = {
            cookie: (name, value, options) => {
                res._cookie = { name, value, options };
            }
        };

        next = () => { next.called = true };
        next.called = false;
    });

    it("1. should set language from query and set cookie", () => {
        govcyLanguageMiddleware(req, res, next);

        expect(req.globalLang).to.equal("en");
        expect(res._cookie).to.deep.include({ name: "lang", value: "en" });
        expect(next.called).to.be.true;
    });

    it("2. should set language from cookie if no query param", () => {
        req.query = {}; // no query param
        req.cookies = { lang: "en" }; // cookie present

        govcyLanguageMiddleware(req, res, next);

        expect(req.globalLang).to.equal("en");
        expect(res._cookie).to.be.undefined; // should NOT set a new cookie
        expect(next.called).to.be.true;
    });

    it("3. should default to 'el' if no query param or cookie", () => {
        req.query = {};     // no lang in query
        req.cookies = {};   // no lang in cookie

        govcyLanguageMiddleware(req, res, next);

        expect(req.globalLang).to.equal("el"); // default
        expect(res._cookie).to.be.undefined;   // no cookie set
        expect(next.called).to.be.true;
    });

});
