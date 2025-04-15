import { expect } from 'chai';
import * as dataLayer from '../../src/utils/govcyDataLayer.mjs';

describe('govcyDataLayer', () => {
    let session;

    beforeEach(() => {
        session = {}; // Reset session before each test
    });

    // Test the initializeSiteData function
    it('1. should initialize session structure correctly', () => {
        dataLayer.initializeSiteData(session, 'site1', 'page1');
        expect(session.siteData).to.deep.equal({
            site1: {
                inputData: {
                    page1: {
                        formData: {}
                    },
                },
                submissionData: {}
            },
        });
    });

    // Test the `storePageData` and `getPageData` function
    it('2. should store page data correctly', () => {
        dataLayer.initializeSiteData(session, 'site1', 'page1');
        dataLayer.storePageData(session, 'site1', 'page1', { field1: 'value1', field2: 'value2' });

        expect(dataLayer.getPageData(session, 'site1', 'page1')).to.deep.equal({
            field1: 'value1',
            field2: 'value2',
        });
    });

    // Test the `storePageValidationErrors` and `getPageValidationErrors` function
    it('3. should store and retrieve page validation errors correctly', () => {
        dataLayer.initializeSiteData(session, 'site1', 'page1');
        const validationErrors = { field1: 'Error message' };
        const formData = { field1: 'value1' };

        // Store validation errors
        dataLayer.storePageValidationErrors(session, 'site1', 'page1', validationErrors, formData);

        // Retrieve validation errors
        const errors = dataLayer.getPageValidationErrors(session, 'site1', 'page1');
        expect(errors).to.deep.equal({
            errors: validationErrors,
            formData: formData,
            errorSummary: [],
        });

        // Ensure validation errors are cleared after retrieval
        expect(dataLayer.getPageValidationErrors(session, 'site1', 'page1')).to.be.null;
    });

    // Test the `storeSiteValidationErrors` and `getSiteSubmissionErrors` function
    it('4. should store and retrieve site validation errors correctly', () => {
        dataLayer.initializeSiteData(session, 'site1');
        const validationErrors = { field1: 'Site-level error' };

        // Store site validation errors
        dataLayer.storeSiteValidationErrors(session, 'site1', validationErrors);

        // Retrieve site validation errors
        const errors = dataLayer.getSiteSubmissionErrors(session, 'site1');
        expect(errors).to.deep.equal({
            errors: validationErrors,
            errorSummary: [],
        });

        // Ensure site validation errors are cleared after retrieval
        expect(dataLayer.getSiteSubmissionErrors(session, 'site1')).to.be.null;
    });

    // Test the `storeSiteSubmissionData` and `getSiteSubmissionData` function
    it('5. should store site submission data and clear input data', () => {
        dataLayer.initializeSiteData(session, 'site1');

        session.siteData.site1.inputData = {
            page1: { formData: { field1: 'value1' } },
            page2: { formData: { field2: 'value2' } },
        };

        session.user = { name: 'John Doe', unique_identifier: 'user123', email: 'HtYyj@example.com' };
        const service = { site: { id: 'service1', title: 'Test Service' } };
        const referenceNumber = 'REF12345';
        const timestamp = new Date().toISOString();
        const printFriendlyData = [{ pageUrl: 'page1', fields: [] }];

        dataLayer.storeSiteSubmissionData(session, 'site1', service, referenceNumber, timestamp, printFriendlyData);

        const submissionData = dataLayer.getSiteSubmissionData(session, 'site1');
        expect(submissionData).to.deep.equal({
            service: { id: 'service1', title: 'Test Service' },
            referenceNumber: 'REF12345',
            timestamp: timestamp,
            user: session.user,
            rawData: {
                page1: { formData: { field1: 'value1' } },
                page2: { formData: { field2: 'value2' } },
            },
            printFriendlyData: printFriendlyData,
        });

        // Ensure input data is cleared after submission
        expect(dataLayer.getSiteInputData(session, 'site1')).to.deep.equal({});
    });

    // Test `clearSiteData`
    it('6. should clear all data for a specific site', () => {
        dataLayer.initializeSiteData(session, 'site1', 'page1');
        session.siteData.site1.inputData.page1.formData = { field1: 'value1' };

        dataLayer.clearSiteData(session, 'site1');

        expect(session.siteData.site1).to.be.undefined;
    });
});