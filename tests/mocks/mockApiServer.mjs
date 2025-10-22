import express from "express";
import multer from "multer";

const app = express();
const port = 3002; // Mock API will run on this port

app.use(express.json()); // Middleware to parse JSON requests

// 🔧 NEW: Multer setup (memory; fine for mocks/tests)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * NEW route: multipart/form-data upload
 * - Expects field "file" as the uploaded file
 * - Optional text fields (e.g., "description") available via req.body
 */
app.post("/form-upload/:tag", upload.single("file"), (req, res) => {
    try {
        const authHeader = req.headers["authorization"] || null;

        console.log(`Received multipart/form-data upload --------------`);

        // Access parsed file and fields
        const file = req.file;                 // { originalname, mimetype, size, buffer, ... }
        const { description } = req.body || {};

        if (!file) {
            return res.status(400).json({
                Succeeded: false,
                ErrorCode: 400,
                ErrorMessage: "No file received",
                Data: null
            });
        }

        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: {
                receivedFile: true,
                filename: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                description: description || null,
                fileId: "mock-file-id", // Mock ID for testing
                sha256: "mock-sha256-hash", // Mock SHA256 for testing
            },
            // Echo headers for test assertions
            ReceivedAuthorization: authHeader,
            ReceivedClientKey: req.headers["client-key"] || null,
            ReceivedServiceId: req.headers["service-id"] || null
        });
    } catch (err) {
        console.error("Error processing multipart upload:", err);
        return res.status(500).json({
            Succeeded: false,
            ErrorCode: 500,
            ErrorMessage: "Internal server error",
            Data: null
        });
    }
});

