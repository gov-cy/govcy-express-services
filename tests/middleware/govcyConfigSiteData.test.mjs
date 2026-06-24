import { expect } from "chai";
import sinon from "sinon";
import { serviceConfigDataMiddleware } from "../../src/middleware/govcyConfigSiteData.mjs";
import { getServiceConfigData } from "../../src/utils/govcyLoadConfigData.mjs";

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

    expect(req.serviceData.site.id).to.be.equal("test");
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

  it("4. should set Matomo userId when authenticated user has a sub", async () => {
    req.session = {
      user: {
        sub: "abc"
      }
    };

    await serviceConfigDataMiddleware(req, res, next);

    expect(req.serviceData.site.matomo.userId).to.exist;
    expect(req.serviceData.site.matomo.userId).to.be.a("string");
    expect(req.serviceData.site.matomo.userId).to.not.equal("abc");

    expect(next.calledOnce).to.be.true;
  });

  it("5. should not set Matomo userId when authenticated user has no sub", async () => {
    req.session = {
      user: {}
    };

    await serviceConfigDataMiddleware(req, res, next);

    expect(req.serviceData.site.matomo).to.not.have.property("userId");
    expect(next.calledOnce).to.be.true;
  });

  it("6. should trim user sub before generating Matomo userId", async () => {
    req.session = {
      user: {
        sub: "  abc  "
      }
    };

    await serviceConfigDataMiddleware(req, res, next);

    const expectedService = getServiceConfigData("test", "en", "abc");

    expect(req.serviceData.site.matomo.userId)
      .to.equal(expectedService.site.matomo.userId);

    expect(next.calledOnce).to.be.true;
  });

  it("7. should not set Matomo userId when user sub is not a string", async () => {
    req.session = {
      user: {
        sub: 12345
      }
    };

    await serviceConfigDataMiddleware(req, res, next);

    expect(req.serviceData.site.matomo).to.not.have.property("userId");
    expect(next.calledOnce).to.be.true;
  });

  it("8. should not set Matomo userId when req.session is missing", async () => {
    delete req.session;

    await serviceConfigDataMiddleware(req, res, next);

    expect(req.serviceData.site.id).to.equal("test");
    expect(req.serviceData.site.matomo).to.not.have.property("userId");
    expect(res.cookie.calledWith("cs", "test")).to.be.true;
    expect(next.calledOnce).to.be.true;
  });

});
