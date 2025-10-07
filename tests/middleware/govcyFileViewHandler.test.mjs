import { expect } from "chai";
import sinon from "sinon";
import { govcyFileViewHandler } from "../../src/middleware/govcyFileViewHandler.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";

describe("govcyFileViewHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                siteId: "test-site",
                pageUrl: "index",
                elementName: "upload"
            },
            serviceData: {
                site: {
                },
                pages: [
                    {
                        pageData: {
                            url: "index",
                            title: "Index",
                        },
                        pageTemplate: {
                            sections: [
                                {
                                    name: "main",
                                    elements: [
                                        {
                                            element: "form",
                                            params: {
                                                elements: [
                                                    {
                                                        element: "fileInput",
                                                        params: {
                                                            id: "upload",
                                                            name: "upload"
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            },
            session: {
                siteData: {
                    "test-site": {
                        inputData: {
                            "index": {
                                formData: {
                                    upload: {
                                        sha256: "valid-sha",
                                        fileId: "file-id-123"
                                    }
                                }
                            }
                        },
                        loadData: {
                            referenceValue: "ref-456"
                        }
                    }
                },
                user: {
                    access_token: "mock-token"
                }
            },
            originalUrl: "site/page/",
            _pageRedirectDepth: 0
        };

        res = {
            type: sinon.stub(),
            setHeader: sinon.stub(),
            send: sinon.stub()
        };

        next = sinon.stub();
    });

    it("1. should respond error `File download APU configuration not found`", async () => {
        const handler = govcyFileViewHandler(); // no DI needed
        await handler(req, res, next);

        // Check that an Error was passed to next
        const error = next.firstCall.args[0];
        expect(error).to.be.an('error');
        expect(error.message).to.include('File download APU configuration not found');
    });
    it("2. should return error if env vars are missing", async () => {
        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID",
        };

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("Missing environment variables");
    });

    it("3. should return error if file input is not found on the page", async () => {
        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID"
        };

        process.env.TEST_URL = "http://fake.url";
        process.env.TEST_CLIENT_KEY = "mock-client-key";
        process.env.TEST_SERVICE_ID = "mock-service-id";

        // Use a fileInput element name that doesn't exist in the page template
        req.params.elementName = "nonexistentElement";

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("File input [nonexistentElement] not allowed on this page");
    });

    it("4. should return error if reference number is missing", async () => {
        process.env.TEST_URL = "http://fake.url";
        process.env.TEST_CLIENT_KEY = "mock-client-key";
        process.env.TEST_SERVICE_ID = "mock-service-id";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID"
        };

        // 🔻 Remove the reference number from session
        delete req.session.siteData["test-site"].loadData.referenceValue;

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("Missing submission reference number");
    });

    it("5. should return error if file input data is missing", async () => {
        process.env.TEST_URL = "http://fake.url";
        process.env.TEST_CLIENT_KEY = "mock-client-key";
        process.env.TEST_SERVICE_ID = "mock-service-id";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID"
        };

        // ✅ Restore referenceValue
        req.session.siteData["test-site"].loadData.referenceValue = "ref-456";

        // 🔻 Invalidate the file input data
        req.session.siteData["test-site"].inputData.index.formData.upload = {
            sha256: undefined,
            fileId: undefined
        };

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("data not found on this page");
    });


    it("6. should respond with file and correct headers when successful (real API)", async () => {
        // Point to your real test API
        process.env.TEST_URL = "http://localhost:3002/fileDownload";
        process.env.TEST_CLIENT_KEY = "mock-client-key";
        process.env.TEST_SERVICE_ID = "mock-service-id";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            method: "GET",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID"
        };

        req.session.siteData["test-site"].loadData = {
            referenceValue: "ref-456"
        };

        req.session.siteData["test-site"].inputData.index.formData.upload = {
            sha256: "abc123",
            fileId: "file-xyz"
        };

        res.redirect = sinon.stub();

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        // Assertions
        expect(res.type.calledOnce).to.be.true;
        expect(res.setHeader.calledOnce).to.be.true;
        expect(res.send.calledOnce).to.be.true;

        const bufferSent = res.send.firstCall.args[0];
        expect(Buffer.isBuffer(bufferSent)).to.be.true;
        expect(bufferSent.length).to.be.greaterThan(0);
    });


    it("7. should return error when API returns Succeeded: false (401)", async () => {
        process.env.TEST_URL = "http://localhost:3002/fileDownloadError401";
        process.env.TEST_CLIENT_KEY = "mock-key";
        process.env.TEST_SERVICE_ID = "mock-service";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            method: "GET",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID"
        };

        req.session.siteData["test-site"].loadData = {
            referenceValue: "ref-456"
        };

        req.session.siteData["test-site"].inputData.index.formData.upload = {
            sha256: "abc123",
            fileId: "file-xyz"
        };

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("Unauthorized access");
    });

    it("8. should return error for unsupported MIME type", async () => {
        process.env.TEST_URL = "http://localhost:3002/fileDownloadBadMime";
        process.env.TEST_CLIENT_KEY = "mock-key";
        process.env.TEST_SERVICE_ID = "mock-service";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID"
        };

        req.session.siteData["test-site"].loadData = {
            referenceValue: "ref-456"
        };

        req.session.siteData["test-site"].inputData.index.formData.upload = {
            sha256: "sha123",
            fileId: "bad-mime-id"
        };

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("Invalid file type (MIME not allowed)");
    });

    it("9. should return error when magic bytes don't match MIME type", async () => {
        process.env.TEST_URL = "http://localhost:3002/fileDownloadBadMagic";
        process.env.TEST_CLIENT_KEY = "mock-key";
        process.env.TEST_SERVICE_ID = "mock-service";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            method: "GET",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID"
        };

        req.session.siteData["test-site"].loadData = {
            referenceValue: "ref-456"
        };

        req.session.siteData["test-site"].inputData.index.formData.upload = {
            sha256: "sha-bad",
            fileId: "bad-magic"
        };

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("magic byte mismatch");
    });

    it("10. should handle multipleThingsDraft mode correctly", async () => {
        req.originalUrl = "/apis/test-site/index/multiple/add/view-file/upload";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID",
        };
        process.env.TEST_URL = "http://localhost:3002/fileDownload";
        process.env.TEST_CLIENT_KEY = "mock-client-key";
        process.env.TEST_SERVICE_ID = "mock-service-id";

        // ✅ Use the API to set the draft for pageUrl "index"
        dataLayer.setMultipleDraft(
            req.session,
            "test-site",
            "index",
            { upload: { sha256: "abc123", fileId: "file-xyz" } } // use the known-good pair
        );

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        expect(res.send.calledOnce).to.be.true;
    });


    it("11. should handle multipleThingsEdit mode correctly", async () => {
        req.originalUrl = "/apis/test-site/index/multiple/edit/0/view-file/upload";
        req.params.index = "0";

        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID",
        };
        process.env.TEST_URL = "http://localhost:3002/fileDownload";
        process.env.TEST_CLIENT_KEY = "mock-client-key";
        process.env.TEST_SERVICE_ID = "mock-service-id";

        // items[index][elementName]
        req.session.siteData["test-site"].inputData.index = {
            formData: [{ upload: { sha256: "abc123", fileId: "file-xyz" } }]
        };

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        expect(res.send.calledOnce).to.be.true;
    });



    it("12. should reject single mode file view on multipleThings page", async () => {
        req.serviceData.pages[0].multipleThings = true;
        req.serviceData.site.fileDownloadAPIEndpoint = {
            url: "TEST_URL",
            clientKey: "TEST_CLIENT_KEY",
            serviceId: "TEST_SERVICE_ID",
        };

        process.env.TEST_URL = "http://localhost:3002/fileDownload";
        process.env.TEST_CLIENT_KEY = "mock-key";
        process.env.TEST_SERVICE_ID = "mock-service";

        const handler = govcyFileViewHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error.message).to.include("Single mode file view not allowed");
    });




});