// Mock endpoint for submission
app.post("/:key", (req, res) => {
    const { key } = req.params;
    const authHeader = req.headers['authorization'] || null;
    console.log(`Received request with key: ${key}`);
    console.log(`Authorization header: ${authHeader}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);

    // Simulate different responses based on input
    if (key === "success") {
        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: { referenceValue: "12345678-x" },
            ReceivedAuthorization: authHeader, // This is to test the auth header
            ReceivedClientKey: req.headers['client-key'] || null,    // For testing client key
            ReceivedServiceId: req.headers['service-id'] || null     // For testing service ID
        });
    } else if (key === "error102") {
        return res.status(200).json({
            Succeeded: false,
            ErrorCode: 102,
            ErrorMessage: "User not administrator",
        });
    } else if (key === "error103") {
        return res.status(200).json({
            Succeeded: false,
            ErrorCode: 103,
            ErrorMessage: "User needs registration",
        });
    } else {
        return res.status(400).json({
            Succeeded: false,
            ErrorCode: 400,
            ErrorMessage: "Bad request",
        });
    }
});

// Mock endpoint for submission
app.get("/:key/:lang", (req, res) => {
    const { key, lang } = req.params;
    const authHeader = req.headers['authorization'] || null;
    console.log(`Received request with key: ${key}`);
    console.log(`Authorization header: ${authHeader}`);
    console.log(`Query params: ${JSON.stringify(req.query, null, 2)}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);
    if (key === "umdUnverified") {
        return res.status(200).json({
            "errorCode": 401,
            "errorMessage": "Unauthorized: No identity found",
            "data": {
                "fullName": null,
                "dob": null,
                "dod": null,
                "pin": null,
                "email": null,
                "emailVerified": false,
                "mobile": null,
                "mobileVerified": false,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": null,
                "poBoxAddress": null
            },
            "succeeded": false
        });
    } else if (key === "umdForeign") {
        return res.status(200).json({
            "errorCode": 0,
            "errorMessage": null,
            "data": {
                "fullName": "KOSTIS GIANNIS",
                "dob": "1995-11-01",
                "dod": null,
                "pin": "",
                "email": null,
                "emailVerified": false,
                "mobile": null,
                "mobileVerified": false,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": null,
                "poBoxAddress": null
            },
            "succeeded": true
        });
    } else if (key === "umdPinUnknown") {
        return res.status(200).json({
            "errorCode": -100,
            "errorMessage": "PIN_UNKNOWN_OR_INVALID",
            "data": {
                "fullName": null,
                "dob": null,
                "dod": null,
                "pin": null,
                "email": null,
                "emailVerified": false,
                "mobile": null,
                "mobileVerified": false,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": null,
                "poBoxAddress": null
            },
            "succeeded": false
        });
    } else if (key === "umdAgeEligibility") {
        return res.status(200).json({
            "errorCode": -104,
            "errorMessage": "AGE_ELIGIBILITY_FAILURE",
            "data": {
                "fullName": null,
                "dob": null,
                "dod": null,
                "pin": null,
                "email": null,
                "emailVerified": false,
                "mobile": null,
                "mobileVerified": false,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": null,
                "poBoxAddress": null
            },
            "succeeded": false
        });
    } else if (key === "umdCitizenNonActive") {
        return res.status(200).json({
            "errorCode": -101,
            "errorMessage": "CITIZEN_NOT_ACTIVE",
            "data": {
                "fullName": null,
                "dob": null,
                "dod": null,
                "pin": null,
                "email": null,
                "emailVerified": false,
                "mobile": null,
                "mobileVerified": false,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": null,
                "poBoxAddress": null
            },
            "succeeded": false
        });
    } else if (key === "umdCitizenUpdated") {
        return res.status(200).json({
            "errorCode": 0,
            "errorMessage": null,
            "data": {
                "fullName": "COSTIS GIANNIS WITH DATA 1",
                "dob": "1992-10-16",
                "dod": null,
                "pin": "0001234567",
                "email": "dsftesting1@gmail.com",
                "emailVerified": true,
                "mobile": "0035799123456",
                "mobileVerified": true,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": [
                    {
                        "type": null,
                        "postalCode": 1101,
                        "language": null,
                        "item": {
                            "street": {
                                "apartmentNumber": "",
                                "streetNumber": "12"
                            },
                            "code": 48,
                            "name": "ΙΩΝΩΝ",
                            "parish": {
                                "code": 100001,
                                "name": "ΑΓΙΟΣ ΑΝΔΡΕΑΣ"
                            }
                        },
                        "town": {
                            "code": 1000,
                            "name": "ΛΕΥΚΩΣΙΑ"
                        },
                        "district": {
                            "code": 1,
                            "name": "ΛΕΥΚΩΣΙΑ"
                        },
                        "country": {
                            "code": 600,
                            "name": "ΚΥΠΡΟΣ",
                            "alpha2": null,
                            "alpha3": null
                        },
                        "addressVerified": false,
                        "addressText": "ΙΩΝΩΝ  12  \n1101 ΛΕΥΚΩΣΙΑ\nΛΕΥΚΩΣΙΑ\nΚΥΠΡΟΣ"
                    }
                ],
                "addressInfoUnstructured": null,
                "poBoxAddress": null
            },
            "succeeded": true
        });
    } else if (key === "umdCitizenNotUpdated") {
        return res.status(200).json({
            "errorCode": 0,
            "errorMessage": null,
            "data": {
                "fullName": "COSTIS GIANNIS NOT UPDATED",
                "dob": "2007-08-25",
                "dod": null,
                "pin": "0001234567",
                "email": null,
                "emailVerified": false,
                "mobile": null,
                "mobileVerified": false,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": null,
                "poBoxAddress": null
            },
            "succeeded": true
        });
    } else if (key === "umdCitizenUpdatedUnstructured") {
        return res.status(200).json({
            "errorCode": 0,
            "errorMessage": null,
            "data": {
                "fullName": "ALI ISMAIL",
                "dob": "1979-05-24",
                "dod": null,
                "pin": "0001013317",
                "email": "dsftesting1@gmail.com",
                "emailVerified": true,
                "mobile": "0035799413163",
                "mobileVerified": true,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": [
                    {
                        "type": null,
                        "addressLine1": "Potsi poda",
                        "addressLine2": "",
                        "town": "BBKing",
                        "postalCode": "2460",
                        "language": null,
                        "country": {
                            "code": 816,
                            "name": "ΒΑΝΟΥΑΤΟΥ",
                            "alpha2": null,
                            "alpha3": null
                        },
                        "addressVerified": false,
                        "addressText": "Potsi poda\n2460 BBKing\nΒΑΝΟΥΑΤΟΥ"
                    }
                ],
                "poBoxAddress": null
            },
            "succeeded": true
        });
    } else if (key === "umdCitizenUpdatedPOBox") {
        return res.status(200).json({
            "errorCode": 0,
            "errorMessage": null,
            "data": {
                "fullName": "ΣΤΕΛΛΑ ΣΤΥΛΙΑΝΟΥ",
                "dob": "1977-07-07",
                "dod": null,
                "pin": "0000766588",
                "email": "dsftesting1@gmail.com",
                "emailVerified": true,
                "mobile": "0035797667201",
                "mobileVerified": true,
                "landline": null,
                "landlineVerified": false,
                "addressInfo": null,
                "addressInfoUnstructured": null,
                "poBoxAddress": [
                    {
                        "type": null,
                        "language": "el",
                        "poBoxNumber": "12452",
                        "poBoxDistrictCode": "",
                        "poBoxDistrictDesc": "",
                        "poBoxPostalCode": "2244",
                        "poBoxText": "PO box 12452\n2244"
                    }
                ]
            },
            "succeeded": true
        });
    }
});

