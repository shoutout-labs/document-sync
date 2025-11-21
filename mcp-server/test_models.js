"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = require("dotenv");
dotenv_1.default.config();
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach((m) => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        }
        else {
            console.log("No models found or error:", data);
        }
    }
    catch (error) {
        console.error("Error listing models:", error);
    }
}
listModels();
//# sourceMappingURL=test_models.js.map