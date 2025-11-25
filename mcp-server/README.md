# Gemini File Search MCP Server

This is a Model Context Protocol (MCP) server that allows AI agents to query your local project files using Google's Gemini File Search API.

It automatically detects your project configuration from the `document-sync.json` file created by the Gemini File Sync VS Code extension.

### Demo

<video width="100%" controls>
  <source src="../resources/Document_Sync__Living_Brain.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Related Extensions

This MCP server works seamlessly with the **Document Sync** extension for VS Code and Cursor, which automatically syncs your project files to Google's Gemini File Search API.

### VS Code Extension

Install the [Document Sync extension](https://marketplace.visualstudio.com/items?itemName=shoutoutlabs.document-sync) from the VS Code Marketplace to:

- Automatically sync files to Gemini File Search when you save changes
- Organize files by project name for better management
- Selectively watch and sync specific directories
- Securely store your Gemini API key

### Cursor Extension

The same extension is also available for Cursor. Install it from:

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=shoutoutlabs.document-sync) (works in Cursor)
- [Open VSX](https://open-vsx.org/extension/shoutoutlabs/document-sync) (open-source alternative)

### How They Work Together

1. **Install the Extension**: Install Document Sync in VS Code or Cursor
2. **Sync Your Files**: Use the extension to sync your project files to Gemini File Search
3. **Use the MCP Server**: This MCP server allows AI agents (like Claude Desktop or Cursor's AI) to query your synced files
4. **Automatic Updates**: As you work, the extension keeps your files in sync, and the MCP server provides real-time access to your codebase

The extension creates a `document-sync.json` file in your project root, which this MCP server uses to automatically detect your project configuration.

## Prerequisites

1.  **Node.js**: Ensure Node.js is installed.
2.  **Gemini API Key**: You need a valid API Key from Google AI Studio.
3.  **Project Configuration**: You must have run the Gemini File Sync extension in your project at least once to generate the `document-sync.json` file in your project root.

## Installation

You can install this server directly from npm:

```bash
npm install -g @shoutoutlabs/document-sync-mcp
```

Or run it directly with `npx`:

```bash
npx @shoutoutlabs/document-sync-mcp
```

## Running the Server

### Environment Variables
- `GEMINI_API_KEY`: **Required**. Your Google Gemini API Key.
- `PROJECT_PATH`: **Optional**. Absolute path to your project root. Use this if the server cannot find `document-sync.json` automatically (e.g., when running from a different directory).

### Manual Run
```bash
export GEMINI_API_KEY="your_api_key_here"
npx @shoutoutlabs/document-sync-mcp
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
        "@shoutoutlabs/document-sync-mcp"
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
    npx -y @shoutoutlabs/document-sync-mcp
    ```
7.  **Environment Variables**:
    - Key: `GEMINI_API_KEY`
    - Value: `your_api_key_here`

## Available Tools

- **`ask_project(query: string, projectName?: string)`**: Ask a question about the current project.
    - `query`: The question to ask.
    - `projectName`: (Optional) The name of the project. If provided, the server uses this name to find files. If not provided, it attempts to find `document-sync.json` in the current or parent directories.

## Web Client

The application also includes a **web-client** that can run on your own server. This provides a powerful web interface to manage and interact with your synced documents and projects.

### Features

- **View Synced Documents**: All documents and projects synced via the extension can be viewed in the web interface
- **Project Management**: Manage your projects, knowledge bases, and documents through an intuitive web dashboard
- **Team Collaboration**: Provide access to your dashboard for other teams (marketing, sales, etc.) so they have up-to-date documentation to retrieve information
- **MCP Server Integration**: With the MCP server, you can get relevant application context directly in the chat interface
- **Multi-Repository Support**: Ideal for managing multiple repositories for the same project (such as microservices), providing the same knowledge base across all repos

### Advantages

- **Team Access**: Share your documentation dashboard with non-technical team members who need access to up-to-date project information
- **Context-Aware Chat**: The web client integrates with the MCP server to provide relevant application context during chat interactions
- **Unified Knowledge Base**: Perfect for microservices architectures where you want a single knowledge base accessible across multiple repositories

### Running the Web Client

See the [web-client README](../web-client/README.md) for detailed setup instructions. The web client can be configured to use your Gemini API key via environment variable or entered directly in the interface.

> **Important:** To see the same projects across the extension, MCP server, and web client, you must use the **same Gemini API key** in all three components. Each API key has its own set of File Search stores, so using different keys will show different projects.
