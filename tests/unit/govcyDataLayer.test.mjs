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
                submissionDataVersion: '1.0',
                rendererVersion: '2.0',
                designSystemsVersion: '3.0',
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
                submissionUsername: "John Doe",
                submissionEmail: "HtYyj@example.com",
                submissionData: session.siteData.site1.inputData, // Raw data as submitted by the user in each page
                submissionDataVersion: service.site?.submissionDataVersion || "", // The submission data version
                printFriendlyData: printFriendlyData, // Print-friendly data
                rendererData: reviewSummaryList, // Renderer data of the summary list
                rendererVersion: service.site?.rendererVersion || "", // The renderer version
                designSystemsVersion: service.site?.designSystemsVersion || "", // The design systems version
                service: { // Service info
                    id: service.site.id, // Service ID
                    title: service.site.title // Service title multilingual object
                }
            }
        );

        const submissionData = dataLayer.getSiteSubmissionData(session, 'site1');
        expect(submissionData).to.deep.equal({
            submissionUsername: 'John Doe',
            submissionEmail: 'HtYyj@example.com',
            submissionData: {
                page1: { formData: { field1: 'value1' } },
                page2: { formData: { field2: 'value2' } },
            },
            submissionDataVersion: '1.0',
            printFriendlyData: printFriendlyData,
            rendererData: reviewSummaryList,
            rendererVersion: '2.0',
            designSystemsVersion: "3.0",
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

    it("19. should return the reference number from load data if it exists", () => {
        session.siteData = {
            site1: {
                loadData: {
                    referenceValue: "REF-001"
                }
            }
        };

        const ref = dataLayer.getSiteLoadDataReferenceNumber(session, "site1");
        expect(ref).to.equal("REF-001");
    });

    it("20. should return null if reference number is missing", () => {
        session.siteData = {
            site1: {
                loadData: {
                    // no referenceValue
                }
            }
        };

        const ref = dataLayer.getSiteLoadDataReferenceNumber(session, "site1");
        expect(ref).to.be.null;
    });

    it("21. should return null if siteData or loadData is missing", () => {
        session = {}; // no siteData at all
        const ref = dataLayer.getSiteLoadDataReferenceNumber(session, "site1");
        expect(ref).to.be.null;
    });

    // --- removeAllFilesFromSite tests ---
    it("22. should replace matching single file objects and array items by fileId across the site", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        dataLayer.initializeSiteData(session, "site1", "page2");

        // Populate formData across pages
        session.siteData.site1.inputData.page1.formData = {
            textField: "keep",
            fileSingleA: { fileId: "A", sha256: "X" },      // should remain (fileId != "B")
            fileSingleΒ: { fileId: "B", sha256: "Y" },               // should be replaced -> ""
            fileList: [
                { fileId: "B", sha256: "Y" },               // should be replaced -> ""
                { fileId: "C", sha256: "Z" },               // should remain
                "keep"
            ]
        };
        session.siteData.site1.inputData.page2.formData = {
            util: { fileId: "B", sha256: "Y" },              // should be replaced -> ""
            util2: { fileId: "Α", sha256: "Y" }              // should remain -> ""
        };

        dataLayer.removeAllFilesFromSite(session, "site1", { fileId: "B" });

        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal({
            textField: "keep",
            fileSingleA: { fileId: "A", sha256: "X" },      // unchanged
            fileSingleΒ: "",                               // replaced
            fileList: ["", { fileId: "C", sha256: "Z" }, "keep"] // only first item replaced
        });
        expect(session.siteData.site1.inputData.page2.formData).to.deep.equal({
            util: "",                                        // replaced
            util2: { fileId: "Α", sha256: "Y" }              // unchanged
        });

    });

    it("23. should replace matching values by sha256 across the site", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        dataLayer.initializeSiteData(session, "site1", "page2");

        session.siteData.site1.inputData.page1.formData = {
            f1: { fileId: "ID-1", sha256: "SHA-TARGET" },   // should be replaced
            f2: { fileId: "ID-2", sha256: "SHA-OTHER" }     // should remain
        };
        session.siteData.site1.inputData.page2.formData = {
            list: [
                { fileId: "ID-3", sha256: "SHA-TARGET" },   // should be replaced
                "keep"
            ]
        };

        dataLayer.removeAllFilesFromSite(session, "site1", { sha256: "SHA-TARGET" });

        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal({
            f1: "",                                         // replaced
            f2: { fileId: "ID-2", sha256: "SHA-OTHER" }     // unchanged
        });
        expect(session.siteData.site1.inputData.page2.formData).to.deep.equal({
            list: ["", "keep"]                              // only matching item replaced
        });
    });

    it("24. should require BOTH fileId and sha256 to match when both are provided", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            exactMatch: { fileId: "X", sha256: "S" },       // both match -> replaced
            idOnly: { fileId: "X", sha256: "DIFF" },    // sha differs -> keep
            shaOnly: { fileId: "DIFF", sha256: "S" },    // id differs -> keep
            other: { fileId: "A", sha256: "B" }        // keep
        };

        dataLayer.removeAllFilesFromSite(session, "site1", { fileId: "X", sha256: "S" });

        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal({
            exactMatch: "",
            idOnly: { fileId: "X", sha256: "DIFF" },
            shaOnly: { fileId: "DIFF", sha256: "S" },
            other: { fileId: "A", sha256: "B" }
        });
    });

    it("25. should do nothing if neither fileId nor sha256 is provided", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        const original = {
            a: { fileId: "ONE", sha256: "S1" },
            b: [{ fileId: "TWO", sha256: "S2" }, "keep"]
        };
        session.siteData.site1.inputData.page1.formData = JSON.parse(JSON.stringify(original));

        // No criteria provided
        dataLayer.removeAllFilesFromSite(session, "site1", {});

        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal(original);
    });

    it("26. should skip pages without formData and not throw", () => {
        // page1 has formData; page2 doesn't
        dataLayer.initializeSiteData(session, "site1", "page1");
        session.siteData.site1.inputData.page1.formData = {
            f: { fileId: "K", sha256: "S" }
        };
        // create a page2 bucket without formData
        session.siteData.site1.inputData.page2 = { someMeta: true };

        // Should not throw and should still process page1
        dataLayer.removeAllFilesFromSite(session, "site1", { fileId: "K" });

        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal({ f: "" });
        expect(session.siteData.site1.inputData.page2).to.deep.equal({ someMeta: true });
    });

    // --- isFileUsedInSiteInputDataAgain tests ---

    it("27. should return true when the same file is used in two different fields on the same page", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            a: { fileId: "F1", sha256: "S1" },
            b: { fileId: "F1", sha256: "S1" }, // second place on same page
            c: "keep"
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "F1",
            sha256: "S1"
        });

        expect(result).to.equal(true);
    });

    it("28. should return true when the same file appears on two different pages", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        dataLayer.initializeSiteData(session, "site1", "page2");

        session.siteData.site1.inputData.page1.formData = {
            a: { fileId: "F2", sha256: "S2" }
        };
        session.siteData.site1.inputData.page2.formData = {
            b: { fileId: "F2", sha256: "S2" }, // second place on different page
            c: { fileId: "F2", sha256: "S3" }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "F2",
            sha256: "S2"
        });

        expect(result).to.equal(true);
    });

    it("29. should return false when the file appears only once in the entire site", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            a: { fileId: "ONLY", sha256: "ONE" },
            b: "keep"
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "ONLY",
            sha256: "ONE"
        });

        expect(result).to.equal(false);
    });

    it("30. when both fileId and sha256 are provided, BOTH must match", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        dataLayer.initializeSiteData(session, "site1", "page2");

        session.siteData.site1.inputData.page1.formData = {
            a: { fileId: "X", sha256: "S-OK" }   // id differs -> NOT a hit
        };
        session.siteData.site1.inputData.page2.formData = {
            b: { fileId: "X-OK", sha256: "S" }   // sha differs -> NOT a hit
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "X-OK",
            sha256: "S-OK"
        });

        expect(result).to.equal(false);
    });

    it("31. should match and return true when only fileId is provided (multiple occurrences)", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        dataLayer.initializeSiteData(session, "site1", "page2");

        session.siteData.site1.inputData.page1.formData = {
            a: { fileId: "ID-ONLY", sha256: "S-A" }
        };
        session.siteData.site1.inputData.page2.formData = {
            b: { fileId: "ID-ONLY", sha256: "S-B" }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "ID-ONLY"
        });

        expect(result).to.equal(true);
    });

    it("32. should match and return true when only sha256 is provided (multiple occurrences)", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        dataLayer.initializeSiteData(session, "site1", "page2");

        session.siteData.site1.inputData.page1.formData = {
            a: { fileId: "A1", sha256: "SHA-ONLY" }
        };
        session.siteData.site1.inputData.page2.formData = {
            b: { fileId: "A2", sha256: "SHA-ONLY" }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            sha256: "SHA-ONLY"
        });

        expect(result).to.equal(true);
    });

    it("33. should return true when the same file appears twice in the same array field", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            files: [
                { fileId: "DUP", sha256: "SAME" },
                { fileId: "DUP", sha256: "SAME" }
            ],
            other: "keep"
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "DUP",
            sha256: "SAME"
        });

        expect(result).to.equal(true);
    });

    it("34. should return false when site/inputData/page/formData is missing or non-object", () => {
        // No siteData at all
        session = {};
        expect(
            dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", { fileId: "X" })
        ).to.equal(false);

        // Site exists but no inputData
        session = { siteData: { site1: {} } };
        expect(
            dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", { fileId: "X" })
        ).to.equal(false);

        // Page exists but no formData
        session = {};
        dataLayer.initializeSiteData(session, "site1", "page1");
        delete session.siteData.site1.inputData.page1.formData;

        expect(
            dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", { fileId: "X" })
        ).to.equal(false);
    });

    it("35. should ignore non-file-like values (strings, nulls, objects without both keys)", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        dataLayer.initializeSiteData(session, "site1", "page2");

        session.siteData.site1.inputData.page1.formData = {
            a: "not a file",
            b: null,
            c: { fileId: "PRESENT_ONLY" },           // missing sha256 → not counted by matcher
            d: { sha256: "PRESENT_ONLY" }            // missing fileId → not counted by matcher
        };
        session.siteData.site1.inputData.page2.formData = {
            e: "still not a file"
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "PRESENT_ONLY",
            sha256: "PRESENT_ONLY"
        });

        expect(result).to.equal(false);
    });

    it("36. should detect file in multipleDraft", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");
        session.siteData.site1.inputData.page1.multipleDraft = {
            doc: { fileId: "DRAFT1", sha256: "SAME" }
        };

        session.siteData.site1.inputData.page1.formData = {
            other: "keep"
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "DRAFT1",
            sha256: "SAME"
        });

        expect(result).to.equal(false); // appears once only
    });

    it("37. should return true when file appears in both formData and multipleDraft", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            doc: { fileId: "DUP", sha256: "SAME" }
        };
        session.siteData.site1.inputData.page1.multipleDraft = {
            doc: { fileId: "DUP", sha256: "SAME" }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "DUP",
            sha256: "SAME"
        });

        expect(result).to.equal(true); // seen in both
    });

    it("38. should detect duplicates across multipleItems array", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            multipleItems: [
                { doc: { fileId: "ID1", sha256: "HASH1" } },
                { doc: { fileId: "ID1", sha256: "HASH1" } }
            ]
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "ID1",
            sha256: "HASH1"
        });

        expect(result).to.equal(true);
    });

    it("39. should detect duplicates across multipleItems and multipleDraft", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            multipleItems: [
                { doc: { fileId: "SAMEFILE", sha256: "SAMEHASH" } }
            ]
        };
        session.siteData.site1.inputData.page1.multipleDraft = {
            doc: { fileId: "SAMEFILE", sha256: "SAMEHASH" }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "SAMEFILE",
            sha256: "SAMEHASH"
        });

        expect(result).to.equal(true);
    });

    it("40. should ignore malformed entries inside multipleItems", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            multipleItems: [
                { bad: "not a file" },
                { doc: { fileId: "OK", sha256: "OK" } }
            ]
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "OK",
            sha256: "OK"
        });

        expect(result).to.equal(false); // only one valid hit
    });

    it("41. should return true when the same file is present in formData, multipleDraft, and multipleItems", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1 = {
            formData: { a: { fileId: "F", sha256: "S" }, multipleItems: [] },
            multipleDraft: { b: { fileId: "F", sha256: "S" } }
        };
        session.siteData.site1.inputData.page1.formData.multipleItems.push({ c: { fileId: "F", sha256: "S" } });

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "F",
            sha256: "S"
        });

        expect(result).to.equal(true);
    });

    it("42. should return true when the same file is present in formData and multipleItems", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1 = {
            formData: { a: { fileId: "F2", sha256: "S2" }, multipleItems: [] }
        };
        session.siteData.site1.inputData.page1.formData.multipleItems.push({ b: { fileId: "F2", sha256: "S2" } });

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "F2",
            sha256: "S2"
        });

        expect(result).to.equal(true);
    });

    it("43. should return true when the same file is present in multipleDraft and multipleItems (no formData)", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1 = {
            multipleDraft: { a: { fileId: "FD", sha256: "SD" } },
            formData: [] // explicitly using array form to represent multipleItems
        };
        session.siteData.site1.inputData.page1.formData.push({ b: { fileId: "FD", sha256: "SD" } });

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "FD",
            sha256: "SD"
        });

        expect(result).to.equal(true);
    });

    it("44. should return false when multipleDraft and multipleItems exist but reference different files", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1 = {
            multipleDraft: { a: { fileId: "X1", sha256: "S1" } },
            formData: [] // array form for multipleItems
        };
        session.siteData.site1.inputData.page1.formData.push({ b: { fileId: "X2", sha256: "S2" } });

        const result = dataLayer.isFileUsedInSiteInputDataAgain(session, "site1", {
            fileId: "X1",
            sha256: "S1"
        });

        expect(result).to.equal(false);
    });

    // --- removeAllFilesFromSite tests (multipleThings support) ---

    it("45. should remove matching files from formData array (multiple items)", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = [
            { a: { fileId: "TARGET", sha256: "SAME" } },
            { b: { fileId: "OTHER", sha256: "DIFF" } }
        ];

        dataLayer.removeAllFilesFromSite(session, "site1", {
            fileId: "TARGET",
            sha256: "SAME"
        });

        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal([
            { a: "" }, // replaced
            { b: { fileId: "OTHER", sha256: "DIFF" } } // untouched
        ]);
    });

    it("46. should remove matching files from multipleDraft", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.multipleDraft = {
            d: { fileId: "DRAFT-ID", sha256: "DRAFT-SHA" },
            e: "keep"
        };

        dataLayer.removeAllFilesFromSite(session, "site1", {
            fileId: "DRAFT-ID",
            sha256: "DRAFT-SHA"
        });

        expect(session.siteData.site1.inputData.page1.multipleDraft).to.deep.equal({
            d: "",   // replaced
            e: "keep"
        });
    });

    it("47. should remove matching files when present in both multipleDraft and formData array", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.multipleDraft = {
            draftField: { fileId: "SAME", sha256: "SHA" }
        };
        session.siteData.site1.inputData.page1.formData = [
            { field: { fileId: "SAME", sha256: "SHA" } }
        ];

        dataLayer.removeAllFilesFromSite(session, "site1", {
            fileId: "SAME",
            sha256: "SHA"
        });

        expect(session.siteData.site1.inputData.page1.multipleDraft).to.deep.equal({
            draftField: ""
        });
        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal([
            { field: "" }
        ]);
    });

    it("48. should do nothing when multipleDraft and formData array exist but reference different files", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.multipleDraft = {
            draftField: { fileId: "X1", sha256: "S1" }
        };
        session.siteData.site1.inputData.page1.formData = [
            { field: { fileId: "X2", sha256: "S2" } }
        ];

        dataLayer.removeAllFilesFromSite(session, "site1", {
            fileId: "X1",
            sha256: "S1"
        });

        // Draft cleared
        expect(session.siteData.site1.inputData.page1.multipleDraft).to.deep.equal({
            draftField: ""
        });
        // Items untouched
        expect(session.siteData.site1.inputData.page1.formData).to.deep.equal([
            { field: { fileId: "X2", sha256: "S2" } }
        ]);
    });

    it("49. should remove the same file from flat formData, multipleDraft, and formData array simultaneously", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        // flat formData
        session.siteData.site1.inputData.page1.formData = {
            flatField: { fileId: "Z", sha256: "Z-SHA" }
        };

        // multipleDraft
        session.siteData.site1.inputData.page1.multipleDraft = {
            draftField: { fileId: "Z", sha256: "Z-SHA" }
        };

        // array formData (multiple items)
        session.siteData.site1.inputData.page1.formData = [
            { fieldA: { fileId: "Z", sha256: "Z-SHA" } },
            { fieldB: "keep" }
        ];

        dataLayer.removeAllFilesFromSite(session, "site1", {
            fileId: "Z",
            sha256: "Z-SHA"
        });

        // flat formData cleared
        expect(session.siteData.site1.inputData.page1.formData[0].fieldA).to.equal("");
        // array second field remains intact
        expect(session.siteData.site1.inputData.page1.formData[1].fieldB).to.equal("keep");

        // draft cleared
        expect(session.siteData.site1.inputData.page1.multipleDraft.draftField).to.equal("");
    });

    it("50. should NOT remove anything if fileId/sha256 do not match across flat, draft, and array", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        session.siteData.site1.inputData.page1.formData = {
            flatField: { fileId: "A", sha256: "SHA-A" }
        };
        session.siteData.site1.inputData.page1.multipleDraft = {
            draftField: { fileId: "B", sha256: "SHA-B" }
        };
        session.siteData.site1.inputData.page1.formData = [
            { fieldA: { fileId: "C", sha256: "SHA-C" } },
            { fieldB: "keep" }
        ];

        // Try removing a completely different file
        dataLayer.removeAllFilesFromSite(session, "site1", {
            fileId: "Z",
            sha256: "Z-SHA"
        });

        expect(session.siteData.site1.inputData.page1.formData[0].fieldA).to.deep.equal({ fileId: "C", sha256: "SHA-C" });
        expect(session.siteData.site1.inputData.page1.formData[1].fieldB).to.equal("keep");
        expect(session.siteData.site1.inputData.page1.multipleDraft.draftField).to.deep.equal({ fileId: "B", sha256: "SHA-B" });
    });

    it("51. should only remove matching files in a mixed structure", () => {
        dataLayer.initializeSiteData(session, "site1", "page1");

        // flat formData with two different files
        session.siteData.site1.inputData.page1.formData = {
            flatField1: { fileId: "TARGET", sha256: "T-SHA" }, // should be cleared
            flatField2: { fileId: "KEEP", sha256: "K-SHA" }    // should remain
        };

        // multipleDraft with the target
        session.siteData.site1.inputData.page1.multipleDraft = {
            draftField: { fileId: "TARGET", sha256: "T-SHA" } // should be cleared
        };

        // array with a mix
        session.siteData.site1.inputData.page1.formData = [
            { fieldA: { fileId: "TARGET", sha256: "T-SHA" } }, // should be cleared
            { fieldB: { fileId: "KEEP", sha256: "K-SHA" } }    // should remain
        ];

        dataLayer.removeAllFilesFromSite(session, "site1", {
            fileId: "TARGET",
            sha256: "T-SHA"
        });

        // flat formData
        expect(session.siteData.site1.inputData.page1.formData[0].fieldA).to.equal("");
        expect(session.siteData.site1.inputData.page1.formData[1].fieldB).to.deep.equal({ fileId: "KEEP", sha256: "K-SHA" });

        // draft cleared
        expect(session.siteData.site1.inputData.page1.multipleDraft.draftField).to.equal("");
    });


});

