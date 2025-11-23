import express from "express";
import cors from "cors";
import { listProjects, askProject } from "./gemini.js";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/projects", async (req, res) => {
    try {
        const projects = await listProjects();
        res.json(projects);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/chat", async (req, res) => {
    const { query, projectName } = req.body;

    if (!query || !projectName) {
        return res.status(400).json({ error: "Missing query or projectName" });
    }

    try {
        const response = await askProject(query, projectName);
        res.json({ response });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
