import { expect } from "chai";
import { tempSaveIfConfigured } from "../../src/utils/govcyTempSave.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";

// Env used by helper
process.env.CLIENT_KEY = "CLIENT_KEY";
process.env.SERVICE_ID = "SERVICE_ID";

describe("tempSaveIfConfigured (integration-ish, uses mock API)", () => {

  it("1. should be a no-op when submissionPutAPIEndpoint is missing", async () => {
    const store = { siteData: { site1: { inputData: {} } } };
    const service = { site: { /* no submissionPutAPIEndpoint */ } };

    await tempSaveIfConfigured(store, service, "site1");

    // no changes, no throws
    expect(store.siteData.site1.loadData).to.be.undefined;
  });

  it("2. should PUT stringified submission_data and merge Data into loadData", async () => {
    // Mock endpoint that returns { succeeded:true, data:{ referenceValue: "0000000924107836" } }
    process.env.PUT_URL = "http://localhost:3002/submissionData";

    const store = {};
    // seed some inputData so we can verify it’s read and stringified
    dataLayer.initializeSiteData(store, "site1", "index");
    store.siteData.site1.inputData.index.formData = {
      certificate_select: ["birth", "permanent_residence"]
    };

    const service = {
      site: {
        submissionPutAPIEndpoint: {
          url: "PUT_URL",
          method: "PUT",
          clientKey: "CLIENT_KEY",
          serviceId: "SERVICE_ID"
        }
      }
    };

    await tempSaveIfConfigured(store, service, "site1");

    // loadData should be created and include response.Data merged in
    const ld = dataLayer.getSiteLoadData(store, "site1");
    expect(ld).to.be.an("object");
    expect(ld.referenceValue).to.equal("0000000924107836");

    // optional sanity: inputData still intact (helper reads it; does not mutate it)
    expect(store.siteData.site1.inputData.index.formData).to.deep.equal({
      certificate_select: ["birth", "permanent_residence"]
    });
  });

  it("3. should not throw and should not modify loadData when Succeeded=false", async () => {
    // Mock endpoint that returns { succeeded:false, errorCode:401, ... }
    process.env.PUT_URL = "http://localhost:3002/error401";

    const store = {};
    dataLayer.initializeSiteData(store, "site1", "index");
    store.siteData.site1.inputData.index.formData = { email: "test@example.com" };

    const service = {
      site: {
        submissionPutAPIEndpoint: {
          url: "PUT_URL",
          method: "PUT",
          clientKey: "CLIENT_KEY",
          serviceId: "SERVICE_ID"
        }
      }
    };

    await tempSaveIfConfigured(store, service, "site1");

    // No throw; loadData remains undefined (no mutation on failure)
    console.log("Load data after failed temp save:", store.siteData.site1.loadData);
    expect(dataLayer.getSiteLoadData(store, 'site1')).to.deep.equal({});
  });

  it("4. should swallow HTTP/network errors (non-blocking) and not modify loadData", async () => {
    // bad URL in mock to force HTTP error
    process.env.PUT_URL = "http://localhost:3002/badURL";

    const store = {};
    dataLayer.initializeSiteData(store, "site1", "index");
    store.siteData.site1.inputData.index.formData = { email: "test@example.com" };

    const service = {
      site: {
        submissionPutAPIEndpoint: {
          url: "PUT_URL",
          method: "PUT",
          clientKey: "CLIENT_KEY",
          serviceId: "SERVICE_ID"
        }
      }
    };

    await tempSaveIfConfigured(store, service, "site1");

    expect(dataLayer.getSiteLoadData(store, 'site1')).to.deep.equal({});
  });

  it("5. should merge server Data into existing loadData without losing fields", async () => {
    process.env.PUT_URL = "http://localhost:3002/submissionData";

    const store = {};
    dataLayer.initializeSiteData(store, "site1", "index");
    store.siteData.site1.inputData.index.formData = { email: "merge@example.com" };

    // preset loadData to verify merge behavior
    dataLayer.storeSiteLoadData(store, "site1", { existing: "keep-me" });

    const service = {
      site: {
        submissionPutAPIEndpoint: {
          url: "PUT_URL",
          method: "PUT",
          clientKey: "CLIENT_KEY",
          serviceId: "SERVICE_ID"
        }
      }
    };

    await tempSaveIfConfigured(store, service, "site1");

    const ld = dataLayer.getSiteLoadData(store, "site1");
    expect(ld.referenceValue).to.equal("0000000924107836");
  });

});