describe("getFormDataValue - multiple things", () => {
    it("1. should return file object from multipleDraft when formData is empty", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "academic-details": {
                            formData: {}, // empty formData
                            multipleDraft: {
                                academicFile: {
                                    sha256: "mock-sha256",
                                    fileId: "mock-id"
                                }
                            }
                        }
                    }
                }
            }
        };

        const result = dataLayer.getFormDataValue(store, "testSite", "academic-details", "academicFile");
        expect(result).to.deep.equal({
            sha256: "mock-sha256",
            fileId: "mock-id"
        });
    });

    it("2. should return correct formData value when formData is array and index is provided", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "academic-details": {
                            formData: [
                                { title: "MSc" },
                                { title: "BSc" }
                            ]
                        }
                    }
                }
            }
        };

        const value0 = dataLayer.getFormDataValue(store, "testSite", "academic-details", "title", 0);
        const value1 = dataLayer.getFormDataValue(store, "testSite", "academic-details", "title", 1);

        expect(value0).to.equal("MSc");
        expect(value1).to.equal("BSc");
    });

    it("3. should return empty string when page or field does not exist", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {}
                }
            }
        };

        const result = dataLayer.getFormDataValue(store, "testSite", "missing-page", "field");
        expect(result).to.equal("");
    });

    it("4. should return empty string when siteId is missing", () => {
        const store = {};
        const result = dataLayer.getFormDataValue(store, undefined, "page1", "field1");
        expect(result).to.equal("");
    });
});