// Mock endpoint for submission
app.get("/:key", (req, res) => {
    const { key } = req.params;
    const authHeader = req.headers['authorization'] || null;
    console.log(`Received request with key: ${key}`);
    console.log(`Authorization header: ${authHeader}`);
    console.log(`Query params: ${JSON.stringify(req.query, null, 2)}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);

    // Simulate different responses based on input
    if (key === "success") {
        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: { referenceValue: "12345678-x" },
            ReceivedQuery: req.query, // This is to test the query params
            ReceivedAuthorization: authHeader, // This is to test the auth header
            ReceivedClientKey: req.headers['client-key'] || null,    // For testing client key
            ReceivedServiceId: req.headers['service-id'] || null     // For testing service ID
        });
    } else if (key === "error102") {
        return res.status(200).json({
            Succeeded: false,
            ErrorCode: 102,
            ErrorMessage: "User not administrator",
        });
    } else if (key === "error105") {
        return res.status(200).json({
            Succeeded: false,
            ErrorCode: 105,
            ErrorMessage: "Other error occurred",
        });
        // Handle submission data retrieval
    } else if (key === "submissionData") {
        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: {
                submissionId: "f97c091b-caa6-4e69-a515-f57043a704b0",
                serviceId: "f11077f3-72c7-4eec-ab01-f07d9efed08d",
                referenceValue: "0000000924107836",
                submissionTs: "2025-08-07T17:05:26+03:00",
                status: 0,
                statusTs: "2025-08-07T17:05:34+03:00",
                userId: "0000000924107836",
                userType: 1,
                userName: "",
                userIdentifier: "0001013317",
                userEmail: "",
                submissionData: "{\"index\":{\"formData\":{\"certificate_select\":[\"birth\",\"permanent_residence\"]}},\"data-entry-radios\":{\"formData\":{\"mobile_select\":\"other\",\"mobileTxt\":\"+35799484967\"}}}",
                dataStatus: 0
            }
        });
    } else if (key === "submissionEmpty") {
        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: null
        });
    } else {
        return res.status(400).json({
            Succeeded: false,
            ErrorCode: 400,
            ErrorMessage: "Bad request",
        });
    }
});


// Mock endpoint to download a file
app.get("/:key/:referenceNo/:fileId/:sha256", (req, res) => {
    const { key, referenceNo, fileId, sha256 } = req.params;
    const authHeader = req.headers['authorization'] || null;
    console.log(`Received request with key: ${key}`);
    console.log(`Authorization header: ${authHeader}`);
    console.log(`Query params: ${JSON.stringify(req.query, null, 2)}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);

    // Simulate different responses based on input
    if (key === "fileDownload") {
        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: {
                fileId: "685ce92aa0291b778956dea3",
                fileName: "govcy (21).pdf",
                contentType: "application/pdf",
                fileSize: 1872,
                sha256: "bb89074e5374c96a6c2a9ea2e6b7f5885693edf6d06c3dadbdb41b5d7a44253c",
                base64: "JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgaHR0cDovL3d3dy5yZXBvcnRsYWIuY29tCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0gL1BhcmVudCA2IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0F1dGhvciAoYW5vbnltb3VzKSAvQ3JlYXRpb25EYXRlIChEOjIwMjUwODA3MDUxNzAyKzAwJzAwJykgL0NyZWF0b3IgKFJlcG9ydExhYiBQREYgTGlicmFyeSAtIHd3dy5yZXBvcnRsYWIuY29tKSAvS2V5d29yZHMgKCkgL01vZERhdGUgKEQ6MjAyNTA4MDcwNTE3MDIrMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQREYgTGlicmFyeSAtIHd3dy5yZXBvcnRsYWIuY29tKSAKICAvU3ViamVjdCAodW5zcGVjaWZpZWQpIC9UaXRsZSAodW50aXRsZWQpIC9UcmFwcGVkIC9GYWxzZQo+PgplbmRvYmoKNiAwIG9iago8PAovQ291bnQgMSAvS2lkcyBbIDMgMCBSIF0gL1R5cGUgL1BhZ2VzCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDEwMgo+PgpzdHJlYW0KR2FwUWgwRT1GLDBVXEgzVFxwTllUXlFLaz90Yz5JUCw7VyNVMV4yM2loUEVNXz9DVzRLSVNpOTBNakdeMixGUyM8UkM1K2MsbigvI11PZTQ8IV5URCNnaV0mPFQhb1lsM1MoK34+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNzMgMDAwMDAgbiAKMDAwMDAwMDEwNCAwMDAwMCBuIAowMDAwMDAwMjExIDAwMDAwIG4gCjAwMDAwMDA0MDQgMDAwMDAgbiAKMDAwMDAwMDQ3MiAwMDAwMCBuIAowMDAwMDAwNzY4IDAwMDAwIG4gCjAwMDAwMDA4MjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8ZGMwMzIwYWRmODcxZTliYmY2ODk4NzIxMWUyYmQ3ODI+PGRjMDMyMGFkZjg3MWU5YmJmNjg5ODcyMTFlMmJkNzgyPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKGh0dHA6Ly93d3cucmVwb3J0bGFiLmNvbSkKCi9JbmZvIDUgMCBSCi9Sb290IDQgMCBSCi9TaXplIDgKPj4Kc3RhcnR4cmVmCjEwMTkKJSVFT0YK",
                description: null,
                uid: null,
                tag: "kostis"
            },
            ReceivedReferenceNo: referenceNo, // This is to test the referenceNo
            ReceivedFileId: fileId, // This is to test the fileId
            ReceivedSha256: sha256 // This is to test the sha256
        });
    } else if (key === "fileDownloadBadMime") {
        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data: {
                fileId: "bad-mime-id",
                fileName: "archive.zip",
                contentType: "application/zip", // 🚫 Not allowed
                fileSize: 1000,
                sha256: "sha123",
                base64: Buffer.from("fake content").toString("base64"),
                tag: "kostis"
            }
        });
    } else if (key === "fileDownloadBadMagic") {
        return res.status(200).json({
            Succeeded: true,
            Data: {
                fileId: "bad-magic",
                fileName: "fake.pdf",
                contentType: "application/pdf",
                fileSize: 1000,
                sha256: "sha-bad",
                base64: Buffer.from("This is not a real PDF").toString("base64"),
                tag: "kostis"
            }
        });
    } else if (key === "fileDownloadEmpty") {
        return res.status(200).json({
            Succeeded: true,
            Data: {
                fileId: "empty-file",
                fileName: "empty.pdf",
                contentType: "application/pdf",
                fileSize: 0,
                sha256: "sha-empty",
                base64: "", // ❌ Empty
                tag: "kostis"
            }
        });
    } else if (key === "fileDownloadError401") {
        return res.status(401).json({
            Succeeded: false,
            ErrorCode: 401,
            ErrorMessage: "Unauthorized access",
        });
    } else if (key === "fileDownloadError404") {
        return res.status(404).json({
            Succeeded: false,
            ErrorCode: 404,
            ErrorMessage: "File not found",
        });
    } else {
        return res.status(400).json({
            Succeeded: false,
            ErrorCode: 400,
            ErrorMessage: "Bad request",
        });
    }
});

