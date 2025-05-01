import express from "express";

const app = express();
const port = 3002; // Mock API will run on this port

app.use(express.json()); // Middleware to parse JSON requests

// Mock endpoint for submission
app.post("/:key", (req, res) => {
    const { key } = req.params;
    console.log(`Received request with key: ${key}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);

    // Simulate different responses based on input
    if (key === "success") {
        return res.status(200).json({
            Succeeded: true,
            ErrorCode: 0,
            ErrorMessage: null,
            Data : { submission_id: "12345678-x" },
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

// Start the server
app.listen(port, () => {
    console.log(`Mock API running at http://localhost:${port}`);
});