describe("removeAllFilesFromSite - multiple things", () => {
    it("1. should remove fileInput objects from normal page formData", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "personal-details": {
                            formData: {
                                name: "Constantinos",
                                idAttachment: { sha256: "sha-123", fileId: "id-001" }
                            }
                        }
                    }
                }
            }
        };

        dataLayer.removeAllFilesFromSite(store, "testSite", { sha256: "sha-123", fileId: "id-001" });

        const pageData = store.siteData.testSite.inputData["personal-details"].formData;
        expect(pageData.idAttachment).to.equal(""); // should clear file
        expect(pageData.name).to.equal("Constantinos"); // should preserve non-file fields
    });

    it("2. should remove fileInput objects from multipleThings array pages", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "academic-details": {
                            formData: [
                                {
                                    title: "MSc",
                                    academicFileAttachment: { sha256: "hash1", fileId: "file1" }
                                },
                                {
                                    title: "BSc",
                                    academicFileAttachment: { sha256: "hash2", fileId: "file2" }
                                }
                            ]
                        }
                    }
                }
            }
        };


        dataLayer.removeAllFilesFromSite(store, "testSite", { sha256: "hash1", fileId: "file1" });
        const items = store.siteData.testSite.inputData["academic-details"].formData;
        expect(items[0].academicFileAttachment).to.equal("");
        dataLayer.removeAllFilesFromSite(store, "testSite", { sha256: "hash2", fileId: "file2" });
        expect(items[1].academicFileAttachment).to.equal("");
    });

    it("3. should clear fileInput fields in multipleDraft section", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "academic-details": {
                            multipleDraft: {
                                academicFile: { sha256: "hash3", fileId: "file3" },
                                title: "PhD"
                            }
                        }
                    }
                }
            }
        };

        dataLayer.removeAllFilesFromSite(store, "testSite", { sha256: "hash3", fileId: "file3" });

        const draft = store.siteData.testSite.inputData["academic-details"].multipleDraft;
        expect(draft.academicFile).to.equal("");
        expect(draft.title).to.equal("PhD");
    });


});


