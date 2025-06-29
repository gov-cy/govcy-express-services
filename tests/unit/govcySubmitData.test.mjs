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
                submission_username: 'John Doe',
                submission_email: 'john@example.com',
                submission_data_version: '1.0',
                renderer_version: '1.14.2',
                design_systems_version: '3.2.0',
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
                                                value: [{ element: 'textElement', params: { text: { en: 'value1', el: 'value1' ,tr: 'value1' }, type: 'span' } }],
                                            },
                                            {
                                                key: { en: 'Field 2', el: 'Πεδίο 2' },
                                                value: [{ element: 'textElement', params: { text: { en: 'value2', el: 'value2', tr: 'value2' }, type: 'span' } }],
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
});