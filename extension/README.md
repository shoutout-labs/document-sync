# Document Sync

Sync your project files to Google's Gemini File Search API and enable AI-powered code understanding. Compatible with VS Code and Cursor.

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

### Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Gemini File Search: Sync Files` - Sync files to Gemini File Search
- `Gemini File Search: Login to Gemini` - Set or update your API key
- `Gemini File Search: Change Project Name` - Change your project name
- `Gemini File Search: Change Watch Location` - Change the directory to watch

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
  "watchLocation": "/path/to/watch"
}
```

You can edit this file directly or use the extension commands to update settings.

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

## Related Tools

This extension works great with:
- **MCP Server**: Use `document-sync-mcp` to enable AI agents to query your files
- **Web Client**: Chat with your project files through a web interface

## Support

- **Issues**: Report issues on the [GitHub repository](https://github.com/shoutoutlabs/document-sync)
- **Questions**: Open a discussion on GitHub

## License

MIT License - see [LICENSE](LICENSE) for details

