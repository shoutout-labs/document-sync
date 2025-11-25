# Publishing to Cursor Marketplace

Cursor uses the **Open VSX Registry** as its extension marketplace. To make your extension available in Cursor, you need to publish it to Open VSX.

This guide is based on the [official Open VSX publishing documentation](https://github.com/EclipseFdn/open-vsx.org/wiki/Publishing-Extensions).

## Prerequisites

1. **Eclipse Account**: Create an account at [eclipse.org](https://accounts.eclipse.org/user/register)
   - **Important**: Fill in the _GitHub Username_ field and use exactly the same GitHub account as when you log in to open-vsx.org
2. **GitHub Account**: For logging into open-vsx.org
3. **Open VSX CLI** (optional): For command-line publishing

## Initial Setup (One-Time)

### 1. Create Eclipse Account

1. Go to [eclipse.org registration](https://accounts.eclipse.org/user/register)
2. Create an account
3. **Important**: Fill in the _GitHub Username_ field with your GitHub username
4. Use the same GitHub account when logging into open-vsx.org

### 2. Log in to Open VSX and Sign Publisher Agreement

1. Go to [open-vsx.org](https://open-vsx.org/)
2. Click on the account icon in the top right corner
3. Authorize the application with your GitHub account
4. Navigate to your Profile page (click on your avatar → _Settings_)
5. Click on _Log in with Eclipse_ and authorize the application to access your eclipse.org account
6. You should see a button labeled _Show Publisher Agreement_
7. Click that button, read the agreement, and click _Agree_ if you consent

### 3. Create Your Namespace

The `publisher` field in your `package.json` (currently `shoutoutlabs`) defines the namespace. You need to create this namespace before publishing.

**Using npx (recommended - always uses latest version):**
```bash
npx ovsx create-namespace shoutoutlabs -p <your_access_token>
```

**Or install globally:**
```bash
npm install -g ovsx
ovsx create-namespace shoutoutlabs -p <your_access_token>
```

**Note**: Valid namespace names can only contain letters, numbers, and '-', '+', '$' and '~'.

### 4. Generate Access Token

1. Go to [open-vsx.org](https://open-vsx.org/)
2. Navigate to Settings → Access Tokens (click on your avatar → _Settings_ → _Access Tokens_)
3. Click _Generate New Token_
4. Enter a description (e.g., "Local machine publishing" or "CI/CD publishing")
5. Click _Generate Token_
6. **Copy the token immediately** - it's never displayed again!
7. Store it securely (encrypted file, CI/CD secrets, etc.)

An access token can be used to publish as many extensions as you like until it is deleted.

## Publishing Methods

You can publish using either the web UI or the command line. Both methods are described below.

### Method 1: Web UI Publishing

1. **Package your extension**:
   ```bash
   cd extension
   npm install
   npm run compile
   npm run package
   ```
   This creates a `.vsix` file (e.g., `document-sync-1.0.1.vsix`)

2. **Upload to Open VSX**:
   - Go to [open-vsx.org](https://open-vsx.org/)
   - Click the 'Publish' link in the upper right
   - Click 'Publish Extension'
   - Select or drag and drop your `.vsix` file

3. **Wait for processing**:
   - Your extension will appear in your settings in a 'Deactivated' state initially
   - Processing is asynchronous and normally takes 5-10 seconds
   - It can take longer for large extensions or when the server is busy
   - Once processing completes, it will show as active

### Method 2: Command Line Publishing (CLI)

#### Option A: Publish from a .vsix file

1. **Package your extension**:
   ```bash
   cd extension
   npm install
   npm run compile
   npm run package
   ```

2. **Publish using npx**:
   ```bash
   npx ovsx publish document-sync-1.0.1.vsix -p <your_access_token>
   ```

   **Or using npm script** (after setting token):
   ```bash
   export OPENVSX_TOKEN=your_token_here
   npm run publish:openvsx
   ```

#### Option B: Publish directly from source

The `ovsx` tool can build and publish in one step:

```bash
cd extension
npm install
npx ovsx publish -p <your_access_token>
```

The `ovsx` tool uses `vsce` internally, which runs the `vscode:prepublish` script from your `package.json` automatically.

**Note**: If your extension uses Yarn, add the `--yarn` argument:
```bash
npx ovsx publish --yarn -p <your_access_token>
```

## Verification

1. After publishing, visit [open-vsx.org](https://open-vsx.org/)
2. Search for your extension: `shoutoutlabs.document-sync`
3. Your extension should appear in the registry
4. Initially, it may show as "Deactivated" in your settings - wait a few seconds for processing to complete

## Availability in Cursor

- After publishing to Open VSX, your extension will automatically become available in Cursor
- It may take a few hours for the extension to appear in Cursor's marketplace
- Users can search for "Document Sync" in Cursor's extension marketplace

## Updating Your Extension

To publish an update:

1. **Update the version** in `package.json`:
   ```json
   "version": "1.0.2"
   ```

2. **Rebuild and package**:
   ```bash
   npm run compile
   npm run package
   ```

3. **Publish the new version**:
   ```bash
   # Using web UI: upload the new .vsix file
   # Or using CLI:
   npx ovsx publish document-sync-1.0.2.vsix -p <your_access_token>
   ```

## Publishing to Both Marketplaces

If you want to publish to both VS Code Marketplace and Open VSX:

**VS Code Marketplace:**
```bash
npm run publish
```

**Open VSX (Cursor):**
```bash
# Set your token first
export OPENVSX_TOKEN=your_token_here
npm run publish:openvsx
```

## Troubleshooting

### "Extension not found in Cursor"
- Wait a few hours after publishing to Open VSX
- Verify the extension is visible and active on open-vsx.org
- Make sure you're searching with the correct name
- Check that the extension shows as "Active" (not "Deactivated") in your settings

### "Authentication failed"
- Verify your Access Token is correct
- Make sure the token hasn't been deleted
- Check that you're using the `-p` flag correctly: `npx ovsx publish -p <token>`

### "Namespace not found" or "Cannot publish to namespace"
- Make sure you've created the namespace first using `ovsx create-namespace`
- Verify the namespace name matches your `publisher` field in `package.json`
- Check that you're using the correct access token

### "Version already exists"
- Update the version number in `package.json`
- Rebuild and republish

### Extension shows as "Deactivated"
- This is normal immediately after publishing
- Wait 5-10 seconds (or longer for large extensions) for processing to complete
- Check your settings page on open-vsx.org to see when it becomes active

## Additional Resources

- [Official Open VSX Publishing Guide](https://github.com/EclipseFdn/open-vsx.org/wiki/Publishing-Extensions)
- [Open VSX Wiki](https://github.com/eclipse/openvsx/wiki)
- [Eclipse Account Registration](https://accounts.eclipse.org/user/register)
- [Open VSX Registry](https://open-vsx.org/)
