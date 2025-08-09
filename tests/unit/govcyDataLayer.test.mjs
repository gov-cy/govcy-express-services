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
                loadData: {},
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
        const service = {
            site: {
                id: 'service1',
                title: 'Test Service',
                submission_data_version: '1.0',
                renderer_version: '2.0',
                design_systems_version: '3.0',
            },
        };
        // const referenceNumber = 'REF12345';
        // const timestamp = new Date().toISOString();
        const printFriendlyData = [{ pageUrl: 'page1', fields: [] }];
        const reviewSummaryList = [{ pageUrl: 'page1', summary: 'Summary data' }];
    
        dataLayer.storeSiteSubmissionData(
            session,
            'site1',
            {
                submission_username: "John Doe",
                submission_email: "HtYyj@example.com",
                submission_data: session.siteData.site1.inputData, // Raw data as submitted by the user in each page
                submission_data_version: service.site?.submission_data_version || "", // The submission data version
                print_friendly_data: printFriendlyData, // Print-friendly data
                renderer_data: reviewSummaryList, // Renderer data of the summary list
                renderer_version: service.site?.renderer_version || "", // The renderer version
                design_systems_version: service.site?.design_systems_version || "", // The design systems version
                service: { // Service info
                    id: service.site.id, // Service ID
                    title: service.site.title // Service title multilingual object
                }
            }
        );
    
        const submissionData = dataLayer.getSiteSubmissionData(session, 'site1');
        expect(submissionData).to.deep.equal({
            submission_username: 'John Doe',
            submission_email: 'HtYyj@example.com',
            submission_data: {
                page1: { formData: { field1: 'value1' } },
                page2: { formData: { field2: 'value2' } },
            },
            submission_data_version: '1.0',
            print_friendly_data: printFriendlyData,
            renderer_data: reviewSummaryList,
            renderer_version: '2.0',
            design_systems_version: "3.0",
            service: { id: 'service1', title: 'Test Service' }
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

    it('7. should return empty objects for non-existent data', () => {
        expect(dataLayer.getPageData(session, 'nonExistentSite', 'nonExistentPage')).to.deep.equal({});
        expect(dataLayer.getSiteInputData(session, 'nonExistentSite')).to.deep.equal({});
        expect(dataLayer.getSiteSubmissionData(session, 'nonExistentSite')).to.deep.equal({});
    });

    it('8. should retrieve user data from the session', () => {
        session.user = { name: 'John Doe', email: 'john@example.com' };
        const user = dataLayer.getUser(session);
        expect(user).to.deep.equal({ name: 'John Doe', email: 'john@example.com' });
    });
    
    it('9. should return null if user data is missing', () => {
        expect(dataLayer.getUser(session)).to.be.null;
    });

    it('10. should handle simultaneous updates correctly', () => {
        dataLayer.initializeSiteData(session, 'site1', 'page1');
        dataLayer.storePageData(session, 'site1', 'page1', { field1: 'value1' });
    
        dataLayer.storePageData(session, 'site1', 'page1', { field2: 'value2' });
    
        expect(dataLayer.getPageData(session, 'site1', 'page1')).to.deep.equal({
            field2: 'value2',
        });
    });

    it("11. should cache eligibility results and respect maxAgeMs", () => {
        const session = {};
        const siteId = "test";
        const endpointKey = "http://localhost:3002/success";
        const result = { Succeeded: true, ErrorCode: 0 };

        dataLayer.storeSiteEligibilityResult(session, siteId, endpointKey, result);

        // Should return cached result
        let cached = dataLayer.getSiteEligibilityResult(session, siteId, endpointKey, 10000);
        expect(cached).to.deep.equal(result);

        // Should not return cached result if maxAgeMs is 0
        cached = dataLayer.getSiteEligibilityResult(session, siteId, endpointKey, 0);
        expect(cached).to.be.null;
    });

    it('12. should return site data if it exists in the session', () => {
        const session = {
            siteData: {
                site1: {
                    inputData: {
                        page1: {
                            formData: { field1: 'value1' }
                        }
                    },
                    eligibility: {
                        someCheck: { result: { Succeeded: true } }
                    }
                }
            }
        };

        const result = dataLayer.getSiteData(session, 'site1');
        expect(result).to.deep.equal(session.siteData.site1);
    });

    it('13. should return an empty object if site exists but has no data', () => {
        const session = {
            siteData: {
                site1: {}
            }
        };

        const result = dataLayer.getSiteData(session, 'site1');
        expect(result).to.deep.equal({});
    });

    it('14. should return null if site does not exist in session', () => {
        const session = {
            siteData: {
                site1: {}
            }
        };

        const result = dataLayer.getSiteData(session, 'nonexistent');
        expect(result).to.deep.equal({});
    });

    it('15. should return null if siteData is undefined in session', () => {
        const session = {}; // no siteData
        const result = dataLayer.getSiteData(session, 'site1');
        expect(result).to.deep.equal({});
    });

    it("16. should store and retrieve load data correctly", () => {
        const loadData = {
            prefillFromAPI: true,
            values: {
                name: "Alice",
                age: 30
            }
        };

        dataLayer.storeSiteLoadData(session, 'site1', loadData);

        const result = dataLayer.getSiteLoadData(session, 'site1');
        expect(result).to.deep.equal(loadData);
    });

    it("17. should return empty object if load data does not exist", () => {
        const result = dataLayer.getSiteLoadData(session, 'site1');
        expect(result).to.deep.equal({});
    });

    it("18. should replace site inputData with provided loadData", () => {
        const siteId = "site1";

        // Pre-fill inputData to prove it's replaced
        dataLayer.initializeSiteData(session, siteId, "pageOld");
        session.siteData[siteId].inputData.pageOld.formData = {
            oldField: "should be replaced"
        };

        const newInputData = {
            index: {
                formData: {
                    email: "test@example.com"
                }
            },
            page2: {
                formData: {
                    option: "yes"
                }
            }
        };

        dataLayer.storeSiteInputData(session, siteId, newInputData);

        expect(session.siteData[siteId].inputData).to.deep.equal(newInputData);
    });


    
});