# Document Sync

Sync your project files to Google's Gemini File Search API and enable AI-powered code understanding. Compatible with VS Code and Cursor. Integrates seamlessly with [MCP servers](#mcp-server-integration) to enable AI agents (like Claude Desktop and Cursor's AI) to query your synced project files.

## Features

- 🔄 **Automatic File Syncing** - Automatically sync files to Gemini File Search when you save changes
- 📁 **Project Organization** - Organize files by project name for better management
- 🎯 **Selective Directory Watching** - Choose which directories to watch and sync
- 🔐 **Secure API Key Storage** - Your Gemini API key is stored securely in VS Code's secret storage
- 🤖 **AI-Powered Code Understanding** - Enable AI assistants to understand your codebase through Gemini File Search
- ⚡ **Real-time Updates** - Files are synced automatically as you work

## Requirements

- VS Code or Cursor (v1.85.0 or higher)
- A Google Gemini API Key ([Get one here](https://ai.google.dev/))

## Installation

1. Open VS Code or Cursor
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Document Sync"
4. Click **Install**

## Quick Start

1. **Get Your API Key**
   - Visit [Google AI Studio](https://ai.google.dev/)
   - Create an API key with File Search access

2. **First Time Setup**
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run `Gemini File Search: Sync Files`
   - Enter your Gemini API Key when prompted
   - Enter a project name (e.g., "my-awesome-project")
   - Select the directory you want to sync (or use workspace root)

3. **Start Syncing**
   - Click the "Gemini Sync" icon in the Activity Bar
   - Click "Sync Now" to upload your files
   - Files will automatically sync when you save changes

## Usage

### Activity Bar

The extension adds a "Gemini Sync" icon to your Activity Bar. Click it to access:

- **Sync Now** - Manually trigger a file sync
- **Change Project Name** - Update your project name
- **Change Watch Location** - Change which directory to watch
- **Update API Key** - Update your Gemini API key
- **Enable/Disable Sync** - Toggle automatic file syncing for this project

### Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Gemini File Search: Sync Files` - Sync files to Gemini File Search
- `Gemini File Search: Login to Gemini` - Set or update your API key
- `Gemini File Search: Change Project Name` - Change your project name
- `Gemini File Search: Change Watch Location` - Change the directory to watch
- `Gemini File Search: Toggle Sync` - Enable or disable automatic syncing for this project

### Automatic Syncing

Once configured, the extension automatically:
- Watches your selected directory for file changes
- Syncs files when you save them
- Deletes files from Gemini when you delete them locally
- Updates files when you modify them

### Configuration

Settings are stored in `document-sync.json` in your workspace root:

```json
{
  "projectName": "my-project",
  "watchLocation": "src",
  "syncEnabled": true
}
```

**Settings:**
- `projectName` - The name of your project (creates a separate File Store in Gemini)
- `watchLocation` - Relative path from workspace root to the directory to watch (or absolute path if outside workspace)
- `syncEnabled` - Enable/disable automatic syncing (default: `true`)

You can edit this file directly or use the extension commands to update settings. The MCP server automatically reads this configuration file to detect your project settings.

## How It Works

1. **File Upload**: Files are uploaded to Google's Gemini File Search API
2. **Indexing**: Gemini indexes your files for semantic search
3. **AI Queries**: AI assistants can query your codebase using natural language
4. **Automatic Updates**: Changes are synced automatically as you work

## Project Names

Each project name creates a separate "File Store" in Gemini. This allows you to:
- Organize different projects separately
- Keep multiple projects synced simultaneously
- Switch between projects easily

## Troubleshooting

### Files Not Syncing

- **Check API Key**: Run `Gemini File Search: Login to Gemini` to verify your API key
- **Check Watch Location**: Ensure the watch location is set correctly
- **Check Output**: Open the Output panel and select "Gemini File Sync" to see detailed logs
- **Verify Project Name**: Make sure your project name is set

### API Errors

- **Invalid API Key**: Verify your API key at [Google AI Studio](https://ai.google.dev/)
- **File Search Not Enabled**: Ensure your API key has File Search access
- **Rate Limits**: Check if you've hit API rate limits

### Configuration Issues

- **Settings File**: Check that `document-sync.json` exists in your workspace root
- **Permissions**: Ensure you have write permissions to your workspace directory
- **Path Issues**: Verify that the watch location path is correct

### Viewing Logs

1. Open the Output panel (`View` > `Output` or `Ctrl+Shift+U` / `Cmd+Shift+U`)
2. Select "Gemini File Sync" from the dropdown
3. Review the logs for detailed information about sync operations

## Privacy & Security

- Your API key is stored securely in VS Code's secret storage
- Files are uploaded to Google's Gemini File Search API
- Only files in your selected watch location are synced
- You can delete files from Gemini by deleting them locally

## Use Cases

- **AI Code Assistants**: Enable AI assistants to understand your codebase
- **Code Documentation**: Let AI assistants answer questions about your code
- **Project Analysis**: Query your project files using natural language
- **Team Collaboration**: Share project context with AI-powered tools

## MCP Server Integration

The Document Sync extension works seamlessly with the **Gemini File Search MCP Server**, which allows AI agents (like Claude Desktop or Cursor's AI) to query your synced project files using the Model Context Protocol (MCP).

### How It Works Together

1. **Sync Your Files**: Use this extension to sync your project files to Gemini File Search
2. **Use the MCP Server**: The MCP server automatically detects your project configuration from `document-sync.json`
3. **AI Queries**: AI agents can now query your codebase using natural language
4. **Automatic Updates**: As you work, the extension keeps files in sync, and the MCP server provides real-time access

### Installing the MCP Server

Install the MCP server globally:

```bash
npm install -g @shoutoutlabs/document-sync-mcp
```

Or use it directly with npx:

```bash
npx @shoutoutlabs/document-sync-mcp
```

### Configuration

The MCP server automatically detects your project configuration from the `document-sync.json` file created by this extension. You only need to provide your Gemini API key:

**Environment Variable:**
- `GEMINI_API_KEY` (required) - Your Google Gemini API Key
- `PROJECT_PATH` (optional) - Absolute path to project root (if not in current directory)

### Adding to Claude Desktop

Add the following to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### Adding to Cursor

1. Open Cursor Settings
2. Navigate to **Features** > **MCP**
3. Click **Add New MCP Server**
4. Configure:
   - **Name**: `gemini-file-search` (or any name you prefer)
   - **Type**: `command`
   - **Command**: `npx -y @shoutoutlabs/document-sync-mcp`
   - **Environment Variables**: 
     - Key: `GEMINI_API_KEY`
     - Value: `your_api_key_here`

### Available MCP Tools

The MCP server provides the following tool:

- **`ask_project(query: string, projectName?: string)`** - Ask questions about your project files
  - `query`: The question to ask about your codebase
  - `projectName`: (Optional) The name of the project. If not provided, the server uses the project name from `document-sync.json`

### Example Usage

Once configured, you can ask AI agents questions like:
- "What does the authentication module do?"
- "How does the file upload feature work?"
- "Show me all the API endpoints in this project"
- "Explain the database schema"

The AI agent will use the MCP server to query your synced files and provide accurate answers based on your actual codebase.

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

## Related Tools

This extension works great with:
- **MCP Server**: Use `@shoutoutlabs/document-sync-mcp` to enable AI agents to query your files via Model Context Protocol
- **Web Client**: Chat with your project files through a web interface and manage your knowledge bases

## Support

- **Issues**: Report issues on the [GitHub repository](https://github.com/shoutoutlabs/document-sync)
- **Questions**: Open a discussion on GitHub

## License

MIT License - see [LICENSE](LICENSE) for details