describe("isFileUsedInSiteInputDataAgain - multiple things", () => {
    it("1. should return true if file exists inside multipleThings array", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "academic-details": {
                            formData: [
                                {
                                    title: "MSc",
                                    academicFileAttachment: { fileId: "file-xyz", sha256: "sha-xyz" }
                                },
                                {
                                    title: "BSc",
                                    academicFileAttachment: { fileId: "file-xyz", sha256: "sha-xyz" }
                                }
                            ]
                        }
                    }
                }
            }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(store, "testSite", {
            fileId: "file-xyz",
            sha256: "sha-xyz"
        });
        expect(result).to.be.true;
    });


    it("2. should return true if file exists inside multipleDraft", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "academic-details": {
                            formData: [
                                {
                                    title: "MSc",
                                    academicFileAttachment: { fileId: "file-777", sha256: "sha-777" }
                                }
                            ],
                            multipleDraft: {
                                academicFile: { fileId: "file-777", sha256: "sha-777" }
                            }
                        }
                    }
                }
            }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(store, "testSite", {
            fileId: "file-777",
            sha256: "sha-777"
        });
        expect(result).to.be.true;
    });

    it("3. should return false if fileId matches but sha256 is different", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "academic-details": {
                            formData: [
                                {
                                    title: "MSc",
                                    academicFileAttachment: { fileId: "file-777", sha256: "sha-777" }
                                }
                            ],
                            multipleDraft: {
                                academicFile: { fileId: "file-777", sha256: "sha-777" }
                            }
                        }
                    }
                }
            }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(store, "testSite", {
            fileId: "file-777",
            sha256: "sha-778" // different
        });
        expect(result).to.be.false;
    });

    it("4. should return true on combination of normal page and multiple things ", () => {
        const store = {
            siteData: {
                testSite: {
                    inputData: {
                        "personal-details": {
                            formData: {
                                name: "Constantinos",
                                idAttachment: { fileId: "file-777", sha256: "sha-777" }
                            }
                        },
                        "academic-details": {
                            formData: [
                                {
                                    title: "MSc",
                                    academicFileAttachment: { fileId: "file-777", sha256: "sha-777" }
                                }
                            ],
                            multipleDraft: {
                                academicFile: { fileId: "file-888", sha256: "sha-888" }
                            }
                        }
                    }
                }
            }
        };

        const result = dataLayer.isFileUsedInSiteInputDataAgain(store, "testSite", {
            fileId: "file-777",
            sha256: "sha-777"
        });
        expect(result).to.be.true;
    });

});

