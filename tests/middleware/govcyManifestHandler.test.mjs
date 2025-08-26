import { expect } from "chai";
import sinon from "sinon";
import { govcyManifestHandler } from "../../src/middleware/govcyManifestHandler.mjs";

describe("govcyManifestHandler", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { siteId: "test-site" },
      serviceData: {
        site: {
          lang: "en",
          title: {
            en: "Test Service"
          },
          description: {
            en: "This is a test"
          },
          cdn: {
            dist: "https://cdn.test.gov.cy"
          }
        }
      }
    };

    res = {
      setHeader: sinon.stub(),
      json: sinon.stub()
    };

    next = sinon.stub();
  });

  it("1. should return manifest JSON with expected values", () => {
    const handler = govcyManifestHandler();
    handler(req, res, next);

    expect(res.setHeader.calledWith("Content-Type", "application/json")).to.be.true;
    expect(res.json.calledOnce).to.be.true;

    const manifest = res.json.firstCall.args[0];

    expect(manifest.name).to.equal("Test Service");
    expect(manifest.short_name).to.equal("Test Service");
    expect(manifest.description).to.equal("This is a test");
    expect(manifest.icons).to.be.an("array").with.lengthOf(3);
    expect(manifest.start_url).to.equal("/test-site/index");
    expect(manifest.scope).to.equal("/test-site/");
  });

  it("2. should call next(error) if an exception is thrown", () => {
  delete req.serviceData; // Force a crash inside the try block

  const handler = govcyManifestHandler();
  handler(req, res, next);

  expect(next.calledOnce).to.be.true;
  const error = next.firstCall.args[0];
  expect(error).to.be.an("error");
});

});
