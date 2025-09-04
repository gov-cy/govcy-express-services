import { expect } from 'chai';
import sinon from 'sinon';
import * as dataLayer from '../../src/utils/govcyDataLayer.mjs';
import * as govcyResources from '../../src/resources/govcyResources.mjs';
import { prepareSubmissionData, preparePrintFriendlyData, generateReviewSummary } from '../../src/utils/govcySubmitData.mjs';

describe('govcySubmitData', () => {
    let req, siteId, service;

    beforeEach(() => {
        // Mock request object
        req = {
            session: {
                siteData: {
                    testSite: {
                        inputData: {
                            page1: {
                                formData:{ field1: 'value1', field2: 'value2' }
                            },
                        },
                    },
                },
                user: { name: 'John Doe', email: 'john@example.com' },
            },
            globalLang: 'en',
        };

        // Mock siteId and service
        siteId = 'testSite';
        service = {
            site: {
                id: 'testSite',
                title: { en: 'Test Service', el: 'Υπηρεσία Τεστ' },
                lang: "el",
                languages: [
                    {
                        code: "el",
                        label: "EL",
                    },
                    {
                        code: "en",
                        label: "EN"
                    }
                ],
                submission_data_version: '1.0',
                renderer_version: '1.14.2',
                design_systems_version: '3.2.0',
            },
            pages: [
                {
                    pageData: { url: 'page1', title: { en: 'Page 1', el: 'Σελίδα 1' } },
                    pageTemplate: {
                        sections: [
                            {
                                elements: [
                                    {
                                        element: 'form',
                                        params: {
                                            elements: [
                                                { element: 'textInput', params: {id:`field1`, name: 'field1', label: { en: 'Field 1', el: 'Πεδίο 1' } } },
                                                { element: 'textInput', params: {id:`field2`, name: 'field2', label: { en: 'Field 2', el: 'Πεδίο 2' } } },
                                            ],
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('prepareSubmissionData', () => {
        it('1. should prepare submission data correctly', () => {
            const submissionData = prepareSubmissionData(req, siteId, service);

            expect(submissionData).to.deep.include({
                submissionUsername: 'John Doe',
                submissionEmail: 'john@example.com',
                submissionDataVersion: '1.0',
                rendererVersion: '1.14.2',
                designSystemsVersion: '3.2.0',
                service: {
                    id: 'testSite',
                    title: { en: 'Test Service', el: 'Υπηρεσία Τεστ' },
                },
            });
        });
    });

    describe('preparePrintFriendlyData', () => {
        it('2. should prepare print-friendly data correctly', () => {
            const printFriendlyData = preparePrintFriendlyData(req, siteId, service);

            expect(printFriendlyData).to.deep.equal([
                {
                    pageUrl: 'page1',
                    pageTitle: { en: 'Page 1', el: 'Σελίδα 1' },
                    fields: [
                        {
                            id: 'field1',
                            name: "field1",
                            label: { en: 'Field 1', el: 'Πεδίο 1' },
                            value: 'value1',
                            valueLabel: { en: 'value1', el: 'value1' },
                        },
                        {
                            id: 'field2',
                            name: "field2",
                            label: { en: 'Field 2', el: 'Πεδίο 2' },
                            value: 'value2',
                            valueLabel: { en: 'value2', el: 'value2' },
                        },
                    ],
                },
            ]);
        });
    });

    describe('generateReviewSummary', () => {
        it('3. should generate a review summary correctly', () => {
            const submissionData = preparePrintFriendlyData(req, siteId, service);
            const reviewSummary = generateReviewSummary(submissionData, req, siteId, false);

            expect(reviewSummary).to.deep.include({
                element: 'summaryList',
                params: {
                    items: [
                        {
                            key: { en: 'Page 1', el: 'Σελίδα 1' },
                            value: [
                                {
                                    element: 'summaryList',
                                    params: {
                                        items: [
                                            {
                                                key: { en: 'Field 1', el: 'Πεδίο 1' },
                                                value: [{ element: 'textElement', params: { showNewLine: true, text: { en: 'value1', el: 'value1' ,tr: 'value1' }, type: 'span' } }],
                                            },
                                            {
                                                key: { en: 'Field 2', el: 'Πεδίο 2' },
                                                value: [{ element: 'textElement', params: { showNewLine: true, text: { en: 'value2', el: 'value2', tr: 'value2' }, type: 'span' } }],
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    ],
                },
            });
        });
    });

    it('4. should NOT skip pages with redirecting conditions', () => {
        // Extend the service to include a conditional page with a redirect
        service.pages.push({
            pageData: {
                url: 'conditionalPage',
                title: { en: 'Conditional Page', el: 'Σελίδα Συνθηκών' },
                conditions: [
                    {
                        expression: "true", // Always redirect
                        redirect: "somewhere-else"
                    }
                ]
            },
            pageTemplate: {
                sections: [
                    {
                        elements: [
                            {
                                element: 'form',
                                params: {
                                    elements: [
                                        {
                                            element: 'textInput',
                                            params: {
                                                id: 'condField',
                                                name: 'condField',
                                                label: { en: 'Conditional Field', el: 'Πεδίο Συνθηκών' }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        });

        // Provide mock data for the new conditional page
        req.session.siteData.testSite.inputData.conditionalPage = {
            formData: { condField: 'something' }
        };

        // Add required mock param for siteId (used in condition evaluation)
        req.params = { siteId };

        // Run the function
        const result = prepareSubmissionData(req, siteId, service);

        // Expect only page1 to be included in submissionData
        expect(result.submissionData).to.have.property('page1');
        expect(result.submissionData).to.have.property('conditionalPage');
    });


    describe('preparePrintFriendlyData with conditionally excluded page', () => {
        it('5. should not include print-friendly data for excluded page', () => {
            service.pages[0].pageData.conditions = [
                {
                    expression: "true",
                    redirect: "somewhere"
                }
            ];

            const printData = preparePrintFriendlyData(req, siteId, service);
            expect(printData).to.deep.equal([]);
        });
    });

    describe('generateReviewSummary with conditionally excluded page', () => {
        it('6. should not generate summary for excluded page', () => {
            service.pages[0].pageData.conditions = [
                {
                    expression: "true",
                    redirect: "somewhere"
                }
            ];

            const summary = generateReviewSummary([], req, siteId, false);
            expect(summary.params.items).to.deep.equal([]);
        });
    });

    it('7. should rename fileInput field to include "Attachment" in submissionData', () => {
    // Add fileInput to the form
    service.pages[0].pageTemplate.sections[0].elements[0].params.elements.push({
        element: 'fileInput',
        params: { id: 'passportFile', name: 'passportFile', label: { en: 'Passport File', el: 'Αρχείο Διαβατηρίου' } }
    });

    // Simulate uploaded file in session (already stored in dataLayer under original name)
    req.session.siteData[siteId].inputData.page1.formData.passportFile = {
        fileId: '12345-file-id',
        sha256: 'abc123sha'
    };

    const result = prepareSubmissionData(req, siteId, service);

    // expect(result.submissionData.page1.formData).to.not.have.property('passportFile');
    // expect(result.submissionData.page1.formData).to.have.property('passportFileAttachment');
    // expect(result.submissionData.page1.formData.passportFileAttachment).to.deep.equal({
    expect(result.submissionData.page1).to.not.have.property('passportFile');
    expect(result.submissionData.page1).to.have.property('passportFileAttachment');
    expect(result.submissionData.page1.passportFileAttachment).to.deep.equal({
        fileId: '12345-file-id',
        sha256: 'abc123sha'
    });
});

it('8. should handle fileInput inside conditional radio and rename correctly', () => {
    // Add a radios element with conditional file input
    service.pages[0].pageTemplate.sections[0].elements[0].params.elements.push({
        element: 'radios',
        params: {
            id: 'uploadType',
            name: 'uploadType',
            items: [
                {
                    value: 'yes',
                    conditionalElements: [
                        {
                            element: 'fileInput',
                            params: { id: 'cvFile', name: 'cvFile', label: { en: 'CV File', el: 'Αρχείο Βιογραφικού' } }
                        }
                    ]
                },
                {
                    value: 'no'
                }
            ]
        }
    });

    // Simulate radio selection + file upload
    // req.session.siteData[siteId].inputData.page1.formData.uploadType = 'yes';
    // req.session.siteData[siteId].inputData.page1.formData.cvFile = {
    req.session.siteData[siteId].inputData.page1.formData.uploadType = 'yes';
    req.session.siteData[siteId].inputData.page1.formData.cvFile = {
        fileId: 'cv-abc-id',
        sha256: 'cvsha256xyz'
    };

    const result = prepareSubmissionData(req, siteId, service);

    // expect(result.submissionData.page1.formData).to.have.property('cvFileAttachment');
    // expect(result.submissionData.page1.formData.cvFileAttachment).to.deep.equal({
    expect(result.submissionData.page1).to.have.property('cvFileAttachment');
    expect(result.submissionData.page1.cvFileAttachment).to.deep.equal({
        fileId: 'cv-abc-id',
        sha256: 'cvsha256xyz'
    });
});

it('9. should assign empty string when fileInput value is missing', () => {
    service.pages[0].pageTemplate.sections[0].elements[0].params.elements.push({
        element: 'fileInput',
        params: { id: 'licenseFile', name: 'licenseFile', label: { en: 'License', el: 'Άδεια' } }
    });

    // File not uploaded, key doesn't exist
    const result = prepareSubmissionData(req, siteId, service);

    // expect(result.submissionData.page1.formData.licenseFileAttachment).to.equal("");
    expect(result.submissionData.page1.licenseFileAttachment).to.equal("");
});


});