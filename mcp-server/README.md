# Gemini File Search MCP Server

This is a Model Context Protocol (MCP) server that allows AI agents to query your local project files using Google's Gemini File Search API.

It automatically detects your project configuration from the `document-sync.json` file created by the Gemini File Sync VS Code extension.

## Prerequisites

1.  **Node.js**: Ensure Node.js is installed.
2.  **Gemini API Key**: You need a valid API Key from Google AI Studio.
3.  **Project Configuration**: You must have run the Gemini File Sync extension in your project at least once to generate the `document-sync.json` file in your project root.

## Installation

You can install this server directly from npm:

```bash
npm install -g document-sync-mcp
```

Or run it directly with `npx`:

```bash
npx document-sync-mcp
```

## Running the Server

### Environment Variables
- `GEMINI_API_KEY`: **Required**. Your Google Gemini API Key.
- `PROJECT_PATH`: **Optional**. Absolute path to your project root. Use this if the server cannot find `document-sync.json` automatically (e.g., when running from a different directory).

### Manual Run
```bash
export GEMINI_API_KEY="your_api_key_here"
npx document-sync-mcp
```

## Adding to Claude Desktop

To use this server with Claude Desktop, add the following to your `claude_desktop_config.json` (usually located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "gemini-file-search": {
      "command": "npx",
      "args": [
        "-y",
        "document-sync-mcp"
      ],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Adding to Cursor

1.  Open Cursor Settings.
2.  Navigate to **Features** > **MCP**.
3.  Click **Add New MCP Server**.
4.  **Name**: `gemini-file-search` (or any name you prefer).
5.  **Type**: `command`.
6.  **Command**:
    ```bash
    npx -y document-sync-mcp
    ```
7.  **Environment Variables**:
    - Key: `GEMINI_API_KEY`
    - Value: `your_api_key_here`

## Available Tools

- **`ask_project(query: string, projectName?: string)`**: Ask a question about the current project.
    - `query`: The question to ask.
    - `projectName`: (Optional) The name of the project. If provided, the server uses this name to find files. If not provided, it attempts to find `document-sync.json` in the current or parent directories.
