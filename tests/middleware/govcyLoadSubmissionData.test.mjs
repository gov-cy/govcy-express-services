import { expect } from "chai";
import { govcyLoadSubmissionData } from "../../src/middleware/govcyLoadSubmissionData.mjs";

describe("govcyLoadSubmissionData", () => {
  it("1. should call govcyLoadSubmissionDataAPIs and call next on success", async () => {
    const req = {
      params: { siteId: "test-site" },
      serviceData: { site: { name: "Test Service" } },
      session: {}
    };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    // This works because you already have mock API logic behind the real function
    const handler = govcyLoadSubmissionData();
    await handler(req, res, next);

    expect(nextCalled).to.be.true;
  });

    it("2. should catch errors and call next with error", async () => {
    const req = {
    //   params: { siteId: "test-site" },
      // ❌ Make serviceData invalid to trigger failure in the called function
      serviceData: null,
      session: {}
    };
    const res = {};
    let capturedError = null;
    const next = (error) => { capturedError = error; };

    const handler = govcyLoadSubmissionData();
    await handler(req, res, next);
    
    expect(capturedError).to.be.an("error");
    expect(capturedError.message).to.exist;
  });

});
