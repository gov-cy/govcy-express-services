import { expect } from "chai";
import { handleFileUpload } from '../../src/utils/govcyHandleFiles.mjs';
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";


describe('handleFileUpload - file upload util', () => {
  const validServiceConfig = {
    site: {
      fileUploadAPIEndpoint: {
        url: "UPLOAD_URL",
        method: "POST",
        clientKey: "CLIENT_KEY",
        serviceId: "SERVICE_ID"
      }
    },
    pages: [
      // 👈 simulate a page with no pageTemplate
      {
        pageData:
        {
          url: "bad-page",
          title: "Broken Page"
        }
        // No pageTemplate here
      }
    ]

  };

  const validPageConfig = {
    pageData:
    {
      url: "test-page",
      title:
      {
        el: "Test page el",
        en: "Test page en"
      }
    },
    pageTemplate:
    {
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
                      name: "elementName",
                      id: "elementName",
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };

  const validFile = {
    originalname: "test.pdf",
    mimetype: "application/pdf",
    buffer: Buffer.from("fake"),
    size: 1234
  };

  it('1. should return 400 if file is missing', async () => {
    const result = await handleFileUpload({
      service: validServiceConfig,
      store: {},                    // minimal session
      siteId: 'test-site',
      pageUrl: 'test-page',
      elementName: 'proofOfPayment',
      file: null                    // ⛔ Missing file
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.equal('Missing file or element name');
  });

  it("2. should return 400 if elementName is missing", async () => {
    const result = await handleFileUpload({
      service: validServiceConfig, // same mock config as previous
      store: {}, // empty session store
      siteId: "testsite",
      pageUrl: "file-upload-page",
      elementName: undefined, // 👈 missing elementName
      file: validFile
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.include("element name");
  });

  it("3. should return 400 if upload config is missing from service", async () => {
    const result = await handleFileUpload({
      service: { site: {} },  // 👈 No fileUploadAPIEndpoint
      store: {},
      siteId: "testsite",
      pageUrl: "file-upload-page",
      elementName: "proofOfPayment",
      file: validFile
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.include("upload configuration");
  });

  it("4. should return 400 if page config is invalid (missing pageTemplate)", async () => {
    process.env.UPLOAD_URL = "http://localhost:3002/form-upload"; // ensure getEnvVariable resolves
    process.env.CLIENT_KEY = "CLIENT_KEY"; // ensure getEnvVariable resolves
    process.env.SERVICE_ID = "SERVICE_ID"; // ensure getEnvVariable resolves
    const result = await handleFileUpload({
      service: validServiceConfig,
      store: {},
      siteId: "test-site",
      pageUrl: "bad-page", // Matches a page, but with no pageTemplate
      elementName: "proofOfPayment",
      file: validFile
    });

    expect(result.status).to.equal(400);
  });

  it("5. should return 403 if page is skipped by conditional logic", async () => {

    // deep copy the 
    let itServiceConfig = JSON.parse(JSON.stringify(validServiceConfig));
    itServiceConfig.pages[0] = validPageConfig;
    itServiceConfig.pages[0].pageData['conditions'] = [
      {
        expression: "dataLayer['site123.inputData.test-page.formData.alwaysTrueFlag'] == 'yes'", // Always true for this test
        redirect: "review"
      }
    ];

    const result = await handleFileUpload({
      service: itServiceConfig,
      store: {
        siteData: {
          'site123': {
            inputData: {
              'test-page': {
                formData: {
                  alwaysTrueFlag: 'yes'
                }
              }
            }
          }
        }
      }, // no session needed
      siteId: "site123",
      pageUrl: "test-page",
      elementName: "elementName",
      file: validFile
    });

    expect(result.status).to.equal(403);
    expect(result.errorMessage).to.include("conditional logic");

  });


  it("6. should return 403 if element name is not found on the page", async () => {
    const serviceConfig = {
      ...validServiceConfig,
      pages: [validPageConfig] // 👈 page with fileInput named "elementName"
    };

    const result = await handleFileUpload({
      service: serviceConfig,
      store: {}, // No conditions, no skip
      siteId: "testsite",
      pageUrl: "test-page",
      elementName: "wrongElementName", // 👈 Not the one defined in the page
      file: validFile
    });

    expect(result.status).to.equal(403);
    expect(result.errorMessage).to.include("not allowed");
  });

  it("7. should return 400 if file has disallowed MIME type", async () => {
    const config = JSON.parse(JSON.stringify(validServiceConfig));
    config.pages = [validPageConfig];

    const result = await handleFileUpload({
      service: config,
      store: {},
      siteId: "testsite",
      pageUrl: "test-page",
      elementName: "elementName",
      file: {
        ...validFile,
        mimetype: "application/x-msdownload", // ⛔ Not allowed
      }
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.include("MIME not allowed");
  });

  it("8. should return 400 if magic bytes do not match allowed MIME type", async () => {
    const config = JSON.parse(JSON.stringify(validServiceConfig));
    config.pages = [validPageConfig];

    const result = await handleFileUpload({
      service: config,
      store: {},
      siteId: "testsite",
      pageUrl: "test-page",
      elementName: "elementName",
      file: {
        originalname: "fake.pdf",
        mimetype: "application/pdf",   // ✅ Allowed
        buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // ⛔ Actually a JPEG
        size: 1024
      }
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.include("magic byte mismatch");
  });

  it("9. should accept file with correct MIME and magic bytes", async () => {
    const config = JSON.parse(JSON.stringify(validServiceConfig));
    config.pages = [validPageConfig];

    const result = await handleFileUpload({
      service: config,
      store: {},
      siteId: "testsite",
      pageUrl: "test-page",
      elementName: "elementName",
      file: {
        originalname: "good.pdf",
        mimetype: "application/pdf",     // ✅ Allowed
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]), // ✅ %PDF-
        size: 1024
      }
    });

    // We're not mocking govcyApiRequest here — this would fail unless mocked or live API available
    // But we can assert it gets past validation
    expect(result.status).to.not.equal(400);
  });

  it("10. should return 400 if file is empty", async () => {
    const config = JSON.parse(JSON.stringify(validServiceConfig));
    config.pages = [validPageConfig];

    const result = await handleFileUpload({
      service: config,
      store: {},
      siteId: "testsite",
      pageUrl: "test-page",
      elementName: "elementName",
      file: {
        originalname: "empty.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from([]), // ⛔ Empty file
        size: 0
      }
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.include("empty");
  });


  it("11. should return 400 if file exceeds allowed size", async () => {
    // Create a valid PDF buffer (starts with %PDF-)
    const pdfHeader = Buffer.from("%PDF-1.7\n");
    const extraData = Buffer.alloc((10 * 1024 * 1024) + 1 - pdfHeader.length); // Total > 10MB
    const bigBuffer = Buffer.concat([pdfHeader, extraData]);

    const result = await handleFileUpload({
      service: {
        ...validServiceConfig,
        pages: [validPageConfig]
      },
      store: {},
      siteId: "test-site",
      pageUrl: "test-page",
      elementName: "elementName",
      file: {
        originalname: "hugefile.pdf",
        mimetype: "application/pdf",   // Matches magic bytes
        buffer: bigBuffer,
        size: bigBuffer.length
      }
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.include("exceeds allowed size");
  });

  it("12. should return 200 and metadata if upload is successful", async () => {
    const result = await handleFileUpload({
      service: {
        ...validServiceConfig,
        pages: [validPageConfig]
      },
      store: {}, // no session required for now
      siteId: "test-site",
      pageUrl: "test-page",
      elementName: "elementName",
      file: {
        originalname: "test.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("%PDF-1.7\nhello"), // Valid PDF header
        size: 1024
      }
    });

    expect(result.status).to.equal(200);
    expect(result.data).to.have.property("sha256", "mock-sha256-hash");
    expect(result.data).to.have.property("fileId", "mock-file-id");
  });


});

describe("handleFileUpload - multipleThings modes", () => {
  const configWithFileInput = {
    site: {
      fileUploadAPIEndpoint: {
        url: "UPLOAD_URL",
        method: "POST",
        clientKey: "CLIENT_KEY",
        serviceId: "SERVICE_ID"
      }
    },
    pages: [
      {
        pageData: { url: "test-page" },
        pageTemplate: {
          sections: [
            {
              name: "main",
              elements: [
                {
                  element: "form",
                  params: {
                    elements: [
                      { element: "fileInput", params: { name: "elementName", id: "elementName" } }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };

  const validFile = {
    originalname: "good.pdf",
    mimetype: "application/pdf",
    buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
    size: 100
  };

  it("13. should store in draft when mode=multipleThingsDraft", async () => {
    const store = { siteData: {} };

    const result = await handleFileUpload({
      service: configWithFileInput,
      store,
      siteId: "test-site",
      pageUrl: "test-page",
      elementName: "elementName",
      file: validFile,
      mode: "multipleThingsDraft"
    });

    expect(result.status).to.equal(200);
    const draft = dataLayer.getMultipleDraft(store, "test-site", "test-page");

    expect(draft).to.have.property("elementName");
    expect(draft.elementName).to.have.property("fileId");
  });

  it("14. should store in item array when mode=multipleThingsEdit", async () => {
    const store = { siteData: {} };
    // Pre-populate items
    dataLayer.storePageData(store, "test-site", "test-page", [{}]);

    const result = await handleFileUpload({
      service: configWithFileInput,
      store,
      siteId: "test-site",
      pageUrl: "test-page",
      elementName: "elementName",
      file: validFile,
      mode: "multipleThingsEdit",
      index: 0
    });

    expect(result.status).to.equal(200);
    const items = dataLayer.getPageData(store, "test-site", "test-page");
    expect(items[0]).to.have.property("elementName");
    expect(items[0].elementName).to.have.property("fileId");
  });

  it("15. should return 400 if mode=multipleThingsEdit with invalid index", async () => {
    const store = { siteData: {} };
    dataLayer.storePageData(store, "test-site", "test-page", []); // empty items

    const result = await handleFileUpload({
      service: configWithFileInput,
      store,
      siteId: "test-site",
      pageUrl: "test-page",
      elementName: "elementName",
      file: validFile,
      mode: "multipleThingsEdit",
      index: 99
    });

    expect(result.status).to.equal(400);
    expect(result.errorMessage).to.include("Invalid index");
  });
});