// ---------------------------------------------------------
// setMultipleDraft
// ---------------------------------------------------------
describe("setMultipleDraft()", () => {
    it("1. should set multipleDraft correctly for a given page", () => {
        let store = { siteData: {} };
        dataLayer.setMultipleDraft(store, "site1", "academic-details", { title: "MSc" });
        expect(store.siteData["site1"].inputData["academic-details"].multipleDraft)
            .to.deep.equal({ title: "MSc" });
    });

    it("2. should overwrite existing multipleDraft data", () => {
        let store = { siteData: {} };
        store = {
            siteData: {
                site1: {
                    inputData: {
                        "academic-details": { multipleDraft: { title: "Old MSc" } }
                    }
                }
            }
        };
        dataLayer.setMultipleDraft(store, "site1", "academic-details", { title: "New MSc" });
        expect(store.siteData.site1.inputData["academic-details"].multipleDraft)
            .to.deep.equal({ title: "New MSc" });
    });

    it("3. should create nested objects if missing", () => {
        let store = { siteData: {} };
        dataLayer.setMultipleDraft(store, "newSite", "newPage", { field: "abc" });
        expect(store.siteData.newSite.inputData.newPage.multipleDraft)
            .to.deep.equal({ field: "abc" });
    });

    it("4. should allow complex object structures", () => {
        let store = { siteData: {} };
        const draft = {
            title: "BSc",
            academicFile: { fileId: "file-123", sha256: "sha-xyz" },
            grades: ["A", "B"]
        };
        dataLayer.setMultipleDraft(store, "site1", "page1", draft);
        expect(store.siteData.site1.inputData.page1.multipleDraft)
            .to.deep.equal(draft);
    });

    it("5. should not affect other pages’ drafts", () => {
        let store = { siteData: {} };
        store = {
            siteData: {
                site1: {
                    inputData: {
                        "page1": { multipleDraft: { title: "Old" } },
                        "page2": { multipleDraft: { title: "Keep" } }
                    }
                }
            }
        };
        dataLayer.setMultipleDraft(store, "site1", "page1", { title: "New" });
        expect(store.siteData.site1.inputData.page1.multipleDraft.title).to.equal("New");
        expect(store.siteData.site1.inputData.page2.multipleDraft.title).to.equal("Keep");
    });
});