// Mock put endpoint for submission
app.put("/:key", (req, res) => {
    const { key } = req.params;
    const authHeader = req.headers['authorization'] || null;
    console.log(`Received request with key: ${key}`);
    console.log(`Authorization header: ${authHeader}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);

    // Simulate different responses based on input
    if (key === "submissionData") {
        return res.status(200).json({
            succeeded: true,
            errorCode: 0,
            errorMessage: null,
            data: {
                referenceValue: "0000000924107836"
            },
        });
    } else if (key === "error401") {
        return res.status(401).json({
            Succeeded: false,
            ErrorCode: 401,
            ErrorMessage: "Unauthorized access",
        });
    } else {
        return res.status(400).json({
            Succeeded: false,
            ErrorCode: 400,
            ErrorMessage: "Bad request",
        });
    }
});

// Mock put endpoint for File delete 
app.delete("/:key/:fileId/:sha256", (req, res) => {
    const { key, fileId, sha256 } = req.params;
    const authHeader = req.headers['authorization'] || null;
    console.log(`Received request with key: ${key}`);
    console.log(`Authorization header: ${authHeader}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);

    // Simulate different responses based on input
    if (key === "fileDelete") {
        return res.status(200).json({
            succeeded: true,
            errorCode: 0,
            errorMessage: null,
            data: {},
        });
    } else if (key === "error404") {
        return res.status(404).json({
            Succeeded: false,
            ErrorCode: 404,
            ErrorMessage: "File not found",
        });
    } else {
        return res.status(400).json({
            Succeeded: false,
            ErrorCode: 400,
            ErrorMessage: "Bad request",
        });
    }
});

app.listen(port, () => {
    console.log(`Mock API running at http://localhost:${port}`);
});