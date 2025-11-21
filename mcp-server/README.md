# Gemini File Search MCP Server

This is a Model Context Protocol (MCP) server that allows AI agents to query your local project files using Google's Gemini File Search API.

It automatically detects your project configuration from the `document-sync.json` file created by the Gemini File Sync VS Code extension.

## Prerequisites

1.  **Node.js**: Ensure Node.js is installed.
2.  **Gemini API Key**: You need a valid API Key from Google AI Studio.
3.  **Project Configuration**: You must have run the Gemini File Sync extension in your project at least once to generate the `document-sync.json` file in your project root.

## Installation

Navigate to this directory and install dependencies:

```bash
cd mcp-server
npm install
npm run build
```

## Running the Server

You can run the server manually to test it, but typically you will configure it within an MCP client (like Claude Desktop or Cursor).

### Environment Variable
The server requires the `GEMINI_API_KEY` environment variable to be set.

### Manual Test
```bash
export GEMINI_API_KEY="your_api_key_here"
node build/index.js
```

## Adding to Claude Desktop

To use this server with Claude Desktop, add the following to your `claude_desktop_config.json` (usually located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "gemini-file-search": {
      "command": "node",
      "args": [
        "/absolute/path/to/your/project/mcp-server/build/index.js"
      ],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```
*Note: Replace `/absolute/path/to/your/project/...` with the actual full path to the `build/index.js` file.*

## Adding to Cursor

1.  Open Cursor Settings.
2.  Navigate to **Features** > **MCP**.
3.  Click **Add New MCP Server**.
4.  **Name**: `gemini-file-search` (or any name you prefer).
5.  **Type**: `command`.
6.  **Command**:
    ```bash
    node /absolute/path/to/your/project/mcp-server/build/index.js
    ```
7.  **Environment Variables**:
    - Key: `GEMINI_API_KEY`
    - Value: `your_api_key_here`

## Available Tools

- **`ask_project`**: Ask a question about the current project. The server will find relevant files uploaded to Gemini (matching your project name) and use them to answer your query.