// ---------------------------------------------------------
// clearMultipleDraft
// ---------------------------------------------------------
describe("clearMultipleDraft()", () => {
    it("1. should clear existing multipleDraft data", () => {
        let store = { siteData: {} };
        store = {
            siteData: {
                site1: {
                    inputData: {
                        "academic-details": { multipleDraft: { title: "MSc" } }
                    }
                }
            }
        };
        dataLayer.clearMultipleDraft(store, "site1", "academic-details");
        expect(store.siteData.site1.inputData["academic-details"].multipleDraft).to.be.null;
    });

    it("2. should handle missing site/page gracefully", () => {
        let store = { siteData: {} };
        expect(() => {
            dataLayer.clearMultipleDraft(store, "unknown", "page");
        }).not.to.throw();
    });

    it("3. should only clear target page’s draft", () => {
        let store = { siteData: {} };
        store = {
            siteData: {
                site1: {
                    inputData: {
                        "page1": { multipleDraft: { title: "Clear me" } },
                        "page2": { multipleDraft: { title: "Keep me" } }
                    }
                }
            }
        };
        dataLayer.clearMultipleDraft(store, "site1", "page1");
        expect(store.siteData.site1.inputData.page1.multipleDraft).to.be.null;
        expect(store.siteData.site1.inputData.page2.multipleDraft).to.deep.equal({ title: "Keep me" });
    });

    it("4. should not throw when multipleDraft is already empty", () => {
        let store = { siteData: {} };
        store = {
            siteData: { site1: { inputData: { "page1": { multipleDraft: {} } } } }
        };
        expect(() => dataLayer.clearMultipleDraft(store, "site1", "page1")).not.to.throw();
        
        expect(store.siteData.site1.inputData.page1.multipleDraft).to.be.null;
    });

    it("5. should keep structure intact even if no multipleDraft existed", () => {
        let store = { siteData: {} };
        store = { siteData: { site1: { inputData: { "page1": {} } } } };
        expect(() => dataLayer.clearMultipleDraft(store, "site1", "page1")).not.to.throw();
        expect(store.siteData.site1.inputData.page1).to.be.an("object");
    });
});

