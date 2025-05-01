import { expect } from "chai";
import { govcyApiRequest } from "../../src/utils/govcyApiRequest.mjs";

describe("Integration Test - Mock API", () => {
    const mockApiBaseUrl = "http://localhost:3002"; // Base URL for the mock API

    it("1. should successfully submit data to the mock API", async () => {
        // Dummy data to send to the mock API
        const dummyData = {
            submission_username: "John Doe",
            submission_email: "john@example.com",
            submission_data: { field1: "value1", field2: "value2" },
            submission_data_version: "1.0",
            print_friendly_data: [],
            renderer_data: [],
            renderer_version: "1.14.2",
            design_systems_version: "3.2.0",
            service: {
                id: "testSite",
                title: { en: "Test Service", el: "Υπηρεσία Τεστ" },
            },
            referenceNumber: "",
        };

        // Call the mock API with the "success" key in the URL
        const response = await govcyApiRequest("post", `${mockApiBaseUrl}/success`, dummyData);

        // Assert the response
        expect(response.Succeeded).to.be.true;
        expect(response.ErrorCode).to.equal(0);
        expect(response.Data.submission_id).to.equal("12345678-x");
    });

    it("2. should handle API error responses correctly (error102)", async () => {
        // Dummy data to send to the mock API
        const dummyData = {
            submission_username: "John Doe",
            submission_email: "john@example.com",
        };

        try {
            // Call the mock API with the "error102" key in the URL
            await govcyApiRequest("post", `${mockApiBaseUrl}/error102`, dummyData);
        } catch (error) {
            // Assert the error message
            expect(error.message).to.equal("User not administrator");
        }
    });

    it("3. should handle API error responses correctly (error103)", async () => {
        // Dummy data to send to the mock API
        const dummyData = {
            submission_username: "John Doe",
            submission_email: "john@example.com",
        };

        try {
            // Call the mock API with the "error103" key in the URL
            await govcyApiRequest("post", `${mockApiBaseUrl}/error103`, dummyData);
        } catch (error) {
            // Assert the error message
            expect(error.message).to.equal("User needs registration");
        }
    });

    it("4. should handle bad requests correctly", async () => {
        // Dummy data to send to the mock API
        const dummyData = {
            submission_username: "John Doe",
            submission_email: "john@example.com",
        };

        try {
            // Call the mock API with an invalid key in the URL
            await govcyApiRequest("post", `${mockApiBaseUrl}/invalid-key`, dummyData);
        } catch (error) {
            // Assert the error message
            expect(error.message).to.equal("Bad request");
        }
    });
});