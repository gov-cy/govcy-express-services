import { expect } from "chai";
import sinon from "sinon";
import { serviceConfigDataMiddleware } from "../../src/middleware/govcyConfigSiteData.mjs";

describe("serviceConfigDataMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { siteId: "test" },
      globalLang: "en"
    };

    res = {
      cookie: sinon.stub(),
      clearCookie: sinon.stub()
    };

    next = sinon.stub();
  });

  it("1. should load service data and set cookie if siteId exists", async () => {
    
    await serviceConfigDataMiddleware(req, res, next);

    expect(req.serviceData.site.id).to.be.equal("test" );
    expect(res.cookie.calledWith("cs", "test")).to.be.true;
    expect(next.calledOnce).to.be.true;
  });

  it("2. should have error if siteId is missing", async () => {
    req.params.siteId = '';

    await serviceConfigDataMiddleware(req, res, next);
    const error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("not found");
    expect(next.calledOnce).to.be.true;
  });

  it("3. should have error if siteId is not found", async () => {
    req.params.siteId = 'test-nonexistent';

    await serviceConfigDataMiddleware(req, res, next);
    const error = next.firstCall.args[0];
    expect(error).to.be.an("error");
    expect(error.message).to.include("not found");
    expect(next.calledOnce).to.be.true;
  });


});