describe("getFormDataValue()", () => {
  let store;

  beforeEach(() => {
    store = {
      siteData: {
        testSite: {
          inputData: {
            "simple-page": {
              formData: {
                name: "Constantinos",
                email: "test@example.com"
              }
            },
            "multiple-page": {
              formData: [
                { title: "MSc", year: "2020" },
                { title: "BSc", year: "2018" }
              ]
            },
            "draft-page": {
              formData: [
                { title: "Old MSc", year: "2020" }
              ],
              multipleDraft: { title: "Draft MSc", year: "2024" }
            }
          }
        }
      }
    };
  });

  it("1. should return value from a normal single page", () => {
    const result = dataLayer.getFormDataValue(store, "testSite", "simple-page", "name");
    expect(result).to.equal("Constantinos");
  });

  it("2. should return correct indexed value for multipleThings", () => {
    const result = dataLayer.getFormDataValue(store, "testSite", "multiple-page", "title", 1);
    expect(result).to.equal("BSc");
  });

  it("3. should return undefined for out-of-range index", () => {
    const result = dataLayer.getFormDataValue(store, "testSite", "multiple-page", "title", 99);
    expect(result).to.equal("");
  });

  it("4. should prioritize array data over multipleDraft value", () => {
    const result = dataLayer.getFormDataValue(store, "testSite", "draft-page", "title", 0);
    expect(result).to.equal("Old MSc");
  });

  it("5. should return first item when index is not specified for multipleThings", () => {
    const result = dataLayer.getFormDataValue(store, "testSite", "multiple-page", "year");
    expect(result).to.equal("");
  });

  it("6. should return undefined if page or field does not exist", () => {
    const result = dataLayer.getFormDataValue(store, "testSite", "unknown-page", "fieldX");
    expect(result).to.equal("");
  });

  it("7. should return empty string if field exists but empty", () => {
    store.siteData.testSite.inputData["simple-page"].formData["emptyField"] = "";
    const result = dataLayer.getFormDataValue(store, "testSite", "simple-page", "emptyField");
    expect(result).to.equal("");
  });

  it("8. should not throw even if store structure is malformed", () => {
    const malformed = {};
    expect(() => dataLayer.getFormDataValue(malformed, "x", "y", "z")).not.to.throw();
  });
});
