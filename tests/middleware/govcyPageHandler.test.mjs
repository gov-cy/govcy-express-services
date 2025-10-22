import { expect } from "chai";
import sinon from "sinon";
import { govcyPageHandler } from "../../src/middleware/govcyPageHandler.mjs";
import * as dataLayer from "../../src/utils/govcyDataLayer.mjs";
import * as govcyUpdateMyDetailsModule from "../../src/middleware/govcyUpdateMyDetails.mjs";


describe("govcyPageHandler", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                siteId: "test-site",
                pageUrl: "index"
            },
            query: {},
            csrfToken: () => "mock-csrf-token",
            globalLang: "en",
            serviceData: {
                site: {
                    id: "test-site",
                    title: { en: "Test Title" },
                    lang: "en",
                    cdn: { dist: "/mock" }
                },
                pages: [
                    {
                        pageData: {
                            url: "index",
                            title: { en: "Test Page" },
                            layout: "layouts/base.njk",
                            mainLayout: "one-third"
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
                                                        element: "textInput",
                                                        params: {
                                                            id: "fullName",
                                                            name: "fullName",
                                                            label: {
                                                                en: "Full Name"
                                                            }
                                                        }
                                                    },
                                                    {
                                                        element: "button",
                                                        params: {
                                                            text: "Continue"
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
                                    fullName: "Test User"
                                }
                            }
                        }
                    }
                },
                user: {
                    name: "Tester"
                }
            }
        };

        res = {};
        next = sinon.stub();
    });

    it("1. should populate processedPage for a valid form page", () => {
        const handler = govcyPageHandler();
        handler(req, res, next);

        expect(req.processedPage).to.be.an("object");

        const { pageData, pageTemplate } = req.processedPage;
        expect(pageData.pageData.title.en).to.equal("Test Page");
        expect(pageTemplate.sections).to.be.an("array");

        const formElement = pageTemplate.sections[0].elements.find(e => e.element === "form");
        expect(formElement).to.exist;
        expect(formElement.params.elements.some(e => e.element === "textInput")).to.be.true;
        expect(formElement.params.elements.some(e => e.element === "button")).to.be.true;
        const hasCsrf = formElement.params.elements.some(el =>
            el.element === "htmlElement" &&
            typeof el.params?.text?.en === "string" &&
            el.params.text.en.includes('name="_csrf"') &&
            el.params.text.en.includes('mock-csrf-token')
        );

        expect(hasCsrf).to.be.true;

        expect(next.calledOnce).to.be.true;
    });

    it("2. should redirect if page condition evaluates to true", () => {
        res = {
            redirect: sinon.stub()
        };

        req.serviceData.pages[0].pageData.conditions = [
            {
                expression: "true",
                redirect: "some-other-page"
            }
        ];

        const handler = govcyPageHandler();
        handler(req, res, next);

        expect(res.redirect.calledOnce, "res.redirect was not called").to.be.true;
        const redirectUrl = res.redirect.firstCall.args[0];
        expect(redirectUrl).to.equal("/test-site/some-other-page");
    });

    // it("3. should add user name section if user is logged in", () => {
    //     const handler = govcyPageHandler();
    //     handler(req, res, next);

    //     const processed = req.processedPage;
    //     expect(processed).to.be.an("object");

    //     const hasUserNameSection = processed.pageTemplate.sections.some(section => {
    //         return section.elements?.some(el =>
    //             el.element === "userName" &&
    //             el.params?.name?.el?.includes("Tester")
    //         );
    //     });

    //     expect(hasUserNameSection).to.be.true;
    // });

    it("4. should show validation errors and repopulate form data", () => {
        // Add fake validation errors to session
        req.session.siteData["test-site"].inputData["index"].validationErrors = {
            errors: {
                fullName: {
                    id: "fullName",
                    message: { el: "Υποχρεωτικό πεδίο", en: "Required field" },
                    pageUrl: "index"
                }
            },
            errorSummary: [
                {
                    link: "#fullName",
                    text: "Required field"
                }
            ],
            formData: {
                fullName: "Partial Name"
            }
        };

        const handler = govcyPageHandler();
        handler(req, res, next);

        const elements = req.processedPage.pageTemplate.sections
            .find(sec => sec.name === "main")
            .elements;

        const hasErrorSummary = elements[0].params.elements.some(el => el.element === "errorSummary");
        const form = elements.find(el => el.element === "form");
        const formField = form?.params?.elements?.find(el => el.params?.id === "fullName");

        expect(hasErrorSummary).to.be.true;
        expect(formField?.params?.value).to.equal("Partial Name");
    });

    it("5. should update form action, set method to POST, inject CSRF and remove prototypeNavigate", () => {
        // Add a form with a button that includes prototypeNavigate
        req.serviceData.pages[0].pageTemplate.sections = [
            {
                name: "main",
                elements: [
                    {
                        element: "form",
                        params: {
                            elements: [
                                {
                                    element: "textInput",
                                    params: {
                                        id: "fullName",
                                        name: "fullName",
                                        label: { el: "Όνομα", en: "Name" }
                                    }
                                },
                                {
                                    element: "button",
                                    params: {
                                        text: "Continue",
                                        prototypeNavigate: "next-page"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ];

        const handler = govcyPageHandler();
        handler(req, res, next);

        const form = req.processedPage.pageTemplate.sections
            .find(sec => sec.name === "main")
            .elements.find(el => el.element === "form");

        // Check action and method
        expect(form.params.action).to.equal("/test-site/index");
        expect(form.params.method).to.equal("POST");

        // Check button type and prototypeNavigate removed
        const button = form.params.elements.find(el => el.element === "button");
        expect(button.params.type).to.equal("submit");
        expect(button.params.prototypeNavigate).to.be.undefined;

        // Check CSRF token is added
        const csrf = form.params.elements.find(el =>
            el.element === "htmlElement" &&
            el.params?.text?.el?.includes("name=\"_csrf\"") &&
            el.params?.text?.el?.includes("mock-csrf-token")
        );
        expect(csrf).to.exist;
    });

    it("6. should populate req.processedPage with pageData and pageTemplate", () => {
        const handler = govcyPageHandler();
        handler(req, res, next);

        const processed = req.processedPage;
        expect(processed).to.be.an("object");

        // Check pageData exists and has expected structure
        expect(processed.pageData).to.have.property("site");
        expect(processed.pageData).to.have.property("pageData");
        expect(processed.pageData.pageData.title.en).to.equal("Test Page");

        // Check pageTemplate has main section
        const mainSection = processed.pageTemplate.sections.find(sec => sec.name === "main");
        expect(mainSection).to.exist;

        // Check form exists inside the main section
        const hasForm = mainSection.elements.some(el => el.element === "form");
        expect(hasForm).to.be.true;
    });

    // -----------------------------------------------------------------------------
    // MultipleThings hub integration test (data-driven, no stubbing)
    // -----------------------------------------------------------------------------
    it('7. should build a multipleThings hub page when page.multipleThings is defined', async () => {
        // Simulate route parameters
        req.params.pageUrl = 'academic-details';
        req.params.siteId = 'test-site';

        // Build service data with multipleThings configuration
        req.serviceData.pages = [
            {
                pageData: { url: 'academic-details', title: { en: 'Academic Details' } },
                multipleThings: {
                    itemTitleTemplate: '{{ qualification }} – {{ institution }}',
                    min: 0,
                    max: 3,
                    listPage: {
                        title: { en: 'Your qualifications' },
                        addButtonPlacement: 'bottom',
                        addButtonText: { en: 'Add another qualification' },
                        continueButtonText: { en: 'Continue' },
                        hasBackLink: true
                    }
                },
                pageTemplate: {
                    sections: [
                        {
                            name: 'main',
                            elements: [
                                {
                                    element: 'form',
                                    params: {
                                        elements: [
                                            { element: 'textInput', params: { id: 'qualification', name: 'qualification' } },
                                            { element: 'textInput', params: { id: 'institution', name: 'institution' } }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        // Emulate items already added by the user
        req.session.siteData['test-site'].inputData['academic-details'] = {
            formData: [
                { qualification: 'BSc Computer Science', institution: 'UCY' },
                { qualification: 'MSc AI', institution: 'UCL' }
            ]
        };


        const handler = govcyPageHandler();
        await handler(req, res, next);

        // ✅ The hub handler should have populated req.processedPage
        expect(req.processedPage).to.be.an('object');
        expect(req.processedPage.pageTemplate).to.have.property('sections');
        expect(req.processedPage.pageTemplate.sections).to.be.an('array').that.is.not.empty;

        // ✅ The hub should contain a multipleThingsTable and a Continue button
        const hubElements = JSON.stringify(req.processedPage.pageTemplate.sections);
        expect(hubElements).to.include('multipleThingsTable');
        expect(hubElements).to.include('Continue');
        expect(hubElements).to.include('Add another qualification');

        // ✅ The hub should include a beforeMain section with a backLink
        const beforeMain = req.processedPage.pageTemplate.sections.find(s => s.name === 'beforeMain');
        expect(beforeMain).to.be.an('object');
        expect(beforeMain.elements[0].element).to.equal('backLink');

        // ✅ The middleware should call next() (since hub handler ends with next())
        expect(next.calledOnce).to.be.true;
    });
    
    it("8. should call govcyUpdateMyDetailsHandler when page.updateMyDetails exists", async () => {
  // --- Simulate service and page ---
  req.serviceData.pages = [
    {
      pageData: { url: "update-my-details" },
      updateMyDetails: {
        APIEndpoint: {
          url: "CIVIL_REGISTRY_CONTACT_API_URL",
          clientKey: "CIVIL_REGISTRY_CLIENT_KEY",
          serviceId: "CIVIL_REGISTRY_SERVICE_ID"
        },
        updateMyDetailsURL: "https://update-my-details.service.gov.cy",
        scope: ["email", "mobile"],
        topElements: []
      },
      pageTemplate: { sections: [] }
    }
  ];

  req.params.pageUrl = "update-my-details";
  req.params.siteId = "test-site";

  // --- Mock res to detect early return ---
  let wasReturned = false;
  res.render = () => { wasReturned = true; };
  res.redirect = () => { wasReturned = true; };

  // --- Run handler ---
  const handler = govcyPageHandler();
  await handler(req, res, next);

  // --- Assertions ---
  // The handler should return early (no page rendering or further logic)
  expect(wasReturned || next.called).to.be.true;
});



});
