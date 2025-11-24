# Document Sync

A comprehensive solution for syncing your project files to Google's Gemini File Search API, enabling AI-powered code understanding and chat capabilities across VS Code, Cursor, MCP servers, and web interfaces.

## Overview

Document Sync consists of three main components:

1. **VS Code/Cursor Extension** - Sync files from your workspace to Gemini File Search
2. **MCP Server** - Enable AI agents to query your project files via Model Context Protocol
3. **Web Client** - Chat with your project files through a React web interface

## Features

- 🔄 **Automatic File Syncing** - Sync your project files to Gemini File Search API
- 🤖 **AI-Powered Queries** - Ask questions about your codebase using Gemini
- 📁 **Project Management** - Organize files by project name
- 🎯 **Selective Syncing** - Choose specific directories to watch and sync
- 🔌 **MCP Integration** - Use with Claude Desktop, Cursor, and other MCP-compatible tools
- 🌐 **Web Interface** - Chat with your projects through a modern React UI

## Prerequisites

- **Node.js** (v18 or higher)
- **VS Code** or **Cursor** (v1.85.0 or higher)
- **Google Gemini API Key** - Get yours from [Google AI Studio](https://ai.google.dev/)

## Installation

### VS Code/Cursor Extension

1. Install the extension from the VS Code marketplace or build from source:

```bash
cd extension
npm install
npm run compile
```

2. Press `F5` to open a new window with the extension loaded, or package it:

```bash
npm run package
```

3. Install the generated `.vsix` file in VS Code/Cursor.

### MCP Server

The MCP server is available as an npm package:

```bash
npm install -g document-sync-mcp
```

Or use it directly with npx:

```bash
npx document-sync-mcp
```

### Web Client

```bash
cd web-client
npm install
```

Create a `.env` file:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

Start the development server:

```bash
npm run dev
```

## Usage

### VS Code/Cursor Extension

1. **First Time Setup**:
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Run `Gemini File Search: Sync Files`
   - Enter your Gemini API Key when prompted
   - Enter a project name for your workspace
   - Select a directory to watch (or use the workspace root)

2. **Syncing Files**:
   - Use the "Gemini Sync" activity bar icon
   - Click "Sync Files" to upload files to Gemini File Search
   - Files are automatically synced when you save changes

3. **Commands**:
   - `Gemini File Search: Sync Files` - Manually trigger a sync
   - `Gemini File Search: Login to Gemini` - Update your API key
   - `Gemini File Search: Change Project Name` - Update project name
   - `Gemini File Search: Change Watch Location` - Change the directory to watch

4. **Configuration**:
   - Settings are stored in `document-sync.json` in your workspace root
   - Contains `projectName` and `watchLocation` settings

### MCP Server

#### Running the Server

Set your API key and run:

```bash
export GEMINI_API_KEY="your_api_key_here"
npx document-sync-mcp
```

#### Adding to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "gemini-file-search": {
      "command": "npx",
      "args": ["-y", "document-sync-mcp"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Adding to Cursor

1. Open Cursor Settings
2. Navigate to **Features** > **MCP**
3. Click **Add New MCP Server**
4. Configure:
   - **Name**: `gemini-file-search`
   - **Type**: `command`
   - **Command**: `npx -y document-sync-mcp`
   - **Environment Variables**: `GEMINI_API_KEY` = `your_api_key_here`

#### Available Tools

- **`ask_project(query: string, projectName?: string)`** - Ask questions about your project files

### Web Client

1. Start the development server (see Installation above)
2. Open the app in your browser (usually `http://localhost:5173`)
3. Select a project from the list
4. Start chatting with your project files!

## Project Structure

```
document-sync/
├── extension/          # VS Code/Cursor extension
│   ├── extension.ts    # Main extension code
│   ├── geminiService.ts # Gemini API integration
│   ├── package.json    # Extension manifest
│   └── resources/      # Extension assets
├── mcp-server/         # MCP server for AI agents
│   ├── src/
│   │   ├── index.ts    # MCP server entry point
│   │   └── gemini.ts   # Gemini integration
│   └── package.json
└── web-client/         # React web application
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   └── services/
    └── package.json
```

## Development

### Building the Extension

```bash
cd extension
npm install
npm run compile      # Compile TypeScript
npm run watch        # Watch mode for development
npm run package      # Create .vsix package
```

### Building the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### Building the Web Client

```bash
cd web-client
npm install
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

## Configuration

### Extension Settings

The extension creates a `document-sync.json` file in your workspace root:

```json
{
  "projectName": "my-project",
  "watchLocation": "/path/to/watch"
}
```

### Environment Variables

**MCP Server:**
- `GEMINI_API_KEY` (required) - Your Gemini API key
- `PROJECT_PATH` (optional) - Absolute path to project root

**Web Client:**
- `VITE_GEMINI_API_KEY` (required) - Your Gemini API key

## How It Works

1. **File Syncing**: The extension watches your specified directory and uploads files to Gemini File Search API when they change
2. **File Search**: Files are indexed by Gemini and can be queried using natural language
3. **AI Queries**: The MCP server and web client use Gemini's File Search to answer questions about your codebase
4. **Project Organization**: Files are organized by project name, allowing multiple projects to coexist

## Troubleshooting

### Extension Issues

- **Files not syncing**: Check that your API key is set and the watch location is correct
- **API errors**: Verify your Gemini API key is valid and has File Search enabled
- **Project not found**: Ensure `document-sync.json` exists in your workspace root

### MCP Server Issues

- **Server not starting**: Check that `GEMINI_API_KEY` is set correctly
- **Project not found**: Ensure `document-sync.json` exists in your project root, or set `PROJECT_PATH` environment variable

### Web Client Issues

- **API key error**: Ensure `VITE_GEMINI_API_KEY` is set in your `.env` file
- **No projects found**: Make sure you've synced at least one project using the extension

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.

