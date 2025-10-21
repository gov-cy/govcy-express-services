import { expect } from "chai";
import sinon from "sinon";
import { govcyFileDeletePageHandler, govcyFileDeletePostHandler } from "../../src/middleware/govcyFileDeleteHandler.mjs";

describe("govcyFileDeletePageHandler & govcyFileDeletePostHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                siteId: "test-site",
                pageUrl: "index",
                elementName: "upload"
            },
            query: {},
            serviceData: {
                site: {
                    name: "test-service"
                },
                pages: [
                    {
                        pageData: {
                            url: "index",
                            title: "Index"
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
                                                            name: "upload",
                                                            label: {
                                                                en: "Test File",
                                                                el: "Αρχείο Δοκιμής"
                                                            }
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
                            index: {
                                formData: {
                                    upload: {
                                        fileId: "abc123",
                                        sha256: "xyz987"
                                    }
                                }
                            }
                        },
                        user: {
                            name: "Mock User"
                        }
                    }
                }
            },
            originalUrl: "site/page/",
            csrfToken: () => "mock-csrf"
        };

        res = {
            redirect: sinon.stub()
        };

        next = sinon.stub();
    });

    it("1. GET should call next and populate req.processedPage on success", async () => {
        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(req.processedPage).to.be.an("object");
        expect(req.processedPage.pageData.pageData.title.en).to.include("Test File");
        expect(req.processedPage.pageTemplate.sections).to.be.an("array");
        expect(req.processedPage.pageTemplate.sections[0].elements[0].element).to.include("backLink");
        expect(req.processedPage.pageTemplate.sections[1].elements[0].element).to.include("form");
        expect(req.processedPage.pageTemplate.sections[1].elements[0].params.elements[0].element).to.include("radio");
        expect(req.processedPage.pageTemplate.sections[1].elements[0].params.elements[1].element).to.include("button");
    });

    it("2. GET should redirect if page condition evaluates to true", async () => {
        // Inject condition directly into the page config
        req.serviceData.pages[0].pageData.conditions = [
            {
                expression: "true",
                redirect: "some-other-page"
            }
        ];

        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("some-other-page");
    });

    it("3. GET should error if file input element not found on page", async () => {


        // 🔥 Remove the fileInput element from the page
        req.serviceData.pages[0].pageTemplate.sections[0].elements[0].params.elements = [];

        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("File input [upload] not allowed on this page");
    });

    it("4. GET should error if file input has no label", async () => {
        // Remove label
        req.serviceData.pages[0].pageTemplate.sections[0].elements[0].params.elements[0].params.label = undefined;

        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("File input [upload] does not have a label");
    });

    it("5. GET should error if file input data is not found in session", async () => {
        // Remove the file input session data
        delete req.session.siteData["test-site"].inputData.index.formData.upload;

        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        // ✅ Expect a redirect instead of an error
        expect(res.redirect.calledOnce).to.be.true;
        expect(res.redirect.firstCall.args[0]).to.equal(`/test-site/index`);
        expect(next.called).to.be.false; // should not call next with an error anymore
    });

    it("6. GET should include validation error summary when hasError is set", async () => {
        req.query.hasError = "1";

        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        expect(next.calledOnce).to.be.true;

        const formElement = req.processedPage.pageTemplate.sections[1].elements.find(
            el => el.element === "form"
        );

        const radioEl = formElement.params.elements[0];
        expect(radioEl.element).to.equal("radios");
        expect(radioEl.params.error).to.be.a("object");

        const summarySection = req.processedPage.pageTemplate.sections[1].elements.find(
            el => el.element === "errorSummary"
        );
        expect(summarySection).to.exist;
        expect(summarySection.params.errors[0].link).to.equal("#deleteFile-option-1");
        expect(summarySection.params.errors[0].text.en).to.include("Select if you want to delete the file");

    });

    it("7. POST should remove file from session and redirect if deleteFile is 'yes'", async () => {

        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };

        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/success"; // or any dummy
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        process.env.TEST_SUBMISSION_DSF_GTW_KEY = "x";

        req.body = { deleteFile: "yes" };
        console.log("Session before delete:", JSON.stringify(req.session.siteData["test-site"].inputData.index.formData, null, 2));
        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        const fileData = req.session.siteData["test-site"].inputData.index.formData.upload;
        console.log("Session after delete:", JSON.stringify(req.session.siteData["test-site"].inputData.index.formData, null, 2));
        expect(fileData).to.equal("");

        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.equal("/test-site/index");
    });

    it("8. POST should redirect with error if deleteFile is missing", async () => {
        // in test setup:
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };

        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/success"; // or any dummy
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        process.env.TEST_SUBMISSION_DSF_GTW_KEY = "x";
        req.body = {}; // 🔥 no deleteFile

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        expect(res.redirect.calledOnce).to.be.true;

        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("hasError=1");
        expect(redirectUrl).to.include("/test-site/index/delete-file/upload");
    });

    it("9. POST should redirect without deleting if deleteFile is 'no'", async () => {
        // in test setup:
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };

        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/success"; // or any dummy
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        process.env.TEST_SUBMISSION_DSF_GTW_KEY = "x";
        req.body = { deleteFile: "no" };

        const fileBefore = JSON.parse(JSON.stringify(
            req.session.siteData["test-site"].inputData.index.formData.upload
        ));

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        const fileAfter = req.session.siteData["test-site"].inputData.index.formData.upload;
        expect(fileAfter).to.deep.equal(fileBefore); // ✅ unchanged

        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.equal("/test-site/index");
    });

    it("10. POST should preserve route=review in redirect", async () => {
        // in test setup:
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };

        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/success"; // or any dummy
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        process.env.TEST_SUBMISSION_DSF_GTW_KEY = "x";
        req.query.route = "review";
        req.body = { deleteFile: "yes" };

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        expect(res.redirect.calledOnce).to.be.true;

        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("/test-site/index");
        expect(redirectUrl).to.include("route=review");
    });

    it("11. POST should return error if file input element is not found", async () => {
        req.body = { deleteFile: "yes" };

        // 🔥 Remove fileInput element from page template
        req.serviceData.pages[0].pageTemplate.sections[0].elements[0].params.elements = [];

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("File input [upload] not allowed on this page");
    });

    it("12. POST should redirect if page condition evaluates to true", async () => {
        req.body = { deleteFile: "yes" };

        // Inject a condition that evaluates to true
        req.serviceData.pages[0].pageData.conditions = [
            {
                expression: "true",
                redirect: "redirected-from-post"
            }
        ];

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        expect(res.redirect.calledOnce).to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.include("redirected-from-post");
    });

    it("13. POST should not delete and fail if fileDeleteAPIEndpoint config is missing", async () => {
        // Ensure endpoint is NOT configured
        delete req.serviceData.site.fileDeleteAPIEndpoint;

        const before = JSON.parse(JSON.stringify(
            req.session.siteData["test-site"].inputData.index.formData.upload
        ));

        req.body = { deleteFile: "yes" };

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        // No redirect on config error, should call next(err)
        expect(res.redirect.called).to.be.false;
        expect(next.calledOnce).to.be.true;

        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        // tolerate possible typo 'APU' vs 'API'
        expect(err.message).to.match(/File delete (APU|API) configuration not found/i);
        expect(err.status || err.statusCode || err.code).to.satisfy(v => (v === 404) || v == null);

        // File must remain untouched
        const after = req.session.siteData["test-site"].inputData.index.formData.upload;
        expect(after).to.deep.equal(before);
    });

    it("14. POST should not delete and fail if required env vars are missing", async () => {
        // Endpoint configured, but env URL/clientKey intentionally missing
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",          // will remain unset in process.env
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY", // also unset
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };
        delete process.env.TEST_DELETE_FILE_API_URL;
        delete process.env.TEST_SUBMISSION_API_CLIENT_KEY;

        const before = JSON.parse(JSON.stringify(
            req.session.siteData["test-site"].inputData.index.formData.upload
        ));

        req.body = { deleteFile: "yes" };

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        // Should surface error via next(err), not redirect
        expect(res.redirect.called).to.be.false;
        expect(next.calledOnce).to.be.true;

        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        // your code message suggests "Missing environment variables for upload" (keep it loose)
        expect(err.message).to.match(/Missing environment variables/i);
        expect(err.status || err.statusCode || err.code).to.satisfy(v => (v === 404) || v == null);

        // File must remain untouched
        const after = req.session.siteData["test-site"].inputData.index.formData.upload;
        expect(after).to.deep.equal(before);
    });



    it("15. POST should remove same physical file from other pages (site-wide)", async () => {
        // Add another page that references the same file
        req.serviceData.pages.push({
            pageData: { url: "another-page", title: "Another" },
            pageTemplate: {
                sections: [
                    {
                        name: "main", elements: [
                            {
                                element: "form", params: {
                                    elements: [
                                        { element: "fileInput", params: { id: "upload2", name: "upload2", label: { en: "Another File", el: "Άλλο Αρχείο" } } }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        });
        // Put same file ref there
        req.session.siteData["test-site"].inputData["another-page"] = {
            formData: { upload2: { fileId: "abc123", sha256: "xyz987" } }
        };

        // Success endpoint
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };
        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/fileDelete";
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        process.env.TEST_SUBMISSION_DSF_GTW_KEY = "x";

        req.body = { deleteFile: "yes" };
        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        // original page cleared
        expect(req.session.siteData["test-site"].inputData.index.formData.upload).to.equal("");
        // other page cleared as well
        expect(req.session.siteData["test-site"].inputData["another-page"].formData.upload2).to.equal("");
    });

    it("16. POST should error if file input data not found in session", async () => {
        // Remove file from session
        delete req.session.siteData["test-site"].inputData.index.formData.upload;

        req.body = { deleteFile: "yes" };
        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        const err = next.firstCall.args[0];
        expect(err).to.be.an("error");
        expect(err.message).to.match(/data not found/i);
    });

    it("17. POST should redirect to condition.redirect when condition is true (even if API would fail)", async () => {
        // Make a failing endpoint to ensure it shouldn't matter
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };
        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/error404";

        // Condition that triggers redirect
        req.serviceData.pages[0].pageData.conditions = [
            { expression: "true", redirect: "redirected-from-post" }
        ];

        req.body = { deleteFile: "yes" };
        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        expect(res.redirect.calledOnce).to.be.true;
        expect(res.redirect.firstCall.args[0]).to.include("redirected-from-post");
    });

    it("18. GET should resolve file from multipleDraft (add flow)", async () => {
        // Setup a multipleDraft with file reference
        req.session.siteData["test-site"].inputData.index = {
            multipleDraft: {
                upload: { fileId: "draft123", sha256: "sha-draft" }
            }
        };

        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(req.processedPage.pageData.pageData.title.en).to.include("Test File");
    });

    it("19. GET should resolve file from formData array (edit flow)", async () => {
        // Simulate multipleThings array with two items
        req.params.index = "1";
        req.session.siteData["test-site"].inputData.index = {
            formData: [
                { otherField: "keep" },
                { upload: { fileId: "edit123", sha256: "sha-edit" } }
            ]
        };

        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(req.processedPage.pageData.pageData.title.en).to.include("Test File");
    });

    it("20. POST should remove file from multipleDraft and redirect", async () => {
        req.session.siteData["test-site"].inputData.index = {
            multipleDraft: {
                upload: { fileId: "draft123", sha256: "sha-draft" }
            }
        };


        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };
        req.originalUrl = "/test-site/index/multiple/add"; // simulate add flow

        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/success"; // or any dummy
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        process.env.TEST_SUBMISSION_DSF_GTW_KEY = "x";

        req.body = { deleteFile: "yes" };
        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        // The draft file should be cleared site-wide
        expect(req.session.siteData["test-site"].inputData.index.multipleDraft.upload).to.equal("");
        expect(res.redirect.calledOnce).to.be.true;
        expect(res.redirect.firstCall.args[0]).to.equal("/test-site/index/multiple/add");
    });

    it("21. POST should remove file from array item (edit flow)", async () => {
        req.params.index = "0";
        req.session.siteData["test-site"].inputData.index = {
            formData: [
                { upload: { fileId: "edit123", sha256: "sha-edit" } }
            ]
        };

        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
            dsfgtwApiKey: "TEST_SUBMISSION_DSF_GTW_KEY"
        };

        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/success"; // or any dummy
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        process.env.TEST_SUBMISSION_DSF_GTW_KEY = "x";

        req.body = { deleteFile: "yes" };
        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        expect(req.session.siteData["test-site"].inputData.index.formData[0].upload).to.equal("");
        expect(res.redirect.calledOnce).to.be.true;
        expect(res.redirect.firstCall.args[0]).to.equal("/test-site/index/multiple/edit/0");
    });

    it("22. GET should error if single mode delete attempted on multipleThings page", async () => {
        req.serviceData.pages[0].multipleThings = true; // single delete not allowed
        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);

        const error = next.firstCall.args[0];
        expect(error).to.be.an("error");
        expect(error.message).to.include("Single mode delete file not allowed");
    });

    it("23. POST should log error when delete API returns unsuccessful result", async () => {
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
        };
        process.env.TEST_DELETE_FILE_API_URL = "http://localhost:3002/fail";
        process.env.TEST_SUBMISSION_API_CLIENT_KEY = "x";
        process.env.TEST_SUBMISSION_API_SERVIVE_ID = "x";
        req.body = { deleteFile: "yes" };

        // Fake unsuccessful API call
        global.fetch = async () => ({ json: async () => ({ Succeeded: false }) });

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);

        expect(res.redirect.calledOnce).to.be.true;
    });

    it("24. POST should skip dsfgtwApiKey header when not set", async () => {
        req.serviceData.site.fileDeleteAPIEndpoint = {
            url: "TEST_DELETE_FILE_API_URL",
            method: "DELETE",
            clientKey: "TEST_SUBMISSION_API_CLIENT_KEY",
            serviceId: "TEST_SUBMISSION_API_SERVIVE_ID",
        };
        delete process.env.TEST_SUBMISSION_DSF_GTW_KEY;
        req.body = { deleteFile: "yes" };

        const handler = govcyFileDeletePostHandler();
        await handler(req, res, next);
        expect(res.redirect.called).to.be.true;
    });

    it("25. GET should continue normally if condition evaluates to true (non-redirect case)", async () => {
        req.serviceData.pages[0].pageData.conditions = [
            { expression: "false", redirect: "ignored-page" }
        ];
        const handler = govcyFileDeletePageHandler();
        await handler(req, res, next);
        expect(req.processedPage).to.be.an("object");
        expect(next.calledOnce).to.be.true;
    });


});
