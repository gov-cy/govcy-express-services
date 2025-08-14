import { expect } from "chai";
import fs from "fs";
import path from "path";
import FormData from "form-data";

import { govcyApiRequest } from "../../src/utils/govcyApiRequest.mjs";

describe("Integration Test - Mock API", () => {
    const mockApiBaseUrl = "http://localhost:3002"; // Base URL for the mock API
    const fixturesPath = path.resolve("tests/fixtures/testfile.pdf"); // your dummy file

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
        expect(response.Data.referenceValue).to.equal("12345678-x");
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

    it("5. should send Authorization header when useAccessTokenAuth is true", async () => {
        const dummyData = { test: "auth-header" };
        const user = { access_token: "test-token-123" };
        const response = await govcyApiRequest(
            "post",
            `${mockApiBaseUrl}/success`,
            dummyData,
            true, // useAccessTokenAuth
            user
        );
        expect(response.ReceivedAuthorization).to.equal("Bearer test-token-123");
    });

    it("6. should send client-key and service-id headers", async () => {
        const dummyData = { test: "header-check" };
        const user = { access_token: "test-token-abc" };
        const headers = {
            "client-key": "my-client-key-123",
            "service-id": "my-service-id-456",
            accept: "text/plain"
        };
        const response = await govcyApiRequest(
            "post",
            `${mockApiBaseUrl}/success`,
            dummyData,
            true, // useAccessTokenAuth
            user,
            headers
        );
        expect(response.ReceivedClientKey).to.equal("my-client-key-123");
        expect(response.ReceivedServiceId).to.equal("my-service-id-456");
        expect(response.ReceivedAuthorization).to.equal("Bearer test-token-abc");
    });

    it("7. should send query params for GET requests", async () => {
        const params = { checkFor: "isCitizen,isAdult", foo: "bar" };
        const response = await govcyApiRequest(
            "get",
            "http://localhost:3002/success",
            params
        );
        expect(response.Succeeded).to.be.true;
        expect(response.ErrorCode).to.equal(0);
        expect(response.ReceivedQuery).to.deep.equal(params);
        // You can check the mock server logs to verify params, or enhance the mock to echo them back for assertion
    });

    it("8. should send params as body for POST requests", async () => {
        const params = { checkFor: "isCitizen,isAdult", foo: "bar" };
        const response = await govcyApiRequest(
            "post",
            "http://localhost:3002/success",
            params
        );
        expect(response.Succeeded).to.be.true;
        expect(response.ErrorCode).to.equal(0);
        // Optionally, enhance mock server to echo req.body for assertion
    });

    it("9. should send headers for GET eligibility check", async () => {
        const headers = {
            "client-key": "my-client-key-123",
            "service-id": "my-service-id-456",
            accept: "text/plain"
        };
        const response = await govcyApiRequest(
            "get",
            "http://localhost:3002/success",
            {},
            true,
            { access_token: "test-token-abc" },
            headers
        );
        expect(response.ReceivedClientKey).to.equal("my-client-key-123");
        expect(response.ReceivedServiceId).to.equal("my-service-id-456");
        expect(response.ReceivedAuthorization).to.equal("Bearer test-token-abc");
    });

    it("10. should send FormData with file upload successfully", async () => {
        // Create form-data body
        const form = new FormData();
        form.append("file", fs.createReadStream(fixturesPath));
        form.append("meta", JSON.stringify({ example: true }));

        const response = await govcyApiRequest(
            "post",
            `${mockApiBaseUrl}/form-upload/tag`, // Mock endpoint for file upload
            form,                  // 👈 Pass FormData directly
            true,                 // useAccessTokenAuth
            { access_token: "form-token-123" },                  // user
            { "client-key": "form-client-key" } // custom header
        );

        expect(response.Succeeded).to.be.true;
        expect(response.ErrorCode).to.equal(0);
        // These will depend on what your mock API echoes back
        expect(response.ReceivedClientKey).to.equal("form-client-key");
        expect(response.Data).to.have.property("receivedFile").that.is.true;
        expect(response.ReceivedAuthorization).to.equal("Bearer form-token-123");
        expect(response.Data.filename).to.equal("testfile.pdf");
        expect(response.Data.mimeType).to.equal("application/pdf");
        expect(response.Data.size).to.be.greaterThan(0);
    });

    it("11. should fail when no file is provided", async () => {
        const form = new FormData();
        form.append("meta", "no-file-case");

      
        const response = await govcyApiRequest(
            "post",
            `${mockApiBaseUrl}/form-upload/tag`, // Mock endpoint for file upload
            form,
            true,
            { access_token: "form-token-123" },
            {},
            3,
            false,
            [200, 400, 500] // Allow 200, 400, and 500 status codes
        );
        console.log("Unexpected success response:", response);
        expect(response.Succeeded).to.be.false;
        expect(response.ErrorCode).to.equal(400);
        expect(response.ErrorMessage).to.include("No file received");
            
    });

});