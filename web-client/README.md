<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your Gemini API Key (choose one method):
   - **Option A (Recommended):** Set the `GEMINI_API_KEY` environment variable in a `.env.local` file:
     ```bash
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - **Option B:** Enter your API key directly in the web interface when you first open the app

   > **Important:** To see the same projects across the extension, MCP server, and web client, you must use the **same Gemini API key** in all three components. Each API key has its own set of File Search stores, so using different keys will show different projects.

3. Run the app:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000` (or the port specified in your Vite config).
