import { GoogleAIFileManager } from "@google/generative-ai/server";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}

const fileManager = new GoogleAIFileManager(API_KEY);

async function uploadTestFile() {
    const testFileName = "test_project/hello.txt";
    const testContent = "Hello! This is a test file for the Gemini Document Sync project.";
    const tempFilePath = path.join(process.cwd(), "temp_hello.txt");

    fs.writeFileSync(tempFilePath, testContent);

    try {
        console.log("Uploading test file...");
        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
            mimeType: "text/plain",
            displayName: testFileName,
        });

        console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);
    } catch (error) {
        console.error("Error uploading file:", error);
    } finally {
        fs.unlinkSync(tempFilePath);
    }
}

uploadTestFile();
