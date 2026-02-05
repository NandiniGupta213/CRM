import express from "express";

const app = express();
const PORT = 8000;

app.get("/", (req, res) => {
    res.send("Test server is working!");
});

app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});

// Keep server alive
process.stdin.resume();