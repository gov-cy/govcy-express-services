import { expect } from "chai";
import { govcyLoadSubmissionDataAPIs } from "../../src/utils/govcyLoadSubmissionDataAPIs.mjs";

// Set up environment variables for the test
process.env.CLIENT_KEY = "CLIENT_KEY";
process.env.SERVICE_ID = "SERVICE_ID";

describe("govcyLoadSubmissionDataAPIs (integration, real API)", () => {
    it("1. should store data from GET if GET returns data", async () => {
        // Set up environment variables for the test
        process.env.GET_URL = "http://localhost:3002/submissionData";
        process.env.PUT_URL = "http://localhost:3002/submissionData";
        const store = {};
        let calledNext = false;
        const next = (err) => { if (err) throw err; calledNext = true; };
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };
        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);
        // ✅ Check loadData is populated
        expect(store.siteData.submissionData.loadData).to.have.property("submissionId");
        expect(store.siteData.submissionData.loadData.referenceValue).to.equal("0000000924107836");

        // ✅ Check inputData is hydrated from submissionData
        expect(store.siteData.submissionData.inputData).to.have.property("index");
        expect(store.siteData.submissionData.inputData.index).to.have.property("formData");
        expect(store.siteData.submissionData.inputData.index.formData).to.deep.equal({
            certificate_select: ["birth", "permanent_residence"]
        });

        expect(calledNext).to.be.true;
    });

    
    it("2. should PUT data if GET returns NO data", async () => {
        // Set up environment variables for the test
        process.env.GET_URL = "http://localhost:3002/submissionEmpty";
        process.env.PUT_URL = "http://localhost:3002/submissionData";
        const store = {};
        let calledNext = false;
        const next = (err) => { if (err) throw err; calledNext = true; };
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    method: "GET",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    method: "PUT",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };
        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);
        expect(store.siteData.submissionData.loadData).to.not.have.property("submission_id");
        expect(store.siteData.submissionData.loadData.referenceValue).to.equal("0000000924107836");
        expect(calledNext).to.be.true;
    });

    it("3. should skip API calls if data already exists in store", async () => {
        const store = {
            siteData: {
                submissionData: {
                    loadData: { already: "here" }
                }
            }
        };
        let calledNext = false;
        const next = (err) => { if (err) throw err; calledNext = true; };
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };
        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);
        expect(store.siteData.submissionData.loadData).to.deep.equal({ already: "here" });
        expect(calledNext).to.be.true;
    });
    
    it("4. should call next() and not modify store if required endpoint config is missing", async () => {
        const store = {};
        let calledNext = false;
        const next = (err) => { if (err) throw err; calledNext = true; };

        // Omit clientKey from GET endpoint
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    // clientKey: "CLIENT_KEY", // missing!
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };

        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);

        // Should not add any data to store
        expect(store.siteData).to.be.undefined;
        expect(calledNext).to.be.true;
    });

    it("5. should call next() and not modify store if required GET returns nad HTTPstatus ", async () => {
        // Set up environment variables for the test
        process.env.GET_URL = "http://localhost:3002/badURL";
        process.env.PUT_URL = "http://localhost:3002/submissionData";
        const store = {};
        let calledNext = false;
        let caughtError = null;

        const next = (err) => {
            if (err) {
                caughtError = err; // Save error to inspect if needed
            }
            calledNext = true;
        };

        // Omit clientKey from GET endpoint
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };

        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);

        expect(calledNext).to.be.true;
        // Should not add any data to store
        expect(store.siteData).to.be.undefined;
        // Optionally: assert specific error message or status code
        expect(caughtError).to.be.an("error");
        expect(caughtError.message).to.include("Bad request"); // or just `.to.exist`
    });
    it("6. should call next() and not modify store if required GET returns succeeded false ", async () => {
        // Set up environment variables for the test
        process.env.GET_URL = "http://localhost:3002/error102";
        process.env.PUT_URL = "http://localhost:3002/submissionData";
        const store = {};
        let calledNext = false;
        let caughtError = null;

        const next = (err) => {
            if (err) {
                caughtError = err; // Save error to inspect if needed
            }
            calledNext = true;
        };

        // Omit clientKey from GET endpoint
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };

        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);

        expect(calledNext).to.be.true;
        // Should not add any data to store
        expect(store.siteData).to.be.undefined;
        // Optionally: assert specific error message or status code
        expect(caughtError).to.be.an("error");
        expect(caughtError.message).to.include("returned succeeded false"); // or just `.to.exist`
    });

    it("7. should call next() and not modify store if required POST returns nad HTTPstatus ", async () => {
        // Set up environment variables for the test
        process.env.GET_URL = "http://localhost:3002/submissionEmpty";
        process.env.PUT_URL = "http://localhost:3002/badURL";
        const store = {};
        let calledNext = false;
        let caughtError = null;

        const next = (err) => {
            if (err) {
                caughtError = err; // Save error to inspect if needed
            }
            calledNext = true;
        };

        // Omit clientKey from GET endpoint
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    method: "GET",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    method: "PUT",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };

        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);

        expect(calledNext).to.be.true;
        // Should not add any data to store
        expect(store.siteData).to.be.undefined;
        // Optionally: assert specific error message or status code
        expect(caughtError).to.be.an("error");
        expect(caughtError.message).to.include("Bad request"); // or just `.to.exist`
    });
    
    it("8. should call next() and not modify store if required GET returns succeeded false ", async () => {
        // Set up environment variables for the test
        process.env.GET_URL = "http://localhost:3002/submissionEmpty";
        process.env.PUT_URL = "http://localhost:3002/error401";
        const store = {};
        let calledNext = false;
        let caughtError = null;

        const next = (err) => {
            if (err) {
                caughtError = err; // Save error to inspect if needed
            }
            calledNext = true;
        };

        // Omit clientKey from GET endpoint
        const service = {
            site: {
                submissionGetAPIEndpoint: {
                    url: "GET_URL",
                    method: "GET",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                },
                submissionPutAPIEndpoint: {
                    url: "PUT_URL",
                    method: "PUT",
                    clientKey: "CLIENT_KEY",
                    serviceId: "SERVICE_ID"
                }
            }
        };

        await govcyLoadSubmissionDataAPIs(store, service, "submissionData", next);

        expect(calledNext).to.be.true;
        // Should not add any data to store
        expect(store.siteData).to.be.undefined;
        // Optionally: assert specific error message or status code
        expect(caughtError).to.be.an("error");
        expect(caughtError.message).to.include("Unauthorized access"); // or just `.to.exist`
    });
});


    