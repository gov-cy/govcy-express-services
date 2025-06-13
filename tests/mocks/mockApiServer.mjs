import express from "express";

const app = express();
const port = 3002; // Mock API will run on this port

app.use(express.json()); // Middleware to parse JSON requests

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
            Data : { submission_id: "12345678-x" },
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
            Data : { submission_id: "12345678-x" },
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
    } else {
        return res.status(400).json({
            Succeeded: false,
            ErrorCode: 400,
            ErrorMessage: "Bad request",
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Mock API running at http://localhost:${port}`);
});