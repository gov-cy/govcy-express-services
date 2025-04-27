import { expect } from 'chai';
import { govcyGenerateReviewSummary } from '../../src/utils/govcyReviewSummary.mjs';
import * as govcyResources from '../../src/resources/govcyResources.mjs';

describe('govcyReviewSummary - govcyGenerateReviewSummary', () => {
    it('1. should generate a summary list for a simple form with conditional elements', () => {
        // Mock session data directly
        const req = {
            session: {
                siteData: {
                    'test-site': {
                        inputData: {
                            page1: {
                                formData: {
                                    field1: 'value1',
                                    field2: 'value2',
                                    radioField: 'option1',
                                    conditionalField: 'conditionalValue',
                                },
                            },
                        },
                    },
                },
            },
            globalLang: 'en',
        };

        const siteId = 'test-site';
        const service = {
            pages: [
                {
                    pageData: { url: 'page1', title: 'Page 1' },
                    pageTemplate: {
                        sections: [
                            {
                                elements: [
                                    {
                                        element: 'form',
                                        params: {
                                            elements: [
                                                { element: 'textInput', params: { name: 'field1', label: 'Field 1' } },
                                                { element: 'textInput', params: { name: 'field2', label: 'Field 2' } },
                                                {
                                                    element: 'radios',
                                                    params: {
                                                        name: 'radioField',
                                                        items: [
                                                            {
                                                                value: 'option1',
                                                                text: { en: 'Option 1' },
                                                                conditionalElements: [
                                                                    { element: 'textInput', params: { name: 'conditionalField', label: 'Conditional Field' } },
                                                                ],
                                                            },
                                                            {
                                                                value: 'option2',
                                                                text: { en: 'Option 2' },
                                                            },
                                                        ],
                                                    },
                                                },
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

        // Call the actual function
        const summaryList = govcyGenerateReviewSummary(req, siteId, service);

        // Assert the result
        expect(summaryList).to.deep.equal({
            element: 'summaryList',
            params: {
                items: [
                    {
                        key: 'Page 1',
                        value: [
                            {
                                element: 'summaryList',
                                params: {
                                    items: [
                                        {
                                            key: 'Field 1',
                                            value: [
                                                {
                                                    element: 'textElement',
                                                    params: {
                                                        text: { en: 'value1', el: 'value1', tr: 'value1' },
                                                        type: 'span',
                                                    },
                                                },
                                            ],
                                        },
                                        {
                                            key: 'Field 2',
                                            value: [
                                                {
                                                    element: 'textElement',
                                                    params: {
                                                        text: { en: 'value2', el: 'value2', tr: 'value2' },
                                                        type: 'span',
                                                    },
                                                },
                                            ],
                                        },
                                        {
                                            key: {
                                                el: "radioField",
                                                en: "radioField",
                                                tr: "radioField"
                                            },
                                            value: [
                                                {
                                                    element: "textElement",
                                                    params: {
                                                        text: {
                                                            el: "Option 1",
                                                            en: "Option 1",
                                                            tr: "Option 1"
                                                        },
                                                        type: "span"
                                                    }
                                                }
                                            ]
                                        },
                                        {
                                            key: 'Conditional Field',
                                            value: [
                                                {
                                                    element: 'textElement',
                                                    params: {
                                                        text: { en: 'conditionalValue', el: 'conditionalValue', tr: 'conditionalValue' },
                                                        type: 'span',
                                                    },
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        ],
                        actions: [
                            {
                                text: govcyResources.staticResources.text.change,
                                classes: govcyResources.staticResources.other.noPrintClass,
                                href: govcyResources.constructPageUrl(siteId, 'page1', 'review'),
                                visuallyHiddenText: 'Page 1',
                            },
                        ],
                    },
                ],
            },
        });
    });

    it('2. should skip sections without elements', () => {
        const req = { session: {}, globalLang: 'en' };
        const siteId = 'test-site';
        const service = {
            pages: [
                {
                    pageData: { url: 'page1', title: 'Page 1' },
                    pageTemplate: {
                        sections: [
                            { elements: [] }, // Empty section
                        ],
                    },
                },
            ],
        };

        const summaryList = govcyGenerateReviewSummary(req, siteId, service);

        expect(summaryList.params.items).to.be.empty;
    });

    
});